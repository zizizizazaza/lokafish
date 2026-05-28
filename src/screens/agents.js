// Agents screen — MiroFish-style Split Layout
// Left: Full-height live knowledge graph | Right: Build steps → Simulation feed
//
// This screen absorbs the former `simulation.js` screen — peter-jim merged
// "World Build" and "Simulation" into two phases of the same sandbox view.
//
// Backend hooks grafted on top (preserved from loka's M2/M3 work):
//   el._loadProject(projectId) — fetches /api/project/<id>/data and swaps
//     the mutable agent/sim data refs + rebuilds DOM in place.

import {
  agentCategories as staticAgentCategories,
  behaviorChain as staticBehaviorChain,
  entityTypes,
  kgLogMessages as staticKgLogMessages,
} from '../data/agents.js';
import {
  simulationPosts as staticSimulationPosts,
  metricsTimeline as staticMetricsTimeline,
  metricsBaseline as staticMetricsBaseline,
} from '../data/simulation.js';
import { createAgentModal, showAgentDetail, showNodeDetail } from '../components/agent-modal.js';
import { delay, staggerReveal, formatNumber } from '../utils/animation.js';
import { fetchProjectData } from '../lib/project_client.js';
import { getConfig, getCurrentPlan } from '../lib/participation_state.js';
import {
  DECISION_POINTS, PARTICIPATION_MODES,
  computeCommunityLeader, computeAgentConsensus,
  planStepsToDecisionPointIds,
  PLAN_STEP_TO_DP_IDS,
} from '../data/decision_points.js';

// Mutable refs — _loadProject swaps these to the real backend payload.
let agentCategories = staticAgentCategories;
let behaviorChain = staticBehaviorChain;
let kgLogMessages = staticKgLogMessages;
let simulationPosts = staticSimulationPosts;
let metricsTimeline = staticMetricsTimeline;
let metricsBaseline = staticMetricsBaseline;
// When a real project is loaded, this holds the raw Zep graph (nodes/edges)
// so the KG canvas can render user data instead of the procedural mock.
let customGraphData = null;

/**
 * Convert a raw Zep graph_data payload into the shape the KG canvas loop
 * expects. Edges use the new {from, to, label} format. Positions are seeded
 * by hashing node names so layout is stable across reloads.
 */
function buildKgFromCustomGraph(graph, w, h) {
  const rawNodes = graph?.nodes || [];
  const rawEdges = graph?.edges || [];
  if (!rawNodes.length) return null;

  const pickColor = (labels) => {
    for (const l of labels || []) {
      if (DARK_ENTITY_COLORS[l]) return DARK_ENTITY_COLORS[l];
      if (entityTypes && entityTypes[l]) return entityTypes[l];
    }
    return DARK_ENTITY_COLORS.Entity || '#34D399';
  };

  const hashSeed = (s) => {
    let h = 0;
    for (let i = 0; i < String(s).length; i++) {
      h = ((h << 5) - h + String(s).charCodeAt(i)) | 0;
    }
    return Math.abs(h);
  };
  const seeded = (s, salt = 0) => {
    const h = hashSeed(String(s) + ':' + salt);
    return (h % 10000) / 10000;
  };

  const degree = new Map();
  for (const e of rawEdges) {
    const s = e.source_uuid || e.source || e.from;
    const t = e.target_uuid || e.target || e.to;
    if (s) degree.set(s, (degree.get(s) || 0) + 1);
    if (t) degree.set(t, (degree.get(t) || 0) + 1);
  }
  const sortedNodes = [...rawNodes].sort((a, b) => {
    const da = degree.get(a.uuid) || 0;
    const db = degree.get(b.uuid) || 0;
    return db - da;
  });
  const kept = sortedNodes.slice(0, 200);
  const keptIds = new Set(kept.map(n => n.uuid));

  const nodes = kept.map((n, i) => {
    const deg = degree.get(n.uuid) || 0;
    const isCore = i < 10;
    const size = isCore ? 18 - i * 0.6 : Math.max(4, Math.min(10, 4 + deg * 0.7));
    let x, y;
    if (isCore) {
      const angle = (i / 10) * Math.PI * 2;
      x = w * 0.5 + Math.cos(angle) * w * 0.18;
      y = h * 0.5 + Math.sin(angle) * h * 0.22;
    } else {
      const angle = seeded(n.uuid, 1) * Math.PI * 2;
      const r = 0.25 + seeded(n.uuid, 2) * 0.35;
      x = w * 0.5 + Math.cos(angle) * w * r;
      y = h * 0.5 + Math.sin(angle) * h * r;
    }
    return {
      id: n.uuid,
      label: (n.name || 'Unknown').slice(0, 18),
      size,
      color: pickColor(n.labels || n.label_list),
      type: (n.labels || [])[0] || 'Entity',
      x: Math.max(14, Math.min(w - 14, x)),
      y: Math.max(14, Math.min(h - 14, y)),
      vx: 0, vy: 0,
      summary: n.summary || '',
      realEntity: true,
    };
  });

  const edges = [];
  for (const e of rawEdges) {
    const s = e.source_uuid || e.source || e.from;
    const t = e.target_uuid || e.target || e.to;
    if (keptIds.has(s) && keptIds.has(t)) {
      edges.push({ from: s, to: t, label: e.relation || e.label || 'related to' });
    }
  }

  return { nodes, edges };
}

// ─── Node color palette (dark-theme optimized) ───────────────────────────
// Catppuccin Mocha — pastel-on-dark palette, perceptually balanced.
// Mirrors src/screens/kg-3d.js ENTITY_COLORS so the legend, the procedural
// mock and the real Zep render all agree on hue.
const DARK_ENTITY_COLORS = {
  Person:      '#F38BA8', // pink
  Company:     '#89B4FA', // blue
  Entity:      '#A6E3A1', // green
  GovAgency:   '#CBA6F7', // mauve
  MediaOutlet: '#F9E2AF', // yellow
};

