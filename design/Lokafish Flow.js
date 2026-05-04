/* ─────────────────────────────────────────────
   Lokafish Flow — Scenario & Plan stage logic
   ───────────────────────────────────────────── */

// ─── stage routing ───
const stages = {
    scenario: document.getElementById('stage-scenario'),
    plan: document.getElementById('stage-plan'),
    run: document.getElementById('stage-run'),
    report: document.getElementById('stage-report'),
};
const navSteps = document.querySelectorAll('.nav__step');
const STAGE_ORDER = ['scenario', 'plan', 'run', 'report'];
function goStage(name) {
    Object.entries(stages).forEach(([k, el]) => el.classList.toggle('is-active', k === name));
    // dark mode for nav while in simulation stage
    document.body.classList.toggle('is-dark', name === 'run');
    const currentIdx = STAGE_ORDER.indexOf(name);
    navSteps.forEach(n => {
        const stage = n.dataset.stage;
        n.classList.remove('is-active', 'is-done');
        if (stage === name) n.classList.add('is-active');
        else if (currentIdx >= 0 && STAGE_ORDER.indexOf(stage) >= 0 && STAGE_ORDER.indexOf(stage) < currentIdx) {
            n.classList.add('is-done');
        }
    });
    window.scrollTo({ top: 0, behavior: 'instant' });
}

// ─── scenario stage ───
const scenarioInput = document.getElementById('scenario-input');
const charCount = document.getElementById('char-count');
function updateCount() { charCount.textContent = `${scenarioInput.value.length} chars`; }
scenarioInput.addEventListener('input', updateCount);
updateCount();

// example pickers (sidebar — always visible)
const examplesEls = document.querySelectorAll('.sc-example');
function syncActiveExample() {
    const v = scenarioInput.value.trim();
    examplesEls.forEach(card => {
        card.classList.toggle('is-active', card.dataset.scenario === v);
    });
}
examplesEls.forEach(card => {
    card.addEventListener('click', () => {
        scenarioInput.value = card.dataset.scenario;
        updateCount();
        syncActiveExample();
        scenarioInput.focus();
    });
});
scenarioInput.addEventListener('input', syncActiveExample);
syncActiveExample();

// pill toggles
function bindPill(el, onChange) {
    if (!el) return;
    el.addEventListener('click', () => {
        el.classList.toggle('is-on');
        onChange && onChange(el.classList.contains('is-on'));
    });
}
bindPill(document.getElementById('pill-ai-data'));
bindPill(document.getElementById('pill-upload'), on => {
    document.getElementById('upload-area').classList.toggle('is-visible', on);
});

// advanced tray toggle
const advanced = document.getElementById('advanced');
const advCaret = document.getElementById('adv-caret');
const advancedTriggerEl = document.getElementById('advanced-toggle');
advancedTriggerEl.addEventListener('click', () => {
    const open = advanced.classList.toggle('is-open');
    advancedTriggerEl.classList.toggle('is-open', open);
    if (advCaret) advCaret.textContent = open ? '▴' : '▾';
});

// scenario-mode (used by sliders' updateAdvSummary)
let scenarioMode = 'dual';

// sliders
function bindSlider(slider, valueEl, fmt) {
    const update = () => {
        valueEl.textContent = fmt ? fmt(+slider.value) : slider.value;
        updateAdvSummary();
    };
    slider.addEventListener('input', update);
    update();
}
bindSlider(document.getElementById('slider-rounds'), document.getElementById('val-rounds'));
bindSlider(document.getElementById('slider-agents'), document.getElementById('val-agents'),
    v => v.toLocaleString('en-US'));

// segmented control — scenario mode
document.querySelectorAll('#seg-scenario-mode button').forEach(b => {
    b.addEventListener('click', () => {
        scenarioMode = b.dataset.val;
        document.querySelectorAll('#seg-scenario-mode button').forEach(x => x.classList.toggle('is-on', x === b));
        updateAdvSummary();
    });
});

// model chips
document.querySelectorAll('#model-chips .param__chip').forEach(c => {
    c.addEventListener('click', () => {
        c.classList.toggle('is-on');
        updateAdvSummary();
    });
});

// keep advanced summary in sync
function updateAdvSummary() {
    const summary = document.getElementById('adv-summary');
    if (!summary) return;
    const rounds = document.getElementById('slider-rounds').value;
    const agents = (+document.getElementById('slider-agents').value).toLocaleString('en-US');
    const modeLabel = { single: 'single', dual: 'dual', triple: 'triple' }[scenarioMode];
    summary.textContent = `${rounds} rounds · ${agents} agents · ${modeLabel} scenarios`;
}
updateAdvSummary();

// ⌘↵ to continue
scenarioInput.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        document.getElementById('btn-generate-plan').click();
    }
});

// ─── go to plan ───
document.getElementById('btn-generate-plan').addEventListener('click', () => {
    goStage('plan');
    runPlanGeneration();
});
document.getElementById('btn-back-to-scenario').addEventListener('click', () => {
    goStage('scenario');
});

// nav step click (already-visited only)
navSteps.forEach(n => {
    n.addEventListener('click', () => {
        const s = n.dataset.stage;
        if (s === 'home') return; // <a> handles it
        if (STAGE_ORDER.includes(s)) goStage(s);
    });
});

/* ─────────────────────────────────────────────
   PLAN STAGE
   ───────────────────────────────────────────── */

const planSteps = [
    {
        title: 'Define economic context',
        tool: 'context.compile',
        desc: 'Identify the question, constrain the geography & time horizon, and pin the dependent variables to predict.',
        io: { in: 'scenario.txt', out: 'context.json' },
        time: '~12s',
        userable: false,
    },
    {
        title: 'Gather baseline data',
        tool: 'data.collect',
        desc: 'Pull historical concert / event tourism data, hotel & flight occupancy, FX, and credit-card spend benchmarks.',
        io: { in: 'context.json', out: 'baseline.parquet' },
        time: '~38s',
        userable: true,
    },
    {
        title: 'Map affected industries',
        tool: 'graph.industries',
        desc: 'Build a directed graph of primary, secondary & tertiary impact sectors using input-output relationships.',
        io: { in: 'baseline.parquet', out: 'sector-graph.json' },
        time: '~22s',
        userable: true,
    },
    {
        title: 'Spawn agent population',
        tool: 'agents.spawn',
        desc: 'Instantiate 2,000 heterogeneous agents — tourists, locals, businesses, regulators — with calibrated priors.',
        io: { in: 'sector-graph.json', out: 'population.bin' },
        time: '~18s',
        userable: false,
    },
    {
        title: 'Calibrate behavioural priors',
        tool: 'priors.fit',
        desc: 'Fit agent decision rules against historical analogues (BTS Manila ’22, Coldplay Singapore ’24).',
        io: { in: 'population.bin · history.parquet', out: 'priors.bin' },
        time: '~26s',
        userable: true,
    },
    {
        title: 'Run Monte Carlo simulation',
        tool: 'sim.run',
        desc: '120 rounds × 2,000 agents under dual scenarios. Record GDP delta, sector spend, and confidence intervals.',
        io: { in: 'priors.bin', out: 'simulation.parquet' },
        time: '~6m',
        userable: false,
    },
    {
        title: 'Synthesize findings',
        tool: 'analysis.synth',
        desc: 'Aggregate per-round outcomes, surface dominant trajectories, and compute spillover into adjacent regions.',
        io: { in: 'simulation.parquet', out: 'findings.json' },
        time: '~48s',
        userable: true,
    },
    {
        title: 'Compose final report',
        tool: 'report.render',
        desc: 'Render an executive summary with charts, prediction intervals, sensitivity analysis, and source citations.',
        io: { in: 'findings.json', out: 'report.html' },
        time: '~22s',
        userable: false,
    },
];

