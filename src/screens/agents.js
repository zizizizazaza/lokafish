// Agents screen — Dense KG (1000+ nodes), draggable, clickable agent cards

import {
  agentCategories as staticAgentCategories,
  behaviorChain as staticBehaviorChain,
  entityTypes,
  kgLogMessages as staticKgLogMessages,
} from '../data/agents.js';
import { createAgentModal, showAgentDetail, showNodeDetail } from '../components/agent-modal.js';
import { delay, staggerReveal, formatNumber } from '../utils/animation.js';
import { fetchProjectData } from '../lib/project_client.js';

// Mutable refs — _loadProject swaps these to the real backend payload.
let agentCategories = staticAgentCategories;
let behaviorChain = staticBehaviorChain;
let kgLogMessages = staticKgLogMessages;
// When a real project is loaded, this holds the raw Zep graph (nodes/edges)
// so the KG canvas can render user data instead of the procedural mock.
let customGraphData = null;

/**
 * Convert a raw Zep graph_data payload ({nodes, edges}) into the shape the
 * KG canvas animation loop expects. Positions are seeded by hashing node
 * names so the layout is stable across reloads.
 */
function buildKgFromCustomGraph(graph, w, h) {
  const rawNodes = graph?.nodes || [];
  const rawEdges = graph?.edges || [];
  if (!rawNodes.length) return null;

  const pickColor = (labels) => {
    for (const l of labels || []) {
      if (entityTypes[l]) return entityTypes[l];
    }
    return entityTypes.Entity || '#0F7B6C';
  };

  // Deterministic pseudo-random from a string, for stable node positions
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

  // Cap at 200 to keep the canvas snappy; take the most "important" first
  // (those with more connections = higher degree).
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
    const size = isCore ? 14 - i * 0.5 : Math.max(3, Math.min(8, 3 + deg * 0.6));
    // Clustered layout: core nodes near center, periphery around rings
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
      edges.push([s, t]);
    }
  }

  return { nodes, edges };
}

