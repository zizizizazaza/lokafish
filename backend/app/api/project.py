"""
Project-level orchestration endpoints.

These endpoints wrap the full MiroFish pipeline (ontology → graph → simulation
→ report) into a single call so the frontend can trigger a complete analysis
without having to chain the five underlying services itself.

Routes (mounted at /api/project via chat_bp equivalent registration):
    POST /api/project/run            — start a new analysis, returns {project_id}
    GET  /api/project/<id>/status    — poll pipeline progress
    GET  /api/project/<id>/data      — fetch the frontend-ready result bundle
    GET  /api/project/<id>/report_md — fetch the raw markdown report
"""

import json
import threading
import time
import uuid
from pathlib import Path
from flask import jsonify, request, send_file

from . import project_bp
from ..services.pipeline_runner import run_full_pipeline
from ..services import chart_aggregator, data_adapter
from ..utils.logger import get_logger

logger = get_logger('mirofish.project')


# In-memory registry of pipeline tasks. For M1 this is enough; a production
# deployment would use sqlite or redis so state survives restarts.
# Key: project_id (the one returned by the ontology endpoint, not the
# opaque task key we hand out before the pipeline starts).
_RUNS: dict = {}
_RUNS_LOCK = threading.Lock()

# Temporary map from client-facing run_id -> real project_id once known.
# Needed because we return a run_id immediately, before ontology completes.
_RUN_TO_PROJECT: dict = {}


def _uploads_dir() -> Path:
    root = Path(__file__).resolve().parents[2] / "uploads" / "projects"
    root.mkdir(parents=True, exist_ok=True)
    return root


def _project_dir(project_id: str) -> Path:
    d = _uploads_dir() / project_id
    d.mkdir(parents=True, exist_ok=True)
    return d


def _status_path(run_id: str) -> Path:
    """Per-run status file. We write this every time progress changes so
    the status endpoint can be served by reading a file instead of racing
    with the worker thread."""
    return _uploads_dir() / f"_run_{run_id}.status.json"


def _write_status(run_id: str, status: dict) -> None:
    path = _status_path(run_id)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(status, ensure_ascii=False, indent=2),
                    encoding="utf-8")


def _read_status(run_id: str) -> dict:
    path = _status_path(run_id)
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}


def _worker(run_id: str, doc_path: Path, requirement: str,
            project_name: str, max_rounds: int):
    """Background thread that actually runs the pipeline."""
    tmp_dir = _uploads_dir() / f"_run_{run_id}"
    tmp_dir.mkdir(parents=True, exist_ok=True)

    state = {
        "run_id": run_id,
        "status": "running",
        "stage": "ontology",
        "progress": 0,
        "message": "Starting pipeline...",
        "project_id": None,
        "started_at": time.time(),
    }
    _write_status(run_id, state)

    def on_progress(stage: str, pct: int, msg: str):
        state["stage"] = stage
        state["progress"] = pct
        state["message"] = msg
        _write_status(run_id, state)

    result = run_full_pipeline(
        doc_path=doc_path,
        requirement=requirement,
        project_name=project_name,
        output_dir=tmp_dir,
        progress_callback=on_progress,
        max_rounds=max_rounds,
    )

    if result.error:
        state["status"] = "failed"
        state["error"] = result.error
        state["finished_at"] = time.time()
        _write_status(run_id, state)
        logger.error(f"pipeline {run_id} failed: {result.error}")
        return

    # On success, move the tmp run dir to the project's real home
    # (keyed by project_id so multiple runs on the same project don't stomp).
    project_id = result.project_id or run_id
    final_dir = _project_dir(project_id)
    for item in tmp_dir.iterdir():
        target = final_dir / item.name
        if target.exists():
            if target.is_dir():
                import shutil
                shutil.rmtree(target)
            else:
                target.unlink()
        item.rename(target)
    tmp_dir.rmdir()

    state["status"] = "completed"
    state["project_id"] = project_id
    state["graph_id"] = result.graph_id
    state["simulation_id"] = result.simulation_id
    state["report_id"] = result.report_id
    state["progress"] = 100
    state["stage"] = "done"
    state["message"] = "Analysis complete"
    state["finished_at"] = time.time()
    _write_status(run_id, state)

    with _RUNS_LOCK:
        _RUN_TO_PROJECT[run_id] = project_id

    logger.info(f"pipeline {run_id} completed -> project {project_id}")


