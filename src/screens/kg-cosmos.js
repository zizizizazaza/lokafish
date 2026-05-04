// kg-cosmos.js — Cosmograph-powered knowledge graph renderer.
//
// Replaces the hand-rolled Canvas2D force-graph in agents.js with
// Cosmograph's WebGL renderer. We keep:
//   • the same data shape (nodes / edges from generateDenseKG or
//     buildKgFromCustomGraph)
//   • node click → showNodeDetail modal (the original pop-up)
//   • the chrome around the canvas (header, stats pills, legend, hint)
//
// All visual upgrades (glow, force-directed clustering, smooth zoom,
// edge fade by importance) come from Cosmograph for free.

import { Graph } from '@cosmograph/cosmos';
import { showNodeDetail } from '../components/agent-modal.js';

// Same palette the legacy renderer used, so the legend stays accurate.
// Cosmograph WebGL prefers [r,g,b,a] tuples in 0..1 range — strings are
// supported but fail silently for some pipelines, so we pre-convert.
// Cosmograph internally divides RGB by 255 when given an array form,
// so we keep components in 0..255 range. Alpha stays 0..1.
function hexToRGBA(hex, a = 1) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return [150, 165, 184, a];
  const v = parseInt(m[1], 16);
  return [(v >> 16 & 255), (v >> 8 & 255), (v & 255), a];
}
const ENTITY_COLORS = {
  Person:      hexToRGBA('#f87171'),
  Company:     hexToRGBA('#60a5fa'),
  Entity:      hexToRGBA('#34d399'),
  GovAgency:   hexToRGBA('#a78bfa'),
  MediaOutlet: hexToRGBA('#facc15'),
  Venue:       hexToRGBA('#34d399'),
  Sector:      hexToRGBA('#38bdf8'),
  Event:       hexToRGBA('#a78bfa'),
  Policy:      hexToRGBA('#f87171'),
  Asset:       hexToRGBA('#eab308'),
};
const FALLBACK_COLOR = hexToRGBA('#94a3b8');

/**
 * Mount a Cosmograph instance on the given <canvas>.
 *
 * @param {HTMLCanvasElement} canvas      Target canvas (use one already in DOM).
 * @param {object} modal                  Agent-detail modal (passed to showNodeDetail).
 * @param {() => {nodes:Array, edges:Array}} getData
 *        Producer that returns the latest nodes/edges. Called on every
 *        rebuild — lets us keep using the existing demo / custom-graph
 *        data sources without re-implementing them.
 * @returns {{
 *   rebuild: () => void,
 *   zoom: (factor: number) => void,
 *   reset: () => void,
 *   destroy: () => void,
 * }}
 */