// Generate 1000+ KG nodes procedurally — used as a fallback when the
// backend hasn't provided a real graph_data payload.
function generateDenseKG(w, h) {
  const coreNodes = [
    { id: 'ts', label: 'Taylor Swift', size: 18, color: '#E03E3E', type: 'Person', fx: 0.5, fy: 0.35 },
    { id: 'sg', label: 'Singapore', size: 16, color: '#0F7B6C', type: 'Entity', fx: 0.35, fy: 0.5 },
    { id: 'venue', label: 'Nat. Stadium', size: 12, color: '#0F7B6C', type: 'Entity', fx: 0.55, fy: 0.48 },
    { id: 'stb', label: 'STB', size: 10, color: '#E03E3E', type: 'GovAgency', fx: 0.2, fy: 0.35 },
    { id: 'mti', label: 'Min. Trade', size: 10, color: '#E03E3E', type: 'GovAgency', fx: 0.15, fy: 0.25 },
    { id: 'airlines', label: 'SIA', size: 11, color: '#2383E2', type: 'Company', fx: 0.7, fy: 0.55 },
    { id: 'mbs', label: 'MBS', size: 10, color: '#D9730D', type: 'Company', fx: 0.3, fy: 0.65 },
    { id: 'grab', label: 'Grab', size: 9, color: '#0F7B6C', type: 'Company', fx: 0.15, fy: 0.6 },
    { id: 'dbs', label: 'DBS', size: 9, color: '#D9730D', type: 'Company', fx: 0.75, fy: 0.7 },
    { id: 'bloomberg', label: 'Bloomberg', size: 9, color: '#6940A5', type: 'MediaOutlet', fx: 0.82, fy: 0.3 },
    { id: 'changi', label: 'Changi', size: 10, color: '#2383E2', type: 'Entity', fx: 0.65, fy: 0.38 },
    { id: 'gdp', label: 'GDP Impact', size: 12, color: '#2383E2', type: 'Entity', fx: 0.25, fy: 0.2 },
  ];

  const types = Object.keys(entityTypes);
  const colors = Object.values(entityTypes);
  const clusterCenters = [
    { x: 0.5, y: 0.35 }, { x: 0.25, y: 0.55 }, { x: 0.7, y: 0.5 },
    { x: 0.4, y: 0.7 }, { x: 0.15, y: 0.4 }, { x: 0.8, y: 0.35 },
    { x: 0.6, y: 0.25 }, { x: 0.35, y: 0.85 }, { x: 0.85, y: 0.65 },
  ];

  const names = [
    'Hotel_', 'Rest_', 'Shop_', 'Fan_', 'Tourist_', 'Driver_', 'Worker_',
    'Analyst_', 'Reporter_', 'Investor_', 'Agent_', 'Vendor_', 'Staff_',
    'Operator_', 'Manager_', 'Director_', 'Trader_', 'Consultant_',
  ];

  const nodes = coreNodes.map(n => ({
    ...n,
    x: n.fx * w, y: n.fy * h, vx: 0, vy: 0,
  }));

  // Generate ~1000 additional nodes clustered around centers
  for (let i = 0; i < 1000; i++) {
    const cluster = clusterCenters[i % clusterCenters.length];
    const typeIdx = i % types.length;
    const spread = 0.12 + Math.random() * 0.08;
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * spread;
    const x = (cluster.x + Math.cos(angle) * dist) * w;
    const y = (cluster.y + Math.sin(angle) * dist) * h;

    nodes.push({
      id: `n${i}`,
      label: names[i % names.length] + (Math.floor(i / names.length) + 1),
      size: 1.5 + Math.random() * 2.5,
      color: colors[typeIdx],
      type: types[typeIdx],
      x: Math.max(10, Math.min(w - 10, x)),
      y: Math.max(10, Math.min(h - 10, y)),
      vx: 0, vy: 0,
    });
  }

  // Generate edges — connect to nearby nodes + core connections
  const edges = [];
  const coreEdges = [
    ['ts', 'sg'], ['ts', 'venue'], ['ts', 'bloomberg'], ['sg', 'stb'], ['sg', 'mti'],
    ['sg', 'changi'], ['sg', 'gdp'], ['stb', 'mti'], ['airlines', 'changi'],
    ['mbs', 'sg'], ['grab', 'sg'], ['dbs', 'mbs'], ['venue', 'grab'],
  ];
  edges.push(...coreEdges);

  // Connect each non-core node to 1-3 nearby nodes
  for (let i = coreNodes.length; i < nodes.length; i++) {
    const n = nodes[i];
    // Connect to nearest core node
    let minDist = Infinity, nearestCore = 0;
    for (let j = 0; j < coreNodes.length; j++) {
      const dx = n.x - nodes[j].x, dy = n.y - nodes[j].y;
      const d = dx * dx + dy * dy;
      if (d < minDist) { minDist = d; nearestCore = j; }
    }
    edges.push([nodes[nearestCore].id, n.id]);

    // Connect to 1-2 random nearby non-core nodes
    const conns = 1 + Math.floor(Math.random() * 2);
    for (let c = 0; c < conns; c++) {
      const j = coreNodes.length + Math.floor(Math.random() * (nodes.length - coreNodes.length));
      if (j !== i) {
        const dx = n.x - nodes[j].x, dy = n.y - nodes[j].y;
        if (dx * dx + dy * dy < (w * 0.15) ** 2) {
          edges.push([n.id, nodes[j].id]);
        }
      }
    }
  }

  return { nodes, edges };
}

