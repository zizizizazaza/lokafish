"""
Data adapter — translates raw MiroFish snapshot dicts into the shapes that
the Loka frontend screens expect.

This is the Python port of scripts/inject_to_lokafish.js. It runs at
request time inside /api/project/<id>/data so a freshly captured project
can be browsed through agents/simulation/analytics/report screens without
shelling out to the Node CLI to pre-bake src/data/*.js.
"""

from __future__ import annotations

import re
from typing import Any, Dict, List, Optional


COLORS = {
    "blue": "#2383E2",
    "green": "#0F7B6C",
    "orange": "#D9730D",
    "purple": "#6940A5",
    "red": "#E03E3E",
    "pink": "#AD1A72",
    "yellow": "#DFAB01",
    "brown": "#9B6E2E",
    "gray": "#9B9A97",
}

ENTITY_TYPES = {
    "Person": COLORS["red"],
    "Entity": COLORS["green"],
    "Company": COLORS["blue"],
    "GovAgency": COLORS["red"],
    "MediaOutlet": COLORS["purple"],
    "Location": COLORS["green"],
    "Concept": COLORS["orange"],
    "Event": COLORS["pink"],
}


# ---------------------------------------------------------------------------
# Small helpers
# ---------------------------------------------------------------------------

def _hex_to_rgba(hex_color: str, alpha: float) -> str:
    h = hex_color.lstrip("#")
    r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
    return f"rgba({r},{g},{b},{alpha})"


def _category_for_entity(labels: List[str]) -> Dict[str, Any]:
    lset = {(l or "").lower() for l in (labels or [])}
    if "person" in lset:
        return {"id": "people", "label": "People", "color": COLORS["blue"], "icon": "👥"}
    if lset & {"govagency", "government", "agency"}:
        return {"id": "govt", "label": "Government", "color": COLORS["red"], "icon": "🏛️"}
    if lset & {"company", "organization", "business"}:
        return {"id": "corp", "label": "Companies", "color": COLORS["orange"], "icon": "🏢"}
    if lset & {"mediaoutlet", "media"}:
        return {"id": "media", "label": "Media", "color": COLORS["purple"], "icon": "📰"}
    if "event" in lset:
        return {"id": "events", "label": "Events", "color": COLORS["pink"], "icon": "🎤"}
    if lset & {"location", "place"}:
        return {"id": "places", "label": "Places", "color": COLORS["green"], "icon": "📍"}
    return {"id": "concepts", "label": "Concepts", "color": COLORS["orange"], "icon": "◆"}


def _profiles_list(profiles: Optional[Any]) -> List[Dict]:
    if not profiles:
        return []
    if isinstance(profiles, list):
        return profiles
    if isinstance(profiles, dict):
        for key in ("profiles", "data"):
            if key in profiles and isinstance(profiles[key], list):
                return profiles[key]
    return []


def _profile_index(profiles: Optional[Any]) -> Dict[str, Dict]:
    """Build a lookup from id/uuid/name -> profile dict."""
    idx: Dict[str, Dict] = {}
    for p in _profiles_list(profiles):
        for key in ("user_id", "id", "uuid", "name"):
            v = p.get(key)
            if v:
                idx[str(v)] = p
    return idx


def _avatar_for(name: str) -> str:
    from urllib.parse import quote
    seed = quote(name or "agent")
    return f"https://api.dicebear.com/7.x/notionists/svg?seed={seed}"


# ---------------------------------------------------------------------------
# Agents screen
# ---------------------------------------------------------------------------

