# Lokafish Snapshot Pipeline

This is the **snapshot-and-replay** pipeline that lets Lokafish display real
data captured from a real MiroFish run, without needing a live backend at
demo time.

```
              ┌─────────────────┐
              │  MiroFish       │   real Flask app on Linux
              │  backend :5001  │   (LLM_API_KEY + ZEP_API_KEY needed)
              └────────┬────────┘
                       │ HTTP
                       ▼
        ┌─────────────────────────────┐
        │ run_mirofish_capture.py     │   STAGE 1   (slow: 25-90 min)
        │ drives the full pipeline    │
        │ saves every response to     │
        │ public/snapshots/raw/       │
        └────────┬────────────────────┘
                 │
                 ▼
        ┌─────────────────────────────┐
        │ aggregate_stage4.py         │   STAGE 2   (fast: seconds)
        │ reads OASIS actions         │
        │ writes 5 chart JSONs to     │
        │ public/snapshots/charts/    │
        └────────┬────────────────────┘
                 │
                 ▼
        ┌─────────────────────────────┐
        │ inject_to_lokafish.js       │   STAGE 3   (fast: seconds)
        │ rewrites src/data/*.js      │
        │ from snapshot + charts      │
        └────────┬────────────────────┘
                 │
                 ▼
              npm run dev             ← demo time, zero backend needed
```

## One-time setup (Linux machine)

You'll need a Linux machine because MiroFish's backend depends on
`camel-oasis`, which won't install on Windows.

### 1. Clone MiroFish backend

```bash
git clone <your-mirofish-repo>
cd MiroFish-main/MiroFish-main
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
```

### 2. Configure the two API keys

Pick **one** LLM provider:

#### Option A: Aliyun DashScope / 通义千问 (recommended for China)

Sign up at <https://dashscope.aliyuncs.com>, get an API key, then:

```bash
export LLM_API_KEY="sk-xxxxx"
export LLM_BASE_URL="https://dashscope.aliyuncs.com/compatible-mode/v1"
export LLM_MODEL_NAME="qwen-plus"
```

#### Option B: DeepSeek (cheapest, also available in China)

Sign up at <https://platform.deepseek.com>, then:

```bash
export LLM_API_KEY="sk-xxxxx"
export LLM_BASE_URL="https://api.deepseek.com/v1"
export LLM_MODEL_NAME="deepseek-chat"
```

#### Option C: OpenAI (needs a VPN if you're in China)

Sign up at <https://platform.openai.com>, then:

```bash
export LLM_API_KEY="sk-xxxxx"
# default base URL + model are fine
```

Then for **Zep** (knowledge graph store):

Sign up at <https://www.getzep.com>, create a project, copy the API key:

```bash
export ZEP_API_KEY="z_xxxxxxxx"
```

### 3. Start MiroFish backend

```bash
cd MiroFish-main/MiroFish-main
python backend/run.py
# listens on http://localhost:5001
```

Verify it's healthy:

```bash
curl http://localhost:5001/health
# → {"status": "ok", "service": "MiroFish Backend"}
```

### 4. Clone Lokafish (alongside MiroFish)

```bash
cd ..
git clone <your-lokafish-repo>
cd lokafish
npm install
pip install requests   # for the capture script
```

## Running the pipeline (one capture)

### Stage 1 — capture a real MiroFish run

In a **second terminal** on the Linux machine (keep MiroFish running in the
first one):

```bash
cd lokafish
python scripts/run_mirofish_capture.py \
  --doc scripts/sample_doc.md \
  --requirement "Predict the local economic impact of Taylor Swift's Eras Tour 6-night run at Singapore National Stadium (March 2-9, 2024) on hospitality, transport, F&B, retail, social-media uplift and 12-month long-tail tourism. Identify the assumptions that most need human verification." \
  --backend http://localhost:5001 \
  --output public/snapshots/raw \
  --max-rounds 80 \
  --poll-interval 3
```

**This step takes 25-90 minutes** depending on your LLM speed and how many
OASIS rounds you let it run. It will print progress like:

```
[14:21:03] STEP 1/5 — generating ontology from sample_doc.md
[14:22:18] saved 00_ontology.json  (3.2 KB)
[14:22:18] STEP 2/5 — building Zep knowledge graph
[14:22:19]   build progress: 5% — Creating Zep graph...
[14:23:02]   build progress: 30% — Adding text batches...
...
[14:35:11] saved 01_graph_build_task.json
[14:35:12] STEP 3/5 — fetching entities from Zep graph
[14:35:14] saved 02_entities.json
[14:35:14] STEP 4/5 — creating + preparing simulation
...
[14:48:39] STEP 5/5 — running OASIS swarm simulation (this is the slow one)
[14:48:42]   round 1/120 — twitter=0 reddit=0 status=running
[14:49:11]   round 2/120 — twitter=14 reddit=18 status=running
...
[15:43:22]   round 80/120 — twitter=890 reddit=1102 status=completed
[15:43:23] saved 04c_actions.json
[15:43:24] saved 04e_actions.jsonl  (1992 actions)
[15:43:25] STEP 5/5 — generating report (ReportAgent ReACT loop)
...
[15:48:11] saved 05c_report.md
[15:48:11] DONE — total elapsed: 5228s (87.1min)
```

