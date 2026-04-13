"""
Full MiroFish pipeline runner — ontology → graph → entities → simulation → report.

Used by the /api/project/run endpoint to drive a complete analysis in the
background while the frontend polls for progress. The logic mirrors the
scripts/run_mirofish_capture.py CLI but is callable from within the Flask
process.

Internally self-calls the existing graph/simulation/report HTTP endpoints
against localhost. This keeps the pipeline code in one place (the endpoints)
and avoids duplicating orchestration logic — we just chain the endpoints
that already exist.
"""

from __future__ import annotations

import json
import time
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional

import requests

ProgressCallback = Callable[[str, int, str], None]


@dataclass
class PipelineResult:
    project_id: str
    graph_id: Optional[str] = None
    simulation_id: Optional[str] = None
    report_id: Optional[str] = None
    report_markdown: Optional[str] = None
    error: Optional[str] = None
    timeline: List[Dict[str, Any]] = field(default_factory=list)


# Each stage is a slice of the 0..100 progress bar. The callback maps the
# stage's internal 0..100 progress into the global range below.
STAGE_RANGES = {
    "expansion": (0, 5),
    "ontology": (5, 12),
    "graph": (12, 30),
    "entities": (30, 35),
    "simulation_prepare": (35, 50),
    "simulation_run": (50, 90),
    "report": (90, 100),
}


def _stage_progress(stage: str, local_pct: int) -> int:
    lo, hi = STAGE_RANGES.get(stage, (0, 100))
    return int(lo + (hi - lo) * max(0, min(100, local_pct)) / 100)


class PipelineSession:
    """Thin HTTP client for self-calls into the Flask backend."""

    def __init__(self, backend_url: str, output_dir: Path,
                 progress: ProgressCallback, poll_interval: float = 3.0):
        self.backend_url = backend_url.rstrip("/")
        self.output_dir = output_dir
        self.progress = progress
        self.poll_interval = poll_interval
        self.timeline: List[Dict[str, Any]] = []
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def _log(self, label: str):
        self.timeline.append({
            "ts": datetime.now().isoformat(),
            "label": label,
        })

    def _save(self, filename: str, content: Any):
        path = self.output_dir / filename
        path.parent.mkdir(parents=True, exist_ok=True)
        if isinstance(content, (dict, list)):
            path.write_text(json.dumps(content, ensure_ascii=False, indent=2),
                            encoding="utf-8")
        else:
            path.write_text(str(content), encoding="utf-8")

    def get(self, route: str, **kwargs) -> Dict:
        r = requests.get(f"{self.backend_url}{route}", timeout=120, **kwargs)
        r.raise_for_status()
        return r.json()

    def post_json(self, route: str, body: Dict) -> Dict:
        r = requests.post(f"{self.backend_url}{route}", json=body, timeout=600)
        r.raise_for_status()
        return r.json()