const traceLines = [
    'parsing scenario…',
    'detected geography → Singapore (primary) + ASEAN spillover',
    'identified event class → live entertainment / mega-concert',
    'matching against historical analogues…',
    'found 14 comparable events (BTS Manila ’22, Coldplay SG ’24, Eras Tour Tokyo ’24…)',
    'inferring time horizon → 4 weeks pre / 8 weeks post',
    'mapping affected industries → tourism, hospitality, aviation, F&B, retail, transit',
    'building input-output multiplier graph (sector-graph v2)',
    'allocating 2,000-agent population with calibrated priors',
    'verifying data sources → MAS, STB, IATA, public earnings filings',
    'compiling 8-stage plan…',
    'budgeting compute → est. 6m for full Monte Carlo run',
    'plan compiled.',
];

const thinkingEl = document.getElementById('thinking');
const thinkingFill = document.getElementById('thinking-fill');
const thinkingPct = document.getElementById('thinking-pct');
const thinkingTrace = document.getElementById('thinking-trace');
const thinkingLabel = document.getElementById('thinking-label');
const planList = document.getElementById('plan-steps');
const planActions = document.getElementById('plan-actions');
const planTitle = document.getElementById('plan-title');
const planKicker = document.getElementById('plan-kicker');

let planRunning = false;

function streamLengthFactor() {
    const map = { short: 0.55, medium: 1, long: 1.55 };
    return map[currentTweaks.streamLen] || 1;
}

function runPlanGeneration() {
    if (planRunning) return;
    planRunning = true;

    // reset UI
    thinkingEl.classList.remove('is-done');
    thinkingFill.style.width = '0%';
    thinkingPct.textContent = '0%';
    thinkingTrace.innerHTML = '';
    planList.innerHTML = '';
    planActions.style.display = 'none';
    planTitle.innerHTML = 'Reading <em>scenario.</em>';
    planKicker.textContent = 'Generating plan…';

    // render skeleton rows immediately
    planSteps.forEach((_, i) => {
        const li = document.createElement('li');
        li.className = 'plan-step plan-step--skeleton';
        li.innerHTML = `
            <div class="plan-step__num">${String(i + 1).padStart(2, '0')}</div>
            <div>
                <div class="skeleton skeleton--title"></div>
                <div class="skeleton skeleton--line-a"></div>
                <div class="skeleton skeleton--line-b"></div>
            </div>
            <div class="skeleton skeleton--time"></div>
        `;
        planList.appendChild(li);
    });

    const factor = streamLengthFactor();
    const totalLines = traceLines.length;
    const baseDelay = 380 * factor;

    let i = 0;
    const stream = () => {
        if (i >= totalLines) {
            finishStream();
            return;
        }
        // mark previous as settled (faded)
        const prev = thinkingTrace.querySelectorAll('.trace-item');
        prev.forEach((el, idx) => {
            if (idx < prev.length - 1) el.classList.add('is-settled');
        });
        // append new
        const li = document.createElement('li');
        li.className = 'trace-item';
        li.innerHTML = `<span class="trace-dot"></span><span>${traceLines[i]}</span>`;
        thinkingTrace.appendChild(li);
        // keep trace window slim — drop oldest after 5
        const all = thinkingTrace.querySelectorAll('.trace-item');
        if (all.length > 4) {
            all[0].style.display = 'none';
        }
        requestAnimationFrame(() => li.classList.add('is-visible'));

        // progress
        const pct = Math.round(((i + 1) / totalLines) * 92);
        thinkingFill.style.width = pct + '%';
        thinkingPct.textContent = pct + '%';

        // light up corresponding plan step ~ once we cross thresholds
        const stepIdx = Math.min(planSteps.length - 1, Math.floor((i / totalLines) * planSteps.length));
        const rows = planList.querySelectorAll('.plan-step');
        rows.forEach((r, ri) => {
            r.classList.toggle('plan-step--skeleton-active', ri === stepIdx && r.classList.contains('plan-step--skeleton'));
        });

        // hydrate up to current step
        for (let h = 0; h <= stepIdx; h++) hydrateStep(h);

        i++;
        const jitter = baseDelay * (0.7 + Math.random() * 0.7);
        setTimeout(stream, jitter);
    };
    stream();

    function finishStream() {
        // hydrate any remaining
        planSteps.forEach((_, h) => hydrateStep(h));
        thinkingFill.style.width = '100%';
        thinkingPct.textContent = '100%';
        thinkingLabel.textContent = 'Plan ready';
        thinkingEl.classList.add('is-done');
        planTitle.innerHTML = 'Review the <em>plan.</em>';
        planKicker.textContent = `Plan ready · ${planSteps.length} stages · est. ~9m`;
        planActions.style.display = 'flex';
        applyMode(currentMode);
        planRunning = false;
    }
}

function hydrateStep(idx) {
    const rows = planList.querySelectorAll('.plan-step');
    const row = rows[idx];
    if (!row || !row.classList.contains('plan-step--skeleton')) return;
    const step = planSteps[idx];
    row.classList.remove('plan-step--skeleton', 'plan-step--skeleton-active');
    if (step.userable) row.classList.add('plan-step--user');
    row.dataset.idx = idx;
    row.innerHTML = `
        <div class="plan-step__num">${String(idx + 1).padStart(2, '0')}</div>
        <div>
            <div class="plan-step__tool">
                <span class="plan-step__tool-label">tool</span>
                <span class="plan-step__tool-name">${step.tool}</span>
            </div>
            <div class="plan-step__title">${step.title}</div>
            <div class="plan-step__desc">${step.desc}</div>
            <div class="plan-step__io-row">
                <span class="plan-step__io"><b>in</b> ${step.io.in}</span>
                <span class="plan-step__arrow">→</span>
                <span class="plan-step__io"><b>out</b> ${step.io.out}</span>
            </div>
            ${step.userable ? `
                <label class="plan-step__switch">
                    <span>Pause for me here</span>
                    <span class="toggle" data-step-toggle="${idx}"><span class="toggle__knob"></span></span>
                </label>
            ` : ''}
        </div>
        <div class="plan-step__time">${step.time}</div>
    `;
    // bind step toggle
    const t = row.querySelector('[data-step-toggle]');
    if (t) {
        t.addEventListener('click', e => {
            e.preventDefault();
            t.classList.toggle('is-on');
            updateUserPauses();
        });
    }
}

