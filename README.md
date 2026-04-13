# Loka

Agentic intelligence platform for economic prediction. Frontend (Vite) + agentic
backend (MiroFish, Flask + Zep + OASIS) + a snapshot pipeline that lets the
frontend display real captured data offline at demo time.

## Repository layout

```
loka/
├── backend/                   ← MiroFish Flask backend (Python 3.11+)
│   ├── app/                   ← Flask app: graph / simulation / report blueprints
│   ├── scripts/               ← MiroFish's own runners (OASIS subprocess scripts)
│   ├── requirements.txt
│   └── run.py                 ← starts backend on :5001
│
├── src/                       ← Lokafish frontend (vanilla JS + Vite)
│   ├── main.js                ← 6-screen wizard router
│   ├── style.css
│   ├── screens/               ← landing / input / agents / simulation / analytics / report
│   ├── components/            ← reusable bits (modal, map, particle bg)
│   ├── data/                  ← AUTO-GENERATED data files (overwritten by inject script)
│   └── utils/
│
├── public/
│   ├── favicon.svg
│   └── snapshots/             ← captured backend responses (gitignored by default)
│       ├── raw/               ← stage-1 output: every MiroFish HTTP response
│       └── charts/            ← stage-2 output: 5 chart JSONs for analytics screen
│
├── scripts/                   ← snapshot pipeline (3 steps)
│   ├── README.md              ← detailed pipeline guide
│   ├── sample_doc.md          ← example input document
│   ├── run_mirofish_capture.py
│   ├── aggregate_stage4.py
│   └── inject_to_lokafish.js
│
├── index.html                 ← Vite entry
├── package.json               ← Vite + zero runtime deps
├── package-lock.json
├── vercel.json                ← static deploy config
├── .env.example               ← copy to .env, fill in the 2 API keys
├── .gitignore
└── README.md                  ← this file
```

## How it works

```
                ┌────────────────┐
                │  backend/      │   Real MiroFish, runs on Linux only.
                │  Flask :5001   │   Needs LLM + Zep keys.
                └────────┬───────┘
                         │ HTTP
                         ▼
        ┌────────────────────────────┐
        │ scripts/                   │   Run once on Linux.
        │   run_mirofish_capture.py  │   Drives the full pipeline,
        │   aggregate_stage4.py      │   writes JSON snapshots to
        │   inject_to_lokafish.js    │   public/snapshots/, regenerates
        └────────┬───────────────────┘   src/data/*.js
                 │
                 ▼
        ┌────────────────────────────┐
        │  src/ + public/            │   Demo time. Pure static frontend.
        │  npm run dev               │   Zero backend dependency.
        │  → :5173                   │   Works on Windows / Mac / vercel.
        └────────────────────────────┘
```

The backend is **only** needed to capture a snapshot. After that, the frontend
runs offline against the snapshot data — perfect for live demos that can't
afford a 30-minute MiroFish runtime or a network outage.

## Quick start (frontend only — uses last captured snapshot)

If `src/data/*.js` is already populated from a previous capture, you can run
the frontend without touching the backend at all:

```bash
npm install
npm run dev
# → http://localhost:5173
```

## Full pipeline (capture a fresh snapshot)

You need a Linux machine for this. See [scripts/README.md](scripts/README.md)
for the full guide. Short version:

### 1. Configure API keys (one-time)

Copy `.env.example` to `.env` and fill in:

```bash
LLM_API_KEY=sk-xxxxx              # Aliyun Qwen / DeepSeek / OpenAI — pick one
LLM_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
LLM_MODEL_NAME=qwen-plus
ZEP_API_KEY=z_xxxxxxxx            # https://www.getzep.com
```

### 2. Install backend deps (Linux only)

```bash
cd backend
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 3. Start backend

```bash
# from project root
set -a && source .env && set +a   # export the env vars
python backend/run.py             # listens on :5001
```

### 4. Run the 3-stage capture pipeline

In a second terminal:

```bash
# from project root, with backend running in the other terminal
pip install requests              # one-time, only needed by the capture script

# Stage 1: drive MiroFish, save responses (25-90 min)
python scripts/run_mirofish_capture.py \
  --doc scripts/sample_doc.md \
  --requirement "Predict the local economic impact of Taylor Swift's Eras Tour..." \
  --max-rounds 60

# Stage 2: aggregate OASIS actions into chart data (seconds)
python scripts/aggregate_stage4.py

