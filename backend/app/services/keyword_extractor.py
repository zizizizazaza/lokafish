"""
Keyword extractor for analytics chart aggregation.

The default chart_aggregator uses Singapore/Taylor-Swift-specific keyword
dictionaries (Marina Bay, hotels, aviation...). That was fine for the baked
demo but produces empty charts for any other scenario.

This service asks the LLM to produce a fresh {districts, industries,
countries} dict for the current prediction requirement, which gets cached
to the project's upload dir and picked up by the chart_aggregator at
/api/project/<id>/data time.

Output shape matches what chart_aggregator expects so it can be dropped in
as a replacement:

    {
      "districts":  [{"id", "label", "keywords": [...], "x", "y"}],
      "industries": [{"label", "color", "keywords": [...]}],
      "countries":  [{"label", "color", "keywords": [...]}],
    }
"""

from __future__ import annotations

import json
from typing import Any, Dict, Optional

from ..utils.llm_client import LLMClient
from ..utils.logger import get_logger

logger = get_logger('mirofish.keyword_extractor')


SYSTEM_PROMPT = (
    "You are a data analyst designing a chart-aggregation keyword dictionary "
    "for a specific prediction scenario. Your output is parsed as JSON and "
    "used to count keyword mentions in a simulation's action stream."
)


USER_PROMPT_TEMPLATE = """\
# Task

Produce a JSON keyword dictionary tailored to the following prediction
scenario. Each category you produce will be used to aggregate mentions in
a social-media-style simulation stream (posts, comments, quotes) into
chart data.

# Prediction scenario

{requirement}

{context_section}

# Required JSON shape

Return a JSON object with EXACTLY these three keys. Return NO preamble,
NO markdown fences, NO comments — just the JSON object.

{{
  "districts": [
    {{
      "id": "short_snake_case_id",
      "label": "Human-readable short name",
      "keywords": ["lowercase term 1", "lowercase term 2", ...],
      "x": 0.0-1.0,
      "y": 0.0-1.0
    }},
    ... 4 to 10 district entries ...
  ],
  "industries": [
    {{
      "label": "Industry name",
      "color": "#hexcolor",
      "keywords": ["lowercase term 1", ...]
    }},
    ... 5 to 10 industry entries ...
  ],
  "countries": [
    {{
      "label": "Country name",
      "color": "#hexcolor",
      "keywords": ["lowercase country name", "lowercase city", ...]
    }},
    ... 5 to 12 country entries ...
  ]
}}

# Rules

1. Every keyword must be **lowercase** — the aggregator lowercases the
   input before matching.
2. Each category must contain 5-15 keywords. More is better if relevant.
3. **Districts**: if the prediction scenario has a clear geographic focus
   (a specific city or region), produce districts/landmarks inside it.
   If the scenario is not geographic (e.g. macro finance, tech earnings),
   return an EMPTY array `"districts": []` — it's better to skip than to
   force-fit Singapore districts onto a Fed rate cut question.
4. **x, y** for districts are fractional positions on a 0..1 canvas.
   Pick values that look distributed, not all at (0.5, 0.5).
5. **Industries** must be specific sectors that would actually be
   mentioned in the simulated conversations for THIS scenario. Do NOT
   copy "Accommodation / F&B / Aviation" unless the scenario is about
   tourism.
6. **Countries** should be the geographies whose actors/capital/
   consumers matter for the prediction. Always include a short list
   even for local scenarios (e.g. for Singapore scenarios, include
   neighbors + origins of inbound flows).
7. Use distinct hex colors from this palette (feel free to mix):
   #0F7B6C #2383E2 #D9730D #6940A5 #E03E3E #AD1A72 #DFAB01 #9B6E2E
   #D44A4A #1F8FFF

# Examples of what GOOD output looks like

For "Predict impact of NVIDIA's next earnings miss on the semiconductor
supply chain":
- districts: [] (no geography)
- industries: [Semiconductors, AI Infrastructure, Datacenter, Gaming,
  Cloud Services, EDA Software, Foundry, Memory]
- countries: [USA, Taiwan, Korea, China, Japan, Netherlands]

For "Predict impact of Fed 50bp rate cut on Asian equity markets":
- districts: [] (no geography)
- industries: [Asian Equities, Currency Pairs, REITs, Banking, Tech Stocks,
  Government Bonds, Commodities, Private Credit]
- countries: [USA, Japan, Hong Kong, Singapore, India, Korea, Australia,
  Indonesia]

For "Predict economic impact of Los Angeles 2028 Olympics":
- districts: [Downtown LA, SoFi Stadium, Venice Beach, Pasadena, LAX,
  Hollywood, Santa Monica, Long Beach] (LA neighborhoods as districts)
- industries: [Hospitality, Aviation, Construction, Broadcasting,
  Retail, F&B, Security Services, Ground Transport]
- countries: [USA, Mexico, Canada, Japan, UK, France, Germany, China]

Now produce the JSON for the scenario above."""