/* ─── participation mode ─── */
let currentMode = 'sandbox';
const modeCards = document.querySelectorAll('.mode-card');
const summary = document.getElementById('participation-summary');

modeCards.forEach(c => {
    c.addEventListener('click', () => {
        currentMode = c.dataset.mode;
        modeCards.forEach(m => m.classList.toggle('is-active', m === c));
        applyMode(currentMode);
    });
});

function applyMode(mode) {
    const rows = planList.querySelectorAll('.plan-step');
    if (mode === 'sandbox') {
        rows.forEach(r => {
            const t = r.querySelector('[data-step-toggle]');
            if (t) t.classList.remove('is-on');
        });
        summary.textContent = 'Sandbox · agents decide every step.';
    } else if (mode === 'community') {
        rows.forEach(r => {
            const t = r.querySelector('[data-step-toggle]');
            if (t) t.classList.add('is-on');
        });
        summary.textContent = 'Community · 4 decision points routed to crowd vote.';
    } else if (mode === 'user') {
        // default: pause at calibrate priors + synthesize findings
        rows.forEach(r => {
            const idx = +r.dataset.idx;
            const t = r.querySelector('[data-step-toggle]');
            if (!t) return;
            t.classList.toggle('is-on', idx === 4 || idx === 6);
        });
        updateUserPauses();
    }
}

function updateUserPauses() {
    if (currentMode !== 'user') return;
    const on = planList.querySelectorAll('[data-step-toggle].is-on').length;
    summary.textContent = on === 0
        ? 'User · no pauses set — run will go straight through.'
        : `User · run pauses at ${on} checkpoint${on === 1 ? '' : 's'}.`;
}

/* ─── plan list bulk actions ─── */
planActions.addEventListener('click', e => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const action = btn.dataset.action;
    const rows = planList.querySelectorAll('.plan-step');
    rows.forEach(r => {
        const idx = +r.dataset.idx;
        const t = r.querySelector('[data-step-toggle]');
        if (!t) return;
        if (action === 'select-all') t.classList.add('is-on');
        if (action === 'select-none') t.classList.remove('is-on');
        if (action === 'select-defaults') t.classList.toggle('is-on', idx === 4 || idx === 6);
    });
    // switch mode to user since the user is now manually editing pauses
    currentMode = 'user';
    modeCards.forEach(m => m.classList.toggle('is-active', m.dataset.mode === 'user'));
    updateUserPauses();
});

/* ─── run mode ─── */
document.querySelectorAll('.run-mode-btn').forEach(b => {
    b.addEventListener('click', () => {
        document.querySelectorAll('.run-mode-btn').forEach(x => x.classList.toggle('is-active', x === b));
    });
});

document.getElementById('btn-start-run').addEventListener('click', () => {
    goStage('run');
    runSimulationStage();
});

/* ─────────────────────────────────────────────
   TWEAKS PANEL
   ───────────────────────────────────────────── */

const currentTweaks = {
    streamLen: 'medium',
    stepStyle: 'rows',
    accent: '#ff5b1f',
};

const tweaksPanel = document.getElementById('tweaks-panel');
document.getElementById('nav-tweaks').addEventListener('click', () => {
    tweaksPanel.classList.toggle('is-open');
});
document.getElementById('tweaks-close').addEventListener('click', () => {
    tweaksPanel.classList.remove('is-open');
});

document.querySelectorAll('.tweak__row').forEach(row => {
    const key = row.dataset.tweak;
    row.querySelectorAll('.tweak__btn').forEach(b => {
        b.addEventListener('click', () => {
            row.querySelectorAll('.tweak__btn').forEach(x => x.classList.toggle('is-on', x === b));
            currentTweaks[key] = b.dataset.val;
            applyTweak(key, b.dataset.val);
        });
    });
});

function applyTweak(key, val) {
    if (key === 'accent') {
        document.documentElement.style.setProperty('--accent', val);
    }
    if (key === 'stepStyle') {
        planList.classList.toggle('plan-steps--compact', val === 'compact');
    }
}

// inject the compact style on demand
const compactStyle = document.createElement('style');
compactStyle.textContent = `
    .plan-steps--compact .plan-step { padding: 16px 0 16px 8px; grid-template-columns: 48px 1fr auto; gap: 18px; }
    .plan-steps--compact .plan-step__num { font-size: 2rem; }
    .plan-steps--compact .plan-step__title { font-size: 1.15rem; margin-bottom: 4px; }
    .plan-steps--compact .plan-step__desc { display: none; }
    .plan-steps--compact .plan-step__tool { margin-bottom: 6px; }
    .plan-steps--compact .plan-step__io-row { margin-top: 6px; }
`;
document.head.appendChild(compactStyle);

/* ═══════════════════════════════════════════════
   SIMULATION STAGE
   ═══════════════════════════════════════════════ */

const SIM_NODE_TYPES = [
    { type: 'Person',  color: '#fbbf24', sources: ['STB census 2023', 'OASIS social graph'] },
    { type: 'Venue',   color: '#34d399', sources: ['OneMap SG', 'Google Places'] },
    { type: 'Sector',  color: '#38bdf8', sources: ['SSOC 2020', 'IRAS sector tables'] },
    { type: 'Event',   color: '#a78bfa', sources: ['Eventbrite feed', 'Press releases'] },
    { type: 'Policy',  color: '#f87171', sources: ['MAS bulletins', 'STB advisories'] },
    { type: 'Asset',   color: '#d97706', sources: ['Hotel inventory', 'Flight schedules'] },
];
const SIM_NODE_NAMES = {
    Person: ['Mei Lin Tan', 'Aishah Rahman', 'Wei Jie Lim', 'Priya Sharma', 'Hassan Yusof', 'Cheng Wei Ng', 'Sandra Goh', 'Adrian Lee', 'Farah Abdullah', 'Jun Ho Park', 'Kavita Menon', 'Robert Chen'],
    Venue:  ['National Stadium', 'Marina Bay Sands', 'Changi T3', 'Orchard Hotel', 'Raffles Hotel', 'Bras Basah'],
    Sector: ['Hospitality', 'F&B retail', 'Aviation', 'Ground transport', 'Entertainment', 'Retail goods', 'Banking'],
    Event:  ['Eras Tour Mar 2', 'Eras Tour Mar 4', 'Eras Tour Mar 7', 'Pre-event surge', 'Post-event halo'],
    Policy: ['STB advisory 24-03', 'GST refund window', 'Visa-on-arrival', 'Crowd safety brief'],
    Asset:  ['Room block A', 'Room block B', 'Charter flight 142', 'Coach fleet 8', 'F&B kit 21'],
};
const SIM_BUILD_LOG = {
    1: [
        'parsing scenario.txt → 412 tokens',
        'extracting named entities via NER pipeline',
        'matching entity → ontology (KG schema v3.2)',
        'creating Person nodes (320)',
        'creating Venue nodes (84)',
        'creating Sector nodes (24)',
        'creating Event nodes (12)',
        'inferring relationships from co-occurrence',
        'computing edge weights via PMI',
        'pruning edges below threshold (0.18)',
        'graph construction complete · 612 nodes · 1,847 edges',
    ],
    2: [
        'sampling from population.parquet (n=2,000)',
        'assigning SSOC occupational class',
        'fitting Big Five personality vectors',
        'calibrating income against HES 2022/23',
        'binding agent → social graph (avg 22 neighbours)',
        'seeding biographical memory (180d window)',
        'agent population ready · 2,000 entities',
    ],
    3: [
        'building input-output multiplier matrix (67 sectors)',
        'mapping agent.consume → sector.demand',
        'mapping agent.travel → aviation.utilisation',
        'mapping agent.share → social.amplification',
        'verifying chain closure (rank check)',
        'behaviour chain mapped · 8 primary loops',
    ],
};