After this step, `public/snapshots/raw/` contains every captured response.

#### Useful flags

| Flag | Default | Notes |
|---|---|---|
| `--max-rounds N` | (LLM-decided) | Cap OASIS rounds. Use 40-60 to make the run shorter. |
| `--poll-interval S` | 3 | How often to poll status endpoints. |
| `--skip-report` | off | Skip the final ReportAgent step (saves 3-10 min) |
| `--project-name S` | "Lokafish Snapshot" | Display name in MiroFish's project list |

### Stage 2 — aggregate Stage 4 chart data

```bash
python scripts/aggregate_stage4.py \
  --raw public/snapshots/raw \
  --output public/snapshots/charts
```

This reads `04e_actions.jsonl`, scans every action's content for keyword
mentions of Singapore districts, industries, countries, and sentiment words,
and produces 5 chart JSONs:

- `heatmap.json` — district hotspots for the Lokafish Leaflet map
- `gdp.json` — synthetic GDP curve from action volume by round
- `industry.json` — industry impact bars from keyword counts
- `flow.json` — visitor-origin pie from country mention counts
- `sentiment.json` — per-round sentiment timeline

These aggregations are **heuristic** — the numbers reflect what the agents
actually talked about in the simulation, scaled to fit Lokafish's chart axes.
They are **not** a substitute for a proper economic model. The advantage over
the original hardcoded mock data is that **the numbers come from the real
simulation you ran**, so they shift if you re-run with different requirements.

### Stage 3 — inject into Lokafish source

```bash
node scripts/inject_to_lokafish.js \
  --raw public/snapshots/raw \
  --charts public/snapshots/charts \
  --target src/data
```

This rewrites 4 files in `src/data/`:

- `agents.js` — categories built from real Zep entities + real MiroFish profiles
- `simulation.js` — top OASIS actions formatted as feed posts + chat suggestions extracted from the report
- `analytics.js` — exports the 5 chart JSONs
- `report.js` — parses the real markdown report into Lokafish's section format

Each generated file has a banner comment showing the snapshot's `simulation_id`
and `captured_at` timestamp so you know it's a build artifact.

### 4. Run Lokafish

```bash
npm run dev
# → http://localhost:5173
```

Click through the 6 screens. They will display the **real** data captured from
your MiroFish run.

## Re-running the capture

Just rerun all 3 stages:

```bash
python scripts/run_mirofish_capture.py --doc scripts/sample_doc.md --requirement "..." --output public/snapshots/raw
python scripts/aggregate_stage4.py
node scripts/inject_to_lokafish.js
```

The 4 generated `src/data/*.js` files are **idempotent build artifacts** — you
can safely overwrite them. Vite HMR will pick up the change instantly.

## Multiple scenarios

To support multiple example chips (Taylor Swift / Fed rate / NVIDIA / Olympics),
capture each one to a different output directory:

```bash
python scripts/run_mirofish_capture.py --doc taylor.md --output public/snapshots/taylor/raw
python scripts/run_mirofish_capture.py --doc fed.md    --output public/snapshots/fed/raw
```

Then add a small `scenario` parameter to the inject script (left as future work)
or just regenerate `src/data/*.js` from whichever snapshot you want to demo.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `cannot reach backend` | MiroFish not running | `python backend/run.py` in another terminal |
| `403 / 500 from /ontology/generate` | LLM key invalid | check `LLM_API_KEY` is exported in the same shell |
| `Zep graph build fails` | `ZEP_API_KEY` missing | sign up at getzep.com and export the key |
| OASIS simulation hangs at round 0 | `camel-oasis` install issue | reinstall in a fresh venv on Linux |
| `ModuleNotFoundError: requests` | Capture script needs requests | `pip install requests` |
| Inject script silent | empty snapshot dir | check that `99_capture_meta.json` exists |
| Lokafish Stage 4 charts empty | aggregate didn't find actions | check `04e_actions.jsonl` is non-empty |

## Files in this directory

```
scripts/
├── README.md                  ← this file
├── sample_doc.md              ← example input document for MiroFish
├── run_mirofish_capture.py    ← Stage 1: drive MiroFish, save responses
├── aggregate_stage4.py        ← Stage 2: actions.jsonl → 5 chart JSONs
└── inject_to_lokafish.js      ← Stage 3: snapshot → src/data/*.js
```