export function generateDenseKG(w, h) {
  const coreNodes = [
    { id: 'ts',       label: 'Taylor Swift',    size: 20, color: '#F87171', type: 'Person',      fx: 0.50, fy: 0.32 },
    { id: 'sg',       label: 'Singapore',        size: 18, color: '#34D399', type: 'Entity',      fx: 0.32, fy: 0.50 },
    { id: 'venue',    label: 'Nat. Stadium',     size: 14, color: '#34D399', type: 'Entity',      fx: 0.58, fy: 0.48 },
    { id: 'stb',      label: 'STB',              size: 12, color: '#A78BFA', type: 'GovAgency',   fx: 0.22, fy: 0.33 },
    { id: 'mti',      label: 'Min. Trade',       size: 11, color: '#A78BFA', type: 'GovAgency',   fx: 0.13, fy: 0.22 },
    { id: 'airlines', label: 'Singapore Air',    size: 13, color: '#60A5FA', type: 'Company',     fx: 0.72, fy: 0.50 },
    { id: 'mbs',      label: 'MBS Hotel',        size: 11, color: '#60A5FA', type: 'Company',     fx: 0.30, fy: 0.70 },
    { id: 'grab',     label: 'Grab',             size: 10, color: '#60A5FA', type: 'Company',     fx: 0.14, fy: 0.62 },
    { id: 'dbs',      label: 'DBS Bank',         size: 10, color: '#60A5FA', type: 'Company',     fx: 0.78, fy: 0.70 },
    { id: 'bloomberg',label: 'Bloomberg',        size: 10, color: '#FBBF24', type: 'MediaOutlet', fx: 0.84, fy: 0.26 },
    { id: 'changi',   label: 'Changi Airport',   size: 12, color: '#34D399', type: 'Entity',      fx: 0.68, fy: 0.33 },
    { id: 'fans',     label: 'Swifties / Fans',  size: 15, color: '#F87171', type: 'Person',      fx: 0.50, fy: 0.72 },
  ];

  // ── Semantically accurate core relationship edges ────────────────────────
  const coreEdges = [
    { from: 'ts',       to: 'venue',     label: 'performed at'        },
    { from: 'ts',       to: 'stb',       label: 'received S$3M grant' },
    { from: 'ts',       to: 'bloomberg', label: 'covered by'          },
    { from: 'ts',       to: 'changi',    label: 'arrived via'         },
    { from: 'ts',       to: 'fans',      label: 'performed for'       },
    { from: 'fans',     to: 'venue',     label: 'attended concerts'   },
    { from: 'fans',     to: 'mbs',       label: 'stayed at'           },
    { from: 'fans',     to: 'grab',      label: 'used for transport'  },
    { from: 'fans',     to: 'sg',        label: 'visited'             },
    { from: 'fans',     to: 'airlines',  label: 'flew in via'         },
    { from: 'venue',    to: 'sg',        label: 'located in'          },
    { from: 'venue',    to: 'stb',       label: 'co-funded by'        },
    { from: 'stb',      to: 'mti',       label: 'reports to'          },
    { from: 'stb',      to: 'sg',        label: 'promotes tourism'    },
    { from: 'stb',      to: 'bloomberg', label: 'press briefed'       },
    { from: 'airlines', to: 'changi',    label: 'hub at'              },
    { from: 'airlines', to: 'fans',      label: 'chartered flights'   },
    { from: 'mbs',      to: 'sg',        label: 'located in'          },
    { from: 'grab',     to: 'sg',        label: 'operates in'         },
    { from: 'dbs',      to: 'mbs',       label: 'banking partner'     },
    { from: 'dbs',      to: 'sg',        label: 'headquartered in'    },
    { from: 'changi',   to: 'sg',        label: 'gateway to'          },
    { from: 'bloomberg',to: 'sg',        label: 'reported on impact'  },
  ];

  const types  = Object.keys(DARK_ENTITY_COLORS);
  const colors = Object.values(DARK_ENTITY_COLORS);
  const clusterCenters = [
    { x:0.50, y:0.35 }, { x:0.25, y:0.55 }, { x:0.70, y:0.50 },
    { x:0.40, y:0.70 }, { x:0.15, y:0.40 }, { x:0.80, y:0.35 },
    { x:0.60, y:0.25 }, { x:0.35, y:0.85 }, { x:0.85, y:0.65 },
  ];

  // Real-sounding Singapore names per entity type
  const namesByType = {
    Person: [
      'Sarah Chen','Ahmad Ismail','Rachel Lim','Priya Sharma','David Park',
      'Jessica Wong','Tom Garcia','Mei Ling Yap','Ravi Kumar','Emily Johnson',
      'James Lee','Nurul Ain','Kevin Tan','Chloe Wang','Boon Huat Ong',
      'Siti Rahimah','Marcus Ho','Yukiko Tanaka','Liu Yang','Harish Nair',
      'Fiona Goh','Alicia Teo','Benedict Chua','Naomi Patel','Ethan Ng',
      'Suvarna Menon','Darren Lau','Karen Jiang','Vijay Balaji','Zoe Kwan',
      'Michelle Tan','Ryan Seah','Ananya Gupta','Benjamin Yeo','Wei Xin Lu',
    ],
    Company: [
      'Raffles Hotel','Pan Pacific SG','W Singapore','Mandarin Oriental',
      'Fairmont Singapore','Conrad Centennial','Four Seasons SG','Capella SG',
      'InterContinental SG','Grand Hyatt SG','Regent Singapore','Sofitel SG',
      'SIA Group','Grab Holdings','Sea Limited','Singtel','CapitaLand',
      'Genting SG','RWS Attractions','Gardens by the Bay','Universal Studios SG',
      'Klook SG','Trip.com Group','Shopee SG','Lazada SG','DFS Singapore',
      'Takashimaya SG','ION Orchard','Paragon Mall','VivoCity SG',
      'Odette Restaurant','Cut by Wolfgang Puck','Waku Ghin','PS.Cafe',
      'Burnt Ends SG','Candlenut','JAAN by Kirk Westaway','Tippling Club',
    ],
    Entity: [
      'National Stadium','Singapore Sports Hub','Marina Bay Sands Arena',
      'Suntec Convention Ctr','Esplanade Theatre','Gardens by the Bay',
      'Jewel Changi','Clarke Quay','Boat Quay','Sentosa Island',
      'Fort Canning Park','East Coast Park','Orchard Road','Marina Bay',
      'Bugis Street','Little India','Chinatown','Kampong Glam','Dempsey Hill',
      'One-North','Jurong Lake District','Punggol Digital District',
      'Tanjong Pagar','Raffles Place','Shenton Way','Paya Lebar Quarter',
      'Mapletree Business City','Alexandra Technopark','Science Park',
    ],
    GovAgency: [
      'STB','Ministry of Finance','Ministry of Culture',
      'Urban Redevelopment Auth','National Heritage Board','NEA Singapore',
      'Land Transport Auth','Immigration & Checkpoints',
      'Economic Development Bd','Infocomm Media Dev Auth','Enterprise SG',
      'Monetary Authority SG','Council for Estate Agencies','HDB Singapore',
      'SingHealth','NParks Singapore','CAAS Singapore',
    ],
    MediaOutlet: [
      'Bloomberg APAC','Reuters Singapore','CNA','Straits Times',
      'Business Times SG','The Edge Singapore','Nikkei Asia','Tech in Asia',
      'KrAsia','DealStreetAsia','Forbes Asia','FT Asia','WSJ Asia',
      'South China Morning Post','Jakarta Post','The Star Malaysia',
      'Vietnam Investment Review','Philippine Daily Inquirer','Bangkok Post',
    ],
  };

  // Relationship label: { coreNodeId → { satelliteType → edgeLabel } }
  const satelliteRelLabel = {
    ts:        { Person: 'fan of',          Company: 'merchandise partner', MediaOutlet: 'covered tour',    GovAgency: 'regulatory body',  Entity: 'tour stop' },
    sg:        { Person: 'resident of',     Company: 'operates in',         GovAgency: 'authority of',     Entity: 'district of',         MediaOutlet: 'reports on' },
    venue:     { Person: 'attended concert',Company: 'vendor at',           Entity: 'adjacent to',         GovAgency: 'regulated by',     MediaOutlet: 'reported at' },
    stb:       { Company: 'awarded grant',  GovAgency: 'coordinates with',  MediaOutlet: 'press briefed',  Person: 'consulted with',      Entity: 'promoted' },
    mti:       { GovAgency: 'supervised by',Company: 'policy target',       Person: 'civil servant of',    Entity: 'governs',             MediaOutlet: 'cited' },
    airlines:  { Person: 'flew as pax',     Company: 'codeshare with',      Entity: 'serves route to',     GovAgency: 'licensed by',      MediaOutlet: 'reported on' },
    mbs:       { Person: 'guest at',        Company: 'tenant of',           Entity: 'adjacent to',         GovAgency: 'licensed by',      MediaOutlet: 'featured' },
    grab:      { Person: 'customer of',     Company: 'partner of',          Entity: 'service area',        GovAgency: 'regulated by',     MediaOutlet: 'reported on' },
    dbs:       { Company: 'client of',      Person: 'account holder at',    Entity: 'sponsors',            GovAgency: 'regulated by',     MediaOutlet: 'reported on' },
    bloomberg: { Person: 'source for',      Company: 'covered by',          MediaOutlet: 'cited by',       GovAgency: 'quoted in',        Entity: 'reported on' },
    changi:    { Person: 'transited at',    Company: 'tenant at',           Entity: 'connects to',         GovAgency: 'managed by',       MediaOutlet: 'reported on' },
    fans:      { Person: 'fellow fan',      Company: 'spent at',            MediaOutlet: 'documented by',  Entity: 'visited',             GovAgency: 'facilitated by' },
  };

  const nodes = coreNodes.map(n => ({ ...n, x: n.fx * w, y: n.fy * h, vx: 0, vy: 0 }));

  for (let i = 0; i < 1000; i++) {
    const cluster = clusterCenters[i % clusterCenters.length];
    const typeIdx = i % types.length;
    const type    = types[typeIdx];
    const spread  = 0.12 + Math.random() * 0.08;
    const angle   = Math.random() * Math.PI * 2;
    const dist    = Math.random() * spread;
    const bx = Math.max(10, Math.min(w - 10, (cluster.x + Math.cos(angle) * dist) * w));
    const by = Math.max(10, Math.min(h - 10, (cluster.y + Math.sin(angle) * dist) * h));

    const pool  = namesByType[type];
    const label = pool[i % pool.length];

    nodes.push({
      id: `n${i}`,
      label,
      size:  1.5 + Math.random() * 2.5,
      color: colors[typeIdx],
      type,
      x: bx, y: by,
      baseX: bx, baseY: by,
      driftAmp:   4 + Math.random() * 10,
      driftFreqX: 0.18 + Math.random() * 0.28,
      driftFreqY: 0.14 + Math.random() * 0.22,
      driftPhaseX: Math.random() * Math.PI * 2,
      driftPhaseY: Math.random() * Math.PI * 2,
      vx: 0, vy: 0,
    });
  }

  // Start with the semantically accurate core edges
  const edges = [...coreEdges];

  // Satellite nodes — each connects to its nearest core node with a meaningful label
  for (let i = coreNodes.length; i < nodes.length; i++) {
    const n = nodes[i];
    let minDist = Infinity, nearestCore = 0;
    for (let j = 0; j < coreNodes.length; j++) {
      const dx = n.x - nodes[j].x, dy = n.y - nodes[j].y;
      const d = dx * dx + dy * dy;
      if (d < minDist) { minDist = d; nearestCore = j; }
    }
    const coreId  = nodes[nearestCore].id;
    const relMap  = satelliteRelLabel[coreId] || {};
    const edgeLbl = relMap[n.type] || 'related to';
    edges.push({ from: coreId, to: n.id, label: edgeLbl });

    // Optional extra peer-to-peer connections within proximity
    const conns = 1 + Math.floor(Math.random() * 2);
    for (let c = 0; c < conns; c++) {
      const j = coreNodes.length + Math.floor(Math.random() * (nodes.length - coreNodes.length));
      if (j !== i) {
        const dx = n.x - nodes[j].x, dy = n.y - nodes[j].y;
        if (dx * dx + dy * dy < (w * 0.15) ** 2) {
          edges.push({ from: n.id, to: nodes[j].id, label: 'connected to' });
        }
      }
    }
  }

  return { nodes, edges, coreEdges };
}