def build_agent_categories(entities: Optional[Dict],
                           profiles: Optional[Any]) -> List[Dict]:
    """
    Group entities by category (people/govt/corp/media/...) and join with
    profile data. Returns a list of bucket dicts matching what agents.js
    expects (id, label, color, icon, bgColor, count, agents[]).
    """
    pidx = _profile_index(profiles)

    ent_list = []
    if entities:
        ent_list = entities.get("entities") or entities.get("nodes") or []

    buckets: Dict[str, Dict] = {}
    for ent in ent_list:
        cat = _category_for_entity(ent.get("labels") or ent.get("label_list") or [])
        if cat["id"] not in buckets:
            buckets[cat["id"]] = {
                **cat,
                "agents": [],
                "count": 0,
                "bgColor": _hex_to_rgba(cat["color"], 0.08),
            }
        bucket = buckets[cat["id"]]
        ent_uuid = ent.get("uuid")
        ent_name = ent.get("name", "Unknown")
        profile = pidx.get(str(ent_uuid)) or pidx.get(ent_name) or {}

        persona_text = (
            profile.get("persona") or profile.get("bio") or ent.get("summary") or ""
        )
        traits = (
            profile.get("interested_topics") or profile.get("interests") or []
        )[:2]

        labels_first = (ent.get("labels") or [None])[0]
        bucket["agents"].append({
            "name": ent_name or profile.get("name") or "Unknown",
            "role": (
                profile.get("profession") or profile.get("role") or labels_first or "Entity"
            ),
            "avatar": _avatar_for(ent_name),
            "influence": (
                profile["influence"]
                if isinstance(profile.get("influence"), (int, float))
                else min(0.95, 0.4 + (len(ent_name) % 6) * 0.1)
            ),
            "traits": traits,
            "age": profile.get("age"),
            "income": profile.get("income") or "N/A",
            "personality": profile.get("personality"),
            "background": persona_text[:280] or ent.get("summary") or "",
            "decisionLogic": profile.get("decision_logic") or profile.get("persona") or "",
            "consumptionProfile": profile.get("consumption_profile") or "",
            "uuid": ent_uuid,
        })
        bucket["count"] = len(bucket["agents"])

    return list(buckets.values())


def build_behavior_chain(actions: Optional[List[Dict]]) -> List[Dict]:
    """Top action verbs by frequency, used to render the agents-screen behavior strip."""
    verbs: Dict[str, int] = {}
    for a in (actions or [])[:200]:
        t = a.get("action_type") or a.get("type") or a.get("action") or "ACT"
        verbs[t] = verbs.get(t, 0) + 1
    top = sorted(verbs.items(), key=lambda kv: -kv[1])[:5]
    return [
        {"label": label.replace("_", " "), "value": f"{count:,} actions"}
        for label, count in top
    ]


def build_kg_log_messages(requirement: str, ent_count: int, edge_count: int) -> List[str]:
    return [
        f"Loading scenario: {(requirement or 'unknown')[:60]}...",
        "Extracting entity types from document...",
        f"Built {ent_count} entities and {edge_count} relations",
        "Sampling personas from population database...",
        "Generating OASIS agent profiles via LLM...",
        "Compiling economic behavior chains...",
        "World construction complete",
    ]


def build_agents_payload(*, entities: Optional[Dict], graph_data: Optional[Dict],
                        profiles: Optional[Any], actions: Optional[List[Dict]],
                        requirement: str = "") -> Dict:
    categories = build_agent_categories(entities, profiles)
    behavior_chain = build_behavior_chain(actions)
    ent_count = len((entities or {}).get("entities") or [])
    edge_count = len(
        (graph_data or {}).get("edges") or (entities or {}).get("edges") or []
    )
    kg_log = build_kg_log_messages(requirement, ent_count, edge_count)
    return {
        "entityTypes": ENTITY_TYPES,
        "agentCategories": categories,
        "behaviorChain": behavior_chain,
        "kgLogMessages": kg_log,
        "graphData": graph_data,  # raw nodes+edges for D3 force graph
    }


# ---------------------------------------------------------------------------
# Simulation screen
# ---------------------------------------------------------------------------

POS_WORDS = ("great", "amazing", "love", "wonderful", "best", "fantastic", "excited")
NEG_WORDS = ("bad", "terrible", "worst", "hate", "awful", "disappointing")


def _detect_sentiment(text: str) -> str:
    t = (text or "").lower()
    if any(w in t for w in POS_WORDS):
        return "positive"
    if any(w in t for w in NEG_WORDS):
        return "negative"
    return "neutral"


