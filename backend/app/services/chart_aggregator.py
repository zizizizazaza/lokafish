"""
Chart data aggregator — turns raw OASIS action streams into the 5 chart
datasets that the Loka analytics screen expects.

This is a pure-function port of scripts/aggregate_stage4.py so the same
logic can be reused at request time inside /api/project/<id>/data without
shelling out to the standalone CLI.

The aggregations are heuristic and grounded in real action content
(keyword counts) — they're not a substitute for a proper economic model,
but they give every chart a number that comes from the actual simulation.
"""

from __future__ import annotations

from collections import Counter, defaultdict
from typing import Any, Dict, Iterable, List


# ---------------------------------------------------------------------------
# Keyword dictionaries — same as aggregate_stage4.py
# ---------------------------------------------------------------------------

DISTRICTS = [
    {"id": "marina_bay",   "label": "Marina Bay",       "keywords": ["marina bay", "marina-bay", "mbs", "marina bay sands", "esplanade"], "x": 0.35, "y": 0.42},
    {"id": "orchard",      "label": "Orchard Road",     "keywords": ["orchard", "ion orchard", "wisma", "paragon", "scotts road"],         "x": 0.28, "y": 0.35},
    {"id": "changi",       "label": "Changi Airport",   "keywords": ["changi", "airport", "jewel changi", "terminal"],                     "x": 0.52, "y": 0.28},
    {"id": "clarke_quay",  "label": "Clarke Quay",      "keywords": ["clarke quay", "boat quay", "robertson quay", "river"],               "x": 0.33, "y": 0.53},
    {"id": "sentosa",      "label": "Sentosa/USS",      "keywords": ["sentosa", "uss", "universal studios", "rwss", "harbourfront"],       "x": 0.22, "y": 0.58},
    {"id": "stadium",      "label": "Nat. Stadium",     "keywords": ["national stadium", "kallang", "sports hub", "stadium", "indoor stadium"], "x": 0.42, "y": 0.48},
    {"id": "harbourfront", "label": "Harbourfront",     "keywords": ["vivocity", "harbourfront", "telok blangah"],                         "x": 0.30, "y": 0.65},
    {"id": "gardens",      "label": "Gardens by Bay",   "keywords": ["gardens by the bay", "gardens by bay", "supertree", "flower dome"],  "x": 0.40, "y": 0.32},
]

INDUSTRIES = [
    {"label": "Accommodation", "color": "#0F7B6C", "keywords": ["hotel", "room", "occupancy", "accommodation", "stay", "booking", "marriott", "hilton", "shangri", "mbs", "marina bay sands", "airbnb", "hostel", "adr", "revpar", "suite"]},
    {"label": "Aviation",      "color": "#2383E2", "keywords": ["flight", "fly", "flying", "airline", "airport", "changi", "sia", "singapore airlines", "airasia", "scoot", "boeing", "airbus", "pax", "passenger"]},
    {"label": "F&B",           "color": "#D9730D", "keywords": ["food", "restaurant", "cafe", "bar", "menu", "dining", "hawker", "chef", "meal", "lunch", "dinner", "breakfast", "drink", "cocktail", "coffee"]},
    {"label": "Attractions",   "color": "#6940A5", "keywords": ["uss", "universal studios", "tourist", "attraction", "museum", "zoo", "garden", "sentosa", "ride", "park", "ticket"]},
    {"label": "Transport",     "color": "#2383E2", "keywords": ["mrt", "grab", "taxi", "bus", "ride", "shuttle", "transport", "smrt", "uber"]},
    {"label": "Retail",        "color": "#E03E3E", "keywords": ["shop", "store", "buy", "purchase", "merch", "merchandise", "mall", "retail", "boutique", "klook", "souvenir"]},
    {"label": "Media/Content", "color": "#AD1A72", "keywords": ["post", "video", "vlog", "tiktok", "instagram", "twitter", "youtube", "stream", "content", "viewer", "view", "follower", "media", "press"]},
]