// ─── Main screen creator ─────────────────────────────────────────────────
export function createAgents(onComplete) {
  const el = document.createElement('div');
  el.className = 'screen sandbox-screen sim-v3';
  el.id = 'screen-agents';

  const totalAgents = agentCategories.reduce((sum, c) => sum + c.count, 0);
  const modal = createAgentModal();

  el.innerHTML = `
    <!-- LEFT: Knowledge Graph (canvas + chrome unchanged) -->
    <div class="sandbox-left" id="sandbox-left">
      <div class="sandbox-kg-wrap" id="kg-wrap">
        <canvas id="kg-canvas"></canvas>

        <!-- Header (top-left) -->
        <div class="sandbox-kg-header">
          <div class="sandbox-kg-title">
            <span class="sandbox-kg-dot"></span>
            Knowledge Graph
          </div>
          <div class="sim-kg__phase" id="sim-kg-phase">Building world model<span style="opacity:0.5">…</span></div>
          <div class="sandbox-kg-controls">
            <button class="sandbox-ctrl-btn" id="kg-refresh-btn" title="Refresh Layout" style="display:none;">Refresh</button>
          </div>
        </div>

        <!-- Stats pills (top-right) -->
        <div class="sandbox-kg-stats" id="kg-stats">
          <span><b id="kg-node-count">0</b><span>nodes</span></span>
          <span class="sandbox-stats-sep">·</span>
          <span><b id="kg-edge-count">0</b><span>edges</span></span>
          <span><b id="kg-agent-count">0</b><span>agents</span></span>
        </div>

        <!-- Floating stacked controls (right side) -->
        <div class="sim-kg__controls">
          <button class="sim-kg__ctrl" id="kg-zoom-in" title="Zoom in">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
          <button class="sim-kg__ctrl" id="kg-zoom-out" title="Zoom out">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
          <button class="sim-kg__ctrl" id="kg-reset" title="Reset">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.51"/></svg>
          </button>
        </div>

        <!-- Legend bottom-left -->
        <div class="sandbox-kg-legend" id="kg-legend">
          ${Object.entries(DARK_ENTITY_COLORS).map(([t,c]) => `
            <span class="sandbox-legend-item">
              <span class="sandbox-legend-dot" style="background:${c}; color:${c};"></span>${t}
            </span>
          `).join('')}
        </div>

        <!-- Hint bottom-right -->
        <div class="sandbox-kg-hint">click &amp; drag · scroll to zoom</div>
      </div>
    </div>

    <!-- RIGHT: sim panel ─────────────────────────────────────── -->
    <aside class="sandbox-right" id="sandbox-right">
      <header class="sim-panel__head">
        <div class="sim-panel__phase-tag" id="sim-phase-tag">Phase 1 — World construction</div>
        <h2 class="sim-panel__title" id="sim-panel-title">Building <em>digital sandbox</em></h2>
        <p class="sim-panel__sub" id="sim-panel-sub">Extracting entities, populating agent demographics, mapping behaviour chains. The graph on the left grows as we go.</p>
        <div class="sim-panel__progress">
          <div class="sim-panel__progress-fill" id="sim-progress-fill"></div>
        </div>
        <div class="sim-panel__progress-meta">
          <span id="sim-progress-label">Step 1 of 3</span>
          <span id="sim-progress-pct">0%</span>
        </div>
      </header>

      <div class="sim-panel__body" id="sim-panel-body">
        <!-- ══ PHASE 1: BUILD ══ -->
        <div id="phase-build">
          <!-- Step 1 -->
          <div class="sim-bstep is-active is-open" id="step-1" data-step="1">
            <div class="sim-bstep__header" id="step-1-hdr">
              <div class="sim-bstep__num" id="step-1-num">1</div>
              <div class="sim-bstep__info">
                <div class="sim-bstep__name">Knowledge graph construction</div>
                <div class="sim-bstep__status" id="step-1-status">Initialising…</div>
              </div>
              <div class="sbp-step-badge" id="step-1-badge"></div>
              <span class="sim-bstep__chev">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
              </span>
            </div>
            <div class="sim-bstep__body" id="step-1-body">
              <div class="sim-bstep__body-inner">
                <ul class="sim-bstep__log" id="kg-log"></ul>
              </div>
            </div>
          </div>

          <!-- Step 2 -->
          <div class="sim-bstep" id="step-2" data-step="2">
            <div class="sim-bstep__header" id="step-2-hdr">
              <div class="sim-bstep__num" id="step-2-num">2</div>
              <div class="sim-bstep__info">
                <div class="sim-bstep__name">Agent population generation</div>
                <div class="sim-bstep__status" id="step-2-status">Waiting…</div>
              </div>
              <div class="sbp-step-badge" id="step-2-badge"></div>
              <span class="sim-bstep__chev">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
              </span>
            </div>
            <div class="sim-bstep__body" id="step-2-body">
              <div class="sim-bstep__body-inner">
                <div class="sbp-counter" id="agent-counter">Preparing agent profiles…</div>
                <div class="sbp-agent-list" id="agent-list"></div>
              </div>
            </div>
          </div>

          <!-- Step 3 -->
          <div class="sim-bstep" id="step-3" data-step="3">
            <div class="sim-bstep__header" id="step-3-hdr">
              <div class="sim-bstep__num" id="step-3-num">3</div>
              <div class="sim-bstep__info">
                <div class="sim-bstep__name">Economic behaviour chain mapping</div>
                <div class="sim-bstep__status" id="step-3-status">Waiting…</div>
              </div>
              <div class="sbp-step-badge" id="step-3-badge"></div>
              <span class="sim-bstep__chev">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
              </span>
            </div>
            <div class="sim-bstep__body" id="step-3-body">
              <div class="sim-bstep__body-inner">
                <div class="sbp-chain" id="behavior-chain"></div>
              </div>
            </div>
          </div>

          <!-- Hidden: legacy stats containers JS still writes to. -->
          <div class="sbp-stats-bar" id="sbp-stats-bar" style="display:none;">
            <div class="sbp-stat-val" id="stat-nodes">0</div>
            <div class="sbp-stat-val" id="stat-edges">0</div>
            <div class="sbp-stat-val" id="stat-agents">0</div>
            <div class="sbp-stat-val" id="stat-accuracy">—</div>
          </div>
        </div>

        <!-- ══ PHASE 2: SIMULATION ══ -->
        <div id="phase-sim" style="display:none;">
          <div class="sim-metrics">
            <div class="sim-metric">
              <div class="sim-metric__label">Tourism receipts</div>
              <div class="sim-metric__value" id="metric-gdp">S$0M</div>
              <div class="sim-metric__delta is-up" id="metric-gdp-delta">Calculating…</div>
            </div>
            <div class="sim-metric">
              <div class="sim-metric__label">Temp. jobs</div>
              <div class="sim-metric__value" id="metric-jobs">0</div>
              <div class="sim-metric__delta is-up" id="metric-jobs-delta">Ramping</div>
            </div>
            <div class="sim-metric">
              <div class="sim-metric__label">Hotel occupancy</div>
              <div class="sim-metric__value" id="metric-occupancy">75%</div>
              <div class="sim-metric__delta" id="metric-occ-delta">Baseline</div>
            </div>
            <div class="sim-metric">
              <div class="sim-metric__label">Changi pax (wk)</div>
              <div class="sim-metric__value" id="metric-flights">175K</div>
              <div class="sim-metric__delta" id="metric-flights-delta">Monitoring</div>
            </div>
          </div>

          <div class="sim-feed-head">
            <span>Agent feed · live</span>
            <span><span id="round-counter">0</span>/120</span>
          </div>

          <!-- Decision gate (paused) -->
          <div class="sim-dp-gate" id="sim-dp-gate" style="display:none;"></div>

          <div id="sim-feed"></div>
        </div>
      </div>

      <!-- Footer controls -->
      <footer class="sim-controls">
        <button class="sim-control-btn sim-control-btn--ghost" id="btn-skip-sim" style="display:none;">Skip →</button>
        <div class="sim-speed" id="sim-speed-wrap" style="display:none;">
          <span>Speed</span>
          <input type="range" min="1" max="10" value="5" id="speed-slider"/>
          <span id="speed-label">5×</span>
        </div>
        <button class="sim-control-btn sim-control-btn--primary" id="btn-start-sim" style="margin-left:auto;">Launch simulation →</button>
      </footer>
    </aside>
  `;

  // ── Build agent rows ──────────────────────────────────────────────────
  const agentListEl = el.querySelector('#agent-list');
  agentCategories.forEach(cat => {
    cat.agents.forEach(agent => {
      const row = document.createElement('div');
      row.className = 'sbp-agent-row';
      row.style.opacity = '0';
      row.style.transform = 'translateX(12px)';
      const avatarContent = agent.avatar.startsWith('http')
        ? `<img src="${agent.avatar}" alt="${agent.name}" style="width:100%;height:100%;border-radius:inherit;" />`
        : agent.avatar;
      row.innerHTML = `
        <div class="sbp-agent-avatar" style="background:${cat.bgColor}">${avatarContent}</div>
        <div class="sbp-agent-info">
          <div class="sbp-agent-name">${agent.name}</div>
          <div class="sbp-agent-role">${agent.role}</div>
        </div>
        <div class="sbp-agent-weight">
          <div class="sbp-agent-bar-wrap">
            <div class="sbp-agent-bar" data-width="${agent.influence * 100}" style="background:${cat.color};width:0%"></div>
          </div>
          <div class="sbp-agent-pct" style="color:${cat.color}">${(agent.influence * 100).toFixed(0)}%</div>
        </div>
      `;
      row.addEventListener('click', () => showAgentDetail(modal, agent, cat));
      agentListEl.appendChild(row);
    });
  });

  // ── Build behavior chain ──────────────────────────────────────────────
  const chainEl = el.querySelector('#behavior-chain');
  behaviorChain.forEach((node, i) => {
    if (i > 0) {
      const arr = document.createElement('span');
      arr.className = 'sbp-chain-arrow';
      arr.textContent = '→';
      chainEl.appendChild(arr);
    }
    const nd = document.createElement('div');
    nd.className = 'sbp-chain-node';
    nd.innerHTML = `
      <div class="sbp-chain-label">${node.label}</div>
      <div class="sbp-chain-val">${node.value}</div>
    `;
    chainEl.appendChild(nd);
  });

  // ── Speed slider ──────────────────────────────────────────────────────
  el.querySelector('#speed-slider').addEventListener('input', (e) => {
    el.querySelector('#speed-label').textContent = e.target.value + '×';
  });

  // ── Skip simulation ───────────────────────────────────────────────────
  el.querySelector('#btn-skip-sim').addEventListener('click', onComplete);

  // ── Launch Simulation button → switch to Phase 2 ─────────────────────
  const launchBtn = el.querySelector('#btn-start-sim');
  // Initially disabled until phase 1 completes.
  launchBtn.disabled = true;
  launchBtn.style.opacity = '0.45';
  launchBtn.style.pointerEvents = 'none';
  launchBtn.addEventListener('click', () => {
    if (launchBtn.disabled) return;
    el._runSimulation();
  });

  // ── KG controls (zoom in / out / reset) ───────────────────────────────
  const refreshLegacy = el.querySelector('#kg-refresh-btn');
  if (refreshLegacy) refreshLegacy.addEventListener('click', () => { el._rebuildKG && el._rebuildKG(); });
  const resetBtn = el.querySelector('#kg-reset');
  if (resetBtn)  resetBtn.addEventListener('click', () => { el._resetKG ? el._resetKG() : (el._rebuildKG && el._rebuildKG()); });
  const zoomInBtn  = el.querySelector('#kg-zoom-in');
  const zoomOutBtn = el.querySelector('#kg-zoom-out');
  if (zoomInBtn)  zoomInBtn.addEventListener('click',  () => el._zoomKG && el._zoomKG(1.18));
  if (zoomOutBtn) zoomOutBtn.addEventListener('click', () => el._zoomKG && el._zoomKG(1/1.18));

  // ── Panel toggle button (collapse / expand right panel) ──────────────
  const leftPanel  = el.querySelector('.sandbox-left');
  const rightPanel = el.querySelector('#sandbox-right');
  const toggleBtn  = document.createElement('button');
  toggleBtn.className = 'sbp-panel-toggle';
  toggleBtn.title = 'Toggle panel';
  toggleBtn.innerHTML = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>`;
  leftPanel.appendChild(toggleBtn);
  let panelOpen = true;
  toggleBtn.addEventListener('click', () => {
    panelOpen = !panelOpen;
    rightPanel.classList.toggle('collapsed', !panelOpen);
    toggleBtn.innerHTML = panelOpen
      ? `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>`
      : `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>`;
  });

  // ── Step collapse / expand on header click ─────────────────────────────
  [1, 2, 3].forEach(n => {
    const hdr  = el.querySelector(`#step-${n}-hdr`);
    const body = el.querySelector(`#step-${n}-body`);
    const step = el.querySelector(`#step-${n}`);
    if (!hdr || !body) return;
    hdr.addEventListener('click', () => {
      step.classList.toggle('is-open');
    });
  });

  // ── Stage tracker helper ─────────────────────────────────────────────────
  function updateStageTracker(activeStage) {
    el.querySelectorAll('.sim-stage-step').forEach(step => {
      const s = parseInt(step.dataset.stage);
      step.classList.toggle('completed', s < activeStage);
      step.classList.toggle('active', s === activeStage);
    });
    el.querySelectorAll('.sim-stage-line').forEach((line, i) => {
      line.classList.toggle('completed', i + 1 < activeStage);
    });
  }

  // Build an inverse lookup: DP-id → plan step number, titled from the
  // *current plan* so the paused-checkpoint card reads in the user's own
  // terms (no "DP-1", no "Stage 1 · Ontology" jargon).
  function buildDpContext(plan) {
    const byDpId = {};
    if (!plan) return byDpId;
    for (const [stepNStr, dpIds] of Object.entries(PLAN_STEP_TO_DP_IDS)) {
      const stepN = Number(stepNStr);
      const planStep = plan.steps.find(s => s.n === stepN);
      if (!planStep) continue;
      dpIds.forEach((id) => {
        byDpId[id] = { planStep };
      });
    }
    return byDpId;
  }

  // ── User decision gate ───────────────────────────────────────────────────
  //
  // Header uses plan-step vocabulary:
  //   "Checkpoint 2 of 4"  (ordinal within the user's selected gates)
  //   "Step 2 · Build US equity market ontology"  (plain plan step name)
  // No more "DP-X" / "Stage X · StageName" — the user never saw those terms.
  function showUserDecisionGate(dp, { ordinal, totalCheckpoints, planStep } = {}) {
    return new Promise(resolve => {
      const feedEl  = el.querySelector('#sim-feed');
      const gateEl  = el.querySelector('#sim-dp-gate');
      const consensus     = computeAgentConsensus(dp);
      const leader        = computeCommunityLeader(dp);
      const agentOption   = dp.options.find(o => o.id === consensus?.optionId);
      const communityOpt  = dp.options.find(o => o.id === leader?.optionId);
      // Voices from agents who share the consensus stance (up to 2)
      const agentVoices   = dp.agentOpinions.filter(a => a.stance === consensus?.optionId).slice(0, 2);

      const stepLabel = planStep
        ? `Step ${planStep.n} · ${planStep.title}`
        : `Step · ${dp.title}`;
      const ordLabel = (ordinal && totalCheckpoints)
        ? `Checkpoint ${ordinal} of ${totalCheckpoints}`
        : 'Checkpoint';

      gateEl.innerHTML = `
        <div class="sdg-header">
          <span class="sdg-badge">Paused · ${ordLabel}</span>
          <span class="sdg-stage-pill">${stepLabel}</span>
        </div>
        <div class="sdg-title">${dp.title}</div>
        <div class="sdg-desc">${dp.description}</div>

        <!-- ① Agent recommendation — single consensus answer + expandable detail -->
        <div class="sdg-section">
          <div class="sdg-section__label">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20a8 8 0 0 1 16 0"/></svg>
            What the agents recommend
            ${consensus ? `<span class="sdg-consensus-pill">${consensus.count} of ${consensus.total} agents</span>` : ''}
          </div>
          ${agentOption ? `
            <div class="sdg-answer">
              <div class="sdg-answer__label">${agentOption.label}</div>
              <div class="sdg-answer__summary">${agentOption.summary}</div>
              ${agentVoices.length ? `
                <div class="sdg-voices">
                  <div class="sdg-voices__intro">Why they picked this:</div>
                  ${agentVoices.map(v => `
                    <div class="sdg-voice">
                      <span class="sdg-voice__name">${v.agent}</span>
                      <span class="sdg-voice__text">"${v.reasoning}"</span>
                    </div>
                  `).join('')}
                </div>
              ` : ''}
            </div>
            <button class="sdg-view-btn" data-modal="agent">See all ${dp.agentOpinions.length} agent opinions
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          ` : '<div class="sdg-answer__summary">No consensus reached.</div>'}
        </div>

        <!-- ② Community result — single winning answer + expandable breakdown -->
        <div class="sdg-section">
          <div class="sdg-section__label">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="7" r="3"/><circle cx="17" cy="7" r="3"/><path d="M1 21v-1a7 7 0 0 1 7-7h1"/><path d="M17 14a7 7 0 0 1 7 7v1"/></svg>
            Community result
            ${leader ? `<span class="sdg-consensus-pill">${leader.pct}% · ${leader.votes} votes</span>` : ''}
          </div>
          ${communityOpt ? `
            <div class="sdg-answer">
              <div class="sdg-answer__label">${communityOpt.label}</div>
              <div class="sdg-answer__summary">${communityOpt.summary}</div>
            </div>
            <button class="sdg-view-btn" data-modal="community">Full breakdown
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          ` : ''}
        </div>

        <!-- ③ Your call — 3 choices; "Other" expands textarea -->
        <div class="sdg-section sdg-section--input">
          <div class="sdg-section__label">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
            Your call
          </div>
          <div class="sdg-choices">
            <button class="sdg-choice" data-choice="agent">
              <span class="sdg-choice__key">A</span>
              <div class="sdg-choice__body">
                <div class="sdg-choice__tag">Follow agents</div>
                <div class="sdg-choice__text">${agentOption?.label ?? '—'}</div>
              </div>
            </button>
            <button class="sdg-choice" data-choice="community">
              <span class="sdg-choice__key">B</span>
              <div class="sdg-choice__body">
                <div class="sdg-choice__tag">Follow community</div>
                <div class="sdg-choice__text">${communityOpt?.label ?? '—'}</div>
              </div>
            </button>
            <button class="sdg-choice" data-choice="other">
              <span class="sdg-choice__key">C</span>
              <div class="sdg-choice__body">
                <div class="sdg-choice__tag">Other</div>
                <div class="sdg-choice__text">Specify your own direction</div>
              </div>
            </button>
          </div>
          <textarea
            class="sdg-input"
            id="sdg-input"
            placeholder="Describe your custom decision for this checkpoint…"
            rows="3"
            style="display:none; margin-top:8px;"
          ></textarea>
        </div>

        <div class="sdg-actions">
          <button class="sdg-confirm-btn" id="sdg-confirm" disabled>Confirm decision →</button>
        </div>
      `;

      gateEl.style.display = 'flex';
      feedEl.style.display = 'none';

      // Detail modal handlers
      function openDetailModal(type) {
        const total = leader?.total ?? 0;
        let bodyHTML = '';
        let titleText = '';

        if (type === 'agent') {
          titleText = planStep ? `Agent opinions · Step ${planStep.n}` : `Agent opinions`;
          bodyHTML = dp.agentOpinions.map(op => {
            const opt = dp.options.find(o => o.id === op.stance);
            const isConsensus = op.stance === consensus?.optionId;
            return `
              <div class="sdg-detail-agent${isConsensus ? ' sdg-detail-agent--consensus' : ''}">
                <span class="sdg-detail-agent__avatar">${op.agent.slice(0,2).toUpperCase()}</span>
                <div class="sdg-detail-agent__body">
                  <div class="sdg-detail-agent__name">${op.agent}
                    <span class="sdg-detail-agent__stance">${isConsensus ? '✓ consensus' : op.stance}</span>
                  </div>
                  <div class="sdg-detail-agent__option">${opt?.label ?? op.stance}</div>
                  <div class="sdg-detail-agent__reasoning">"${op.reasoning}"</div>
                </div>
              </div>`;
          }).join('');
        } else {
          titleText = planStep
            ? `Community votes · Step ${planStep.n} · ${total} total`
            : `Community votes · ${total} total`;
          bodyHTML = [...dp.options]
            .sort((a,b) => (dp.communityVotes[b.id]||0) - (dp.communityVotes[a.id]||0))
            .map(o => {
              const votes = dp.communityVotes[o.id] || 0;
              const pct   = total ? Math.round((votes / total) * 100) : 0;
              const isTop = o.id === leader?.optionId;
              return `
                <div class="sdg-detail-vote-row${isTop ? ' sdg-detail-vote-row--top' : ''}">
                  <span class="sdg-detail-vote-id">${o.id}</span>
                  <div class="sdg-detail-vote-info">
                    <div class="sdg-detail-vote-label">${o.label}</div>
                    <div class="sdg-detail-vote-bar-wrap">
                      <div class="sdg-detail-vote-bar" style="width:${pct}%"></div>
                    </div>
                  </div>
                  <div class="sdg-detail-vote-nums">
                    <span class="sdg-detail-vote-pct">${pct}%</span>
                    <span class="sdg-detail-vote-count">${votes} votes</span>
                  </div>
                </div>`;
            }).join('') + `
            <a class="sdg-detail-link" href="#" target="_blank" rel="noopener">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              View original community vote thread
            </a>`;
        }

        const overlay = document.createElement('div');
        overlay.className = 'sdg-modal-overlay';
        overlay.innerHTML = `
          <div class="sdg-modal-card">
            <div class="sdg-modal-head">
              <div class="sdg-modal-title">${titleText}</div>
              <button class="sdg-modal-close" aria-label="Close">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div class="sdg-modal-body">${bodyHTML}</div>
          </div>`;

        document.body.appendChild(overlay);
        requestAnimationFrame(() => overlay.classList.add('visible'));

        const closeModal = () => {
          overlay.classList.remove('visible');
          overlay.addEventListener('transitionend', () => overlay.remove(), { once: true });
        };
        overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
        overlay.querySelector('.sdg-modal-close').addEventListener('click', closeModal);
      }

      gateEl.querySelectorAll('.sdg-view-btn').forEach(btn => {
        btn.addEventListener('click', () => openDetailModal(btn.dataset.modal));
      });

      const textarea   = gateEl.querySelector('#sdg-input');
      const confirmBtn = gateEl.querySelector('#sdg-confirm');
      let selectedChoice = null;

      gateEl.querySelectorAll('.sdg-choice').forEach(btn => {
        btn.addEventListener('click', () => {
          gateEl.querySelectorAll('.sdg-choice').forEach(b => b.classList.remove('selected'));
          btn.classList.add('selected');
          selectedChoice = btn.dataset.choice;

          if (selectedChoice === 'other') {
            textarea.style.display = 'block';
            textarea.focus();
            confirmBtn.disabled = textarea.value.trim().length === 0;
          } else {
            textarea.style.display = 'none';
            confirmBtn.disabled = false;
          }
        });
      });

      textarea.addEventListener('input', () => {
        if (selectedChoice === 'other') {
          confirmBtn.disabled = textarea.value.trim().length === 0;
        }
      });

      confirmBtn.addEventListener('click', () => {
        let decisionText, decisionSource;
        if (selectedChoice === 'agent') {
          decisionText = agentOption.label + ' — ' + agentOption.summary;
          decisionSource = 'Agents';
        } else if (selectedChoice === 'community') {
          decisionText = communityOpt.label + ' — ' + communityOpt.summary;
          decisionSource = 'Community';
        } else {
          decisionText = textarea.value.trim();
          decisionSource = 'Custom';
        }

        gateEl.style.display = 'none';
        feedEl.style.display = '';

        const card = document.createElement('div');
        card.className = 'sim-post sim-post--user-decision';
        card.innerHTML = `
          <div class="sim-post__avatar sim-post__avatar--decision">✓</div>
          <div class="sim-post__content">
            <div class="sim-post__header">
              <span class="sim-post__handle" style="color:#60A5FA;">Your decision</span>
              <span class="sim-post__meta">${planStep ? `Step ${planStep.n}` : 'Checkpoint'} · via ${decisionSource}</span>
            </div>
            <div class="sim-post__text">${decisionText}</div>
            <div class="sim-post__footer">
              <span class="sim-post__sentiment" style="background:rgba(96,165,250,0.15);color:#60A5FA;">applied</span>
            </div>
          </div>
        `;
        feedEl.appendChild(card);
        feedEl.scrollTop = feedEl.scrollHeight;
        card.style.opacity = '0';
        requestAnimationFrame(() => {
          card.style.transition = 'opacity 0.3s ease';
          card.style.opacity = '1';
        });

        resolve({ choice: selectedChoice, text: decisionText });
      });
    });
  }

  // ── Community vote card ──────────────────────────────────────────────────
  function injectCommunityVoteCard(feedEl, dp, { ordinal, totalCheckpoints, planStep } = {}) {
    const leader = computeCommunityLeader(dp);
    const total = Object.values(dp.communityVotes).reduce((a, b) => a + b, 0);
    const stepLabel = planStep ? `Step ${planStep.n} · ${planStep.title}` : dp.stageName;
    const ordLabel = (ordinal && totalCheckpoints)
      ? `${ordinal} of ${totalCheckpoints}`
      : '';

    const card = document.createElement('div');
    card.className = 'sim-post sim-post--community-vote';
    card.style.opacity = '0';
    card.style.transform = 'translateY(10px)';
    card.innerHTML = `
      <div class="spcv-header">
        <span class="spcv-badge">Community vote ${ordLabel ? `· ${ordLabel}` : ''}</span>
        <span class="spcv-stage">${stepLabel}</span>
      </div>
      <div class="spcv-title">${dp.title}</div>
      <div class="spcv-bars">
        ${dp.options.map(o => {
          const votes = dp.communityVotes[o.id] || 0;
          const pct = total ? Math.round((votes / total) * 100) : 0;
          const isWinner = o.id === leader?.optionId;
          return `
            <div class="spcv-bar-row${isWinner ? ' winner' : ''}">
              <span class="spcv-bar-id">${o.id}</span>
              <div class="spcv-bar-track">
                <div class="spcv-bar-fill" style="width:${pct}%"></div>
              </div>
              <span class="spcv-bar-pct">${pct}%</span>
              <span class="spcv-bar-label">${o.label}</span>
            </div>
          `;
        }).join('')}
      </div>
      <div class="spcv-result">
        Applied option ${leader?.optionId}: "${leader?.option?.label}"
      </div>
    `;
    feedEl.appendChild(card);
    feedEl.scrollTop = feedEl.scrollHeight;
    requestAnimationFrame(() => {
      card.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
      card.style.opacity = '1';
      card.style.transform = 'translateY(0)';
    });
  }

  // ── Phase transition: World Build → Simulation ──────────────────────
  el._runSimulation = async () => {
    const phaseBuild = el.querySelector('#phase-build');
    const phaseSim   = el.querySelector('#phase-sim');

    // Slide out build panel
    phaseBuild.style.transition = 'opacity 0.35s ease, transform 0.35s ease';
    phaseBuild.style.opacity = '0';
    phaseBuild.style.transform = 'translateX(20px)';

    await delay(360);
    phaseBuild.style.display = 'none';

    // Slide in simulation panel
    phaseSim.style.display = 'block';
    phaseSim.style.opacity = '0';
    phaseSim.style.transform = 'translateX(-20px)';
    phaseSim.style.transition = 'opacity 0.35s ease, transform 0.35s ease';
    await delay(20);
    phaseSim.style.opacity = '1';
    phaseSim.style.transform = 'translateX(0)';

    // Update header chrome to reflect phase 2
    const phaseTag  = el.querySelector('#sim-phase-tag');
    const panelTitle = el.querySelector('#sim-panel-title');
    const panelSub   = el.querySelector('#sim-panel-sub');
    const progFill   = el.querySelector('#sim-progress-fill');
    const progLbl    = el.querySelector('#sim-progress-label');
    const progPct    = el.querySelector('#sim-progress-pct');
    if (phaseTag)   phaseTag.textContent  = 'Phase 2 — Multi-agent simulation';
    if (panelTitle) panelTitle.innerHTML  = 'Running <em>simulation</em>';
    if (panelSub)   panelSub.textContent  = 'Agents interact across 120 rounds. Behaviours feed Input-Output, CGE & Monte Carlo aggregation in real time.';
    if (progFill)   progFill.style.width  = '0%';
    if (progLbl)    progLbl.textContent   = 'Round 0 of 120';
    if (progPct)    progPct.textContent   = '0%';

    // Show speed + skip controls; hide launch
    const skipBtn   = el.querySelector('#btn-skip-sim');
    const speedWrap = el.querySelector('#sim-speed-wrap');
    const startBtn  = el.querySelector('#btn-start-sim');
    if (skipBtn)   skipBtn.style.display   = '';
    if (speedWrap) speedWrap.style.display = '';
    if (startBtn)  startBtn.style.display  = 'none';

    await delay(400);

    // Run simulation
    const feedEl   = el.querySelector('#sim-feed');
    const roundEl  = el.querySelector('#round-counter');
    const speedSlider = el.querySelector('#speed-slider');

    feedEl.innerHTML = '';
    await delay(400);

    // ── Participation config & plan-aware checkpoint schedule ──
    //
    // Decision gates only fire inside the Simulation sub-stage of the
    // plan (steps 5 & 6 in our standard 8-step template — Profiles and
    // Simulation). Between gates the sim keeps running so the user sees
    // posts flow past. Each triggered gate pauses the feed; once
    // confirmed, the feed resumes until the next gate (or end).
    const cfg = getConfig();
    const plan = getCurrentPlan();
    const dpCtx = buildDpContext(plan);

    const triggeredDPs = new Set();

    // Which DP-ids need a gate?
    //   - user      → plan-step ticks translated to DP ids
    //   - community → every DP goes to the crowd
    //   - sandbox   → none
    const scheduledDpIds = cfg.mode === PARTICIPATION_MODES.USER
      ? new Set(planStepsToDecisionPointIds(cfg.selectedPlanSteps || []))
      : cfg.mode === PARTICIPATION_MODES.COMMUNITY
        ? new Set(DECISION_POINTS.map(d => d.id))
        : new Set();

    // Stage boundaries — which stage (1–5) is active at a given pct.
    //   1 Ontology   (0   – 20%)
    //   2 Graph      (20  – 40%)
    //   3 Profiles   (40  – 60%)
    //   4 Simulation (60  – 80%)
    //   5 Report     (80  – 100%)
    const STAGE_BOUNDARIES = [0.20, 0.40, 0.60, 0.80, 1.00];

    // Anchor each DP to the END of its owning plan step, then map that
    // plan-step end to a pct inside the Simulation sub-stage (60–95%).
    // This spreads gates across the sim feed instead of firing them all
    // at the 60% boundary. Plan steps without a DP are skipped.
    const STEP_COUNT = plan?.steps?.length || 8;
    const GATE_WINDOW_START = 0.62;
    const GATE_WINDOW_END   = 0.95;
    function pctForStepEnd(stepN) {
      const t = stepN / STEP_COUNT; // 0..1 across plan
      return GATE_WINDOW_START + t * (GATE_WINDOW_END - GATE_WINDOW_START);
    }

    // Build the ordered checkpoint queue (DP objects the user / community
    // must see, in canonical order, each tagged with its firing pct).
    const canonicalDps = DECISION_POINTS.filter(dp => scheduledDpIds.has(dp.id));
    const checkpointQueue = canonicalDps.map((dp, i) => {
      const stepN = Object.entries(PLAN_STEP_TO_DP_IDS)
        .find(([, ids]) => ids.includes(dp.id))?.[0];
      const stepEnd = stepN ? pctForStepEnd(Number(stepN)) : 0.75;
      return {
        dp,
        pct: stepEnd,
        ordinal: i + 1,
        planStep: dpCtx[dp.id]?.planStep,
      };
    });
    const totalCheckpoints = checkpointQueue.length;
    let nextCheckpointIdx = 0;

    // Initialise stage tracker
    updateStageTracker(1);

    for (let i = 0; i < simulationPosts.length; i++) {
      const post     = simulationPosts[i];
      const roundNum = Math.round(((i + 1) / simulationPosts.length) * 120);
      roundEl.textContent = roundNum;
      // Sync the editorial progress bar in the header.
      const _pf = el.querySelector('#sim-progress-fill');
      const _pl = el.querySelector('#sim-progress-label');
      const _pp = el.querySelector('#sim-progress-pct');
      const _frac = roundNum / 120;
      if (_pf) _pf.style.width = (_frac * 100).toFixed(1) + '%';
      if (_pl) _pl.textContent = `Round ${roundNum} of 120`;
      if (_pp) _pp.textContent = Math.round(_frac * 100) + '%';

      // ── Stage tracker update ──
      const pct = (i + 1) / simulationPosts.length;
      const stageIdx = STAGE_BOUNDARIES.findIndex(b => pct <= b);
      updateStageTracker(stageIdx >= 0 ? stageIdx + 1 : 5);

      // ── Fire any checkpoints whose trigger pct has been reached ──
      while (
        nextCheckpointIdx < checkpointQueue.length &&
        pct >= checkpointQueue[nextCheckpointIdx].pct
      ) {
        const { dp, ordinal, planStep } = checkpointQueue[nextCheckpointIdx];
        nextCheckpointIdx += 1;
        if (triggeredDPs.has(dp.id)) continue;
        triggeredDPs.add(dp.id);

        if (cfg.mode === PARTICIPATION_MODES.USER) {
          await showUserDecisionGate(dp, { ordinal, totalCheckpoints, planStep });
        } else if (cfg.mode === PARTICIPATION_MODES.COMMUNITY) {
          injectCommunityVoteCard(feedEl, dp, { ordinal, totalCheckpoints, planStep });
          await delay(600);
        }
      }

      // ── Decision gates are handled above (distributed across the run) ──

      const metricIdx = Math.min(Math.floor((i / simulationPosts.length) * metricsTimeline.length), metricsTimeline.length - 1);
      const m = metricsTimeline[metricIdx];
      el.querySelector('#metric-gdp').textContent        = `S$${m.gdp[0]}–${m.gdp[1]}M`;
      el.querySelector('#metric-gdp-delta').textContent  = `80% CI range`;
      el.querySelector('#metric-jobs').textContent       = `${m.jobs[0].toLocaleString()}–${m.jobs[1].toLocaleString()}`;
      el.querySelector('#metric-jobs-delta').textContent = `projected range`;
      el.querySelector('#metric-occupancy').textContent  = `${m.occupancy[0]}–${m.occupancy[1]}%`;
      el.querySelector('#metric-occ-delta').textContent  = `+${m.occupancy[0] - metricsBaseline.occupancy}–${m.occupancy[1] - metricsBaseline.occupancy}pp vs baseline`;
      const fLowK  = Math.round(m.flights[0] / 1000);
      const fHighK = Math.round(m.flights[1] / 1000);
      el.querySelector('#metric-flights').textContent = `${fLowK}–${fHighK}K`;
      const fLow  = Math.round(((m.flights[0] - metricsBaseline.flights) / metricsBaseline.flights) * 100);
      const fHigh = Math.round(((m.flights[1] - metricsBaseline.flights) / metricsBaseline.flights) * 100);
      el.querySelector('#metric-flights-delta').textContent = `+${fLow}–${fHigh}% vs normal`;

      // Render post card
      const postEl = document.createElement('div');
      postEl.className = 'sim-post';
      postEl.style.opacity = '0';
      postEl.style.transform = 'translateY(10px)';
      const avatarContent = post.avatar.startsWith('http')
        ? `<img src="${post.avatar}" alt="${post.handle}" style="width:100%;height:100%;border-radius:50%;" />`
        : post.avatar;
      postEl.innerHTML = `
        <div class="sim-post__avatar">${avatarContent}</div>
        <div class="sim-post__content">
          <div class="sim-post__header">
            <span class="sim-post__handle">${post.handle}</span>
            <span class="sim-post__meta">@${post.username} · ${post.time}</span>
          </div>
          <div class="sim-post__text">${post.text}</div>
          <div class="sim-post__footer">
            <span class="sim-post__stat sim-post__stat--up">↑ ${post.likes.toLocaleString()}</span>
            <span class="sim-post__stat">↻ ${post.reposts.toLocaleString()}</span>
            <span class="sim-post__sentiment sim-post__sentiment--${post.sentiment}">${post.sentiment}</span>
          </div>
        </div>
      `;
      feedEl.appendChild(postEl);
      feedEl.scrollTop = feedEl.scrollHeight;

      // Animate in
      requestAnimationFrame(() => {
        postEl.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
        postEl.style.opacity = '1';
        postEl.style.transform = 'translateY(0)';
      });

      // Speed-aware delay (speed 1 = 3000ms, speed 10 = 300ms)
      const speed = parseInt(speedSlider.value) || 5;
      const pauseMs = Math.round(3200 / speed);
      await delay(pauseMs);
    }

    // Flush any checkpoints whose pct slipped past the final iteration
    // (defensive — normally the in-loop trigger covers everything).
    while (nextCheckpointIdx < checkpointQueue.length) {
      const { dp, ordinal, planStep } = checkpointQueue[nextCheckpointIdx];
      nextCheckpointIdx += 1;
      if (triggeredDPs.has(dp.id)) continue;
      triggeredDPs.add(dp.id);
      if (cfg.mode === PARTICIPATION_MODES.USER) {
        await showUserDecisionGate(dp, { ordinal, totalCheckpoints, planStep });
      } else if (cfg.mode === PARTICIPATION_MODES.COMMUNITY) {
        injectCommunityVoteCard(feedEl, dp, { ordinal, totalCheckpoints, planStep });
        await delay(600);
      }
    }

    roundEl.textContent = '120';
    await delay(600);

    // Completion card
    const completeEl = document.createElement('div');
    completeEl.className = 'sim-post sim-post--complete';
    completeEl.innerHTML = `
      <div class="sim-post__avatar sim-post__avatar--done">✓</div>
      <div class="sim-post__content">
        <div class="sim-post__handle" style="color:#34D399;">Loka Engine</div>
        <div class="sim-post__text" style="color:#F1F5F9;">
          Simulation complete. 120 rounds processed across 2,000 agents. Ready to generate the research report.
        </div>
        <div style="margin-top:12px;">
          <button class="btn btn--primary btn--sm" id="btn-view-analytics">View Report →</button>
        </div>
      </div>
    `;
    feedEl.appendChild(completeEl);
    feedEl.scrollTop = feedEl.scrollHeight;
    completeEl.querySelector('#btn-view-analytics').addEventListener('click', onComplete);
  };

  // ── Animation runner (Phase 1 — World Build) ──────────────────────────
  el._runAnimation = async () => {
    const { rebuildKG, nodeCount, edgeCount } = await setupKG(el, modal);
    el._rebuildKG = rebuildKG;

    const animateStat = (statEl, target, suffix = '') => {
      let v = 0;
      const step = Math.ceil(target / 40);
      const id = setInterval(() => {
        v = Math.min(v + step, target);
        statEl.textContent = v.toLocaleString() + suffix;
        if (v >= target) clearInterval(id);
      }, 40);
    };
    animateStat(el.querySelector('#stat-nodes'), nodeCount);
    animateStat(el.querySelector('#stat-edges'), edgeCount);

    // Step 1 — log messages
    const logEl = el.querySelector('#kg-log');
    for (const msg of kgLogMessages) {
      const line = document.createElement('div');
      line.className = 'sbp-log-line';
      line.textContent = msg;
      logEl.appendChild(line);
      logEl.scrollTop = logEl.scrollHeight;
      await delay(160);
    }
    completeStep(el, 1, '✓ Complete');
    await delay(300);

    // Step 2 — agents
    unlockStep(el, 2);
    let count = 0;
    const counterEl = el.querySelector('#agent-counter');
    const counterInterval = setInterval(() => {
      count += Math.floor(Math.random() * 300) + 100;
      if (count > totalAgents) count = totalAgents;
      counterEl.textContent = `Generating ${count.toLocaleString()} / ${totalAgents.toLocaleString()} agent profiles...`;
      if (count >= totalAgents) {
        clearInterval(counterInterval);
        counterEl.textContent = `✓ ${totalAgents.toLocaleString()} agent profiles generated`;
        counterEl.style.color = '#34D399';
      }
    }, 100);

    const rows = el.querySelectorAll('.sbp-agent-row');
    rows.forEach((row, i) => {
      setTimeout(() => {
        row.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        row.style.opacity = '1';
        row.style.transform = 'translateX(0)';
      }, i * 55);
    });
    setTimeout(() => {
      el.querySelectorAll('.sbp-agent-bar').forEach(b => {
        b.style.transition = 'width 0.7s ease';
        b.style.width = b.dataset.width + '%';
      });
    }, 200);

    await delay(1200);
    animateStat(el.querySelector('#stat-agents'), totalAgents);
    completeStep(el, 2, '✓ Complete');
    await delay(300);

    // Step 3 — behavior chain
    unlockStep(el, 3);
    const chainNodes  = el.querySelectorAll('.sbp-chain-node');
    const chainArrows = el.querySelectorAll('.sbp-chain-arrow');
    chainNodes.forEach((n, i)  => setTimeout(() => n.classList.add('visible'), i * 90));
    chainArrows.forEach((a, i) => setTimeout(() => a.classList.add('visible'), i * 90 + 45));

    await delay(1200);
    el.querySelector('#stat-accuracy').textContent = '0.94';
    completeStep(el, 3, '✓ Complete');
    await delay(300);

    // Phase 1 done — flag the launch button as primed.
    const btn = el.querySelector('#btn-start-sim');
    if (btn) {
      btn.disabled = false;
      btn.style.opacity = '1';
      btn.style.pointerEvents = 'auto';
      btn.classList.add('is-ready');
    }
    // Update header for "ready to launch" state.
    const phaseTag2  = el.querySelector('#sim-phase-tag');
    const panelTitle2 = el.querySelector('#sim-panel-title');
    const panelSub2   = el.querySelector('#sim-panel-sub');
    const fill2 = el.querySelector('#sim-progress-fill');
    const lbl2  = el.querySelector('#sim-progress-label');
    const pct2  = el.querySelector('#sim-progress-pct');
    if (phaseTag2)   phaseTag2.textContent = 'Phase 1 — Ready';
    if (panelTitle2) panelTitle2.innerHTML = '<em>Sandbox</em> ready';
    if (panelSub2)   panelSub2.textContent = 'World model assembled. Launch to begin the multi-agent simulation.';
    if (fill2) fill2.style.width = '100%';
    if (lbl2)  lbl2.textContent  = 'Build complete';
    if (pct2)  pct2.textContent  = '100%';
  };

  /**
   * Real-mode hook — fetch /api/project/<id>/data, swap the mutable agent
   * + simulation refs to the backend payload, and re-render the screen.
   *
   * Because peter-jim's agents.js uses its DOM template literal once at
   * mount time, we don't easily rebuild cards in place here — instead we
   * mark the screen unanimated and let _runAnimation play again with the
   * new data when the user next navigates to this screen. The KG canvas
   * auto-uses customGraphData via rebuildGraph().
   */
  el._loadProject = async (projectId) => {
    if (!projectId) return;
    try {
      const data = await fetchProjectData(projectId);
      const a = data.agents || {};
      const s = data.simulation || {};

      if (Array.isArray(a.agentCategories) && a.agentCategories.length) {
        agentCategories = a.agentCategories;
      }
      if (Array.isArray(a.behaviorChain) && a.behaviorChain.length) {
        behaviorChain = a.behaviorChain;
      }
      if (Array.isArray(a.kgLogMessages) && a.kgLogMessages.length) {
        kgLogMessages = a.kgLogMessages;
      }
      if (a.graphData && Array.isArray(a.graphData.nodes) && a.graphData.nodes.length) {
        customGraphData = a.graphData;
      }

      if (Array.isArray(s.simulationPosts) && s.simulationPosts.length) {
        simulationPosts = s.simulationPosts;
      }
      if (Array.isArray(s.metricsTimeline) && s.metricsTimeline.length) {
        metricsTimeline = s.metricsTimeline;
      }
      if (s.metricsBaseline && typeof s.metricsBaseline === 'object') {
        metricsBaseline = s.metricsBaseline;
      }

      // Force the KG canvas to rebuild with the new customGraphData.
      // The ResizeObserver already calls rebuildGraph on size change;
      // we trigger a manual rebuild via a fake size tick.
      const wrap = el.querySelector('#kg-wrap');
      if (wrap) {
        wrap.style.transition = 'none';
        // nudge a reflow
        wrap.offsetHeight;
      }
      // Mark screen unanimated so main.js replays _runAnimation on next nav
      el._animated = false;
    } catch (err) {
      console.warn('agents._loadProject failed:', err);
    }
  };

  return el;
}

