"""
Stage 0: Stakeholder expansion.

Takes a short prediction requirement (e.g. "Predict the economic impact of
Taylor Swift's Eras Tour in Singapore") and asks the LLM to produce a
structured markdown document enumerating 200-300 specific stakeholders
organized into 10-15 categories. That expanded document then gets fed
into Stage 1 (ontology extraction) so the knowledge graph has far more
entities than a bare prompt would produce.

Why we don't try for literal 1500-2000 in one call:
- Token limits (a 2000-entity list blows past 8k output tokens)
- Repetition: the LLM produces near-duplicates past ~300
- Zep will dedupe to ~100-200 unique entities anyway

If a caller really wants more, they can loop and concatenate — see the
`expand_in_batches` function near the bottom.
"""

from __future__ import annotations

from typing import Optional

from ..utils.llm_client import LLMClient
from ..utils.logger import get_logger

logger = get_logger('mirofish.stakeholder_expander')


SYSTEM_PROMPT = (
    "You are a senior research analyst preparing a stakeholder map for a "
    "quantitative economic prediction. Your output feeds a knowledge graph "
    "builder, so every stakeholder you list must be specific and named "
    "(not a vague abstraction)."
)


USER_PROMPT_TEMPLATE = """\
# Task

Expand the prediction scenario below into a rich stakeholder map. Your
output should be a valid markdown document of approximately 2000-3000 words
that enumerates the specific people, companies, government agencies, venues,
platforms, geographic places, and demographic groups whose decisions will
shape the outcome of this prediction.

# Scenario

{requirement}

{context_section}

# Required structure

## 1. Overview
One paragraph summarizing the scenario and the stakeholder landscape.

## 2. Stakeholder categories
10-15 "## Category Name" sections. Each section contains a short intro
(1-2 sentences) followed by a bulleted list of 15-25 SPECIFIC stakeholders.

For each bullet, use this format:
- **Name** (Role / Type) — 1-sentence description of what they do and
  what decisions they make that affect the prediction.

Good examples of specific stakeholders:
- **Marina Bay Sands (MBS)** (Integrated Resort) — 2,560-room hotel; sets
  room rates for concert weekends, decides whether to run Swiftie packages.
- **Trip.com** (OTA platform) — Aggregates SEA booking data; releases
  pre/post surge statistics that drive media coverage.
- **STB (Singapore Tourism Board)** (Government agency) — Negotiates
  exclusivity deals with tour promoters, publishes arrival statistics.

Bad examples (DO NOT produce these):
- "Hotels" (too generic)
- "Tourists" (too generic)
- "The government" (too generic)

# Coverage requirements

Cover AT LEAST these categories where relevant:
- Direct event participants (performers, organizers, venues)
- Government and regulatory bodies
- Major private-sector companies (by industry)
- Media outlets and distribution platforms
- Platforms and marketplaces (booking, social, payment)
- Demographic/consumer segments (specific countries/cities, fan clubs)
- Infrastructure operators (transport, utilities)
- Adjacent industries affected by spillover
- Financial institutions and analysts
- International comparables and competitors

Target total: 200-300 specific named stakeholders across all categories.
Prefer real named entities over generic types. Return ONLY the markdown
document, no preamble.
"""


def expand_requirement(
    requirement: str,
    extra_context: Optional[str] = None,
    *,
    temperature: float = 0.4,
    max_tokens: int = 8000,
) -> str:
    """
    Ask the LLM to produce a rich stakeholder map markdown document.

    Args:
        requirement: The user's prediction brief (required).
        extra_context: Optional additional context (e.g. an uploaded doc's
                       text) to steer the expansion.
        temperature: LLM sampling temperature. Moderate temp = some
                     creativity for enumerating stakeholders without going
                     wild.
        max_tokens: Upper bound on output tokens. 8000 ≈ 2500-3500 words.

    Returns:
        A markdown document ready to hand off to Stage 1 (ontology).
    """
    ctx_section = ""
    if extra_context and extra_context.strip():
        trimmed = extra_context.strip()[:6000]
        ctx_section = f"# Additional context provided by the user\n\n{trimmed}\n"

    user_prompt = USER_PROMPT_TEMPLATE.format(
        requirement=requirement.strip(),
        context_section=ctx_section,
    )

    client = LLMClient()
    logger.info(
        f"expanding stakeholder map for requirement ({len(requirement)} chars, "
        f"{len(extra_context or '')} chars context)"
    )
    reply = client.chat(
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        temperature=temperature,
        max_tokens=max_tokens,
    )
    logger.info(f"stakeholder expansion produced {len(reply)} chars")
    return reply


def expand_in_batches(
    requirement: str,
    extra_context: Optional[str] = None,
    *,
    batches: int = 5,
) -> str:
    """
    Alternative path for callers who want a larger stakeholder list than
    one LLM call can produce. Runs `batches` expansions, each asking the
    LLM to focus on a different axis (geography, industries, media, etc.)
    and concatenates the results.

    Currently unused by pipeline_runner (single-call expansion is plenty
    for a 30-round demo). Exposed for future use.
    """
    axes = [
        "government, regulators, and infrastructure operators",
        "major private companies in the most directly affected industries",
        "media outlets, booking platforms, and social networks",
        "demographic and consumer segments, including specific countries",
        "adjacent industries, financial institutions, and comparables",
    ]
    parts = []
    for i in range(min(batches, len(axes))):
        axis = axes[i]
        user_msg = (
            f"Focus specifically on stakeholders in this category: {axis}.\n\n"
            f"Scenario: {requirement}\n\n"
            "Return a markdown section with 30-50 specific named stakeholders "
            "following the same bullet format as before."
        )
        client = LLMClient()
        part = client.chat(
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_msg},
            ],
            temperature=0.5,
            max_tokens=4000,
        )
        parts.append(f"## Batch {i + 1}: {axis.title()}\n\n{part}")
    return "\n\n".join(parts)