# Stage 3: regenerate src/data/*.js from snapshot (seconds)
node scripts/inject_to_lokafish.js
```

### 5. Run the frontend with the fresh snapshot

```bash
npm run dev
# → http://localhost:5173
```

## What lives where

| Path | Origin | Purpose |
|---|---|---|
| `backend/app/api/graph.py` | MiroFish upstream | Ontology generation, Zep graph build |
| `backend/app/api/simulation.py` | MiroFish upstream | OASIS simulation lifecycle, agent interview |
| `backend/app/api/report.py` | MiroFish upstream | ReportAgent ReACT loop |
| `backend/app/services/` | MiroFish upstream | Graph builder, profile generator, simulation runner, etc. |
| `src/screens/landing.js` | Lokafish | Hero page with stats, examples, ecosystem |
| `src/screens/input.js` | Lokafish | Scenario input + advanced configuration |
| `src/screens/agents.js` | Lokafish | KG visualization + agent population grid |
| `src/screens/simulation.js` | Lokafish | OASIS swarm feed + chat panel |
| `src/screens/analytics.js` | Lokafish | Singapore Leaflet map + 4 canvas charts |
| `src/screens/report.js` | Lokafish | Two-column academic paper + AI chat |
| `src/data/*.js` | Auto-generated | Idempotent build artifacts from snapshot |
| `scripts/run_mirofish_capture.py` | New | Drives MiroFish HTTP API end-to-end |
| `scripts/aggregate_stage4.py` | New | Reads OASIS actions, computes 5 chart JSONs |
| `scripts/inject_to_lokafish.js` | New | Maps snapshot → `src/data/*.js` shapes |

## Snapshot data flow

```
public/snapshots/raw/                   ← stage 1 output
├── 00_ontology.json                    LLM-extracted entity types
├── 01_graph_build_task.json            Zep build progress
├── 01b_project.json                    Resolved project metadata
├── 02_entities.json                    Entities filtered from Zep
├── 02b_graph_data.json                 Full nodes + edges
├── 03a_create.json                     Simulation creation
├── 03b_prepare_kickoff.json            Prepare task started
├── 03c_prepare_final.json              Prepare task complete
├── 03d_profiles.json                   OASIS-ready agent personas
├── 03e_sim_config.json                 LLM-decided simulation config
├── 04a_start.json                      Run started
├── 04b_run_status_final.json           Final run status
├── 04c_actions.json                    All actions (single fetch)
├── 04d_run_status_detail.json          Full detail with actions
├── 04e_actions.jsonl                   Actions in JSONL (preferred for stage 2)
├── 05a_report_kickoff.json             Report task started
├── 05b_report.json                     Report metadata + sections
├── 05c_report.md                       Final markdown report
├── 05d_agent_log.json                  ReportAgent ReACT log
├── 99_capture_meta.json                Run summary (sim_id, elapsed time)
└── 99_timeline.json                    Every API call this script made

public/snapshots/charts/                ← stage 2 output
├── _meta.json                          Aggregation summary
├── heatmap.json                        Singapore district hotspots
├── gdp.json                            Synthetic GDP curve
├── industry.json                       Industry impact bars
├── flow.json                           Visitor origin pie
└── sentiment.json                      Per-round sentiment timeline
```

## Editing the frontend

The 6 screens live in `src/screens/` and read from `src/data/*.js`. Vite has
HMR — edit any file and the browser reloads instantly:

```bash
npm run dev
# edit src/screens/landing.js → instant reload
```

**Do not hand-edit** `src/data/*.js` — those files are regenerated by
`scripts/inject_to_lokafish.js` and any manual edits will be wiped on the next
inject. To change the data, edit the snapshot JSONs in `public/snapshots/raw/`
and rerun `inject_to_lokafish.js`.

## Building for production

```bash
npm run build
# outputs to dist/

npm run preview
# serves dist/ on :4173 for verification
```

`vercel.json` is included for one-click Vercel deployment. The backend is **not**
deployed — production is the frozen frontend running against the committed
snapshot. To update the snapshot, capture a fresh one and commit the new
`public/snapshots/` + `src/data/` together.

## Origin of upstream code

The `backend/` directory is a stripped copy of [MiroFish](https://github.com/666ghj/MiroFish)
(see [backend/pyproject.toml](backend/pyproject.toml)). Only the original
graph / simulation / report blueprints are kept; the frontend that ships with
upstream MiroFish is replaced by the Lokafish frontend in `src/`.