export function mountCosmosGraph(canvas, modal, getData) {
  let lastNodes = [];
  let lastLinks = [];

  // Cosmograph wants nodes with `id` and links with `source`/`target`.
  // Our edges use `from`/`to`, so we adapt.
  function adapt(nodes, edges) {
    const idSet = new Set(nodes.map(n => n.id));
    const links = edges
      .filter(e => idSet.has(e.from) && idSet.has(e.to))
      .map(e => ({ source: e.from, target: e.to, label: e.label }));
    // Add a degree count so node size can reflect importance.
    const deg = {};
    links.forEach(l => {
      deg[l.source] = (deg[l.source] || 0) + 1;
      deg[l.target] = (deg[l.target] || 0) + 1;
    });
    const points = nodes.map(n => {
      // Strip legacy x/y/vx/vy that the old Canvas2D renderer wrote.
      // Cosmograph wants its own simulation to seed positions, otherwise
      // every node spawns in roughly the same spot and the layout
      // collapses to a single dot.
      const { x, y, vx, vy, fx, fy, ...rest } = n;
      return { ...rest, _deg: deg[n.id] || 0 };
    });
    return { points, links };
  }

  const config = {
    backgroundColor: '#0a0a0c',

    // Visuals — node size scales with degree so hubs visually dominate.
    nodeColor: (n) => {
      if (n.color && /^#[0-9a-f]{6}$/i.test(n.color)) return hexToRGBA(n.color);
      return ENTITY_COLORS[n.type] || FALLBACK_COLOR;
    },
    // Mid-range sizes — non-hub nodes 3px, hubs up to ~10px.
    nodeSize: (n) => {
      const d = n._deg || 0;
      return Math.max(3, Math.min(10, 3 + Math.sqrt(d) * 0.7));
    },
    nodeSizeScale: 1,
    // Greyout values only apply WHEN a selection is active (pulse).
    // While idle they have no effect, so we can keep them low for a
    // strong "spotlight" feel during cluster pulses.
    nodeGreyoutOpacity: 0.18,
    renderHighlightedNodeRing: true,
    hoveredNodeRingColor: '#ea5a2c',
    focusedNodeRingColor: '#ea5a2c',

    // Edges — slim threads, dim by default but bright on hover/pulse.
    linkColor: 'rgba(180,190,210,0.22)',
    linkWidth: 0.55,
    linkWidthScale: 1,
    linkArrows: false,
    curvedLinks: false,
    linkGreyoutOpacity: 0.04,

    // Layout — Cosmograph defaults plus a stronger gravity so the
    // constellations don't fly off-screen. The natural simulation
    // settle-time IS the growth animation — nodes fly in from random
    // positions and snap into clusters over ~2.5s.
    // Defaults below are Cosmograph's recommended starting point for
    // medium-density graphs (~1k nodes).
    spaceSize: 4096,
    fitViewOnInit: true,
    fitViewDelay: 2500,
    fitViewPadding: 0.15,
    simulation: {
      repulsion: 2,
      repulsionTheta: 1.15,
      linkSpring: 0.5,
      linkDistance: 10,
      gravity: 0.25,
      friction: 0.85,
      decay: 2500,   // simulation cools down in ~2.5 s, keeps layout stable
    },

    // Click → reuse the legacy node-detail modal so all the popup
    // copy / keyboard handling stays exactly the same.
    onClick: (clickedNode) => {
      if (!clickedNode) return;
      const original = lastNodes.find(n => n.id === clickedNode.id);
      if (original) showNodeDetail(modal, original, lastLinks, lastNodes);
    },

    // Cosmetic: hover ring nudges the user that nodes are clickable.
    onNodeMouseOver: () => { canvas.style.cursor = 'pointer'; },
    onMouseMove:     (n) => { if (!n) canvas.style.cursor = 'default'; },
  };

  const graph = new Graph(canvas, config);

  // ── Manual click hit-test ──────────────────────────────────────────
  // Cosmograph's built-in onClick uses the rendered point's pixel
  // radius for hit-test, which is tight at small node sizes (3–10 px).
  // We add a more forgiving DOM-level handler that finds the nearest
  // node within `HIT_RADIUS_PX` of the pointer and opens the modal.
  const HIT_RADIUS_PX = 28;
  let mouseDownPos = null;
  canvas.addEventListener('mousedown', (e) => {
    mouseDownPos = { x: e.clientX, y: e.clientY };
  });
  canvas.addEventListener('mouseup', (e) => {
    if (!mouseDownPos) return;
    const dx = e.clientX - mouseDownPos.x;
    const dy = e.clientY - mouseDownPos.y;
    mouseDownPos = null;
    // Treat anything > 4 px of motion as a drag, not a click.
    if (Math.hypot(dx, dy) > 4) return;

    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    let posMap;
    try {
      posMap = graph.getNodePositionsMap();
    } catch (_) { return; }
    if (!posMap || posMap.size === 0) return;

    let bestId = null;
    let bestD2 = HIT_RADIUS_PX * HIT_RADIUS_PX;
    // Iterate Map<id, [x,y]> so the id ↔ position pairing is exact,
    // independent of any internal Cosmograph ordering.
    for (const [id, sp] of posMap) {
      let s;
      try { s = graph.spaceToScreenPosition(sp); } catch (_) { continue; }
      const dx2 = s[0] - px, dy2 = s[1] - py;
      const d2 = dx2 * dx2 + dy2 * dy2;
      if (d2 < bestD2) {
        bestD2 = d2;
        bestId = id;
      }
    }
    if (bestId) {
      const node = lastNodes.find(n => n.id === bestId);
      if (node) showNodeDetail(modal, node, lastLinks, lastNodes);
    }
  });

  // ── Cluster pulse animation ────────────────────────────────────────
  // Cosmograph has no native "signal pulse along an edge" feature, so
  // we fake the signal-flow vibe by periodically selecting a random
  // hub and its neighbours — Cosmograph greys out everything else and
  // the highlighted sub-graph "lights up", which reads as data flowing
  // through that part of the network.
  let pulseTimer = null;
  function startPulse() {
    if (pulseTimer) return;
    pulseTimer = setInterval(() => {
      if (!lastNodes.length) return;
      // Bias toward higher-degree (hub) nodes for visual interest.
      const ranked = [...lastNodes].sort(() => Math.random() - 0.5).slice(0, 80);
      const top = ranked.sort((a, b) => (degreeOf(b.id) - degreeOf(a.id))).slice(0, 3);
      const ids = top.map(n => n.id);
      // Include 1-hop neighbours so the connecting edges stay bright.
      const idSet = new Set(ids);
      lastLinks.forEach(e => {
        if (idSet.has(e.from)) idSet.add(e.to);
        if (idSet.has(e.to))   idSet.add(e.from);
      });
      try { graph.selectNodesByIds([...idSet]); } catch (_) {}
      setTimeout(() => { try { graph.unselectNodes(); } catch (_) {} }, 1100);
    }, 1900);
  }
  function stopPulse() {
    if (pulseTimer) { clearInterval(pulseTimer); pulseTimer = null; }
    try { graph.unselectNodes(); } catch (_) {}
  }
  // Cache degrees for the pulse to pick hubs.
  let _degCache = null;
  function degreeOf(id) {
    if (!_degCache) {
      _degCache = {};
      lastLinks.forEach(e => {
        _degCache[e.from] = (_degCache[e.from] || 0) + 1;
        _degCache[e.to]   = (_degCache[e.to]   || 0) + 1;
      });
    }
    return _degCache[id] || 0;
  }

  function rebuild() {
    const data = getData();
    if (!data || !data.nodes || !data.nodes.length) return;
    lastNodes = data.nodes;
    lastLinks = data.edges;
    _degCache = null;
    const { points, links } = adapt(data.nodes, data.edges);
    graph.setData(points, links);
  }

  // Seed an empty canvas so the very first render is dark + ready
  // for growth, not a full 1k-node blast.
  graph.setData([], []);

  // Sort nodes so that hubs come first — biggest "stars" seed the graph,
  // then satellites grow around them. This produces the "world model
  // assembling" feeling instead of a flat 1k-node dump.
  function rankNodesByDegree(nodes, edges) {
    const deg = {};
    edges.forEach(e => {
      deg[e.from] = (deg[e.from] || 0) + 1;
      deg[e.to]   = (deg[e.to]   || 0) + 1;
    });
    return [...nodes].sort((a, b) => (deg[b.id] || 0) - (deg[a.id] || 0));
  }

  /**
   * "Growth" effect — feeds the full graph to Cosmograph in one shot
   * (so the simulation has stable positions to converge to) and then
   * animates the stats counter from 0 → final over `totalDurationMs`.
   * Visually, the user sees Cosmograph's natural particle-assembly
   * animation: random scatter → settle into clusters over ~2-3 s.
   *
   * @param {object}   opts
   * @param {number}   opts.totalDurationMs  How long the counter ticks.
   * @param {(p:number, n:number, e:number) => void} [opts.onProgress]
   */
  function grow(opts = {}) {
    const totalDuration = opts.totalDurationMs ?? 6000;

    const data = getData();
    if (!data || !data.nodes || !data.nodes.length) return;
    lastNodes = data.nodes;
    lastLinks = data.edges;
    _degCache = null;

    const ranked = rankNodesByDegree(data.nodes, data.edges);
    const { points, links } = adapt(ranked, data.edges);

    // 1. Render the whole graph once. Cosmograph's force simulation
    //    starts every node at a random scatter and pulls them into the
    //    final layout over ~2-3 s — that IS the growth animation.
    graph.setData(points, links);

    // 2. After the simulation settles, fit-view once more (the
    //    fitViewOnInit fires too early at ~2.5s) and kick off the
    //    cluster-pulse animation so the network feels alive.
    setTimeout(() => {
      try { graph.fitView(900, 0.18); } catch (_) {}
      startPulse();
    }, 3200);

    // 2. Tick the stats counter so the right-panel "X nodes / Y edges"
    //    pills count up in sync. Decoupled from rendering so the layout
    //    stays stable.
    if (!opts.onProgress) return;
    const totalN = ranked.length;
    const totalE = data.edges.length;
    const start  = performance.now();
    let frameId  = 0;
    function tick() {
      const elapsed = performance.now() - start;
      const p = Math.min(1, elapsed / totalDuration);
      // Ease-out cubic so the counter feels alive, not linear.
      const eased = 1 - Math.pow(1 - p, 3);
      opts.onProgress(p, Math.round(totalN * eased), Math.round(totalE * eased));
      if (p < 1) frameId = requestAnimationFrame(tick);
    }
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }

  // ── Public API ───────────────────────────────────────────────────
  return {
    rebuild,
    grow,
    startPulse,
    stopPulse,
    zoom: (factor) => {
      const cur = graph.getZoomLevel();
      graph.zoom(cur * factor, 220);
    },
    reset: () => {
      graph.fitView(450);
    },
    destroy: () => {
      stopPulse();
      try { graph.destroy(); } catch (_) {}
    },
  };
}