const SIM_AGENT_FEED = [
    { name: 'Mei Lin Tan', role: 'Local fan · Tampines', round: 14, body: 'Booking 2 nights at Marina Bay — willing to stretch on ADR. Sharing wristband shots with friend group on TG.' },
    { name: 'Hassan Yusof', role: 'Inbound · Kuala Lumpur', round: 18, body: 'Driving up Friday with 3 friends. Hotel @ Bugis. Budget for F&B: S$60/day pp.' },
    { name: 'Sandra Goh', role: 'Hotelier · Orchard', round: 21, body: 'Released last 12 rooms onto Booking.com at +28% ADR. Saw 4 booked within 11min.' },
    { name: 'Priya Sharma', role: 'Inbound · Mumbai', round: 24, body: 'Round-trip on SQ423 confirmed. 5-night stay. Adding Universal Studios + Sentosa to itinerary.' },
    { name: 'Adrian Lee', role: 'F&B operator · CBD', round: 27, body: 'Doubled Friday-Sunday staffing. Pop-up "Eras menu" launched on IG — 1.4k saves so far.' },
    { name: 'Jun Ho Park', role: 'Inbound · Seoul', round: 31, body: 'Stayed extra 2 nights post-concert to do Sentosa. Spending S$210/day on retail + dining.' },
    { name: 'Kavita Menon', role: 'Tourist · Chennai', round: 35, body: 'Got 3 Swift-themed merch items at the pop-up. Posting to Instagram (12k followers).' },
];

const SIM_DECISION_POINTS = [
    {
        round: 38,
        title: 'Tourism inflow assumption — pre-event',
        desc: 'Agents are about to commit travel. Two priors fit the data; pick one to anchor the demand curve.',
        options: [
            { key: 'A', label: 'STB-corroborated 35K SEA / 18K AU+NZ inflow', recommended: true },
            { key: 'B', label: 'Conservative baseline-only fallback (12K SEA)' },
            { key: 'C', label: 'Aggressive viral-amplification scenario (52K total)' },
        ],
    },
    {
        round: 91,
        title: 'Halo effect modelling window',
        desc: 'Post-event consumption is showing sustained elevation. Choose the propagation window for the Monte Carlo.',
        options: [
            { key: 'A', label: '6-week halo (econometric standard)' },
            { key: 'B', label: '12-week halo (social-listening corroborated)', recommended: true },
            { key: 'C', label: 'Cap at 8 weeks (conservative)' },
        ],
    },
];

let simState = {
    initialised: false,
    nodes: [],
    edges: [],
    canvas: null,
    ctx: null,
    raf: null,
    zoom: 1,
    pan: { x: 0, y: 0 },
    drag: null,
    hoverNode: null,
    selectedNode: null,
    phase: 'build',  // 'build' | 'run' | 'done'
    buildStep: 0,
    round: 0,
    speed: 5,
    paused: false,
    eventInterval: null,
    decisionIdx: 0,
    pendingDecision: false,
    feedIdx: 0,
};

function runSimulationStage() {
    if (simState.initialised) return;
    initSimKG();
    startBuildPhase();
    simState.initialised = true;
}

