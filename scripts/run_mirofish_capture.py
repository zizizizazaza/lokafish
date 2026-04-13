#!/usr/bin/env python3
"""
Lokafish snapshot pipeline — Stage 1/3:
Drive a real MiroFish backend through the full pipeline (ontology → graph → prepare →
run → report) and capture every response to disk so Lokafish can replay it offline
at demo time.

Usage (on Linux, with MiroFish backend running on :5001):

    python scripts/run_mirofish_capture.py \\
        --doc ./scripts/sample_doc.md \\
        --requirement "Predict the economic impact of Taylor Swift's Eras Tour..." \\
        --backend http://localhost:5001 \\
        --output public/snapshots/raw \\
        --max-rounds 80 \\
        --poll-interval 3

This is the slowest step in the whole pipeline (25-90 minutes depending on LLM speed
and OASIS round count). Run it once per scenario, then commit the snapshot files.

After this completes, run:
    python scripts/aggregate_stage4.py   # produces chart data
    node   scripts/inject_to_lokafish.js # rewrites src/data/*.js
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Optional

try:
    import requests
except ImportError:
    print("ERROR: requests is required. Install with: pip install requests")
    sys.exit(1)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

class CaptureSession:
    def __init__(self, backend: str, output_dir: Path, poll_interval: float = 3.0):
        self.backend = backend.rstrip("/")
        self.output_dir = output_dir
        self.poll_interval = poll_interval
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.timeline: list[Dict] = []  # records of every API call

    def _log(self, label: str, payload: Optional[Dict] = None) -> None:
        ts = datetime.now().strftime("%H:%M:%S")
        msg = f"[{ts}] {label}"
        if payload:
            msg += f"  {json.dumps(payload, ensure_ascii=False)[:120]}"
        print(msg, flush=True)
        self.timeline.append({
            "ts": datetime.now().isoformat(),
            "label": label,
            "payload": payload,
        })

    def _save(self, filename: str, content: Any) -> Path:
        path = self.output_dir / filename
        path.parent.mkdir(parents=True, exist_ok=True)
        if isinstance(content, (dict, list)):
            path.write_text(json.dumps(content, ensure_ascii=False, indent=2), encoding="utf-8")
        else:
            path.write_text(str(content), encoding="utf-8")
        self._log(f"saved {filename}", {"size_kb": round(path.stat().st_size / 1024, 1)})
        return path

    def get(self, route: str, **kwargs) -> Dict:
        url = f"{self.backend}{route}"
        r = requests.get(url, **kwargs)
        r.raise_for_status()
        return r.json()

    def post(self, route: str, **kwargs) -> Dict:
        url = f"{self.backend}{route}"
        r = requests.post(url, **kwargs)
        r.raise_for_status()
        return r.json()

    def post_json(self, route: str, body: Dict) -> Dict:
        return self.post(route, json=body, timeout=120)


# ---------------------------------------------------------------------------
# Pipeline steps
# ---------------------------------------------------------------------------

def step_ontology(sess: CaptureSession, doc_path: Path, requirement: str,
                  project_name: str) -> Dict:
    """POST /api/graph/ontology/generate with file upload."""
    sess._log(f"STEP 1/5 — generating ontology from {doc_path.name}")
    with open(doc_path, "rb") as f:
        files = {"files": (doc_path.name, f, "application/octet-stream")}
        data = {
            "simulation_requirement": requirement,
            "project_name": project_name,
        }
        r = requests.post(
            f"{sess.backend}/api/graph/ontology/generate",
            files=files, data=data, timeout=600,
        )
    r.raise_for_status()
    body = r.json()
    if not body.get("success"):
        raise RuntimeError(f"ontology generation failed: {body}")
    sess._save("00_ontology.json", body["data"])
    return body["data"]


def step_build_graph(sess: CaptureSession, project_id: str) -> Dict:
    """POST /api/graph/build then poll /api/graph/task/<id> until done."""
    sess._log("STEP 2/5 — building Zep knowledge graph")
    body = sess.post_json("/api/graph/build", {"project_id": project_id})
    if not body.get("success"):
        raise RuntimeError(f"build failed: {body}")
    task_id = body["data"]["task_id"]
    sess._log(f"build task started: {task_id}")

    last_progress = -1
    final_task = None
    while True:
        task = sess.get(f"/api/graph/task/{task_id}")
        td = task["data"]
        status = td.get("status")
        progress = td.get("progress", 0)
        if progress != last_progress:
            sess._log(f"  build progress: {progress}% — {td.get('message', '')}")
            last_progress = progress
        if status == "completed":
            final_task = td
            break
        if status == "failed":
            raise RuntimeError(f"build task failed: {td}")
        time.sleep(sess.poll_interval)

    sess._save("01_graph_build_task.json", final_task)
    # Pull project record to get the resolved graph_id
    proj = sess.get(f"/api/graph/project/{project_id}")
    sess._save("01b_project.json", proj["data"])
    graph_id = proj["data"].get("graph_id")
    if not graph_id:
        raise RuntimeError("project has no graph_id after build")
    return {"task": final_task, "graph_id": graph_id, "project": proj["data"]}


def step_fetch_entities(sess: CaptureSession, graph_id: str) -> Dict:
    """GET /api/simulation/entities/<graph_id> (filtered + edge-enriched)."""
    sess._log("STEP 3/5 — fetching entities from Zep graph")
    body = sess.get(f"/api/simulation/entities/{graph_id}", params={"enrich": "true"})
    if not body.get("success"):
        raise RuntimeError(f"entities fetch failed: {body}")
    sess._save("02_entities.json", body["data"])
    # Also fetch full graph data (nodes + edges)
    try:
        graph_body = sess.get(f"/api/graph/data/{graph_id}")
        if graph_body.get("success"):
            sess._save("02b_graph_data.json", graph_body["data"])
    except Exception as e:
        sess._log(f"  (optional) graph_data fetch failed: {e}")
    return body["data"]


def step_create_and_prepare(sess: CaptureSession, project_id: str,
                            graph_id: str) -> Dict:
    """POST /api/simulation/create then /api/simulation/prepare, polling status."""
    sess._log("STEP 4/5 — creating + preparing simulation")
    create = sess.post_json("/api/simulation/create", {
        "project_id": project_id,
        "graph_id": graph_id,
        "enable_twitter": True,
        "enable_reddit": True,
    })
    if not create.get("success"):
        raise RuntimeError(f"sim create failed: {create}")
    sim_id = create["data"]["simulation_id"]
    sess._log(f"  simulation created: {sim_id}")
    sess._save("03a_create.json", create["data"])

    prep = sess.post_json("/api/simulation/prepare", {
        "simulation_id": sim_id,
        "use_llm_for_profiles": True,
        "parallel_profile_count": 5,
    })
    if not prep.get("success"):
        raise RuntimeError(f"prepare failed: {prep}")
    pd = prep["data"]
    sess._save("03b_prepare_kickoff.json", pd)

    # If already prepared, we're done
    if pd.get("already_prepared") or pd.get("status") == "ready":
        sess._log("  prepare: already ready")
    else:
        # Poll
        last_progress = -1
        while True:
            status = sess.post_json("/api/simulation/prepare/status",
                                    {"simulation_id": sim_id})
            sd = status["data"]
            p = sd.get("progress", 0)
            if p != last_progress:
                sess._log(f"  prepare progress: {p}% — {sd.get('message', '')}")
                last_progress = p
            if sd.get("status") in ("ready", "completed"):
                sess._save("03c_prepare_final.json", sd)
                break
            if sd.get("status") in ("failed", "error"):
                raise RuntimeError(f"prepare failed: {sd}")
            time.sleep(sess.poll_interval)

    # Pull profiles
    try:
        profiles = sess.get(f"/api/simulation/{sim_id}/profiles")
        if profiles.get("success"):
            sess._save("03d_profiles.json", profiles["data"])
    except Exception as e:
        sess._log(f"  (optional) profiles fetch failed: {e}")
    # Pull config
    try:
        config = sess.get(f"/api/simulation/{sim_id}/config")
        if config.get("success"):
            sess._save("03e_sim_config.json", config["data"])
    except Exception as e:
        sess._log(f"  (optional) config fetch failed: {e}")

    return {"simulation_id": sim_id}


def step_run_simulation(sess: CaptureSession, sim_id: str,
                        max_rounds: Optional[int] = None) -> Dict:
    """POST /api/simulation/start then poll /run-status until completed."""
    sess._log("STEP 5/5 — running OASIS swarm simulation (this is the slow one)")
    payload = {"simulation_id": sim_id, "platform": "parallel"}
    if max_rounds:
        payload["max_rounds"] = max_rounds
    body = sess.post_json("/api/simulation/start", payload)
    if not body.get("success"):
        raise RuntimeError(f"start failed: {body}")
    sess._save("04a_start.json", body["data"])

    # Poll run-status until completed
    last_round = -1
    while True:
        status = sess.get(f"/api/simulation/{sim_id}/run-status")
        sd = status["data"]
        runner = sd.get("runner_status", "idle")
        cur = sd.get("current_round", 0)
        tot = sd.get("total_rounds", 0)
        if cur != last_round:
            t_n = sd.get("twitter_actions_count", 0)
            r_n = sd.get("reddit_actions_count", 0)
            sess._log(f"  round {cur}/{tot} — twitter={t_n} reddit={r_n} status={runner}")
            last_round = cur
        if runner in ("completed", "stopped", "finished"):
            sess._save("04b_run_status_final.json", sd)
            break
        if runner == "error":
            raise RuntimeError(f"runner error: {sd}")
        time.sleep(sess.poll_interval)

    # Pull the full action stream
    try:
        actions = sess.get(f"/api/simulation/{sim_id}/actions",
                           params={"limit": 10000})
        if actions.get("success"):
            sess._save("04c_actions.json", actions["data"])
    except Exception as e:
        sess._log(f"  actions fetch failed: {e}")

    # Also try to copy the raw actions.jsonl from disk if accessible
    try:
        detail = sess.get(f"/api/simulation/{sim_id}/run-status/detail")
        if detail.get("success"):
            sess._save("04d_run_status_detail.json", detail["data"])
            # Convert all_actions to JSONL for easier downstream processing
            all_actions = detail["data"].get("all_actions", [])
            jsonl_path = sess.output_dir / "04e_actions.jsonl"
            with open(jsonl_path, "w", encoding="utf-8") as f:
                for a in all_actions:
                    f.write(json.dumps(a, ensure_ascii=False) + "\n")
            sess._log(f"saved 04e_actions.jsonl ({len(all_actions)} actions)")
    except Exception as e:
        sess._log(f"  detail fetch failed: {e}")

    return {"simulation_id": sim_id}


def step_generate_report(sess: CaptureSession, sim_id: str) -> Dict:
    """POST /api/report/generate then poll until completed."""
    sess._log("STEP 5/5 — generating report (ReportAgent ReACT loop)")
    body = sess.post_json("/api/report/generate", {"simulation_id": sim_id})
    if not body.get("success"):
        raise RuntimeError(f"report generate failed: {body}")
    bd = body["data"]
    sess._save("05a_report_kickoff.json", bd)

    if bd.get("already_generated"):
        report_id = bd["report_id"]
        sess._log(f"  report already exists: {report_id}")
    else:
        # The kickoff response includes a pre-allocated report_id, but the
        # report itself is still being generated in a background thread.
        # We must poll the task until it completes before trying to GET the
        # report — otherwise ReportManager.get_report() returns None -> 404.
        task_id = bd.get("task_id")
        if not task_id:
            raise RuntimeError(f"report kickoff missing task_id: {bd}")
        report_id = bd.get("report_id")
        while True:
            ts = sess.post_json("/api/report/generate/status", {"task_id": task_id})
            td = ts["data"]
            status = td.get("status")
            if status == "completed":
                report_id = (
                    td.get("report_id")
                    or td.get("metadata", {}).get("report_id")
                    or (td.get("result") or {}).get("report_id")
                    or report_id
                )
                break
            if status == "failed":
                raise RuntimeError(f"report task failed: {td}")
            sess._log(f"  report progress: {td.get('progress', 0)}% — {td.get('message', '')}")
            time.sleep(sess.poll_interval)

    # Pull final report
    final = sess.get(f"/api/report/{report_id}")
    if not final.get("success"):
        raise RuntimeError(f"report fetch failed: {final}")
    sess._save("05b_report.json", final["data"])
    md_content = final["data"].get("markdown_content", "")
    if md_content:
        (sess.output_dir / "05c_report.md").write_text(md_content, encoding="utf-8")
        sess._log(f"saved 05c_report.md ({len(md_content)} chars)")

    # Pull agent log (if available)
    try:
        log = sess.get(f"/api/report/{report_id}/agent-log")
        if log.get("success"):
            sess._save("05d_agent_log.json", log["data"])
    except Exception as e:
        sess._log(f"  agent-log fetch failed: {e}")

    return {"report_id": report_id}


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    p = argparse.ArgumentParser(description="Capture a full MiroFish run for Lokafish replay")
    p.add_argument("--doc", required=True, help="Path to seed document (PDF/MD/TXT)")
    p.add_argument("--requirement", required=True, help="Simulation requirement (NL)")
    p.add_argument("--backend", default="http://localhost:5001", help="MiroFish backend URL")
    p.add_argument("--output", default="public/snapshots/raw", help="Output directory")
    p.add_argument("--project-name", default="Lokafish Snapshot", help="Project display name")
    p.add_argument("--max-rounds", type=int, default=None,
                   help="Cap OASIS rounds (default: LLM-decided, often 100-200)")
    p.add_argument("--poll-interval", type=float, default=3.0,
                   help="Polling interval in seconds")
    p.add_argument("--skip-report", action="store_true",
                   help="Skip the slow report generation step")
    args = p.parse_args()

    doc_path = Path(args.doc).resolve()
    if not doc_path.exists():
        print(f"ERROR: doc not found: {doc_path}")
        sys.exit(1)

    output_dir = Path(args.output).resolve()
    sess = CaptureSession(args.backend, output_dir, args.poll_interval)

    # Health check
    try:
        h = requests.get(f"{args.backend}/health", timeout=5).json()
        sess._log(f"backend health: {h}")
    except Exception as e:
        print(f"ERROR: cannot reach backend at {args.backend}: {e}")
        sys.exit(1)

    started = time.time()
    sess._log("=" * 60)
    sess._log(f"Lokafish snapshot capture starting")
    sess._log(f"  backend       : {args.backend}")
    sess._log(f"  doc           : {doc_path}")
    sess._log(f"  requirement   : {args.requirement[:80]}...")
    sess._log(f"  output        : {output_dir}")
    sess._log(f"  max_rounds    : {args.max_rounds}")
    sess._log("=" * 60)

    try:
        # 1. ontology
        ontology_data = step_ontology(sess, doc_path, args.requirement, args.project_name)
        project_id = ontology_data["project_id"]

        # 2. graph build
        build_data = step_build_graph(sess, project_id)
        graph_id = build_data["graph_id"]

        # 3. fetch entities
        step_fetch_entities(sess, graph_id)

        # 4. create + prepare simulation
        prep = step_create_and_prepare(sess, project_id, graph_id)
        sim_id = prep["simulation_id"]

        # 5. run simulation
        step_run_simulation(sess, sim_id, args.max_rounds)

        # 6. generate report
        if not args.skip_report:
            step_generate_report(sess, sim_id)
        else:
            sess._log("(skipped report generation)")

        # Save the run timeline + meta
        meta = {
            "captured_at": datetime.now().isoformat(),
            "elapsed_seconds": round(time.time() - started, 1),
            "backend": args.backend,
            "doc": str(doc_path),
            "doc_filename": doc_path.name,
            "requirement": args.requirement,
            "project_id": project_id,
            "graph_id": graph_id,
            "simulation_id": sim_id,
            "max_rounds": args.max_rounds,
        }
        sess._save("99_capture_meta.json", meta)
        sess._save("99_timeline.json", sess.timeline)

        sess._log("=" * 60)
        sess._log(f"DONE — total elapsed: {meta['elapsed_seconds']:.0f}s "
                  f"({meta['elapsed_seconds']/60:.1f}min)")
        sess._log(f"Snapshot saved to: {output_dir}")
        sess._log("Next: python scripts/aggregate_stage4.py")
        sess._log("=" * 60)

    except Exception as e:
        sess._log(f"FATAL: {e}")
        sess._save("99_error.json", {
            "error": str(e),
            "type": type(e).__name__,
            "elapsed_seconds": round(time.time() - started, 1),
        })
        raise


if __name__ == "__main__":
    main()