export function createAgents(onComplete) {
  const el = document.createElement('div');
  el.className = 'screen agents-screen';
  el.id = 'screen-agents';
  const totalAgents = agentCategories.reduce((sum, c) => sum + c.count, 0);
  const modal = createAgentModal();

  el.innerHTML = `
    <div class="agents-screen__header anim-fade-up">
      <div class="badge badge--blue" style="margin-bottom: 6px;">Phase 1 — World Construction</div>
      <h2 class="agents-screen__title">Building Digital Sandbox</h2>
      <p class="agents-screen__subtitle">Extracting entities, populating agent demographics, mapping economic behavior chains</p>
    </div>
    <div class="agents-screen__phases">
      <div class="agents-screen__phase" id="phase-1">
        <div class="agents-screen__phase-header">
          <div class="agents-screen__phase-num">1</div>
          <div class="agents-screen__phase-title">Knowledge Graph Construction</div>
          <div class="agents-screen__phase-status" id="phase-1-status">Initializing...</div>
        </div>
        <div class="kg-container" id="kg-container">
          <canvas class="kg-canvas" id="kg-canvas"></canvas>
          <div class="kg-legend" id="kg-legend">
            ${Object.entries(entityTypes).map(([type, color]) => `
              <span class="kg-legend__item"><span class="kg-legend__dot" style="background:${color};"></span>${type}</span>
            `).join('')}
          </div>
          <div class="kg-stats" id="kg-stats"></div>
          <div class="kg-log" id="kg-log"></div>
        </div>
        <div style="text-align: center; font-size: 11px; color: var(--text-muted); margin-top: 6px;">Click & drag nodes · Scroll to zoom · Click node for details</div>
      </div>
      <div class="agents-screen__phase" id="phase-2">
        <div class="agents-screen__phase-header">
          <div class="agents-screen__phase-num">2</div>
          <div class="agents-screen__phase-title">Agent Population Generation</div>
          <div class="agents-screen__phase-status" id="phase-2-status">Waiting...</div>
        </div>
        <div class="agents-screen__counter" id="agent-counter">Preparing agent profiles...</div>
        <div class="agent-grid" id="agent-grid"></div>
        <div style="text-align: center; font-size: 11px; color: var(--text-muted); margin-top: 6px;">Click any agent card to view full persona profile</div>
      </div>
      <div class="agents-screen__phase" id="phase-3">
        <div class="agents-screen__phase-header">
          <div class="agents-screen__phase-num">3</div>
          <div class="agents-screen__phase-title">Economic Behavior Chain Mapping</div>
          <div class="agents-screen__phase-status" id="phase-3-status">Waiting...</div>
        </div>
        <div class="behavior-flow">
          <div class="behavior-flow__chain" id="behavior-chain"></div>
        </div>
      </div>
      <div style="text-align: center; padding: 24px 0; opacity: 0;" id="agents-complete">
        <button class="btn btn--primary btn--lg" id="btn-start-sim">Launch Simulation →</button>
      </div>
    </div>
  `;

  // Build (or rebuild) the agent cards from the current `agentCategories`.
  // Extracted so _loadProject can re-render with new data after fetching.
  function rebuildAgentCards() {
    const gridEl = el.querySelector('#agent-grid');
    if (!gridEl) return;
    gridEl.innerHTML = '';
    agentCategories.forEach(cat => {
      (cat.agents || []).forEach(agent => {
        const card = document.createElement('div');
        card.className = 'agent-card';
        card.style.cursor = 'pointer';
        const avatarContent = agent.avatar && agent.avatar.startsWith('http')
          ? `<img src="${agent.avatar}" alt="${agent.name}" style="width:100%;height:100%;border-radius:inherit;" />`
          : (agent.avatar || agent.name?.[0] || '?');
        card.innerHTML = `
          <div class="agent-card__header">
            <div class="agent-card__avatar" style="background: ${cat.bgColor}">${avatarContent}</div>
            <div>
              <div class="agent-card__name">${agent.name}</div>
              <div class="agent-card__role">${agent.role}</div>
            </div>
          </div>
          <div class="agent-card__stats">
            <div class="agent-card__stat-row">
              <span>Econ. Weight</span>
              <span class="mono">${((agent.influence || 0) * 100).toFixed(0)}%</span>
            </div>
            <div class="agent-card__stat-bar">
              <div class="agent-card__stat-fill" data-width="${(agent.influence || 0) * 100}" style="background: ${cat.color}"></div>
            </div>
            <div style="display: flex; gap: 4px; flex-wrap: wrap; margin-top: 4px;">
              ${(agent.traits || []).map(t => `<span class="badge badge--blue" style="font-size: 9px; padding: 2px 5px;">${t}</span>`).join('')}
            </div>
          </div>
        `;
        card.addEventListener('click', () => showAgentDetail(modal, agent, cat));
        gridEl.appendChild(card);
      });
    });
  }

  function rebuildBehaviorChain() {
    const chainEl = el.querySelector('#behavior-chain');
    if (!chainEl) return;
    chainEl.innerHTML = '';
    (behaviorChain || []).forEach((node, i) => {
      if (i > 0) {
        const arrow = document.createElement('div');
        arrow.className = 'behavior-flow__arrow';
        arrow.textContent = '→';
        chainEl.appendChild(arrow);
      }
      const nodeEl = document.createElement('div');
      nodeEl.className = 'behavior-flow__node';
      nodeEl.innerHTML = `
        <div class="behavior-flow__node-label">${node.label}</div>
        <div class="behavior-flow__node-value">${node.value}</div>
      `;
      chainEl.appendChild(nodeEl);
    });
  }

  rebuildAgentCards();
  rebuildBehaviorChain();

  el.querySelector('#btn-start-sim').addEventListener('click', onComplete);

  el._runAnimation = async () => {
    el.querySelector('#phase-1').classList.add('visible');
    el.querySelector('#phase-1-status').textContent = 'Building...';

    await setupInteractiveKG(el, modal);

    const logEl = el.querySelector('#kg-log');
    for (const msg of kgLogMessages) {
      const line = document.createElement('div');
      line.textContent = msg;
      logEl.appendChild(line);
      logEl.scrollTop = logEl.scrollHeight;
      await delay(150);
    }
    el.querySelector('#phase-1-status').textContent = '✓ Complete';
    await delay(250);

    // Phase 2 — Agent cards
    el.querySelector('#phase-2').classList.add('visible');
    el.querySelector('#phase-2-status').textContent = 'Generating...';
    const counterEl = el.querySelector('#agent-counter');
    let count = 0;
    const counterInterval = setInterval(() => {
      count += Math.floor(Math.random() * 300) + 100;
      if (count > totalAgents) count = totalAgents;
      counterEl.textContent = `Generating ${formatNumber(count)} / ${formatNumber(totalAgents)} agent profiles...`;
      if (count >= totalAgents) {
        clearInterval(counterInterval);
        counterEl.textContent = `✓ ${formatNumber(totalAgents)} agent profiles generated`;
        counterEl.style.color = 'var(--green)';
      }
    }, 120);
    await delay(200);

    // Reveal cards with stagger
    const cards = el.querySelectorAll('.agent-card');
    cards.forEach((card, i) => {
      setTimeout(() => {
        card.style.opacity = '1';
        card.style.transform = 'translateY(0)';
      }, i * 60);
    });

    // Fill stat bars
    setTimeout(() => {
      el.querySelectorAll('.agent-card__stat-fill').forEach(fill => {
        fill.style.width = fill.dataset.width + '%';
      });
    }, 300);

    await delay(1400);
    el.querySelector('#phase-2-status').textContent = '✓ Complete';
    await delay(250);

    // Phase 3
    el.querySelector('#phase-3').classList.add('visible');
    el.querySelector('#phase-3-status').textContent = 'Mapping...';
    staggerReveal(el, '.behavior-flow__node', 100);
    setTimeout(() => staggerReveal(el, '.behavior-flow__arrow', 100), 50);
    await delay(1500);
    el.querySelector('#phase-3-status').textContent = '✓ Complete';
    await delay(250);

    const cta = el.querySelector('#agents-complete');
    cta.style.opacity = '1';
    cta.style.transition = 'opacity 0.3s';
  };

  /**
   * Real-mode hook — fetch the project from /api/project/<id>/data, swap
   * the agent data + KG graph to the backend payload, and rebuild
   * everything (cards, behavior chain, KG canvas) in place.
   */
  el._loadProject = async (projectId) => {
    if (!projectId) return;
    try {
      const data = await fetchProjectData(projectId);
      const a = data.agents || {};
      if (Array.isArray(a.agentCategories) && a.agentCategories.length) {
        agentCategories = a.agentCategories;
      }
      if (Array.isArray(a.behaviorChain) && a.behaviorChain.length) {
        behaviorChain = a.behaviorChain;
      }
      if (Array.isArray(a.kgLogMessages) && a.kgLogMessages.length) {
        kgLogMessages = a.kgLogMessages;
      }
      // Real Zep graph — used by setupInteractiveKG via buildKgFromCustomGraph
      if (a.graphData && Array.isArray(a.graphData.nodes) && a.graphData.nodes.length) {
        customGraphData = a.graphData;
      }

      rebuildAgentCards();
      rebuildBehaviorChain();

      // Make sure all cards/bars are visible even if _runAnimation hasn't fired
      el.querySelectorAll('.agent-card').forEach(c => {
        c.style.opacity = '1';
        c.style.transform = 'translateY(0)';
      });
      el.querySelectorAll('.agent-card__stat-fill').forEach(fill => {
        fill.style.width = fill.dataset.width + '%';
      });

      // Re-run the KG canvas with the new graph data. Wait a tick for the
      // DOM to settle in case the screen is being mounted concurrently.
      if (customGraphData && el.querySelector('#kg-container')) {
        try {
          await setupInteractiveKG(el, modal);
        } catch (err) {
          console.warn('KG re-render failed:', err);
        }
      }
    } catch (err) {
      console.warn('agents._loadProject failed:', err);
    }
  };

  return el;
}

