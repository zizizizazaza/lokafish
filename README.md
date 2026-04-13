# Loka

Self-hosted, open-source, agentic intelligence platform for economic prediction.
Run a multi-agent simulation against your own scenario, get a structured analysis
report — all from a clone-and-go web UI.

```
            ┌─────────────────────────────────────────────────┐
            │ User describes scenario in natural language     │
            └────────────────────┬────────────────────────────┘
                                 ▼
            ┌─────────────────────────────────────────────────┐
            │ MiroFish pipeline (5 stages, 10–30 min)         │
            │  1. Ontology     ← LLM extracts entity types    │
            │  2. Graph build  ← Zep Cloud knowledge graph    │
            │  3. Profiles     ← LLM-generated agent personas │
            │  4. Simulation   ← OASIS multi-agent swarm      │
            │  5. Report       ← ReportAgent ReACT loop       │
            └────────────────────┬────────────────────────────┘
                                 ▼
            ┌─────────────────────────────────────────────────┐
            │ Lokafish frontend — six interactive screens     │
            │  Landing → Input → Agents → Simulation →        │
            │  Analytics → Report (with LLM chat panel)       │
            └─────────────────────────────────────────────────┘
```

## What you get

- **Two modes** in one UI: a fast **demo mode** that replays a pre-baked Taylor
  Swift snapshot, and a **real mode** that runs the full pipeline against
  whatever scenario you type in.
- **Six visualization screens** that all switch from demo data to your own
  data when the pipeline finishes — knowledge graph, agent grid, OASIS
  social feed, analytics charts, full markdown report.
- **Real LLM chat** in the report screen, streamed token-by-token, with the
  model grounded in the contents of *your* report.
- **Snapshot-and-replay** architecture: every project's data is dumped to
  `backend/uploads/projects/<id>/` and can be re-loaded anytime via the
  URL `?project=<id>`.

## Quickstart (Docker — recommended)

```bash
# 1. Clone
git clone https://github.com/LAW1223/lokafish.git
cd lokafish

# 2. Configure API keys
cp .env.example .env
# edit .env and fill in:
#   LLM_API_KEY  (Aliyun DashScope, DeepSeek, or OpenAI)
#   ZEP_API_KEY  (https://www.getzep.com — free Developer tier)

# 3. Start everything
docker compose up

# 4. Open the UI
# http://localhost:5173
```

Backend lives on `:5001`, frontend on `:5173`. Project data is persisted to
`./backend/uploads/projects/`.

## Quickstart (manual / no Docker)

You'll need:
- **Python 3.11** (3.13 has known issues with `camel-ai`'s native deps)
- **Node 20+**
- One LLM provider API key + a Zep Cloud key

```bash
# Backend
cd backend
python3.11 -m venv .venv
source .venv/bin/activate            # or .\.venv\Scripts\Activate.ps1 on Windows
pip install -r requirements.txt
cd ..
cp .env.example .env                 # fill in your keys
set -a && source .env && set +a       # export to current shell
python backend/run.py                 # listens on :5001

# Frontend (in a second terminal)
npm install
npm run dev -- --host 0.0.0.0         # listens on :5173
```

Then open `http://localhost:5173`.

## Required API keys

See [docs/API_REQUIREMENTS.md](docs/API_REQUIREMENTS.md) for the full
breakdown. Short version:

| Key | Used for | Cost |
|---|---|---|
| `LLM_API_KEY` (DashScope / DeepSeek / OpenAI) | Drives all 5 pipeline stages | ~¥5–¥30 per real run |
| `ZEP_API_KEY` | Knowledge graph storage in stage 2 | Free tier |

## Using it

1. Open `http://localhost:5173`
2. Click "Get Started" → land on the input screen
3. **Demo mode** (default): edit the scenario text → click "Run World
   Simulation". The frontend immediately walks you through the pre-baked
   Taylor Swift demo data. No backend calls. Good for showing what the
   tool can do.
4. **Real mode**: click "Real analysis (10–30 min)" → enter your own
   scenario → click "Run World Simulation". The backend kicks off the
   full pipeline. A progress bar shows the current stage. When the
   pipeline completes, the agents/simulation/analytics/report screens
   are all populated with *your* data.

The chat panel in the report screen calls the real LLM and uses your
generated report as context — ask it about findings, methodology, or
implications. It remembers the conversation across turns.

## Project layout

```
loka/
├── backend/
│   ├── app/
│   │   ├── api/            ← Flask blueprints (graph, simulation, report, chat, project)
│   │   ├── services/       ← MiroFish core + chart_aggregator + data_adapter + pipeline_runner
│   │   ├── models/         ← Project / Task data classes
│   │   ├── utils/          ← LLM client, file parser, locale, logger
│   │   └── __init__.py     ← Flask app factory
│   ├── Dockerfile
│   ├── requirements.txt
│   └── run.py              ← starts backend on :5001
│
├── src/                    ← Lokafish frontend (vanilla JS + Vite)
│   ├── main.js             ← 6-screen wizard router
│   ├── lib/project_client.js  ← talks to /api/project endpoints
│   ├── screens/            ← landing / input / agents / simulation / analytics / report
│   ├── data/               ← static demo-mode data (Taylor Swift)
│   ├── components/         ← reusable bits (modal, map, particle bg)
│   └── utils/
│
├── locales/                ← Backend i18n strings
├── public/snapshots/       ← Optional offline snapshots (committed if small)
├── docs/                   ← Setup, API, architecture notes
├── docker-compose.yml
├── Dockerfile.frontend
├── vite.config.js
├── package.json
├── .env.example
└── README.md
```

## How real mode works under the hood

```
input.js          POST /api/project/run
   │  ───────────────────────────────────►   project.py spawns a worker thread
   │                                            │
   │  GET /api/project/<id>/status (poll)       │
   │  ◄─────────────────────────────────────    │ pipeline_runner.py drives:
   │                                            │   ontology / graph / sim / report
   │                                            │ (self-HTTP to existing endpoints)
   │  GET /api/project/<id>/data (final)        ▼
   │  ◄─────────────────────────────────────  Reads JSON files from
   │                                          backend/uploads/projects/<id>/,
   │                                          runs them through chart_aggregator
   │                                          and data_adapter, returns single
   │                                          frontend-ready bundle
   ▼
agents.js / simulation.js / analytics.js / report.js
   each call _loadProject(id), fetch /data, swap mutable refs, re-render
```

## Common issues

- **`camel-oasis` install fails on Python 3.13** — use Python 3.11 instead.
- **Pipeline times out at stage 4** — DashScope rate-limited or slow. Try
  `--max-rounds 20` (lowest the UI allows). Or switch to DeepSeek in `.env`.
- **404 from `/api/chat`** — make sure the backend is running. The Vite
  proxy in `vite.config.js` forwards `/api/*` to whatever `VITE_BACKEND_URL`
  points at (default `http://localhost:5001`).
- **Real mode always shows Taylor data** — clear the URL hash, the report
  screen is loading the demo fallback because no `?project=xxx` is set.

## Origin of upstream code

The `backend/` directory is a stripped-down copy of [MiroFish](https://github.com/666ghj/MiroFish)
keeping only the graph/simulation/report blueprints. The OASIS multi-agent
simulation framework is from [camel-oasis](https://github.com/camel-ai/oasis).
The frontend is original work.

## License

Same as upstream MiroFish. See `backend/pyproject.toml` for details.