def build_simulation_posts(actions: Optional[List[Dict]],
                          profiles: Optional[Any]) -> List[Dict]:
    pidx = _profile_index(profiles)

    posts = []
    seq = 0
    for a in actions or []:
        if len(posts) >= 14:
            break
        args = a.get("action_args") or a.get("args") or {}
        if isinstance(args, dict):
            text = args.get("content") or args.get("text") or ""
        else:
            text = ""
        text = text or a.get("content") or a.get("text") or ""
        if not text or len(text) < 30:
            continue

        round_num = a.get("round_num") or a.get("round") or 0
        agent_name = (
            a.get("agent_name")
            or (pidx.get(str(a.get("agent_id"))) or {}).get("name")
            or f"Agent {a.get('agent_id')}"
        )
        handle = (agent_name or "agent").lower().replace(" ", "_")
        posts.append({
            "avatar": _avatar_for(agent_name),
            "handle": agent_name,
            "username": f"@{handle}",
            "time": f"Round {round_num}",
            "text": text[:380],
            "likes": 100 + ((seq * 173) % 9000),
            "reposts": 20 + ((seq * 91) % 4000),
            "sentiment": _detect_sentiment(text),
        })
        seq += 1
    return posts


def build_metrics_timeline(actions: Optional[List[Dict]]) -> List[Dict]:
    """
    Per-round economic metrics as 80% confidence-interval RANGES, matching
    the shape that src/screens/simulation.js expects:
        {gdp: [low, high], jobs: [low, high], occupancy: [low, high], flights: [low, high]}

    The midpoint scales with action volume in that round; the spread is
    a fixed fraction of the midpoint to give visible CI bands.
    """
    by_round: Dict[int, int] = {}
    for a in actions or []:
        r = a.get("round_num") or a.get("round") or 0
        if not r:
            continue
        by_round[r] = by_round.get(r, 0) + 1

    if not by_round:
        return []
    rounds = sorted(by_round.keys())
    max_count = max(by_round.values()) or 1

    timeline = []
    for r in rounds:
        count = by_round[r]
        ratio = count / max_count if max_count else 0

        gdp_mid = 80 + ratio * 320
        jobs_mid = 2000 + ratio * 14000
        occ_mid = 75 + ratio * 18
        flights_mid = 175000 + ratio * 60000

        def band(mid: float, frac: float = 0.18) -> List[float]:
            spread = mid * frac
            return [round(mid - spread, 0), round(mid + spread, 0)]

        timeline.append({
            "round": r,
            "gdp": [int(b) for b in band(gdp_mid, 0.18)],
            "jobs": [int(b) for b in band(jobs_mid, 0.16)],
            "occupancy": [int(b) for b in band(occ_mid, 0.04)],
            "flights": [int(b) for b in band(flights_mid, 0.08)],
        })
    return timeline


def build_chat_responses(report_md: str) -> Dict[str, str]:
    """Turn the markdown report's H2 sections into a small set of canned
    chat answers, keyed by suggested question."""
    md = report_md or ""
    responses: Dict[str, str] = {}
    sections = re.split(r"^## ", md, flags=re.MULTILINE)[1:]
    labels = [
        "Summarize the key findings",
        "What are the main risks?",
        "Explain the methodology",
        "How does this compare to actuals?",
    ]
    for i in range(min(len(sections), len(labels))):
        block = sections[i]
        heading = block.split("\n", 1)[0].strip()
        body = "\n".join(block.split("\n")[1:]).strip()[:800]
        responses[labels[i]] = f"**{heading}**\n\n{body}"
    if not responses:
        responses["Summarize the key findings"] = (
            "Simulation complete. Detailed report available in Stage 5."
        )
    return responses


def build_simulation_payload(*, actions: Optional[List[Dict]],
                            profiles: Optional[Any],
                            report_md: str = "") -> Dict:
    posts = build_simulation_posts(actions, profiles)
    timeline = build_metrics_timeline(actions)
    chat = build_chat_responses(report_md)
    # Baseline matches the shape src/screens/simulation.js expects
    baseline = {"gdp": 0, "jobs": 0, "occupancy": 75, "flights": 175000}
    return {
        "simulationPosts": posts,
        "metricsTimeline": timeline,
        "metricsBaseline": baseline,
        "chatResponses": chat,
    }


# ---------------------------------------------------------------------------
# Report screen
# ---------------------------------------------------------------------------

def _md_inline(s: str) -> str:
    s = s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    s = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", s)
    s = re.sub(r"\*([^*]+)\*", r"<em>\1</em>", s)
    s = re.sub(r"`([^`]+)`", r"<code>\1</code>", s)
    return s


