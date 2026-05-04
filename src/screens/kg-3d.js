// kg-3d.js — 3D force-directed knowledge graph (text-node style).
//
// Mirrors the public API of mountCosmosGraph in kg-cosmos.js so agents.js
// can swap the renderer without touching the surrounding chrome.
//
// Visual: each node is a SpriteText (label + per-type color). Edges are
// thin grey lines. Camera uses the default orbit controls; click a node
// to open the existing showNodeDetail modal.

// IMPORTANT: 3d-force-graph (via three-render-objects' UMD bundle that Vite
// optimizeDeps picks) uses `window.THREE` as a hardcoded fallback that *omits*
// `Timer` (added in r170). Without exposing the real three on window first,
// `new three$1.Timer()` throws on init. We do the assignment in three-shim.js,
// which is imported BEFORE 3d-force-graph below — ES module evaluation
// guarantees its body runs before the next import is resolved, so by the time
// 3d-force-graph reads `window.THREE`, the full namespace is already there.
import './three-shim.js';
import ForceGraph3D from '3d-force-graph';
import SpriteText from 'three-spritetext';
import { showNodeDetail } from '../components/agent-modal.js';

const ENTITY_COLORS = {
  Person:      '#f87171',
  Company:     '#60a5fa',
  Entity:      '#34d399',
  GovAgency:   '#a78bfa',
  MediaOutlet: '#facc15',
  Venue:       '#34d399',
  Sector:      '#38bdf8',
  Event:       '#a78bfa',
  Policy:      '#f87171',
  Asset:       '#eab308',
};
const FALLBACK_COLOR = '#94a3b8';