COUNTRIES = [
    {"label": "China",       "color": "#6940A5", "keywords": ["china", "chinese", "beijing", "shanghai", "shenzhen", "guangzhou", "mainland", "rmb", "yuan", "wechat", "weibo"]},
    {"label": "Indonesia",   "color": "#0F7B6C", "keywords": ["indonesia", "indonesian", "jakarta", "bali", "surabaya", "rupiah", "idr"]},
    {"label": "Malaysia",    "color": "#2383E2", "keywords": ["malaysia", "malaysian", "kl", "kuala lumpur", "penang", "johor", "myr", "ringgit"]},
    {"label": "Australia",   "color": "#DFAB01", "keywords": ["australia", "australian", "sydney", "melbourne", "perth", "aud", "aussie"]},
    {"label": "India",       "color": "#D9730D", "keywords": ["india", "indian", "mumbai", "delhi", "bangalore", "chennai", "inr", "rupee"]},
    {"label": "Japan",       "color": "#E03E3E", "keywords": ["japan", "japanese", "tokyo", "osaka", "kyoto", "yen", "jpy"]},
    {"label": "Thailand",    "color": "#AD1A72", "keywords": ["thailand", "thai", "bangkok", "phuket", "chiang mai", "thb", "baht"]},
    {"label": "Philippines", "color": "#9B6E2E", "keywords": ["philippines", "filipino", "manila", "cebu", "php", "peso"]},
    {"label": "Vietnam",     "color": "#D44A4A", "keywords": ["vietnam", "vietnamese", "hanoi", "ho chi minh", "saigon", "vnd", "dong"]},
    {"label": "Korea",       "color": "#1F8FFF", "keywords": ["korea", "korean", "seoul", "busan", "krw", "won", "k-pop"]},
]

POSITIVE_WORDS = {
    "amazing", "incredible", "love", "great", "best", "wonderful", "excellent",
    "fantastic", "awesome", "beautiful", "happy", "excited", "thrilled", "perfect",
    "joy", "fun", "epic", "magical", "stunning", "favourite", "favorite", "win",
    "success", "boom", "surge", "spike", "breakthrough", "record", "first",
    "celebrate", "festive", "vibrant", "thriving", "wow", "blessed", "lucky",
}