def extract_keywords(
    requirement: str,
    extra_context: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Ask the LLM for a keyword dictionary matching the current scenario.

    Falls back to an empty dict on any error — callers should treat the
    result as best-effort and default to the baked Singapore keywords if
    the returned dict is empty or malformed.
    """
    ctx_section = ""
    if extra_context and extra_context.strip():
        # The first ~2000 chars of the expansion document gives the LLM
        # concrete stakeholder names to build keyword lists around.
        trimmed = extra_context.strip()[:2000]
        ctx_section = f"# Additional stakeholder context\n\n{trimmed}\n"

    user_prompt = USER_PROMPT_TEMPLATE.format(
        requirement=requirement.strip(),
        context_section=ctx_section,
    )

    client = LLMClient()
    logger.info(f"extracting chart keywords for requirement ({len(requirement)} chars)")
    try:
        result = client.chat_json(
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.3,
            max_tokens=3000,
        )
    except Exception as e:
        logger.warning(f"keyword extraction failed: {e}")
        return {}

    # Sanity-validate the shape before returning
    if not isinstance(result, dict):
        logger.warning("keyword extraction returned non-dict")
        return {}
    out: Dict[str, Any] = {}
    for key in ("districts", "industries", "countries"):
        val = result.get(key)
        if isinstance(val, list):
            out[key] = val
        else:
            out[key] = []

    logger.info(
        f"keyword extraction: {len(out.get('districts', []))} districts, "
        f"{len(out.get('industries', []))} industries, "
        f"{len(out.get('countries', []))} countries"
    )
    return out


def _ensure_schema(category_list: list, required_fields: tuple) -> list:
    """Filter out malformed entries and make sure each item has the
    required fields."""
    clean = []
    for item in category_list:
        if not isinstance(item, dict):
            continue
        if all(f in item for f in required_fields):
            clean.append(item)
    return clean


def normalize_keywords(raw: Dict[str, Any]) -> Dict[str, Any]:
    """
    Sanity-check and normalize an LLM-produced keyword dict for use by
    chart_aggregator. Drops malformed entries, lowercases keywords,
    validates fractional xy for districts.
    """
    if not raw:
        return {}
    out: Dict[str, Any] = {}

    districts = _ensure_schema(
        raw.get("districts") or [],
        ("id", "label", "keywords"),
    )
    for d in districts:
        d["keywords"] = [str(k).lower() for k in (d.get("keywords") or [])]
        d["x"] = float(d.get("x") or 0.5)
        d["y"] = float(d.get("y") or 0.5)
    out["districts"] = districts

    industries = _ensure_schema(
        raw.get("industries") or [],
        ("label", "keywords"),
    )
    for i in industries:
        i["keywords"] = [str(k).lower() for k in (i.get("keywords") or [])]
        if not i.get("color"):
            i["color"] = "#2383E2"
    out["industries"] = industries

    countries = _ensure_schema(
        raw.get("countries") or [],
        ("label", "keywords"),
    )
    for c in countries:
        c["keywords"] = [str(k).lower() for k in (c.get("keywords") or [])]
        if not c.get("color"):
            c["color"] = "#0F7B6C"
    out["countries"] = countries

    return out