/* ── Knowledge graph canvas ── */
function initSimKG() {
    const canvas = document.getElementById('sim-kg-canvas');
    const ctx = canvas.getContext('2d');
    simState.canvas = canvas;
    simState.ctx = ctx;

    function resize() {
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    new ResizeObserver(resize).observe(canvas);

    // initial empty nodes — built up over Step 1
    simState.nodes = [];
    simState.edges = [];

    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('mouseleave', onMouseUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('click', onCanvasClick);

    document.getElementById('sim-kg-zoom-in').addEventListener('click', () => setZoom(simState.zoom * 1.2));
    document.getElementById('sim-kg-zoom-out').addEventListener('click', () => setZoom(simState.zoom / 1.2));
    document.getElementById('sim-kg-reset').addEventListener('click', () => {
        simState.zoom = 1; simState.pan = { x: 0, y: 0 };
        layoutNodes();
    });
    document.getElementById('sim-popover-close').addEventListener('click', closeNodePopover);

    startKgLoop();
}

function startKgLoop() {
    if (simState.raf) cancelAnimationFrame(simState.raf);
    const tick = () => {
        stepPhysics();
        drawKg();
        simState.raf = requestAnimationFrame(tick);
    };
    tick();
}

function setZoom(z) {
    simState.zoom = Math.max(0.4, Math.min(2.5, z));
}
function onWheel(e) {
    e.preventDefault();
    setZoom(simState.zoom * (1 - e.deltaY * 0.001));
}
function worldFromScreen(x, y) {
    const rect = simState.canvas.getBoundingClientRect();
    const cx = rect.width / 2, cy = rect.height / 2;
    return {
        x: (x - cx) / simState.zoom - simState.pan.x + cx,
        y: (y - cy) / simState.zoom - simState.pan.y + cy,
    };
}
function findNodeAt(wx, wy) {
    for (let i = simState.nodes.length - 1; i >= 0; i--) {
        const n = simState.nodes[i];
        const dx = wx - n.x, dy = wy - n.y;
        if (dx * dx + dy * dy < (n.r + 4) * (n.r + 4)) return n;
    }
    return null;
}
function onMouseDown(e) {
    const rect = simState.canvas.getBoundingClientRect();
    const w = worldFromScreen(e.clientX - rect.left, e.clientY - rect.top);
    const node = findNodeAt(w.x, w.y);
    simState.drag = node
        ? { type: 'node', node, ox: w.x - node.x, oy: w.y - node.y }
        : { type: 'pan', sx: e.clientX, sy: e.clientY, px: simState.pan.x, py: simState.pan.y };
    simState.canvas.style.cursor = node ? 'grabbing' : 'move';
}
function onMouseMove(e) {
    const rect = simState.canvas.getBoundingClientRect();
    const w = worldFromScreen(e.clientX - rect.left, e.clientY - rect.top);
    const hover = findNodeAt(w.x, w.y);
    simState.hoverNode = hover;
    if (!simState.drag) {
        simState.canvas.style.cursor = hover ? 'pointer' : 'default';
        return;
    }
    if (simState.drag.type === 'node') {
        simState.drag.node.fx = w.x - simState.drag.ox;
        simState.drag.node.fy = w.y - simState.drag.oy;
    } else {
        simState.pan.x = simState.drag.px + (e.clientX - simState.drag.sx) / simState.zoom;
        simState.pan.y = simState.drag.py + (e.clientY - simState.drag.sy) / simState.zoom;
    }
}
function onMouseUp() {
    if (simState.drag && simState.drag.type === 'node') {
        simState.drag.node.fx = null;
        simState.drag.node.fy = null;
    }
    simState.drag = null;
    simState.canvas.style.cursor = 'default';
}
function onCanvasClick(e) {
    const rect = simState.canvas.getBoundingClientRect();
    const w = worldFromScreen(e.clientX - rect.left, e.clientY - rect.top);
    const node = findNodeAt(w.x, w.y);
    if (node) showNodePopover(node, e.clientX - rect.left, e.clientY - rect.top);
    else closeNodePopover();
}
function showNodePopover(node, x, y) {
    simState.selectedNode = node;
    const pop = document.getElementById('sim-node-popover');
    document.getElementById('sim-popover-type').textContent = node.type;
    document.getElementById('sim-popover-name').textContent = node.name;
    const conn = simState.edges.filter(e => e.a === node || e.b === node).length;
    document.getElementById('sim-popover-row1').innerHTML = `<span>Connections</span><span>${conn}</span>`;
    document.getElementById('sim-popover-row2').innerHTML = `<span>Influence</span><span>${(node.influence * 100).toFixed(0)}%</span>`;
    document.getElementById('sim-popover-row3').innerHTML = `<span>Source</span><span>${node.source}</span>`;
    const rect = simState.canvas.getBoundingClientRect();
    pop.style.left = Math.min(rect.width - 320, x + 12) + 'px';
    pop.style.top = Math.min(rect.height - 200, y + 12) + 'px';
    pop.classList.add('is-visible');
}
function closeNodePopover() {
    simState.selectedNode = null;
    document.getElementById('sim-node-popover').classList.remove('is-visible');
}

function addKgNode(typeIdx, name) {
    const t = SIM_NODE_TYPES[typeIdx];
    const rect = simState.canvas.getBoundingClientRect();
    const cx = rect.width / 2, cy = rect.height / 2;
    const angle = Math.random() * Math.PI * 2;
    const r = 80 + Math.random() * 200;
    const node = {
        type: t.type,
        color: t.color,
        name,
        source: t.sources[Math.floor(Math.random() * t.sources.length)],
        x: cx + Math.cos(angle) * r,
        y: cy + Math.sin(angle) * r,
        vx: 0, vy: 0,
        fx: null, fy: null,
        r: 5 + Math.random() * 6,
        influence: 0.2 + Math.random() * 0.7,
        appearAt: performance.now(),
    };
    simState.nodes.push(node);

    // connect to 1–3 existing nodes by proximity / type affinity
    const candidates = simState.nodes.filter(n => n !== node);
    candidates.sort((a, b) => {
        const da = (a.x - node.x) ** 2 + (a.y - node.y) ** 2;
        const db = (b.x - node.x) ** 2 + (b.y - node.y) ** 2;
        return da - db;
    });
    const k = Math.min(candidates.length, 1 + Math.floor(Math.random() * 3));
    for (let i = 0; i < k; i++) {
        simState.edges.push({ a: node, b: candidates[i], strength: 0.3 + Math.random() * 0.5 });
    }
    return node;
}

function layoutNodes() {
    // gentle re-centring
    const rect = simState.canvas.getBoundingClientRect();
    const cx = rect.width / 2, cy = rect.height / 2;
    simState.nodes.forEach(n => {
        if (!n.fx) {
            const dx = n.x - cx, dy = n.y - cy;
            const d = Math.sqrt(dx * dx + dy * dy);
            const desired = 100 + (n.r * 20);
            if (d > 0) {
                n.x = cx + (dx / d) * Math.min(d, 280);
                n.y = cy + (dy / d) * Math.min(d, 220);
            }
        }
    });
}

function stepPhysics() {
    const rect = simState.canvas.getBoundingClientRect();
    const cx = rect.width / 2, cy = rect.height / 2;
    const nodes = simState.nodes;
    if (!nodes.length) return;

    // gentle force-directed
    for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        if (a.fx != null) { a.x = a.fx; a.y = a.fy; a.vx = 0; a.vy = 0; continue; }
        // centring
        a.vx += (cx - a.x) * 0.0008;
        a.vy += (cy - a.y) * 0.0008;
        // repulsion
        for (let j = 0; j < nodes.length; j++) {
            if (i === j) continue;
            const b = nodes[j];
            const dx = a.x - b.x, dy = a.y - b.y;
            const dsq = dx * dx + dy * dy + 0.001;
            if (dsq < 12000) {
                const f = 60 / dsq;
                a.vx += dx * f;
                a.vy += dy * f;
            }
        }
    }
    // edge spring
    for (const e of simState.edges) {
        const dx = e.b.x - e.a.x, dy = e.b.y - e.a.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 0.001;
        const target = 80;
        const f = (d - target) * 0.0015 * e.strength;
        const fx = (dx / d) * f, fy = (dy / d) * f;
        if (e.a.fx == null) { e.a.vx += fx; e.a.vy += fy; }
        if (e.b.fx == null) { e.b.vx -= fx; e.b.vy -= fy; }
    }
    for (const n of nodes) {
        if (n.fx != null) continue;
        n.vx *= 0.85; n.vy *= 0.85;
        n.x += n.vx; n.y += n.vy;
    }
}

function drawKg() {
    const ctx = simState.ctx;
    const rect = simState.canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);

    // apply zoom + pan
    const cx = rect.width / 2, cy = rect.height / 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(simState.zoom, simState.zoom);
    ctx.translate(-cx + simState.pan.x, -cy + simState.pan.y);

    // edges
    ctx.lineWidth = 0.8;
    for (const e of simState.edges) {
        const grad = ctx.createLinearGradient(e.a.x, e.a.y, e.b.x, e.b.y);
        grad.addColorStop(0, hexToRgba(e.a.color, 0.18 * e.strength + 0.08));
        grad.addColorStop(1, hexToRgba(e.b.color, 0.18 * e.strength + 0.08));
        ctx.strokeStyle = grad;
        ctx.beginPath();
        ctx.moveTo(e.a.x, e.a.y);
        ctx.lineTo(e.b.x, e.b.y);
        ctx.stroke();
    }

    // nodes
    const now = performance.now();
    for (const n of simState.nodes) {
        const age = now - n.appearAt;
        const appear = Math.min(1, age / 600);
        const isHover = simState.hoverNode === n;
        const isSel = simState.selectedNode === n;
        const r = n.r * appear * (isHover || isSel ? 1.4 : 1);

        // halo
        ctx.beginPath();
        ctx.arc(n.x, n.y, r * 2.4, 0, Math.PI * 2);
        ctx.fillStyle = hexToRgba(n.color, 0.06 * appear);
        ctx.fill();

        // core
        ctx.beginPath();
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        ctx.fillStyle = n.color;
        ctx.shadowColor = n.color;
        ctx.shadowBlur = isHover || isSel ? 14 : 6;
        ctx.fill();
        ctx.shadowBlur = 0;

        if (isHover || isSel) {
            ctx.beginPath();
            ctx.arc(n.x, n.y, r * 1.8, 0, Math.PI * 2);
            ctx.strokeStyle = hexToRgba(n.color, 0.6);
            ctx.lineWidth = 1;
            ctx.stroke();

            ctx.fillStyle = '#e8e9ec';
            ctx.font = '500 11px "Inter", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(n.name, n.x, n.y - r * 2.4);
        }
    }
    ctx.restore();
}