NEGATIVE_WORDS = {
    "bad", "terrible", "awful", "worst", "hate", "disappointing", "scam",
    "expensive", "overpriced", "crowded", "annoying", "broken", "delay",
    "cancel", "fail", "ruin", "rip-off", "ripoff", "queue", "wait", "stuck",
    "lost", "stolen", "complain", "noise", "traffic", "jam", "frustrated",
    "exhausted", "tired", "miss", "missed", "sold out", "regret", "scalper",
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def action_text(a: Dict) -> str:
    args = a.get("action_args") or a.get("args") or {}
    if isinstance(args, dict):
        for key in ("content", "text", "post_content", "message", "body"):
            if key in args and args[key]:
                return str(args[key])
    if isinstance(args, str):
        return args
    return a.get("content", "") or a.get("text", "") or ""


def action_round(a: Dict) -> int:
    return int(a.get("round_num") or a.get("round") or 0)


def keyword_count(text: str, keywords: Iterable[str]) -> int:
    text_lower = text.lower()
    return sum(text_lower.count(k.lower()) for k in keywords)


# ---------------------------------------------------------------------------
# Aggregations
# ---------------------------------------------------------------------------

def aggregate_heatmap(actions: List[Dict]) -> Dict:
    counts: Counter = Counter()
    for a in actions:
        text = action_text(a)
        for d in DISTRICTS:
            n = keyword_count(text, d["keywords"])
            if n > 0:
                counts[d["id"]] += n

    if not counts:
        hotspots = []
    else:
        max_count = max(counts.values()) or 1
        scale = 95.0
        hotspots = []
        for d in DISTRICTS:
            n = counts.get(d["id"], 0)
            intensity = round(n / max_count, 3) if n else 0.0
            value_m = round(intensity * scale, 1)
            hotspots.append({
                "x": d["x"], "y": d["y"],
                "label": d["label"],
                "value": f"S${value_m:.0f}M" if value_m else "—",
                "intensity": max(intensity, 0.05) if n else 0.0,
                "mention_count": n,
            })
    return {"hotspots": hotspots, "total_mentions": int(sum(counts.values()))}


def aggregate_gdp(actions: List[Dict]) -> Dict:
    if not actions:
        return {"labels": [], "baseline": [], "withConcert": []}

    rounds = sorted({action_round(a) for a in actions if action_round(a) > 0})
    if not rounds:
        return {"labels": [], "baseline": [], "withConcert": []}

    n_buckets = 9
    bucket_size = max(1, len(rounds) / n_buckets)
    buckets: List[List[int]] = [[] for _ in range(n_buckets)]
    for i, r in enumerate(rounds):
        idx = min(int(i / bucket_size), n_buckets - 1)
        buckets[idx].append(r)

    counts_per_bucket = []
    for bucket in buckets:
        c = sum(1 for a in actions if action_round(a) in bucket) if bucket else 0
        counts_per_bucket.append(c)

    if not any(counts_per_bucket):
        return {"labels": [], "baseline": [], "withConcert": []}

    baseline_val = max(min(counts_per_bucket) * 0.6, 1)
    max_count = max(counts_per_bucket) or 1
    scale = 186.0 / max_count

    labels = ["W-4", "W-3", "W-2", "W-1", "Concert", "W+1", "W+2", "W+3", "W+4"]
    with_concert = [round(100 + (c - baseline_val) * scale * 0.55, 1) for c in counts_per_bucket]
    baseline = [round(100 + i * 0.5, 1) for i in range(n_buckets)]

    return {
        "labels": labels,
        "baseline": baseline,
        "withConcert": with_concert,
        "raw_counts_per_bucket": counts_per_bucket,
    }


def aggregate_industry(actions: List[Dict]) -> List[Dict]:
    counts: Counter = Counter()
    for a in actions:
        text = action_text(a)
        for ind in INDUSTRIES:
            n = keyword_count(text, ind["keywords"])
            if n > 0:
                counts[ind["label"]] += n

    if not counts:
        return [{"label": ind["label"], "color": ind["color"], "value": 0,
                 "growth": "—", "raw_count": 0} for ind in INDUSTRIES]

    max_count = max(counts.values()) or 1
    scale = 125.0 / max_count

    out = []
    for ind in INDUSTRIES:
        c = counts.get(ind["label"], 0)
        value = round(c * scale, 1)
        out.append({
            "label": ind["label"],
            "color": ind["color"],
            "value": value,
            "growth": f"+{round(value / 8, 1)}%" if value > 0 else "—",
            "raw_count": c,
        })
    return out


def aggregate_flow(actions: List[Dict]) -> Dict:
    counts: Counter = Counter()
    for a in actions:
        text = action_text(a)
        for c in COUNTRIES:
            n = keyword_count(text, c["keywords"])
            if n > 0:
                counts[c["label"]] += n

    sources = []
    total = sum(counts.values())
    for c in COUNTRIES:
        n = counts.get(c["label"], 0)
        if n > 0:
            sources.append({
                "label": c["label"],
                "value": n,
                "color": c["color"],
                "raw_count": n,
            })
    sources.sort(key=lambda x: x["value"], reverse=True)

    if not sources:
        return {"totalVisitors": 0, "sources": []}

    return {"totalVisitors": total, "sources": sources}


def aggregate_sentiment(actions: List[Dict]) -> Dict:
    by_round: Dict[int, Dict[str, int]] = defaultdict(
        lambda: {"pos": 0, "neg": 0, "total_actions": 0}
    )
    for a in actions:
        r = action_round(a)
        if r <= 0:
            continue
        text = action_text(a).lower()
        if not text:
            continue
        by_round[r]["total_actions"] += 1
        for w in POSITIVE_WORDS:
            if w in text:
                by_round[r]["pos"] += 1
                break
        for w in NEGATIVE_WORDS:
            if w in text:
                by_round[r]["neg"] += 1
                break

    rounds_sorted = sorted(by_round.keys())
    timeline = []
    for r in rounds_sorted:
        d = by_round[r]
        denom = max(d["pos"] + d["neg"], 1)
        pos_ratio = d["pos"] / denom
        score = round(30 + pos_ratio * 65, 1)
        timeline.append({
            "round": r,
            "score": score,
            "pos": d["pos"],
            "neg": d["neg"],
            "total": d["total_actions"],
        })
    return {"timeline": timeline}


def aggregate_all(
    actions: List[Dict],
    custom_keywords: Dict[str, Any] = None,
) -> Dict[str, Any]:
    """
    Run all 5 aggregations and return them keyed by chart name.

    If `custom_keywords` is provided (from the scenario-specific LLM
    extraction in keyword_extractor.py), those dictionaries override the
    baked Singapore/Taylor defaults. Any category the custom dict leaves
    empty or absent falls back to the module-level defaults.
    """
    ck = custom_keywords or {}

    districts = ck.get("districts") or DISTRICTS
    industries = ck.get("industries") or INDUSTRIES
    countries = ck.get("countries") or COUNTRIES

    return {
        "heatmap": _aggregate_heatmap_with(actions, districts),
        "gdp": aggregate_gdp(actions),
        "industry": _aggregate_industry_with(actions, industries),
        "flow": _aggregate_flow_with(actions, countries),
        "sentiment": aggregate_sentiment(actions),
    }


# ---------------------------------------------------------------------------
# Parameterized variants — accept an external keyword dict so analytics
# charts can reflect the current scenario rather than the baked defaults.
# ---------------------------------------------------------------------------

def _aggregate_heatmap_with(actions: List[Dict], districts: List[Dict]) -> Dict:
    if not districts:
        # Scenario has no geographic dimension (e.g., macro finance) —
        # return an empty heatmap so the UI shows a clean empty state
        # rather than a Taylor-Swift-shaped Singapore map.
        return {"hotspots": [], "total_mentions": 0}

    counts: Counter = Counter()
    for a in actions:
        text = action_text(a)
        for d in districts:
            n = keyword_count(text, d.get("keywords") or [])
            if n > 0:
                counts[d["id"]] += n

    if not counts:
        hotspots = []
    else:
        max_count = max(counts.values()) or 1
        scale = 95.0
        hotspots = []
        for d in districts:
            n = counts.get(d["id"], 0)
            intensity = round(n / max_count, 3) if n else 0.0
            value_m = round(intensity * scale, 1)
            hotspots.append({
                "x": d.get("x", 0.5),
                "y": d.get("y", 0.5),
                "label": d["label"],
                "value": f"S${value_m:.0f}M" if value_m else "—",
                "intensity": max(intensity, 0.05) if n else 0.0,
                "mention_count": n,
            })
    return {"hotspots": hotspots, "total_mentions": int(sum(counts.values()))}


def _aggregate_industry_with(actions: List[Dict], industries: List[Dict]) -> List[Dict]:
    if not industries:
        return []

    counts: Counter = Counter()
    for a in actions:
        text = action_text(a)
        for ind in industries:
            n = keyword_count(text, ind.get("keywords") or [])
            if n > 0:
                counts[ind["label"]] += n

    if not counts:
        return [{"label": ind["label"], "color": ind.get("color", "#2383E2"),
                 "value": 0, "growth": "—", "raw_count": 0} for ind in industries]

    max_count = max(counts.values()) or 1
    scale = 125.0 / max_count

    out = []
    for ind in industries:
        c = counts.get(ind["label"], 0)
        value = round(c * scale, 1)
        out.append({
            "label": ind["label"],
            "color": ind.get("color", "#2383E2"),
            "value": value,
            "growth": f"+{round(value / 8, 1)}%" if value > 0 else "—",
            "raw_count": c,
        })
    return out


def _aggregate_flow_with(actions: List[Dict], countries: List[Dict]) -> Dict:
    if not countries:
        return {"totalVisitors": 0, "sources": []}

    counts: Counter = Counter()
    for a in actions:
        text = action_text(a)
        for c in countries:
            n = keyword_count(text, c.get("keywords") or [])
            if n > 0:
                counts[c["label"]] += n

    sources = []
    total = sum(counts.values())
    for c in countries:
        n = counts.get(c["label"], 0)
        if n > 0:
            sources.append({
                "label": c["label"],
                "value": n,
                "color": c.get("color", "#0F7B6C"),
                "raw_count": n,
            })
    sources.sort(key=lambda x: x["value"], reverse=True)

    if not sources:
        return {"totalVisitors": 0, "sources": []}

    return {"totalVisitors": total, "sources": sources}
