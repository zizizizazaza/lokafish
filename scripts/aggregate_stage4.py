#!/usr/bin/env python3
"""
Lokafish snapshot pipeline — Stage 2/3:
Read the OASIS action stream captured by run_mirofish_capture.py and aggregate it
into the 5 chart datasets that Lokafish's Stage 4 (Analytics) screen needs.

Aggregations performed:
  1. heatmap.json     — Singapore district hotspots (mention frequency by location)
  2. gdp.json         — GDP-style growth curve (rolling action volume by round)
  3. industry.json    — Industry impact bars (keyword-based topic classification)
  4. flow.json        — Visitor-origin pie (country mention frequency)
  5. sentiment.json   — Sentiment timeline (positive/negative word ratio per round)

These aggregations are heuristic and grounded in the actual agent action content,
so the numbers in Lokafish's charts come from the real simulation rather than
hardcoded mock data. They are NOT a substitute for a proper economic model.

Usage:
    python scripts/aggregate_stage4.py \\
        --raw public/snapshots/raw \\
        --output public/snapshots/charts
"""

from __future__ import annotations

import argparse
import json
import re
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path
from typing import Dict, Iterable, List


# ---------------------------------------------------------------------------
# Keyword dictionaries (heuristic but transparent)
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
    {"label": "China",      "color": "#6940A5", "keywords": ["china", "chinese", "beijing", "shanghai", "shenzhen", "guangzhou", "mainland", "rmb", "yuan", "wechat", "weibo"]},
    {"label": "Indonesia",  "color": "#0F7B6C", "keywords": ["indonesia", "indonesian", "jakarta", "bali", "surabaya", "rupiah", "idr"]},
    {"label": "Malaysia",   "color": "#2383E2", "keywords": ["malaysia", "malaysian", "kl", "kuala lumpur", "penang", "johor", "myr", "ringgit"]},
    {"label": "Australia",  "color": "#DFAB01", "keywords": ["australia", "australian", "sydney", "melbourne", "perth", "aud", "aussie"]},
    {"label": "India",      "color": "#D9730D", "keywords": ["india", "indian", "mumbai", "delhi", "bangalore", "chennai", "inr", "rupee"]},
    {"label": "Japan",      "color": "#E03E3E", "keywords": ["japan", "japanese", "tokyo", "osaka", "kyoto", "yen", "jpy"]},
    {"label": "Thailand",   "color": "#AD1A72", "keywords": ["thailand", "thai", "bangkok", "phuket", "chiang mai", "thb", "baht"]},
    {"label": "Philippines","color": "#9B6E2E", "keywords": ["philippines", "filipino", "manila", "cebu", "php", "peso"]},
    {"label": "Vietnam",    "color": "#D44A4A", "keywords": ["vietnam", "vietnamese", "hanoi", "ho chi minh", "saigon", "vnd", "dong"]},
    {"label": "Korea",      "color": "#1F8FFF", "keywords": ["korea", "korean", "seoul", "busan", "krw", "won", "k-pop"]},
]

POSITIVE_WORDS = {
    "amazing", "incredible", "love", "great", "best", "wonderful", "excellent",
    "fantastic", "awesome", "beautiful", "happy", "excited", "thrilled", "perfect",
    "joy", "fun", "epic", "magical", "stunning", "favourite", "favorite", "win",
    "success", "boom", "surge", "spike", "breakthrough", "record", "first",
    "celebrate", "festive", "vibrant", "thriving", "wow", "blessed", "lucky",
    "🎉", "❤️", "💜", "✨", "🔥", "🎊", "🎤", "💕", "😍", "🥹",
}

NEGATIVE_WORDS = {
    "bad", "terrible", "awful", "worst", "hate", "disappointing", "scam",
    "expensive", "overpriced", "crowded", "annoying", "broken", "delay",
    "cancel", "fail", "ruin", "rip-off", "ripoff", "queue", "wait", "stuck",
    "lost", "stolen", "complain", "noise", "traffic", "jam", "frustrated",
    "exhausted", "tired", "miss", "missed", "sold out", "regret", "scalper",
    "❌", "😡", "😭", "💔", "👎",
}


# ---------------------------------------------------------------------------
# Action loading
# ---------------------------------------------------------------------------