async function setupInteractiveKG(el, modal) {
  const canvas = el.querySelector('#kg-canvas');
  const container = el.querySelector('#kg-container');
  const w = container.offsetWidth;
  const h = container.offsetHeight;
  const dpr = devicePixelRatio;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  const ctx = canvas.getContext('2d');

  // Prefer the real Zep graph if a project has been loaded; otherwise
  // fall back to the procedural 1000-node mock so the screen still looks
  // alive in demo mode.
  const fromCustom = customGraphData ? buildKgFromCustomGraph(customGraphData, w, h) : null;
  const { nodes, edges } = fromCustom && fromCustom.nodes.length
    ? fromCustom
    : generateDenseKG(w, h);
  const nodeMap = {};
  nodes.forEach(n => nodeMap[n.id] = n);

  // Stats display
  const statsEl = el.querySelector('#kg-stats');
  statsEl.textContent = `${nodes.length} nodes · ${edges.length} edges`;

  // Interaction state
  let dragging = null;
  let offsetX = 0, offsetY = 0;
  let zoom = 1;
  let panX = 0, panY = 0;

  // Mouse → canvas coords
  function toCanvas(e) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - panX) / zoom,
      y: (e.clientY - rect.top - panY) / zoom,
    };
  }

  function findNode(mx, my) {
    // Check core nodes first (larger)
    for (let i = 0; i < Math.min(12, nodes.length); i++) {
      const n = nodes[i];
      const dx = mx - n.x, dy = my - n.y;
      if (dx * dx + dy * dy < (n.size + 6) ** 2) return n;
    }
    // Then smaller nodes
    for (let i = 12; i < nodes.length; i++) {
      const n = nodes[i];
      const dx = mx - n.x, dy = my - n.y;
      if (dx * dx + dy * dy < (n.size + 4) ** 2) return n;
    }
    return null;
  }

  canvas.addEventListener('mousedown', (e) => {
    const { x, y } = toCanvas(e);
    const node = findNode(x, y);
    if (node) {
      dragging = node;
      offsetX = x - node.x;
      offsetY = y - node.y;
      canvas.style.cursor = 'grabbing';
    }
  });

  canvas.addEventListener('mousemove', (e) => {
    const { x, y } = toCanvas(e);
    if (dragging) {
      dragging.x = x - offsetX;
      dragging.y = y - offsetY;
    } else {
      canvas.style.cursor = findNode(x, y) ? 'pointer' : 'default';
    }
  });

  canvas.addEventListener('mouseup', (e) => {
    if (dragging) {
      const { x, y } = toCanvas(e);
      const dx = (x - offsetX) - dragging.x;
      const dy = (y - offsetY) - dragging.y;
      // If barely moved, treat as click
      if (Math.abs(dx) < 3 && Math.abs(dy) < 3) {
        showNodeDetail(modal, dragging, edges, nodes);
      }
      dragging = null;
      canvas.style.cursor = 'default';
    }
  });

  canvas.addEventListener('click', (e) => {
    if (!dragging) {
      const { x, y } = toCanvas(e);
      const node = findNode(x, y);
      if (node) showNodeDetail(modal, node, edges, nodes);
    }
  });

  // Zoom
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.95 : 1.05;
    zoom = Math.max(0.3, Math.min(3, zoom * delta));
  }, { passive: false });

  // Animate nodes appearing in waves
  let visibleCount = 0;
  const revealSpeed = 30; // nodes per frame

  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.translate(panX, panY);
    ctx.scale(zoom, zoom);

    const showN = Math.min(visibleCount, nodes.length);
    if (visibleCount < nodes.length) visibleCount += revealSpeed;

    // Edges — only draw those where both nodes are visible
    ctx.lineWidth = 0.3;
    for (let i = 0; i < edges.length; i++) {
      const [fromId, toId] = edges[i];
      const a = nodeMap[fromId], b = nodeMap[toId];
      if (!a || !b) continue;
      const aIdx = nodes.indexOf(a), bIdx = nodes.indexOf(b);
      if (aIdx >= showN || bIdx >= showN) continue;

      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = 'rgba(55,53,47,0.04)';
      ctx.stroke();
    }

    // Nodes
    const time = performance.now() / 1000;
    for (let i = 0; i < showN; i++) {
      const n = nodes[i];
      const isCore = i < 12;
      const pulse = isCore ? Math.sin(time * 1.2 + i) * 0.8 : 0;
      const size = n.size + pulse;

      ctx.beginPath();
      ctx.arc(n.x, n.y, size, 0, Math.PI * 2);
      ctx.fillStyle = isCore ? n.color + 'cc' : n.color + '55';
      ctx.fill();

      // Labels only for core nodes
      if (isCore) {
        ctx.font = '9px Inter, sans-serif';
        ctx.fillStyle = 'rgba(55,53,47,0.6)';
        ctx.textAlign = 'center';
        ctx.fillText(n.label, n.x, n.y + size + 11);
      }
    }

    // Highlight dragged node
    if (dragging) {
      ctx.beginPath();
      ctx.arc(dragging.x, dragging.y, dragging.size + 4, 0, Math.PI * 2);
      ctx.strokeStyle = dragging.color;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.restore();
    requestAnimationFrame(draw);
  }
  draw();
}