def run_full_pipeline(
    *,
    doc_path: Path,
    requirement: str,
    project_name: str,
    output_dir: Path,
    progress_callback: ProgressCallback,
    backend_url: str = "http://127.0.0.1:5001",
    max_rounds: int = 30,
    poll_interval: float = 3.0,
) -> PipelineResult:
    """
    Run the complete pipeline and return a PipelineResult.

    progress_callback is invoked as (stage, percent, message) where percent
    is 0..100 across the entire pipeline (not just the current stage).

    Raises no exceptions — all failures are captured into result.error so
    the caller can surface them via the status endpoint.
    """
    sess = PipelineSession(backend_url, output_dir, progress_callback, poll_interval)
    result = PipelineResult(project_id="pending")

    def emit(stage: str, local_pct: int, msg: str):
        progress_callback(stage, _stage_progress(stage, local_pct), msg)

    try:
        # ------- Stage 0: Stakeholder expansion -------
        # Expand the user's short requirement (and any uploaded doc) into
        # a rich stakeholder map markdown so Stage 1 has far more entities
        # to extract. The original doc is preserved for reference; Stage 1
        # reads the expanded version instead.
        emit("expansion", 0, "Expanding stakeholder map with LLM...")
        try:
            from . import stakeholder_expander
            original_text = ""
            try:
                original_text = doc_path.read_text(encoding="utf-8")
            except Exception:
                pass

            expanded_md = stakeholder_expander.expand_requirement(
                requirement=requirement,
                extra_context=original_text,
            )
            # Save the expansion as an artifact AND use it as the new
            # ontology input document. We rename the original so it's
            # preserved for debugging.
            original_backup = output_dir / "_input_original.md"
            try:
                if doc_path.exists():
                    doc_path.rename(original_backup)
            except Exception:
                pass

            expanded_path = output_dir / "_00_stakeholders.md"
            expanded_path.write_text(expanded_md, encoding="utf-8")
            sess._save("_00_stakeholders_meta.json", {
                "char_count": len(expanded_md),
                "line_count": len(expanded_md.splitlines()),
                "bullet_count": expanded_md.count("\n- "),
            })
            # From here on, Stage 1 reads the expanded document.
            doc_path = expanded_path
            emit("expansion", 100, f"Stakeholder map: {expanded_md.count('- ')} bullets")
        except Exception as e:
            # Expansion is a best-effort pre-step. If it fails, fall
            # through to Stage 1 with the original document.
            sess._log(f"expansion failed, falling back to original doc: {e}")
            emit("expansion", 100, f"Expansion skipped ({e})")

        # ------- Stage 1: Ontology -------
        emit("ontology", 0, "Generating ontology from input document...")
        sess._log("ontology: start")
        with open(doc_path, "rb") as f:
            files = {"files": (doc_path.name, f, "application/octet-stream")}
            data = {"simulation_requirement": requirement, "project_name": project_name}
            r = requests.post(f"{backend_url}/api/graph/ontology/generate",
                              files=files, data=data, timeout=600)
        r.raise_for_status()
        body = r.json()
        if not body.get("success"):
            raise RuntimeError(f"ontology generation failed: {body.get('error')}")
        onto = body["data"]
        sess._save("00_ontology.json", onto)
        project_id = onto.get("project_id") or onto.get("projectId")
        if not project_id:
            raise RuntimeError("ontology response missing project_id")
        result.project_id = project_id
        emit("ontology", 100, "Ontology extracted")

        # ------- Stage 2: Graph build -------
        emit("graph", 0, "Building knowledge graph in Zep...")
        build = sess.post_json("/api/graph/build", {"project_id": project_id})
        if not build.get("success"):
            raise RuntimeError(f"graph build failed: {build.get('error')}")
        task_id = build["data"]["task_id"]

        while True:
            task = sess.get(f"/api/graph/task/{task_id}")
            td = task["data"]
            status = td.get("status")
            pct = td.get("progress", 0)
            msg = td.get("message", "")
            emit("graph", pct, f"Graph: {msg}" if msg else "Building graph...")
            if status == "completed":
                sess._save("01_graph_build_task.json", td)
                break
            if status == "failed":
                raise RuntimeError(f"graph build task failed: {td}")
            time.sleep(poll_interval)

        proj = sess.get(f"/api/graph/project/{project_id}")
        sess._save("01b_project.json", proj["data"])
        graph_id = proj["data"].get("graph_id")
        if not graph_id:
            raise RuntimeError("project has no graph_id after build")
        result.graph_id = graph_id

        # ------- Stage 3: Fetch entities -------
        emit("entities", 0, "Fetching entities from knowledge graph...")
        ents = sess.get(f"/api/simulation/entities/{graph_id}",
                        params={"enrich": "true"})
        if ents.get("success"):
            sess._save("02_entities.json", ents["data"])
        try:
            gdata = sess.get(f"/api/graph/data/{graph_id}")
            if gdata.get("success"):
                sess._save("02b_graph_data.json", gdata["data"])
        except Exception:
            pass
        emit("entities", 100, "Entities fetched")

        # ------- Stage 4a: Create + prepare simulation -------
        emit("simulation_prepare", 0, "Creating simulation...")
        create = sess.post_json("/api/simulation/create", {
            "project_id": project_id,
            "graph_id": graph_id,
            "enable_twitter": True,
            "enable_reddit": True,
        })
        if not create.get("success"):
            raise RuntimeError(f"sim create failed: {create.get('error')}")
        sim_id = create["data"]["simulation_id"]
        result.simulation_id = sim_id
        sess._save("03a_create.json", create["data"])

        emit("simulation_prepare", 10, "Generating agent profiles...")
        prep = sess.post_json("/api/simulation/prepare", {
            "simulation_id": sim_id,
            "use_llm_for_profiles": True,
            "parallel_profile_count": 5,
        })
        if not prep.get("success"):
            raise RuntimeError(f"prepare failed: {prep.get('error')}")
        sess._save("03b_prepare_kickoff.json", prep["data"])

        if not (prep["data"].get("already_prepared") or
                prep["data"].get("status") == "ready"):
            while True:
                status = sess.post_json("/api/simulation/prepare/status",
                                        {"simulation_id": sim_id})
                sd = status["data"]
                pct = sd.get("progress", 0)
                msg = sd.get("message", "")
                emit("simulation_prepare",
                     10 + int(pct * 0.9),  # leave a bit of headroom
                     f"Profiles: {msg}" if msg else "Generating profiles...")
                if sd.get("status") in ("ready", "completed"):
                    sess._save("03c_prepare_final.json", sd)
                    break
                if sd.get("status") in ("failed", "error"):
                    raise RuntimeError(f"prepare failed: {sd}")
                time.sleep(poll_interval)

        try:
            profiles = sess.get(f"/api/simulation/{sim_id}/profiles")
            if profiles.get("success"):
                sess._save("03d_profiles.json", profiles["data"])
        except Exception:
            pass

        emit("simulation_prepare", 100, "Simulation prepared")

        # ------- Stage 4b: Run simulation -------
        emit("simulation_run", 0, f"Running OASIS simulation ({max_rounds} rounds)...")
        start = sess.post_json("/api/simulation/start", {
            "simulation_id": sim_id,
            "platform": "parallel",
            "max_rounds": max_rounds,
        })
        if not start.get("success"):
            raise RuntimeError(f"start failed: {start.get('error')}")
        sess._save("04a_start.json", start["data"])

        while True:
            status = sess.get(f"/api/simulation/{sim_id}/run-status")
            sd = status["data"]
            runner = sd.get("runner_status", "idle")
            cur = sd.get("current_round", 0)
            tot = sd.get("total_rounds", max_rounds) or max_rounds
            if tot > 0:
                pct = min(99, int((cur / tot) * 100))
            else:
                pct = 0
            emit("simulation_run", pct, f"Round {cur}/{tot}")
            if runner in ("completed", "stopped", "finished"):
                sess._save("04b_run_status_final.json", sd)
                break
            if runner == "error":
                raise RuntimeError(f"simulation runner error: {sd}")
            time.sleep(poll_interval)

        try:
            actions = sess.get(f"/api/simulation/{sim_id}/actions",
                               params={"limit": 10000})
            if actions.get("success"):
                sess._save("04c_actions.json", actions["data"])
        except Exception:
            pass
        try:
            detail = sess.get(f"/api/simulation/{sim_id}/run-status/detail")
            if detail.get("success"):
                sess._save("04d_run_status_detail.json", detail["data"])
                all_actions = detail["data"].get("all_actions", [])
                with open(output_dir / "04e_actions.jsonl", "w",
                          encoding="utf-8") as f:
                    for a in all_actions:
                        f.write(json.dumps(a, ensure_ascii=False) + "\n")
        except Exception:
            pass

        emit("simulation_run", 100, "Simulation complete")

        # ------- Stage 5: Report -------
        emit("report", 0, "Generating final report (ReportAgent ReACT loop)...")
        rep = sess.post_json("/api/report/generate", {"simulation_id": sim_id})
        if not rep.get("success"):
            raise RuntimeError(f"report generate failed: {rep.get('error')}")
        bd = rep["data"]
        sess._save("05a_report_kickoff.json", bd)

        if bd.get("already_generated"):
            report_id = bd["report_id"]
        else:
            task_id = bd.get("task_id")
            if not task_id:
                raise RuntimeError("report kickoff missing task_id")
            report_id = bd.get("report_id")
            while True:
                ts = sess.post_json("/api/report/generate/status",
                                    {"task_id": task_id})
                td = ts["data"]
                pct = td.get("progress", 0)
                msg = td.get("message", "")
                emit("report", pct, f"Report: {msg}" if msg else "Generating report...")
                st = td.get("status")
                if st == "completed":
                    report_id = (
                        td.get("report_id")
                        or td.get("metadata", {}).get("report_id")
                        or (td.get("result") or {}).get("report_id")
                        or report_id
                    )
                    break
                if st == "failed":
                    raise RuntimeError(f"report task failed: {td}")
                time.sleep(poll_interval)

        result.report_id = report_id
        final = sess.get(f"/api/report/{report_id}")
        if final.get("success"):
            sess._save("05b_report.json", final["data"])
            md = final["data"].get("markdown_content", "")
            if md:
                (output_dir / "05c_report.md").write_text(md, encoding="utf-8")
                result.report_markdown = md

        emit("report", 100, "Pipeline complete")

        result.timeline = sess.timeline
        return result

    except Exception as e:
        result.error = str(e)
        result.timeline = sess.timeline
        return result