// ─── Step helpers ─────────────────────────────────────────────────────────
function unlockStep(el, n) {
  const step = el.querySelector(`#step-${n}`);
  const stat = el.querySelector(`#step-${n}-status`);
  step.classList.remove('is-done');
  step.classList.add('is-active', 'is-open');
  stat.textContent = 'Building…';
  // Update progress bar (n=1 → 0%, 2 → 33%, 3 → 66%)
  const fill  = el.querySelector('#sim-progress-fill');
  const lbl   = el.querySelector('#sim-progress-label');
  const pct   = el.querySelector('#sim-progress-pct');
  if (fill && lbl && pct) {
    const p = Math.round(((n - 1) / 3) * 100);
    fill.style.width = p + '%';
    lbl.textContent = `Step ${n} of 3`;
    pct.textContent = p + '%';
  }
}

function completeStep(el, n, label) {
  const step  = el.querySelector(`#step-${n}`);
  const stat  = el.querySelector(`#step-${n}-status`);
  step.classList.remove('is-active');
  step.classList.add('is-done');
  // Auto-collapse completed step so the next one becomes the focus.
  step.classList.remove('is-open');
  stat.textContent = '✓ Complete';
  // Bump the progress bar to reflect this step finishing.
  const fill = el.querySelector('#sim-progress-fill');
  const pct  = el.querySelector('#sim-progress-pct');
  if (fill && pct) {
    const p = Math.round((n / 3) * 100);
    fill.style.width = p + '%';
    pct.textContent = p + '%';
  }
}