@project_bp.route('/run', methods=['POST'])
def project_run():
    """
    Kick off a new pipeline run.

    Accepts multipart/form-data OR application/json:
        requirement (str, required) — prediction brief
        doc_text    (str, optional) — document content as text
        project_name (str, optional)
        max_rounds  (int, optional, default 30)
        files[]     (multipart only, optional) — upload document files

    Returns:
        {success: true, data: {run_id: "..."}}
    """
    try:
        if request.content_type and 'multipart' in request.content_type:
            requirement = request.form.get('requirement', '').strip()
            project_name = request.form.get('project_name', 'Untitled Analysis').strip()
            max_rounds = int(request.form.get('max_rounds', 30))
            doc_text = request.form.get('doc_text', '').strip()
            uploaded = request.files.getlist('files')
        else:
            body = request.get_json() or {}
            requirement = (body.get('requirement') or '').strip()
            project_name = (body.get('project_name') or 'Untitled Analysis').strip()
            max_rounds = int(body.get('max_rounds') or 30)
            doc_text = (body.get('doc_text') or '').strip()
            uploaded = []

        if not requirement:
            return jsonify({"success": False, "error": "requirement is required"}), 400

        run_id = uuid.uuid4().hex[:12]
        tmp_dir = _uploads_dir() / f"_run_{run_id}"
        tmp_dir.mkdir(parents=True, exist_ok=True)

        # Resolve the "input document" — either an uploaded file or a
        # markdown file synthesized from doc_text + requirement.
        if uploaded:
            first = uploaded[0]
            doc_path = tmp_dir / (first.filename or "input.md")
            first.save(str(doc_path))
        else:
            doc_path = tmp_dir / "input.md"
            synthesized = doc_text or (
                f"# Analysis Brief\n\n"
                f"## Prediction Requirement\n{requirement}\n\n"
                f"## Context\nNo additional context provided. "
                f"Please derive the knowledge graph structure directly "
                f"from the prediction requirement above."
            )
            doc_path.write_text(synthesized, encoding="utf-8")

        # Seed initial status so /status returns something immediately
        _write_status(run_id, {
            "run_id": run_id,
            "status": "running",
            "stage": "ontology",
            "progress": 0,
            "message": "Queued...",
            "started_at": time.time(),
        })

        thread = threading.Thread(
            target=_worker,
            args=(run_id, doc_path, requirement, project_name, max_rounds),
            daemon=True,
        )
        thread.start()

        return jsonify({"success": True, "data": {"run_id": run_id}})

    except Exception as e:
        logger.error(f"project_run failed: {e}", exc_info=True)
        return jsonify({"success": False, "error": str(e)}), 500


@project_bp.route('/<run_id>/status', methods=['GET'])
def project_status(run_id: str):
    """
    Poll a pipeline run's current progress.

    Returns the full status dict, including stage name, 0..100 progress,
    current message, and (when completed) project_id + report_id.
    """
    status = _read_status(run_id)
    if not status:
        return jsonify({"success": False, "error": "run not found"}), 404
    return jsonify({"success": True, "data": status})


