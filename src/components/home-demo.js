// Home demo — 3-act animated scene shown as the second module on landing.
// Acts: 01 Input typewriter → 02 KG growth + sim-style cards → 03 Report.
// Auto-cycles; hover-pauses; dots are clickable.
//
// Act 2 mounts the REAL 3D knowledge graph (kg-3d.js) with the real
// generation animation (grow) and node-click popups (agent-modal). The
// right rail uses the same sim-bstep / sim-metric markup as the
// Simulation module, themed for the dark stage panel.

import { openPilotForm } from './pilot-form.js';

const ACT_DURATION = 9000;
const TYPE_SENTENCE = "Predict the economic impact of Taylor Swift's Eras Tour concert series in Singapore.";

export function createHomeDemo({ onStart } = {}) {
  const el = document.createElement('section');
  el.className = 'lv3-section lv3-section--demo';
  el.id = 'demo';
  el.innerHTML = `
    <div class="hdemo-head">
      <div>
        <span class="lv3-section__label">Fig. 02 · Live demo</span>
        <h2 class="lv3-section__title">Live Demo.</h2>
      </div>
      <p class="hdemo-head__desc">A scripted walkthrough using the same engine that powers Loka. Type a scenario, watch the world build itself, read the report — in three acts.</p>
    </div>

    <div class="hdemo-stage" data-act="0">
      <div class="hdemo-stage__chrome">
        <span class="hdemo-stage__dot"></span>
        <span class="hdemo-stage__dot"></span>
        <span class="hdemo-stage__dot"></span>
        <span class="hdemo-stage__path">loka.world / simulate</span>
      </div>

      <div class="hdemo-board">
        <!-- ACT 1 — INPUT -->
        <div class="hdemo-act hdemo-act--input" data-act-i="0">
          <div class="hdemo-input">
            <div class="hdemo-input__label">Describe a scenario</div>
            <div class="hdemo-input__box">
              <span class="hdemo-input__text"></span><span class="hdemo-input__caret"></span>
            </div>
            <div class="hdemo-input__chips">
              <span class="hdemo-chip" data-chip="0">Taylor Swift</span>
              <span class="hdemo-chip" data-chip="1">Singapore</span>
              <span class="hdemo-chip" data-chip="2">tourism</span>
              <span class="hdemo-chip" data-chip="3">GDP impact</span>
            </div>
            <button class="hdemo-inline-cta" data-advance="1">Start Simulation →</button>
          </div>
        </div>

        <!-- ACT 2 — SIMULATION (real KG + sim-style cards) -->
        <div class="hdemo-act hdemo-act--sim sim-v3" data-act-i="1">
          <div class="hdemo-sim__graph">
            <div class="hdemo-kg-host" data-kg-host></div>
            <div class="hdemo-sim__caption">
              <span class="hdemo-pulse"></span>
              <span>Knowledge graph · <em data-graph-count>0</em> nodes · <em data-edge-count>0</em> edges</span>
            </div>
          </div>
          <aside class="hdemo-sim__cards">
            <!-- Build steps (mirrors agents.js phase 1) -->
            <div class="sim-bstep is-active is-open" data-step="1">
              <div class="sim-bstep__header">
                <div class="sim-bstep__num">1</div>
                <div class="sim-bstep__info">
                  <div class="sim-bstep__name">Knowledge graph construction</div>
                  <div class="sim-bstep__status" data-step-status="1">Building world model…</div>
                </div>
              </div>
            </div>
            <div class="sim-bstep" data-step="2">
              <div class="sim-bstep__header">
                <div class="sim-bstep__num">2</div>
                <div class="sim-bstep__info">
                  <div class="sim-bstep__name">Agent population generation</div>
                  <div class="sim-bstep__status" data-step-status="2">Waiting…</div>
                </div>
              </div>
              <div class="sim-bstep__body">
                <div class="sim-bstep__body-inner">
                  <div class="sbp-counter" data-agent-counter>Preparing agent profiles…</div>
                  <div class="sbp-agent-list" data-agent-list></div>
                </div>
              </div>
            </div>
            <div class="sim-bstep" data-step="3">
              <div class="sim-bstep__header">
                <div class="sim-bstep__num">3</div>
                <div class="sim-bstep__info">
                  <div class="sim-bstep__name">Economic behaviour chain mapping</div>
                  <div class="sim-bstep__status" data-step-status="3">Waiting…</div>
                </div>
              </div>
            </div>

            <!-- Metrics grid (mirrors agents.js phase 2) -->
            <div class="sim-metrics">
              <div class="sim-metric">
                <div class="sim-metric__label">Tourism receipts</div>
                <div class="sim-metric__value" data-metric="gdp">S$0M</div>
                <div class="sim-metric__delta is-up">Calculating…</div>
              </div>
              <div class="sim-metric">
                <div class="sim-metric__label">Hotel occupancy</div>
                <div class="sim-metric__value" data-metric="occ">75%</div>
                <div class="sim-metric__delta is-up">Baseline</div>
              </div>
              <div class="sim-metric">
                <div class="sim-metric__label">Temp. jobs</div>
                <div class="sim-metric__value" data-metric="jobs">0</div>
                <div class="sim-metric__delta is-up">Ramping</div>
              </div>
              <div class="sim-metric">
                <div class="sim-metric__label">Changi pax (wk)</div>
                <div class="sim-metric__value" data-metric="pax">175K</div>
                <div class="sim-metric__delta is-up">Monitoring</div>
              </div>
            </div>
            <button class="hdemo-inline-cta hdemo-inline-cta--dark" data-advance="2">View Report →</button>
          </aside>
        </div>

        <!-- ACT 3 — REPORT -->
        <div class="hdemo-act hdemo-act--report" data-act-i="2">
          <div class="hdemo-report">
            <div class="hdemo-report__head">
              <div class="hdemo-report__label">Taylor Swift · Singapore · 18-month forecast</div>
              <div class="hdemo-report__heroRow">
                <div class="hdemo-report__heroCol">
                  <div class="hdemo-report__heroLabel">GDP impact</div>
                  <div class="hdemo-report__hero"><em data-hero>0.00</em><i>%</i></div>
                  <div class="hdemo-report__ci">95% CI · 1.18% — 1.71%</div>
                </div>
                <div class="hdemo-kpis">
                  <div class="hdemo-kpi"><span class="hdemo-kpi__label">Total injection</span><span class="hdemo-kpi__val" data-kpi="injection">S$0.0B</span></div>
                  <div class="hdemo-kpi"><span class="hdemo-kpi__label">Visitor inflow</span><span class="hdemo-kpi__val" data-kpi="visitors">0K</span></div>
                  <div class="hdemo-kpi"><span class="hdemo-kpi__label">Jobs created</span><span class="hdemo-kpi__val" data-kpi="jobs">0K</span></div>
                  <div class="hdemo-kpi"><span class="hdemo-kpi__label">Tax revenue</span><span class="hdemo-kpi__val" data-kpi="tax">S$0M</span></div>
                </div>
              </div>
            </div>

            <div class="hdemo-report__chartBlock">
              <div class="hdemo-report__chartHead">
                <span class="hdemo-report__chartTitle">Tourism receipts · 18-month trajectory</span>
                <div class="hdemo-report__legend">
                  <span><i class="hdemo-legend-dot hdemo-legend-dot--base"></i>Baseline</span>
                  <span><i class="hdemo-legend-dot hdemo-legend-dot--up"></i>With concert</span>
                  <span><i class="hdemo-legend-dot hdemo-legend-dot--win"></i>Concert window</span>
                </div>
              </div>
              <div class="hdemo-chart-wrap">
                <svg class="hdemo-chart" viewBox="0 0 600 180" preserveAspectRatio="none">
                  <g class="hdemo-chart__grid">
                    <line x1="0" y1="40" x2="600" y2="40"/>
                    <line x1="0" y1="90" x2="600" y2="90"/>
                    <line x1="0" y1="140" x2="600" y2="140"/>
                  </g>
                  <rect class="hdemo-chart__window" x="100" y="0" width="100" height="160"/>
                  <path class="hdemo-chart__base" d="M0,120 L600,120"/>
                  <path class="hdemo-chart__area" d="M0,120 L0,120 L50,118 L100,108 L130,72 L170,38 L220,52 L270,68 L320,78 L370,86 L420,94 L470,102 L520,108 L570,114 L600,118 L600,120 Z"/>
                  <path class="hdemo-chart__line" d="M0,120 L50,118 L100,108 L130,72 L170,38 L220,52 L270,68 L320,78 L370,86 L420,94 L470,102 L520,108 L570,114 L600,118"/>
                </svg>
                <div class="hdemo-chart__peakDot" style="left: calc(170/600 * 100%); top: calc(38/180 * 100%);"></div>
                <div class="hdemo-chart__peakLabel" style="left: calc(170/600 * 100%); top: 6px;">peak +S$184M</div>
                <div class="hdemo-chart__xaxis">
                  <span style="left: 0">M1</span>
                  <span style="left: 25%">M5</span>
                  <span style="left: 50%">M9</span>
                  <span style="left: 75%">M13</span>
                  <span style="left: 100%">M18</span>
                </div>
              </div>
              <div class="hdemo-report__callout">
                <strong>Key finding.</strong> Concert window (M4–M7) drives a 3.4× spike in receipts; spillover to retail and F&amp;B compounds through M14, holding receipts ~12% above baseline.
              </div>
            </div>

            <div class="hdemo-report__sectors">
              <div class="hdemo-report__sectorsLabel">Sector impact · uplift over 18-month baseline</div>
              <div class="hdemo-bar" data-bar="0"><span class="hdemo-bar__name">Tourism</span><span class="hdemo-bar__track"><span class="hdemo-bar__fill" style="--w:84%"></span></span><span class="hdemo-bar__val">+8.4%</span></div>
              <div class="hdemo-bar" data-bar="1"><span class="hdemo-bar__name">F&amp;B</span><span class="hdemo-bar__track"><span class="hdemo-bar__fill" style="--w:62%"></span></span><span class="hdemo-bar__val">+3.1%</span></div>
              <div class="hdemo-bar" data-bar="2"><span class="hdemo-bar__name">Retail</span><span class="hdemo-bar__track"><span class="hdemo-bar__fill" style="--w:48%"></span></span><span class="hdemo-bar__val">+2.6%</span></div>
              <div class="hdemo-bar" data-bar="3"><span class="hdemo-bar__name">Transport</span><span class="hdemo-bar__track"><span class="hdemo-bar__fill" style="--w:36%"></span></span><span class="hdemo-bar__val">+1.9%</span></div>
            </div>
          </div>
        </div>
      </div>

      <div class="hdemo-bar-row">
        <div class="hdemo-progress">
          <button class="hdemo-step" data-step="0" aria-label="Act 1"><span>01</span><i>Input</i></button>
          <button class="hdemo-step" data-step="1" aria-label="Act 2"><span>02</span><i>Simulate</i></button>
          <button class="hdemo-step" data-step="2" aria-label="Act 3"><span>03</span><i>Report</i></button>
        </div>
        <button class="hdemo-cta" data-action="pilot">Request a pilot →</button>
      </div>
    </div>
  `;

  // ── refs ──
  const stage = el.querySelector('.hdemo-stage');
  const steps = el.querySelectorAll('.hdemo-step');
  const typeNode = el.querySelector('.hdemo-input__text');
  const chips = el.querySelectorAll('.hdemo-chip');
  const bars = el.querySelectorAll('.hdemo-bar');
  const heroNode = el.querySelector('[data-hero]');
  const kgHost = el.querySelector('[data-kg-host]');
  const graphCountNode = el.querySelector('[data-graph-count]');
  const edgeCountNode = el.querySelector('[data-edge-count]');
  const bsteps = el.querySelectorAll('.sim-bstep');
  const agentListNode = el.querySelector('[data-agent-list]');
  const agentCounterNode = el.querySelector('[data-agent-counter]');
  const metrics = {
    gdp: el.querySelector('[data-metric="gdp"]'),
    occ: el.querySelector('[data-metric="occ"]'),
    jobs: el.querySelector('[data-metric="jobs"]'),
    pax: el.querySelector('[data-metric="pax"]'),
  };

  el.querySelectorAll('[data-action="start"]').forEach(b => b.addEventListener('click', () => onStart && onStart()));
  el.querySelectorAll('[data-action="pilot"]').forEach(b => b.addEventListener('click', openPilotForm));

  // Click any step header to toggle its body open/closed (after rows render).
  bsteps.forEach((bstep) => {
    const header = bstep.querySelector('.sim-bstep__header');
    const body = bstep.querySelector('.sim-bstep__body');
    if (!header || !body) return;
    header.style.cursor = 'pointer';
    header.addEventListener('click', () => bstep.classList.toggle('is-open'));
  });

  // ── KG mount (lazy, once) ──
  let kg = null;          // { rebuild, grow, zoom, reset, destroy }
  let kgModal = null;     // agent-detail overlay element
  let kgMounting = null;  // promise guard

  async function ensureKg() {
    if (kg || kgMounting) return kgMounting;
    kgMounting = (async () => {
      const [{ mount3DGraph }, { createAgentModal }, agentsMod] = await Promise.all([
        import('../screens/kg-3d.js'),
        import('./agent-modal.js'),
        import('../screens/agents.js'),
      ]);
      kgModal = createAgentModal();
      document.body.appendChild(kgModal);
      const w = kgHost.clientWidth || 600;
      const h = kgHost.clientHeight || 360;
      const dataset = agentsMod.generateDenseKG(w, h);
      // Single fixed dataset so the cycle replays identically.
      const getData = () => ({ nodes: dataset.nodes, edges: dataset.edges });
      kg = mount3DGraph(kgHost, kgModal, getData);
      return kg;
    })();
    return kgMounting;
  }

  // ── agent population (step 2 body) ──
  let agentsBuilt = false;
  let agentRows = [];
  const TOTAL_AGENTS = 1000;
  async function ensureAgentRows() {
    if (agentsBuilt) return;
    agentsBuilt = true;
    const { agentCategories } = await import('../data/agents.js');
    const flat = [];
    agentCategories.forEach(cat => cat.agents.forEach(a => flat.push({ a, cat })));
    agentListNode.innerHTML = '';
    flat.slice(0, 20).forEach(({ a, cat }) => {
      const row = document.createElement('div');
      row.className = 'sbp-agent-row';
      row.style.opacity = '0';
      row.style.transform = 'translateX(12px)';
      const avatar = a.avatar?.startsWith('http')
        ? `<img src="${a.avatar}" alt="" style="width:100%;height:100%;border-radius:inherit;" />`
        : (a.avatar || cat.icon || '·');
      row.innerHTML = `
        <div class="sbp-agent-avatar" style="background:${cat.bgColor}">${avatar}</div>
        <div class="sbp-agent-info">
          <div class="sbp-agent-name">${a.name}</div>
          <div class="sbp-agent-role">${a.role}</div>
        </div>
        <div class="sbp-agent-weight">
          <div class="sbp-agent-bar-wrap">
            <div class="sbp-agent-bar" style="background:${cat.color};width:0%"></div>
          </div>
          <div class="sbp-agent-pct" style="color:${cat.color}">${Math.round(a.influence * 100)}%</div>
        </div>
      `;
      agentListNode.appendChild(row);
      agentRows.push({ row, pct: Math.round(a.influence * 100) });
    });
  }

  function runAgentPopulation() {
    if (!agentListNode || !agentCounterNode) return;
    agentRows.forEach(({ row }) => {
      row.style.opacity = '0';
      row.style.transform = 'translateX(12px)';
      const bar = row.querySelector('.sbp-agent-bar');
      if (bar) bar.style.width = '0%';
    });
    agentCounterNode.textContent = '0 / ' + TOTAL_AGENTS.toLocaleString() + ' agents';
    const dur = 2000;
    const t0 = performance.now();
    function tick(now) {
      const t = Math.min(1, (now - t0) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      const n = Math.round(TOTAL_AGENTS * eased);
      agentCounterNode.textContent = n.toLocaleString() + ' / ' + TOTAL_AGENTS.toLocaleString() + ' agents';
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
    agentRows.forEach(({ row, pct }, i) => {
      later(() => {
        row.style.transition = 'opacity 300ms ease, transform 300ms ease';
        row.style.opacity = '1';
        row.style.transform = 'translateX(0)';
        const bar = row.querySelector('.sbp-agent-bar');
        if (bar) {
          bar.style.transition = 'width 700ms cubic-bezier(.2,.7,.2,1)';
          requestAnimationFrame(() => { bar.style.width = pct + '%'; });
        }
      }, i * 140);
    });
  }

  function startKgGrowth() {
    if (!kg) return;
    graphCountNode.textContent = '0';
    edgeCountNode.textContent = '0';
    kg.grow({
      totalDurationMs: 6500,
      seedCount: 8,
      batchInterval: 180,
      onProgress: (_p, nShown, eShown) => {
        graphCountNode.textContent = nShown;
        edgeCountNode.textContent = eShown;
      },
    });
  }

  // ── act runners ──
  let actIdx = 0;
  let actTimer = null;
  let paused = false;
  let actTokens = [];

  function clearActTimers() {
    actTokens.forEach(t => clearTimeout(t));
    actTokens = [];
  }
  function later(fn, ms) { const t = setTimeout(fn, ms); actTokens.push(t); return t; }

  function runAct1() {
    typeNode.textContent = '';
    chips.forEach(c => c.classList.remove('on'));
    const cta1 = el.querySelector('.hdemo-act--input .hdemo-inline-cta');
    cta1?.classList.remove('on');
    const chars = [...TYPE_SENTENCE];
    const speed = 32;
    chars.forEach((ch, i) => later(() => { typeNode.textContent += ch; }, i * speed));
    chips.forEach((c, i) => later(() => c.classList.add('on'), chars.length * speed + 250 + i * 180));
    const ctaAt = chars.length * speed + 250 + chips.length * 180 + 200;
    later(() => cta1?.classList.add('on'), ctaAt);
    // Auto-advance after a short pause so viewers see the CTA, then jump to Act 2.
    later(() => { if (actIdx === 0 && !manual) goTo(1); }, ctaAt + 1800);
  }

  function setStep(activeIdx) {
    bsteps.forEach((s, i) => {
      s.classList.toggle('is-active', i === activeIdx);
      s.classList.toggle('is-done', i < activeIdx);
      s.classList.toggle('is-open', i === activeIdx);
      const status = s.querySelector('[data-step-status]');
      if (!status) return;
      if (i < activeIdx) status.textContent = 'Complete';
      else if (i === activeIdx) {
        status.textContent = ['Building world model…', 'Populating agents…', 'Mapping behaviour chains…'][i];
      } else status.textContent = 'Waiting…';
    });
  }

  async function runAct2() {
    setStep(0);
    metrics.gdp.textContent = 'S$0M';
    metrics.jobs.textContent = '0';
    metrics.occ.textContent = '75%';
    metrics.pax.textContent = '175K';

    // Re-trigger entrance animation by toggling a class.
    const simAct = el.querySelector('.hdemo-act--sim');
    simAct.classList.remove('is-animating');
    void simAct.offsetWidth;
    simAct.classList.add('is-animating');

    await ensureKg();
    if (actIdx !== 1) return;
    startKgGrowth();
    ensureAgentRows();

    later(() => setStep(1), 2400);
    later(() => runAgentPopulation(), 2500);
    later(() => setStep(2), 4600);
    // metric animations roughly aligned with build progress
    later(() => animateCount(metrics.gdp, 384, 2200, 0, v => `S$${Math.round(v)}M`), 3200);
    later(() => animateCount(metrics.jobs, 12400, 2200, 0, v => Math.round(v).toLocaleString()), 3400);
    later(() => animateCount(metrics.occ, 94, 1800, 0, v => `${Math.round(v)}%`), 3600);
    later(() => animateCount(metrics.pax, 232, 2000, 0, v => `${Math.round(v)}K`), 3800);
    const cta2 = el.querySelector('.hdemo-act--sim .hdemo-inline-cta');
    cta2?.classList.remove('on');
    later(() => cta2?.classList.add('on'), 6200);
  }

  function runAct3() {
    bars.forEach(b => b.classList.remove('on'));
    heroNode.textContent = '0.00';
    const kpiI = el.querySelector('[data-kpi="injection"]');
    const kpiV = el.querySelector('[data-kpi="visitors"]');
    const kpiJ = el.querySelector('[data-kpi="jobs"]');
    const kpiT = el.querySelector('[data-kpi="tax"]');
    if (kpiI) kpiI.textContent = 'S$0.0B';
    if (kpiV) kpiV.textContent = '0K';
    if (kpiJ) kpiJ.textContent = '0K';
    if (kpiT) kpiT.textContent = 'S$0M';
    const chart = el.querySelector('.hdemo-chart');
    chart?.classList.remove('on');

    later(() => animateCount(heroNode, 1.42, 1800, 2), 250);
    later(() => kpiI && animateCount(kpiI, 8.4, 1800, 1, v => `S$${v.toFixed(1)}B`), 350);
    later(() => kpiV && animateCount(kpiV, 680, 1800, 0, v => `${Math.round(v)}K`), 450);
    later(() => kpiJ && animateCount(kpiJ, 12.4, 1800, 1, v => `${v.toFixed(1)}K`), 550);
    later(() => kpiT && animateCount(kpiT, 640, 1800, 0, v => `S$${Math.round(v)}M`), 650);
    later(() => chart?.classList.add('on'), 700);
    bars.forEach((b, i) => later(() => b.classList.add('on'), 1400 + i * 220));
  }

  function animateCount(node, target, dur = 1500, decimals = 0, format = null) {
    const start = performance.now();
    function frame(now) {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      const v = target * eased;
      if (format) node.textContent = format(v);
      else node.textContent = decimals ? v.toFixed(decimals) : Math.round(v).toLocaleString();
      if (t < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  function goTo(i, { user = false } = {}) {
    clearActTimers();
    actIdx = i;
    stage.dataset.act = String(i);
    steps.forEach((s, k) => s.classList.toggle('on', k === i));
    if (i === 0) runAct1();
    else if (i === 1) runAct2();
    else runAct3();
    if (user) enterManual();
    else restartLoop();
  }

  // Manual mode: user has taken control. Auto-cycle stops; hover-pause
  // is no longer meaningful. Steps still work via click; CTAs still work.
  function enterManual() {
    manual = true;
    clearTimeout(actTimer);
    stage.classList.add('is-manual');
  }

  function restartLoop() {
    clearTimeout(actTimer);
    if (manual || paused) return;
    actTimer = setTimeout(() => goTo((actIdx + 1) % 3), ACT_DURATION);
  }

  let manual = false;
  let started = false;
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting && !started) {
        started = true;
        goTo(0);
        const loop = () => {
          if (manual || paused) return;
          actTimer = setTimeout(() => { goTo((actIdx + 1) % 3); loop(); }, ACT_DURATION);
        };
        loop();
      }
    });
  }, { threshold: 0.25 });
  io.observe(stage);

  stage.addEventListener('mouseenter', () => {
    if (manual) return;
    paused = true; clearTimeout(actTimer); stage.classList.add('is-paused');
  });
  stage.addEventListener('mouseleave', () => {
    if (manual) return;
    paused = false; stage.classList.remove('is-paused'); restartLoop();
  });

  steps.forEach((s, i) => s.addEventListener('click', () => { goTo(i, { user: true }); }));

  // In-act advance CTAs ("Start Simulation →", "View Report →").
  el.querySelectorAll('[data-advance]').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = Number(btn.dataset.advance);
      goTo(target, { user: true });
    });
  });

  return el;
}