// ─── KG Canvas Setup ─────────────────────────────────────────────────────
async function setupKG(el, modal) {
  const wrapper = el.querySelector('.sandbox-kg-wrap');
  const canvas  = el.querySelector('#kg-canvas');
  // 3d-force-graph manages its own renderer/canvas, so swap the legacy
  // <canvas> for an empty <div> host with the same id.
  const host = document.createElement('div');
  host.id = 'kg-canvas';
  host.style.cssText = 'position:absolute;inset:0;width:100%;height:100%';
  if (canvas) canvas.replaceWith(host); else wrapper.appendChild(host);

  const { mount3DGraph } = await import('./kg-3d.js');

  // Data producer — Cosmograph asks for it on every rebuild. We respect
  // customGraphData (real Zep payload from a loaded project) and fall
  // back to the procedural mock so demo mode stays alive.
  function produceData() {
    const W = wrapper.clientWidth || 800;
    const H = wrapper.clientHeight || 600;
    const fromCustom = customGraphData ? buildKgFromCustomGraph(customGraphData, W, H) : null;
    const data = fromCustom && fromCustom.nodes.length ? fromCustom : generateDenseKG(W, H);
    return { nodes: data.nodes, edges: data.edges };
  }

  const cosmos = mount3DGraph(host, modal, produceData);

  // Live counts that follow the growth animation (not the final dataset).
  let liveNodeCount = 0;
  let liveEdgeCount = 0;
  function paintStats() {
    const nc = el.querySelector('#kg-node-count');
    const ec = el.querySelector('#kg-edge-count');
    const ac = el.querySelector('#kg-agent-count');
    if (nc) nc.textContent = liveNodeCount;
    if (ec) ec.textContent = liveEdgeCount;
    // Keep the agent badge tracking the final personae count so the
    // right-panel summary still reads correctly.
    const data = produceData();
    if (ac) ac.textContent = data.nodes.filter(n => n.type === 'Person').length || 0;
  }
  paintStats();

  // Kick off the growth animation. Stats + KG phase chip update live.
  function startGrowth(durationMs) {
    cosmos.grow({
      totalDurationMs: durationMs ?? 9000,
      seedCount: 8,
      batchInterval: 200,
      onProgress: (p, nShown, eShown) => {
        liveNodeCount = nShown;
        liveEdgeCount = eShown;
        paintStats();
        const phaseEl = el.querySelector('#sim-kg-phase');
        if (phaseEl) {
          if (p < 1) {
            phaseEl.innerHTML = `Building world model<span style="opacity:0.5">…</span>`;
          } else {
            phaseEl.textContent = 'World model assembled';
          }
        }
      },
    });
  }
  // Auto-start growth as soon as KG mounts. Phase 1 build lasts ~9s
  // which lines up with the existing 3-step status animation.
  startGrowth();
  el._startKgGrowth = startGrowth;

  // Public rebuild fn — used by the Refresh button and by the
  // _loadProject hook to swap in a real graph once it's fetched.
  // Re-runs the growth animation from scratch on the new data.
  function rebuildKG() {
    syncCanvasSize();
    liveNodeCount = 0;
    liveEdgeCount = 0;
    paintStats();
    startGrowth();
  }

  // Resize tracking — Cosmograph handles its own canvas sizing once
  // mounted, but we still want to refit when the panel is collapsed /
  // expanded.
  const ro = new ResizeObserver(() => { syncCanvasSize(); });
  ro.observe(wrapper);

  // Expose programmatic zoom for the +/- buttons in the chrome.
  el._zoomKG  = (factor) => cosmos.zoom(factor);
  el._resetKG = () => cosmos.reset();

  return { rebuildKG, nodeCount: produceData().nodes.length, edgeCount: produceData().edges.length };
}