@project_bp.route('/<project_id>/data', methods=['GET'])
def project_data(project_id: str):
    """
    Fetch the assembled result bundle for a completed project.

    Reads the snapshot JSON files from uploads/projects/<id>/, runs them
    through the chart_aggregator + data_adapter services, and returns a
    fully frontend-ready bundle keyed by screen:

        {
            project_id, requirement,
            agents:     { entityTypes, agentCategories, behaviorChain, kgLogMessages, graphData },
            simulation: { simulationPosts, metricsTimeline, metricsBaseline, chatResponses },
            analytics:  { heatmap, gdp, industry, flow, sentiment },
            report:     { title, abstract, sections, references, risks, ... },
            raw:        { ... pointers to file names if the frontend needs originals }
        }
    """
    d = _project_dir(project_id)
    if not d.exists() or not any(d.iterdir()):
        return jsonify({"success": False, "error": "project has no data yet"}), 404

    def load_json(name: str):
        p = d / name
        if not p.exists():
            return None
        try:
            return json.loads(p.read_text(encoding="utf-8"))
        except Exception:
            return None

    def load_actions_jsonl() -> list:
        p = d / "04e_actions.jsonl"
        if not p.exists():
            return []
        actions = []
        with open(p, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line:
                    try:
                        actions.append(json.loads(line))
                    except Exception:
                        continue
        return actions

    entities = load_json("02_entities.json")
    graph_data = load_json("02b_graph_data.json")
    profiles = load_json("03d_profiles.json")
    actions = load_actions_jsonl()

    # Fall back to actions.json if the JSONL is missing
    if not actions:
        fallback = load_json("04c_actions.json") or {}
        if isinstance(fallback, dict):
            actions = (
                fallback.get("all_actions")
                or fallback.get("actions")
                or fallback.get("data")
                or []
            )
        elif isinstance(fallback, list):
            actions = fallback

    md_path = d / "05c_report.md"
    report_md = md_path.read_text(encoding="utf-8") if md_path.exists() else ""
    report_json = load_json("05b_report.json") or {}

    project_meta = load_json("01b_project.json") or {}
    requirement = (
        project_meta.get("simulation_requirement")
        or project_meta.get("requirement")
        or ""
    )
    captured_at = project_meta.get("created_at") or ""
    sim_id = project_meta.get("simulation_id") or ""

    meta = {
        "project_id": project_id,
        "captured_at": captured_at,
        "simulation_id": sim_id,
    }

    # Load scenario-specific chart keywords if the pipeline produced them
    # during Stage 0. If missing, chart_aggregator falls back to the baked
    # Taylor / Singapore defaults.
    custom_keywords = load_json("_keywords.json") or {}

    # Run all the adaptations
    agents_payload = data_adapter.build_agents_payload(
        entities=entities,
        graph_data=graph_data,
        profiles=profiles,
        actions=actions,
        requirement=requirement,
    )
    simulation_payload = data_adapter.build_simulation_payload(
        actions=actions,
        profiles=profiles,
        report_md=report_md,
    )
    analytics_payload = chart_aggregator.aggregate_all(
        actions,
        custom_keywords=custom_keywords,
    )
    report_payload = data_adapter.build_report_payload(
        report_md=report_md,
        requirement=requirement,
        meta=meta,
        report_json=report_json,
    )

    return jsonify({
        "success": True,
        "data": {
            "project_id": project_id,
            "requirement": requirement,
            "agents": agents_payload,
            "simulation": simulation_payload,
            "analytics": analytics_payload,
            "report": report_payload,
            "report_markdown": report_md,
        }
    })


@project_bp.route('/<project_id>/report_md', methods=['GET'])
def project_report_md(project_id: str):
    """Raw markdown report, suitable for download."""
    md_path = _project_dir(project_id) / "05c_report.md"
    if not md_path.exists():
        return jsonify({"success": False, "error": "no report yet"}), 404
    return send_file(md_path, mimetype='text/markdown', as_attachment=False)


@project_bp.route('/list', methods=['GET'])
def project_list():
    """
    Enumerate all projects that have been persisted to the uploads dir.

    Returns the list sorted by most-recent first. Each entry contains just
    enough metadata for a "recent projects" UI:
        { project_id, created_at, size_kb, has_report, title?, requirement? }

    Per-run status files (_run_*.status.json) are filtered out.
    """
    root = _uploads_dir()
    if not root.exists():
        return jsonify({"success": True, "data": []})

    projects = []
    for entry in root.iterdir():
        # Skip the transient _run_<id>/ scratch dirs and status files
        if not entry.is_dir() or entry.name.startswith("_"):
            continue

        md_path = entry / "05c_report.md"
        proj_meta_path = entry / "01b_project.json"

        title = None
        requirement = None
        if proj_meta_path.exists():
            try:
                meta = json.loads(proj_meta_path.read_text(encoding="utf-8"))
                title = meta.get("name") or meta.get("project_name")
                requirement = (
                    meta.get("simulation_requirement")
                    or meta.get("requirement")
                )
            except Exception:
                pass

        # Fallback: pull the first H1 from the report markdown as title
        if not title and md_path.exists():
            try:
                md = md_path.read_text(encoding="utf-8")
                first_line = md.lstrip("#").split("\n", 1)[0].strip()
                if first_line:
                    title = first_line[:80]
            except Exception:
                pass

        try:
            stat = entry.stat()
            mtime = stat.st_mtime
            size = sum(f.stat().st_size for f in entry.rglob("*") if f.is_file())
        except Exception:
            mtime = 0
            size = 0

        projects.append({
            "project_id": entry.name,
            "title": title or entry.name,
            "requirement": (requirement or "")[:200] if requirement else None,
            "created_at": mtime,
            "size_kb": round(size / 1024, 1),
            "has_report": md_path.exists(),
        })

    projects.sort(key=lambda p: p["created_at"], reverse=True)
    return jsonify({"success": True, "data": projects})