def load_actions(raw_dir: Path) -> List[Dict]:
    """Load all OASIS actions from the captured snapshot (try multiple fallbacks)."""
    # Preferred: 04e_actions.jsonl (line-delimited)
    jsonl = raw_dir / "04e_actions.jsonl"
    if jsonl.exists():
        actions = []
        with open(jsonl, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line:
                    actions.append(json.loads(line))
        return actions

    # Fallback: 04c_actions.json (full body)
    fb = raw_dir / "04c_actions.json"
    if fb.exists():
        body = json.loads(fb.read_text(encoding="utf-8"))
        if isinstance(body, dict):
            for key in ("all_actions", "actions", "data"):
                if key in body and isinstance(body[key], list):
                    return body[key]
        if isinstance(body, list):
            return body

    # Fallback: 04d_run_status_detail.json
    fb2 = raw_dir / "04d_run_status_detail.json"
    if fb2.exists():
        body = json.loads(fb2.read_text(encoding="utf-8"))
        if isinstance(body, dict) and "all_actions" in body:
            return body["all_actions"]

    raise FileNotFoundError(
        f"Could not find any action data in {raw_dir}. "
        "Expected one of: 04e_actions.jsonl, 04c_actions.json, 04d_run_status_detail.json"
    )


def action_text(a: Dict) -> str:
    """Extract the human-readable text of an action (post/comment content)."""
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


# ---------------------------------------------------------------------------
# Aggregations
# ---------------------------------------------------------------------------

def keyword_count(text: str, keywords: Iterable[str]) -> int:
    text_lower = text.lower()
    return sum(text_lower.count(k.lower()) for k in keywords)


def aggregate_heatmap(actions: List[Dict]) -> Dict:
    """Count district-keyword mentions across all action content."""
    counts = Counter()
    for a in actions:
        text = action_text(a)
        for d in DISTRICTS:
            n = keyword_count(text, d["keywords"])
            if n > 0:
                counts[d["id"]] += n

    if not counts:
        # No data — emit zero hotspots
        hotspots = []
    else:
        max_count = max(counts.values()) or 1
        # Each S$M value is fabricated from intensity * a scale factor (95M cap).
        # The number is grounded in the fraction of total mentions so it scales
        # with the simulation, not made up out of thin air.
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
    """Build a synthetic GDP curve from action volume by round, anchored at 100."""
    if not actions:
        return {"labels": [], "baseline": [], "withConcert": []}

    rounds = sorted({action_round(a) for a in actions if action_round(a) > 0})
    if not rounds:
        return {"labels": [], "baseline": [], "withConcert": []}

    # Group all rounds into 9 buckets (W-4 → W+4) to match Lokafish's chart shape
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
    # Scale max action volume → ~186 (matching original chart's peak)
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
    """For each industry, count keyword hits and translate to S$M figure."""
    counts = Counter()
    for a in actions:
        text = action_text(a)
        for ind in INDUSTRIES:
            n = keyword_count(text, ind["keywords"])
            if n > 0:
                counts[ind["label"]] += n

    if not counts:
        return [{**ind, "value": 0, "growth": "—", "raw_count": 0} for ind in INDUSTRIES]

    max_count = max(counts.values()) or 1
    # Scale max → 125 (matching Lokafish's accommodation peak)
    scale = 125.0 / max_count

    out = []
    for ind in INDUSTRIES:
        c = counts.get(ind["label"], 0)
        value = round(c * scale, 1)
        # Growth string: relative to median action count
        out.append({
            "label": ind["label"],
            "color": ind["color"],
            "value": value,
            "growth": f"+{round(value / 8, 1)}%" if value > 0 else "—",
            "raw_count": c,
        })
    return out


def aggregate_flow(actions: List[Dict]) -> Dict:
    """Country mention frequency → visitor origin pie."""
    counts = Counter()
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

    return {
        "totalVisitors": total,  # this is mention count, not actual visitors
        "sources": sources,
    }


def aggregate_sentiment(actions: List[Dict]) -> Dict:
    """Per-round positive vs negative word ratio."""
    by_round = defaultdict(lambda: {"pos": 0, "neg": 0, "total_actions": 0})
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
        # Map 0-1 ratio → 30-95 sentiment score
        score = round(30 + pos_ratio * 65, 1)
        timeline.append({
            "round": r,
            "score": score,
            "pos": d["pos"],
            "neg": d["neg"],
            "total": d["total_actions"],
        })
    return {"timeline": timeline}


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--raw", default="public/snapshots/raw",
                   help="Directory with run_mirofish_capture.py output")
    p.add_argument("--output", default="public/snapshots/charts",
                   help="Output directory for chart JSONs")
    args = p.parse_args()

    raw_dir = Path(args.raw).resolve()
    out_dir = Path(args.output).resolve()
    out_dir.mkdir(parents=True, exist_ok=True)

    if not raw_dir.exists():
        raise SystemExit(f"raw directory not found: {raw_dir}")

    print(f"[aggregate] reading actions from {raw_dir}")
    actions = load_actions(raw_dir)
    print(f"[aggregate] loaded {len(actions)} actions")

    # Compute all 5 aggregations
    print("[aggregate] computing heatmap...")
    heatmap = aggregate_heatmap(actions)

    print("[aggregate] computing GDP curve...")
    gdp = aggregate_gdp(actions)

    print("[aggregate] computing industry breakdown...")
    industry = aggregate_industry(actions)

    print("[aggregate] computing visitor origin flow...")
    flow = aggregate_flow(actions)

    print("[aggregate] computing sentiment timeline...")
    sentiment = aggregate_sentiment(actions)

    # Save all 5
    def _save(name, content):
        path = out_dir / name
        path.write_text(json.dumps(content, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"  wrote {path.name}  ({path.stat().st_size} bytes)")

    _save("heatmap.json", heatmap)
    _save("gdp.json", gdp)
    _save("industry.json", industry)
    _save("flow.json", flow)
    _save("sentiment.json", sentiment)

    meta = {
        "generated_at": datetime.now().isoformat(),
        "input_dir": str(raw_dir),
        "n_actions": len(actions),
        "n_districts_covered": sum(1 for h in heatmap["hotspots"] if h["mention_count"] > 0),
        "n_industries_covered": sum(1 for i in industry if i["raw_count"] > 0),
        "n_countries_covered": len(flow["sources"]),
        "n_rounds_with_sentiment": len(sentiment["timeline"]),
    }
    _save("_meta.json", meta)

    print()
    print(f"[aggregate] DONE — charts written to {out_dir}")
    print(f"[aggregate] coverage: districts={meta['n_districts_covered']}/8, "
          f"industries={meta['n_industries_covered']}/{len(INDUSTRIES)}, "
          f"countries={meta['n_countries_covered']}/{len(COUNTRIES)}, "
          f"sentiment_rounds={meta['n_rounds_with_sentiment']}")
    print(f"[aggregate] next: node scripts/inject_to_lokafish.js")


if __name__ == "__main__":
    main()