function colorOf(node) {
  if (node.color && /^#[0-9a-f]{3,8}$/i.test(node.color)) return node.color;
  return ENTITY_COLORS[node.type] || FALLBACK_COLOR;
}

/**
 * Mount a 3d-force-graph instance inside a container <div>.
 * @param {HTMLElement} container  Empty div the canvas will fill.
 * @param {HTMLElement} modal      Pre-built agent-detail overlay.
 * @param {() => {nodes:Array, edges:Array}} getData
 */
export function mount3DGraph(container, modal, getData) {
  let lastNodes = [];
  let lastLinks = [];
  // ID of the currently-clicked node — drives link highlighting + dimming.
  // Cleared on background click. Read by the linkColor / linkWidth / particle
  // callbacks below, so a single Graph.refresh() repaints the whole network.
  let selectedId = null;

  // Adapt our { nodes, edges } shape to ForceGraph3D's { nodes, links }.
  function adapt(nodes, edges) {
    const idSet = new Set(nodes.map(n => n.id));
    const links = edges
      .filter(e => idSet.has(e.from) && idSet.has(e.to))
      .map(e => ({ source: e.from, target: e.to, label: e.label }));
    const deg = {};
    links.forEach(l => {
      deg[l.source] = (deg[l.source] || 0) + 1;
      deg[l.target] = (deg[l.target] || 0) + 1;
    });
    const ggNodes = nodes.map(n => {
      const { x, y, vx, vy, fx, fy, ...rest } = n;
      return { ...rest, _deg: deg[n.id] || 0 };
    });
    return { nodes: ggNodes, links };
  }

  const Graph = ForceGraph3D()(container)
    .backgroundColor('#1a2238')
    .showNavInfo(false)
    // Disable per-node drag — text sprites have wide invisible hitboxes that
    // hijacked empty-space drags and stopped camera rotation. Click still
    // works (it opens the detail modal); drag is now camera-only.
    .enableNodeDrag(false)
    .nodeRelSize(3)
    .nodeOpacity(0.95)
    .nodeResolution(10)
    .nodeColor((n) => colorOf(n))
    // Scale the default sphere by degree — hubs become visibly bigger dots.
    .nodeVal((n) => 1 + (n._deg || 0) * 0.6)
    // Keep the default sphere AND layer our text label on top.
    .nodeThreeObjectExtend(true)
    .nodeThreeObject((node) => {
      const text = node.label || node.name || node.id || '';
      const display = text.length > 24 ? text.slice(0, 23) + '…' : text;
      const deg = node._deg || 0;
      const isHub = deg >= 8;
      const sprite = new SpriteText(display);
      sprite.color = colorOf(node);
      sprite.fontFace = 'Inter Tight, system-ui, sans-serif';
      // High canvas resolution → sharp text after the sprite is scaled up
      // in world space. Anything below ~120 looked blurry on retina.
      sprite.fontSize = 160;
      sprite.fontWeight = isHub ? '700' : '500';
      // No background chip — the previous near-opaque slab got upscaled
      // along with the canvas and showed as black rectangles around hubs.
      sprite.backgroundColor = false;
      // Tight padding in world units so the canvas hugs the glyphs.
      sprite.padding = 0.3;
      sprite.borderRadius = 0;
      sprite.material.transparent = true;
      sprite.material.depthWrite = false;
      sprite.renderOrder = 10;
      // Keep perspective attenuation for everyone — sharper, no fixed-screen
      // upscale that turned hubs into pixel mush. Hubs just get a bigger
      // world-unit textHeight so they still read as cluster anchors.
      const sphereRadius = 3 * Math.cbrt(1 + deg * 0.6);
      sprite.textHeight = isHub
        ? Math.max(6, Math.min(14, 6 + Math.sqrt(deg) * 1.0))
        : Math.max(2, Math.min(4.5, 2 + Math.sqrt(deg) * 0.35));
      sprite.position.set(0, sphereRadius + sprite.textHeight * 0.6 + 1.2, 0);
      return sprite;
    })
    // Links: brighter when adjacent to the selected node, dim otherwise.
    .linkColor((l) => {
      if (!selectedId) return 'rgba(180,190,210,0.22)';
      const sId = l.source?.id ?? l.source;
      const tId = l.target?.id ?? l.target;
      if (sId === selectedId || tId === selectedId) return 'rgba(255,180,90,0.95)';
      return 'rgba(180,190,210,0.06)';
    })
    .linkWidth((l) => {
      if (!selectedId) return 0.4;
      const sId = l.source?.id ?? l.source;
      const tId = l.target?.id ?? l.target;
      return (sId === selectedId || tId === selectedId) ? 1.6 : 0.3;
    })
    .linkOpacity(0.5)
    .linkDirectionalParticles((l) => {
      if (!selectedId) return 0;
      const sId = l.source?.id ?? l.source;
      const tId = l.target?.id ?? l.target;
      return (sId === selectedId || tId === selectedId) ? 2 : 0;
    })
    .linkDirectionalParticleWidth(1.4)
    .linkDirectionalParticleColor(() => 'rgba(255,200,120,1)')
    .onNodeClick((node) => {
      const original = lastNodes.find(n => n.id === node.id);
      if (original) showNodeDetail(modal, original, lastLinks, lastNodes);
      // Highlight the selected node's connections; clears on background click.
      selectedId = node.id;
      Graph.refresh();
      // Move the camera *toward* the clicked node but stop well before it —
      // 320 world units leaves enough room to see its neighbours. Going
      // closer (the old 90) glued the camera to the sphere.
      const distance = 320;
      const len = Math.hypot(node.x || 1, node.y || 1, node.z || 1);
      const distRatio = 1 + distance / len;
      Graph.cameraPosition(
        { x: (node.x || 0) * distRatio, y: (node.y || 0) * distRatio, z: (node.z || 0) * distRatio },
        node,
        900,
      );
    })
    .onNodeHover((node) => {
      container.style.cursor = node ? 'pointer' : 'default';
    })
    .onBackgroundClick(() => {
      // Clicking empty space clears the highlight so all edges return to
      // their default dim grey.
      if (!selectedId) return;
      selectedId = null;
      Graph.refresh();
    });

  // Cap WebGLRenderer pixelRatio so the drawing buffer + render targets stay
  // well under the 16384 GPU texture limit on high-DPR / zoomed displays.
  // Without this, large containers × devicePixelRatio overflow and the
  // context drops, leaving a blank canvas.
  try {
    const renderer = Graph.renderer && Graph.renderer();
    if (renderer && renderer.setPixelRatio) {
      // Hard-cap to 1 — even 1.5 × a 2k-wide panel × the post-processing
      // composer's internal targets can blow past the 16384 GPU texture
      // limit on retina displays and kill the WebGL context.
      renderer.setPixelRatio(1);
      // Re-trigger size sync so existing drawing buffer + render targets
      // get reallocated at the new ratio (otherwise the original pre-cap
      // buffer sticks around).
      const w = container.clientWidth || 800;
      const h = container.clientHeight || 600;
      Graph.width(w);
      Graph.height(h);
    }
    // Also cap the post-processing composer's pixelRatio — it has its own
    // ratio that defaults to renderer's and creates the giant render
    // targets that were tripping the 16384 limit.
    if (Graph.postProcessingComposer) {
      const c = Graph.postProcessingComposer();
      if (c && c.setPixelRatio) c.setPixelRatio(1);
    }
    // Recover from any later context loss (e.g. another tab steals the GPU).
    const dom = renderer && renderer.domElement;
    if (dom) {
      dom.addEventListener('webglcontextlost', (e) => {
        e.preventDefault();
      }, false);
      dom.addEventListener('webglcontextrestored', () => {
        try { Graph.refresh(); } catch (_) {}
      }, false);
    }
  } catch (_) {}

  // Tuned for the "large-graph" look — clusters in 3D volume, not flat blobs.
  // Stronger repulsion + longer links pushes the natural d3 force layout
  // into the multi-cluster sphere arrangement the user wanted.
  Graph.d3Force('charge').strength(-120).distanceMax(400);
  Graph.d3Force('link').distance(35);

  // Custom radial bound: any node drifting beyond `BOUND_R` from the origin
  // gets pulled back, so the overall cluster volume stays sphere-shaped
  // instead of stretching into a long ribbon. Pulling force ramps with how
  // far past the boundary the node is — gentle near the edge, firm far
  // outside, so internal cluster geometry isn't squished.
  const BOUND_R = 320;
  function radialBound() {
    let nodes;
    const force = (alpha) => {
      for (const n of nodes) {
        const x = n.x || 0, y = n.y || 0, z = n.z || 0;
        const d = Math.hypot(x, y, z);
        if (d <= BOUND_R || d === 0) continue;
        const overshoot = (d - BOUND_R) / BOUND_R;
        const k = Math.min(0.25, overshoot * 0.18) * alpha;
        n.vx = (n.vx || 0) - x * k / d * BOUND_R;
        n.vy = (n.vy || 0) - y * k / d * BOUND_R;
        n.vz = (n.vz || 0) - z * k / d * BOUND_R;
      }
    };
    force.initialize = (n) => { nodes = n; };
    return force;
  }
  Graph.d3Force('bound', radialBound());
  // Fit the view ONCE on first engine stop. After that the user owns the
  // camera — re-fitting on every cooldown stomps on their drag/rotate.
  let didInitialFit = false;
  Graph.onEngineStop(() => {
    if (didInitialFit) return;
    didInitialFit = true;
    try { Graph.zoomToFit(800, 80); } catch (_) {}
  });

  function rebuild() {
    const data = getData();
    if (!data || !data.nodes || !data.nodes.length) return;
    lastNodes = data.nodes;
    lastLinks = data.edges;
    const adapted = adapt(data.nodes, data.edges);
    Graph.graphData(adapted);
  }

  // Seed with empty data so the first paint is dark + ready.
  Graph.graphData({ nodes: [], links: [] });

  function grow(opts = {}) {
    const totalDuration = opts.totalDurationMs ?? 6000;

    const data = getData();
    if (!data || !data.nodes || !data.nodes.length) return;
    lastNodes = data.nodes;
    lastLinks = data.edges;

    const adapted = adapt(data.nodes, data.edges);
    Graph.graphData(adapted);

    // Auto-fit camera once the simulation cools.
    setTimeout(() => {
      try { Graph.zoomToFit(900, 60); } catch (_) {}
    }, 2800);

    if (!opts.onProgress) return;
    const totalN = data.nodes.length;
    const totalE = data.edges.length;
    const start = performance.now();
    let frameId = 0;
    function tick() {
      const elapsed = performance.now() - start;
      const p = Math.min(1, elapsed / totalDuration);
      const eased = 1 - Math.pow(1 - p, 3);
      opts.onProgress(p, Math.round(totalN * eased), Math.round(totalE * eased));
      if (p < 1) frameId = requestAnimationFrame(tick);
    }
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }

  function resize() {
    const w = container.clientWidth || 800;
    const h = container.clientHeight || 600;
    Graph.width(w);
    Graph.height(h);
  }
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(container);

  return {
    rebuild,
    grow,
    startPulse: () => {},
    stopPulse:  () => {},
    zoom: (factor) => {
      const cam = Graph.cameraPosition();
      const len = Math.hypot(cam.x, cam.y, cam.z) || 200;
      const next = Math.max(40, Math.min(2000, len / factor));
      const k = next / len;
      Graph.cameraPosition({ x: cam.x * k, y: cam.y * k, z: cam.z * k }, undefined, 250);
    },
    reset: () => {
      try { Graph.zoomToFit(600, 60); } catch (_) {}
    },
    destroy: () => {
      try { ro.disconnect(); } catch (_) {}
      try { Graph._destructor && Graph._destructor(); } catch (_) {}
      container.innerHTML = '';
    },
  };
}