function hexToRgba(hex, a) {
    const h = hex.replace('#', '');
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${a})`;
}

/* ── Build phase ── */
function startBuildPhase() {
    simState.phase = 'build';
    setSimPhaseHeader('Phase 1 — World construction', 'Building <em>digital sandbox</em>',
        'Extracting entities, populating agent demographics, mapping behaviour chains. Watch the graph grow on the left.');
    runBuildStep(1);
}

function setSimPhaseHeader(tag, title, sub) {
    document.getElementById('sim-phase-tag').textContent = tag;
    document.getElementById('sim-panel-title').innerHTML = title;
    document.getElementById('sim-panel-sub').innerHTML = sub;
}

function setSimProgress(label, pct) {
    document.getElementById('sim-progress-label').textContent = label;
    document.getElementById('sim-progress-fill').style.width = pct + '%';
    document.getElementById('sim-progress-pct').textContent = Math.round(pct) + '%';
}

function setBuildStepState(idx, state, status) {
    const el = document.querySelector(`.sim-bstep[data-step="${idx}"]`);
    if (!el) return;
    el.classList.remove('is-active', 'is-done', 'is-open');
    if (state === 'active') { el.classList.add('is-active', 'is-open'); }
    else if (state === 'done') { el.classList.add('is-done'); }
    if (status) {
        const s = el.querySelector('.sim-bstep__status');
        if (s) s.textContent = status;
    }
}

function bindBuildStepHeaders() {
    document.querySelectorAll('.sim-bstep__header').forEach(h => {
        h.addEventListener('click', () => {
            const step = h.closest('.sim-bstep');
            step.classList.toggle('is-open');
        });
    });
}
bindBuildStepHeaders();

async function runBuildStep(n) {
    if (n > 3) {
        // build phase done
        await delay(500);
        startSimPhase();
        return;
    }
    simState.buildStep = n;
    setBuildStepState(n, 'active', 'Running…');
    setSimProgress(`Step ${n} of 3`, ((n - 1) / 3) * 100);

    const logEl = document.getElementById(`sim-step-${n}-log`);
    logEl.innerHTML = '';
    const lines = SIM_BUILD_LOG[n];

    for (let i = 0; i < lines.length; i++) {
        const li = document.createElement('li');
        li.textContent = lines[i];
        li.style.opacity = '0';
        logEl.appendChild(li);
        requestAnimationFrame(() => {
            li.style.transition = 'opacity 0.25s';
            li.style.opacity = '1';
        });

        // grow KG nodes during step 1
        if (n === 1 && i < lines.length - 1) {
            const burst = 8 + Math.floor(Math.random() * 12);
            for (let b = 0; b < burst; b++) {
                const typeIdx = Math.min(SIM_NODE_TYPES.length - 1, Math.floor((i / lines.length) * 6));
                const names = SIM_NODE_NAMES[SIM_NODE_TYPES[typeIdx].type];
                addKgNode(typeIdx, names[Math.floor(Math.random() * names.length)]);
            }
            updateKgStats();
        }
        if (n === 2 && i < lines.length - 1) {
            // step 2: more agents
            for (let b = 0; b < 12; b++) addKgNode(0, SIM_NODE_NAMES.Person[Math.floor(Math.random() * SIM_NODE_NAMES.Person.length)]);
            updateKgStats();
        }

        await delay(420 + Math.random() * 360);
    }

    setBuildStepState(n, 'done', '✓ Complete');
    document.getElementById(`sim-step-${n}-status`).textContent = '✓ Complete';
    setSimProgress(`Step ${n} of 3`, (n / 3) * 100);
    document.getElementById('sim-kg-phase').innerHTML = n === 3
        ? 'World model ready · awaiting launch'
        : `Step ${n} complete · continuing<span style="opacity:0.5">…</span>`;

    await delay(450);
    runBuildStep(n + 1);
}

function updateKgStats() {
    document.getElementById('sim-kg-nodes').textContent = simState.nodes.length;
    document.getElementById('sim-kg-edges').textContent = simState.edges.length;
    const agents = simState.nodes.filter(n => n.type === 'Person').length;
    document.getElementById('sim-kg-agents').textContent = agents;
}

/* ── Run phase ── */
function startSimPhase() {
    simState.phase = 'run';
    setSimPhaseHeader('Phase 2 — Live simulation', 'Running <em>120 rounds.</em>',
        'Agents are interacting in real time. Pause at decision points to steer the model.');

    // hide build phase, show run
    document.getElementById('sim-build-phase').style.display = 'none';
    document.getElementById('sim-run-phase').style.display = 'block';

    // swap buttons
    document.getElementById('btn-sim-launch').style.display = 'none';
    document.getElementById('sim-speed-wrap').style.display = 'flex';
    document.getElementById('btn-sim-skip').style.display = 'inline-flex';

    document.getElementById('sim-kg-phase').innerHTML = 'Live simulation<span style="opacity:0.5">…</span>';

    // bind speed slider
    const slider = document.getElementById('sim-speed');
    const lbl = document.getElementById('sim-speed-label');
    slider.addEventListener('input', () => {
        simState.speed = +slider.value;
        lbl.textContent = simState.speed + '×';
    });

    document.getElementById('btn-sim-skip').addEventListener('click', () => {
        finishSim();
    });

    setSimProgress('Round 0 of 120', 0);
    advanceSimulation();
}

async function advanceSimulation() {
    while (simState.round < 120 && !simState.pendingDecision) {
        simState.round++;
        document.getElementById('sim-round-display').textContent = `Round ${simState.round}/120`;
        setSimProgress(`Round ${simState.round} of 120`, (simState.round / 120) * 100);
        updateSimMetrics();

        // decision points
        const dp = SIM_DECISION_POINTS.find(d => d.round === simState.round);
        if (dp) {
            simState.pendingDecision = true;
            renderDecisionCard(dp);
            return;
        }

        // emit feed event every couple of rounds
        if (simState.round % 4 === 0 && simState.feedIdx < SIM_AGENT_FEED.length) {
            renderFeedEvent(SIM_AGENT_FEED[simState.feedIdx++]);
        }

        await delay(Math.max(80, 600 / simState.speed));
    }
    if (simState.round >= 120) finishSim();
}

function updateSimMetrics() {
    const r = simState.round;
    const t = r / 120;
    // tourism receipts ramp + post-event tail
    const gdp = Math.round(372 * easeOutCubic(Math.min(1, t * 1.4)));
    const jobs = Math.round(2400 * easeOutCubic(Math.min(1, t * 1.2)));
    const occ = Math.min(92.7, 75 + 22 * easeOutCubic(Math.min(1, t * 1.5))).toFixed(1);
    const pax = Math.round(175 + 35 * easeOutCubic(Math.min(1, t * 1.3)));

    document.getElementById('sim-m-gdp').textContent = `S$${gdp}M`;
    document.getElementById('sim-m-gdp-delta').textContent = `+${(t * 18).toFixed(1)}% vs baseline`;
    document.getElementById('sim-m-jobs').textContent = jobs.toLocaleString();
    document.getElementById('sim-m-jobs-delta').textContent = `+${(t * 14).toFixed(0)}% temp uplift`;
    document.getElementById('sim-m-occ').textContent = occ + '%';
    document.getElementById('sim-m-occ-delta').textContent = r > 30 ? `Peak: 92.7%` : 'Pre-event ramp';
    document.getElementById('sim-m-pax').textContent = pax + 'K';
    document.getElementById('sim-m-pax-delta').textContent = r > 20 ? '+20% wk-on-wk' : 'Baseline';

    document.getElementById('sim-m-occ-delta').classList.toggle('is-up', r > 30);
}
function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

function renderFeedEvent(ev) {
    const feed = document.getElementById('sim-feed');
    const el = document.createElement('div');
    el.className = 'sim-event';
    const initial = ev.name.split(' ').map(s => s[0]).slice(0, 2).join('');
    el.innerHTML = `
        <div class="sim-event__avatar">${initial}</div>
        <div class="sim-event__content">
            <div class="sim-event__head">
                <span class="sim-event__name">${ev.name}</span>
                <span class="sim-event__role">${ev.role}</span>
                <span class="sim-event__time">R${ev.round}</span>
            </div>
            <div class="sim-event__body">${ev.body}</div>
        </div>
    `;
    feed.insertBefore(el, feed.firstChild);
    // keep only 12 visible
    while (feed.children.length > 12) feed.removeChild(feed.lastChild);
}

function renderDecisionCard(dp) {
    const feed = document.getElementById('sim-feed');
    const el = document.createElement('div');
    el.className = 'sim-decision';
    el.innerHTML = `
        <div class="sim-decision__tag">Paused at round ${dp.round} · awaiting your call</div>
        <div class="sim-decision__title">${dp.title}</div>
        <div class="sim-decision__desc">${dp.desc}</div>
        <div class="sim-decision__options">
            ${dp.options.map(o => `
                <button class="sim-decision__option" data-key="${o.key}">
                    <span class="sim-decision__option-key">${o.key}</span>
                    <span>${o.label}${o.recommended ? ' <em style="color:var(--sim-accent);font-style:normal;font-size:0.74rem;margin-left:6px;">· recommended</em>' : ''}</span>
                </button>
            `).join('')}
        </div>
    `;
    el.querySelectorAll('.sim-decision__option').forEach(btn => {
        btn.addEventListener('click', () => {
            const key = btn.dataset.key;
            const choice = dp.options.find(o => o.key === key);
            // collapse to a "decided" bar
            el.innerHTML = `
                <div class="sim-decision__tag" style="color:var(--sim-emerald);">
                    Decision recorded · round ${dp.round}
                </div>
                <div class="sim-decision__title" style="font-size:0.95rem;">
                    ${dp.title} → <span style="color:var(--sim-emerald);">${choice.label}</span>
                </div>
            `;
            simState.pendingDecision = false;
            advanceSimulation();
        });
    });
    feed.insertBefore(el, feed.firstChild);
}

function finishSim() {
    simState.phase = 'done';
    setSimProgress('Run complete · 120/120', 100);
    setSimPhaseHeader('Phase 3 — Synthesis', 'Run complete.', 'All 120 rounds simulated. Findings synthesised. Ready to view the report.');

    document.getElementById('sim-kg-phase').innerHTML = 'Run complete · 120/120';

    // replace controls with "go to report"
    const controls = document.querySelector('.sim-controls');
    controls.innerHTML = `
        <button class="sim-control-btn sim-control-btn--ghost" id="btn-sim-restart">↺ Restart</button>
        <button class="sim-control-btn sim-control-btn--primary" id="btn-go-report">View report →</button>
    `;
    document.getElementById('btn-sim-restart').addEventListener('click', () => {
        simState = { ...simState, round: 0, feedIdx: 0, pendingDecision: false, phase: 'run' };
        document.getElementById('sim-feed').innerHTML = '';
        controls.innerHTML = '';
        location.reload();
    });
    document.getElementById('btn-go-report').addEventListener('click', () => {
        goStage('report');
        initReportStage();
    });
}

// initial sim controls
document.getElementById('btn-sim-back').addEventListener('click', () => goStage('plan'));
document.getElementById('btn-sim-launch').addEventListener('click', () => {
    // skip to next build step or jump straight into sim
    if (simState.phase === 'build' && simState.buildStep < 3) {
        // fast-forward
        simState.buildStep = 3;
    }
});

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

/* ═══════════════════════════════════════════════
   REPORT STAGE
   ═══════════════════════════════════════════════ */

let reportInitialised = false;
function initReportStage() {
    if (reportInitialised) return;
    reportInitialised = true;
    buildReportTOC();
    drawReportCharts();
    bindReportChat();
}

function buildReportTOC() {
    const list = document.getElementById('report-toc-list');
    const sections = document.querySelectorAll('.report-section[data-toc]');
    sections.forEach(s => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = '#' + s.id;
        a.innerHTML = s.dataset.toc;
        a.addEventListener('click', (e) => {
            e.preventDefault();
            s.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
        li.appendChild(a);
        list.appendChild(li);
    });

    // scrollspy
    const links = list.querySelectorAll('a');
    const obs = new IntersectionObserver((entries) => {
        entries.forEach(en => {
            if (en.isIntersecting) {
                links.forEach(l => l.classList.remove('is-active'));
                const link = list.querySelector(`a[href="#${en.target.id}"]`);
                if (link) link.classList.add('is-active');
            }
        });
    }, { rootMargin: '-30% 0px -50% 0px' });
    sections.forEach(s => obs.observe(s));
}

function drawReportCharts() {
    drawSectorChart();
    drawHaloChart();
}

function drawSectorChart() {
    const host = document.getElementById('report-chart-sectors');
    if (!host) return;
    const data = [
        { label: 'Accommodation', pct: 38, color: '#ff5b1f' },
        { label: 'F&B',           pct: 24, color: '#3a3a3a' },
        { label: 'Retail',        pct: 19, color: '#888' },
        { label: 'Aviation',      pct: 12, color: '#bbb' },
        { label: 'Transport',     pct: 7,  color: '#d4d4d4' },
    ];
    host.innerHTML = `
        <div style="position:absolute;inset:0;padding:20px 24px;display:flex;flex-direction:column;">
            <div style="font-family:var(--font-mono);font-size:0.66rem;letter-spacing:0.12em;text-transform:uppercase;color:var(--muted);margin-bottom:14px;">Sector share of S$372M projected receipts</div>
            <div style="display:flex;height:34px;border-radius:6px;overflow:hidden;margin-bottom:16px;">
                ${data.map(d => `<div style="width:${d.pct}%;background:${d.color};" title="${d.label} ${d.pct}%"></div>`).join('')}
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:14px;font-family:var(--font-sans);font-size:0.78rem;color:var(--fg);">
                ${data.map(d => `
                    <div style="display:inline-flex;align-items:center;gap:6px;">
                        <span style="width:10px;height:10px;background:${d.color};border-radius:2px;"></span>
                        <span>${d.label} <b style="font-family:var(--font-serif);font-style:italic;color:var(--accent);">${d.pct}%</b></span>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function drawHaloChart() {
    const host = document.getElementById('report-chart-halo');
    if (!host) return;
    // simple SVG sparkline
    const pts = [];
    for (let i = 0; i <= 16; i++) {
        const t = i / 16;
        // pre-event flat, peak around event, then halo decay
        let y;
        if (t < 0.25) y = 1;
        else if (t < 0.45) y = 1 + (t - 0.25) * 14;  // ramp
        else if (t < 0.55) y = 3.8 - (t - 0.45) * 8; // peak / immediate aftermath
        else y = 3 - Math.pow((t - 0.55) / 0.5, 1.4) * 1.8; // halo decay
        pts.push({ x: i, y: Math.max(1, y) });
    }
    const w = 100, h = 100;
    const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${(p.x / 16) * w} ${h - (p.y / 4) * h * 0.85}`).join(' ');
    const fillPath = path + ` L ${w} ${h} L 0 ${h} Z`;
    host.innerHTML = `
        <div style="position:absolute;inset:0;padding:20px 24px;display:flex;flex-direction:column;">
            <div style="font-family:var(--font-mono);font-size:0.66rem;letter-spacing:0.12em;text-transform:uppercase;color:var(--muted);margin-bottom:8px;">Consumption index: pre-event → halo (4w window)</div>
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" style="flex:1;width:100%;height:100%;">
                <defs>
                    <linearGradient id="halo-grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stop-color="#ff5b1f" stop-opacity="0.3"/>
                        <stop offset="1" stop-color="#ff5b1f" stop-opacity="0"/>
                    </linearGradient>
                </defs>
                <line x1="0" y1="${h - (1 / 4) * h * 0.85}" x2="${w}" y2="${h - (1 / 4) * h * 0.85}" stroke="rgba(0,0,0,0.1)" stroke-dasharray="2 2" vector-effect="non-scaling-stroke"/>
                <path d="${fillPath}" fill="url(#halo-grad)"/>
                <path d="${path}" fill="none" stroke="#ff5b1f" stroke-width="1.6" vector-effect="non-scaling-stroke"/>
                <line x1="${(7/16)*w}" y1="0" x2="${(7/16)*w}" y2="${h}" stroke="rgba(0,0,0,0.18)" stroke-dasharray="3 3" vector-effect="non-scaling-stroke"/>
            </svg>
            <div style="display:flex;justify-content:space-between;font-family:var(--font-mono);font-size:0.66rem;color:var(--muted);margin-top:6px;">
                <span>2w pre</span><span>event</span><span>+4w</span><span>+8w halo</span>
            </div>
        </div>
    `;
}