def md_body_to_html(md: str) -> str:
    """Minimal markdown → HTML for paragraphs, bold, italic, lists, tables."""
    if not md:
        return ""
    lines = md.split("\n")
    html_parts: List[str] = []
    in_list = False
    in_table = False
    table_rows: List[List[str]] = []

    def flush_list():
        nonlocal in_list
        if in_list:
            html_parts.append("</ul>")
            in_list = False

    def flush_table():
        nonlocal in_table, table_rows
        if not in_table:
            return
        if len(table_rows) >= 2:
            head = table_rows[0]
            body = table_rows[2:]  # skip separator row
            html_parts.append('<div class="report-data-table"><table><thead><tr>')
            for c in head:
                html_parts.append(f"<th>{_md_inline(c.strip())}</th>")
            html_parts.append("</tr></thead><tbody>")
            for row in body:
                html_parts.append("<tr>")
                for c in row:
                    html_parts.append(f"<td>{_md_inline(c.strip())}</td>")
                html_parts.append("</tr>")
            html_parts.append("</tbody></table></div>")
        in_table = False
        table_rows = []

    for raw in lines:
        line = raw.rstrip("\r")
        if re.match(r"^\|.*\|$", line):
            if not in_table:
                flush_list()
                in_table = True
                table_rows = []
            table_rows.append(line[1:-1].split("|"))
            continue
        elif in_table:
            flush_table()

        if line.startswith("- "):
            if not in_list:
                html_parts.append('<ul style="padding-left: 24px; margin: 10px 0;">')
                in_list = True
            html_parts.append(f"<li>{_md_inline(line[2:])}</li>")
            continue

        if not line.strip():
            flush_list()
            continue

        flush_list()
        html_parts.append(f"<p>{_md_inline(line)}</p>")

    flush_table()
    flush_list()
    return "".join(html_parts)


def md_to_sections(md: str) -> List[Dict]:
    if not md:
        return []
    sections = []
    splits = re.split(r"^## ", md, flags=re.MULTILINE)[1:]
    for i, block in enumerate(splits):
        heading = block.split("\n", 1)[0].strip()
        body_md = "\n".join(block.split("\n")[1:]).strip()
        # Strip leading number like "1. " from heading if present
        m = re.match(r"^(\d+(?:\.\d+)?)[.\s]+(.+)$", heading)
        if m:
            num, title = m.group(1), m.group(2)
        else:
            num, title = str(i + 1), heading
        sections.append({"num": num, "title": title, "body": md_body_to_html(body_md)})
    return sections


def extract_abstract(md: str) -> str:
    if not md:
        return ""
    m = re.match(r"(?:^#\s.+\n)?([\s\S]*?)(?=\n## |$)", md)
    return m.group(1).strip()[:1200] if m else ""


def extract_risks(md: str) -> List[str]:
    if not md:
        return []
    m = re.search(r"##\s*(?:Risks?|Limitations?|Discussion)[\s\S]*?(?=\n## |$)",
                  md, flags=re.IGNORECASE)
    if not m:
        return []
    block = m.group(0)
    risks = []
    for ln in block.split("\n"):
        if ln.strip().startswith("- "):
            risks.append(ln.strip()[2:][:240])
        if len(risks) >= 6:
            break
    return risks


def build_report_payload(*, report_md: str, requirement: str = "",
                        meta: Optional[Dict] = None) -> Dict:
    from datetime import datetime
    sections = md_to_sections(report_md)
    title = sections[0]["title"] if sections else "Loka Analysis Report"
    abstract = extract_abstract(report_md)
    return {
        "classification": "CONFIDENTIAL",
        "date": datetime.now().strftime("%B %d, %Y"),
        "model": "Multi-Agent Simulation × Quantitative Economic Analysis",
        "title": title,
        "subtitle": (requirement or "")[:140],
        "abstract": md_body_to_html(abstract),
        "sections": sections,
        "references": [
            f"Captured from MiroFish backend on {(meta or {}).get('captured_at', 'unknown')}",
            f"Simulation ID: {(meta or {}).get('simulation_id', 'unknown')}",
            f"Project ID: {(meta or {}).get('project_id', 'unknown')}",
        ],
        "risks": extract_risks(report_md),
    }