function bindReportChat() {
    const form = document.getElementById('report-chat-form');
    const input = document.getElementById('report-chat-input');
    const body = document.getElementById('report-chat-body');
    const suggestEl = document.getElementById('report-chat-suggest');

    function appendMsg(role, text) {
        const msg = document.createElement('div');
        msg.className = `report-chat__msg ${role === 'user' ? 'report-chat__msg--user' : 'report-chat__msg--bot'}`;
        msg.innerHTML = `
            <div class="report-chat__avatar">${role === 'user' ? 'You' : 'L'}</div>
            <div class="report-chat__bubble">${text}</div>
        `;
        body.appendChild(msg);
        body.scrollTop = body.scrollHeight;
        return msg;
    }

    function fakeAnswer(q) {
        const lower = q.toLowerCase();
        if (lower.includes('halo')) return 'The 8–12 week halo emerges because simulated agents continue to share content (avg 4.2 posts/agent over 30d post-event), driving secondary visit decisions in their network. Traditional I-O models miss this because they treat consumption as a single-shot impulse rather than a propagating signal.';
        if (lower.includes('stress') || lower.includes('test')) return 'I ran a sensitivity sweep on three priors: viral coefficient ±25% shifts halo from 6w to 14w; inbound assumption shock ±30% widens 80% CI to [S$280M, S$510M]; and pulling the GST-refund threshold elasticity by ±50% mostly affects retail share without changing aggregate. Want the full table?';
        if (lower.includes('summari') || lower.includes('key')) return 'Five findings: (F1) S$372M projected receipts, mostly accommodation/F&B/retail; (F2) an 8–12 week halo absent in traditional models; (F3) +20% Changi arrivals, validated by STB; (F4) 92.7% peak central-district occupancy, +38% ADR; (F5) +0.25pp Q1 GDP — modest in absolute terms, ~7% of the quarter\'s total expansion.';
        if (lower.includes('counter') || lower.includes('baseline')) return 'The "no-concert" baseline uses a synthetic-control weighted match of Mar 2023 + seasonal adjustment, with weights solved against pre-event hotel ADR and Changi arrivals. The match RMSE is 1.8% over the calibration window. Beyond 4 weeks post-event, baseline uncertainty widens markedly — see §4.';
        return 'Good question. I\'d ground that in §3 of the report — the relevant findings + chart should be on screen. If you\'d like me to walk through the maths or pull the underlying agent traces, just say so.';
    }

    function sendQuery(q) {
        if (!q.trim()) return;
        appendMsg('user', q);
        input.value = '';
        suggestEl.style.display = 'none';
        const typing = appendMsg('bot', '<span style="opacity:0.5;">thinking…</span>');
        setTimeout(() => {
            typing.querySelector('.report-chat__bubble').innerHTML = fakeAnswer(q);
        }, 700 + Math.random() * 600);
    }

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        sendQuery(input.value);
    });
    suggestEl.querySelectorAll('.report-chat__sug').forEach(btn => {
        btn.addEventListener('click', () => sendQuery(btn.textContent));
    });
}

// allow direct nav to report (eg. dev / sharing)
const _hash = location.hash;
if (_hash === '#report') { goStage('report'); initReportStage(); }
if (_hash === '#run') { goStage('run'); runSimulationStage(); }
