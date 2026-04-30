// Plan screen — Lokafish Flow design (Stage 2)
// Thinking stream + skeleton-to-real plan steps + 3 participation modes
// + run-mode segmented control + start/back buttons.

const PLAN_STEPS = [
  { num: '01', title: 'Parse scenario',                tool: 'GPT-4o',    desc: 'Extract event, geography, time horizon, and target industries from the prompt.', time: '1m' },
  { num: '02', title: 'Build knowledge graph',         tool: 'Zep',       desc: 'Sample agents from population data and link them to relevant entities and venues.', time: '4m' },
  { num: '03', title: 'Calibrate agent personalities', tool: 'OASIS',     desc: 'Apply Big Five priors and consumption profiles to each agent.', time: '2m' },
  { num: '04', title: 'Run multi-agent simulation',    tool: 'OASIS·Camel',desc: 'Dual-scenario, 120 rounds with persistent memory and social interactions.', time: '12m' },
  { num: '05', title: 'Solve I-O × CGE × Monte Carlo', tool: 'IO+CGE+MC', desc: 'Aggregate behaviours into macro projections with confidence intervals.', time: '4m' },
  { num: '06', title: 'Counterfactual baseline',       tool: 'Synthetic-control', desc: 'Compute the no-event baseline using historical + seasonal adjustment.', time: '2m' },
  { num: '07', title: 'Compose findings',              tool: 'ReportAgent ReAct', desc: 'Detect halo effects, sector concentrations, and tail risks across runs.', time: '3m' },
  { num: '08', title: 'Render report',                 tool: 'ReportAgent', desc: 'Generate the long-form research document with charts and decision log.', time: '2m' },
];

const TRACE_LINES = [
  'Reading scenario prompt…',
  'Identifying event class: large-scale entertainment',
  'Geographic scope inferred: Singapore (primary), SEA (spillover)',
  'Time horizon: 4 weeks · pre/event/post',
  'Selecting agent populations: 2,000 across 5 demographic strata',
  'Mapping target industries: tourism, hospitality, aviation, F&B, retail',
  'Picking economic models: Input-Output + CGE + Monte Carlo (10K)',
  'Compiling 8-stage execution plan…',
];

const MODES = [
  { id: 'sandbox',   name: 'Sandbox',   tag: 'default',      desc: 'Agents decide every step. You watch the run unfold and review the final report.' },
  { id: 'community', name: 'Community', tag: 'crowdsourced', desc: 'Decision points are routed to the Loka community. The aggregate vote shapes each branch.' },
  { id: 'user',      name: 'User',      tag: 'hands-on',     desc: 'Pick the checkpoints where you want to make the call. The run waits at each one until you decide.' },
];

// Step indices that act as decision points in user-mode (toggleable per step).
// Indices match PLAN_STEPS array; user can flip these on/off.
const USER_DP_INDICES = new Set([1, 3, 4, 6]);

export function createPlan({ onSubmit, onBack } = {}) {
  const el = document.createElement('div');
  el.className = 'screen flow-screen flow-screen--plan';
  el.id = 'screen-plan';

  const skeletonHtml = PLAN_STEPS.map((_, i) => `
    <li class="plan-step plan-step--skeleton" data-i="${i}" style="animation-delay:${i * 60}ms">
      <div class="plan-step__num">${PLAN_STEPS[i].num}</div>
      <div>
        <div class="flow-skeleton flow-skeleton--title"></div>
        <div class="flow-skeleton flow-skeleton--line-a"></div>
        <div class="flow-skeleton flow-skeleton--line-b"></div>
      </div>
      <div class="flow-skeleton" style="width:36px;height:10px;"></div>
    </li>
  `).join('');

  const modesHtml = MODES.map(m => `
    <div class="mode-card${m.id === 'sandbox' ? ' is-active' : ''}" data-mode="${m.id}">
      <div class="mode-card__head">
        <span class="mode-card__name">${m.name}</span>
        <span class="mode-card__tag">${m.tag}</span>
      </div>
      <div class="mode-card__desc">${m.desc}</div>
    </div>
  `).join('');

  el.innerHTML = `
    <div class="flow-stage">
      <header class="flow-head">
        <div class="flow-head__kicker">
          <span class="flow-head__num">02</span>
          <span id="plan-kicker">Generating plan…</span>
        </div>
        <h1 class="flow-head__title" id="plan-title">Reading <em>scenario.</em></h1>
        <p class="flow-head__sub">A multi-stage plan compiled by the agent. Pick a participation mode on the right to control how much you steer it.</p>
      </header>

      <div class="thinking" id="thinking">
        <div class="thinking__head">
          <span class="thinking__pulse" id="thinking-label">Analysing scenario</span>
          <span class="thinking__pct" id="thinking-pct">0%</span>
        </div>
        <div class="thinking__bar"><div class="thinking__bar-fill" id="thinking-fill"></div></div>
        <ul class="thinking__trace" id="thinking-trace"></ul>
      </div>

      <div class="plan-grid">
        <div>
          <div class="plan-list-head">
            <div class="plan-list-head__title">Plan · 8 stages</div>
          </div>
          <ol class="plan-steps" id="plan-steps">${skeletonHtml}</ol>
        </div>

        <aside class="participation" id="participation">
          <div class="participation__head">Participation mode</div>
          ${modesHtml}
          <div class="participation__footer" id="participation-summary">Sandbox — agents decide every step.</div>
        </aside>
      </div>

      <div class="run-row">
        <div>
          <div class="run-row__label">Run mode</div>
          <div class="run-mode-row">
            <button class="run-mode-btn is-active" data-runmode="demo">
              <div class="run-mode-btn__name">Demo</div>
              <div class="run-mode-btn__desc">Pre-computed snapshot · instant · no API key</div>
            </button>
            <button class="run-mode-btn" data-runmode="real">
              <div class="run-mode-btn__name">Real analysis</div>
              <div class="run-mode-btn__desc">Full pipeline · 10–30 min · uses your LLM key</div>
            </button>
          </div>
          <div class="run-row__hint">Demo runs are deterministic and free. Real runs charge against your connected LLM key.</div>
        </div>
        <div class="run-row__footer">
          <button class="flow-btn flow-btn--ghost" id="btn-back-to-scenario">← Edit scenario</button>
          <button class="flow-btn flow-btn--lg" id="btn-start-run">Start run →</button>
        </div>
      </div>
    </div>
  `;

  // ── thinking stream + skeleton hydration ──
  const traceEl  = el.querySelector('#thinking-trace');
  const fillEl   = el.querySelector('#thinking-fill');
  const pctEl    = el.querySelector('#thinking-pct');
  const thinking = el.querySelector('#thinking');
  const labelEl  = el.querySelector('#thinking-label');
  const planKick = el.querySelector('#plan-kicker');
  const planTitle = el.querySelector('#plan-title');
  const stepsEl  = el.querySelector('#plan-steps');
  let scenarioText = '';
  let started = false;

  function runAnimation() {
    if (started) return;
    started = true;
    let i = 0;
    const total = TRACE_LINES.length;
    const interval = setInterval(() => {
      if (i >= total) {
        clearInterval(interval);
        // Mark thinking done, hydrate steps
        thinking.classList.add('is-done');
        labelEl.textContent = 'Plan ready';
        pctEl.textContent = '100%';
        planKick.textContent = 'Plan ready · pick mode';
        planTitle.innerHTML = 'Compose the <em>simulation.</em>';
        hydrateSteps();
        return;
      }
      const line = document.createElement('li');
      line.className = 'trace-item';
      line.innerHTML = `<span class="trace-dot"></span><span>${TRACE_LINES[i]}</span>`;
      traceEl.appendChild(line);
      // settle older lines
      const items = traceEl.querySelectorAll('.trace-item');
      items.forEach((it, idx) => {
        if (idx === items.length - 1) it.classList.add('is-visible');
        else it.classList.add('is-settled');
      });
      requestAnimationFrame(() => line.classList.add('is-visible'));
      i++;
      const pct = Math.round((i / total) * 100);
      fillEl.style.width = pct + '%';
      pctEl.textContent = pct + '%';
    }, 380);
  }

  let currentMode = 'sandbox';

  function switchLabel(mode) {
    if (mode === 'community') return 'Community decides';
    return 'Pause for me';
  }

  function hydrateSteps() {
    const items = stepsEl.querySelectorAll('.plan-step');
    items.forEach((li, idx) => {
      setTimeout(() => {
        const s = PLAN_STEPS[idx];
        li.classList.remove('plan-step--skeleton');
        const isDP = USER_DP_INDICES.has(idx);
        // Switch rendered for every DP step; visibility controlled by .plan-step--switchable
        const switchHtml = isDP ? `
          <button type="button" class="plan-step__switch is-on" data-idx="${idx}" aria-pressed="true">
            <span class="plan-step__switch-label">${switchLabel(currentMode)}</span>
            <span class="plan-step__switch-track"></span>
          </button>
        ` : '';
        li.innerHTML = `
          <div class="plan-step__num">${s.num}</div>
          <div>
            <div class="plan-step__tool">
              <span class="plan-step__tool-label">Tool</span>
              <span class="plan-step__tool-name">${s.tool}</span>
            </div>
            <div class="plan-step__title">${s.title}</div>
            <div class="plan-step__desc">${s.desc}</div>
          </div>
          <div class="plan-step__meta">
            <div class="plan-step__time">~${s.time}</div>
            ${switchHtml}
          </div>
        `;
        // Wire switch toggling (only in user mode; community switches are locked-on)
        const sw = li.querySelector('.plan-step__switch');
        if (sw) sw.addEventListener('click', () => {
          if (currentMode !== 'user') return;
          const on = sw.classList.toggle('is-on');
          sw.setAttribute('aria-pressed', on);
        });
      }, idx * 90);
    });
  }

  // Apply / remove .plan-step--switchable and update labels based on participation mode
  function setStepSwitchVisibility(mode) {
    currentMode = mode;
    const lis = stepsEl.querySelectorAll('.plan-step');
    lis.forEach((li, idx) => {
      const isDP = USER_DP_INDICES.has(idx);
      const shouldShow = (mode === 'community' || mode === 'user') && isDP;
      li.classList.toggle('plan-step--switchable', shouldShow);
      // Update label text and lock state for community mode
      const sw = li.querySelector('.plan-step__switch');
      if (sw) {
        const labelEl = sw.querySelector('.plan-step__switch-label');
        if (labelEl) labelEl.textContent = switchLabel(mode);
        // Community: always-on, locked. User: toggleable.
        sw.classList.toggle('plan-step__switch--locked', mode === 'community');
        if (mode === 'community') {
          sw.classList.add('is-on');
          sw.setAttribute('aria-pressed', 'true');
        }
      }
    });
  }

  // hand-off from main.js — sets the scenario the user wrote
  el._setScenario = (text) => { scenarioText = text; };
  // main.js calls _runAnimation after navigating in
  el._runAnimation = () => {
    started = false;
    traceEl.innerHTML = '';
    fillEl.style.width = '0%';
    pctEl.textContent = '0%';
    thinking.classList.remove('is-done');
    labelEl.textContent = 'Analysing scenario';
    planKick.textContent = 'Generating plan…';
    planTitle.innerHTML = 'Reading <em>scenario.</em>';
    // re-skeleton
    stepsEl.innerHTML = PLAN_STEPS.map((_, i) => `
      <li class="plan-step plan-step--skeleton" data-i="${i}" style="animation-delay:${i * 60}ms">
        <div class="plan-step__num">${PLAN_STEPS[i].num}</div>
        <div>
          <div class="flow-skeleton flow-skeleton--title"></div>
          <div class="flow-skeleton flow-skeleton--line-a"></div>
          <div class="flow-skeleton flow-skeleton--line-b"></div>
        </div>
        <div class="flow-skeleton" style="width:36px;height:10px;"></div>
      </li>
    `).join('');
    runAnimation();
  };

  // ── participation mode ──
  const summary = el.querySelector('#participation-summary');
  el.querySelectorAll('.mode-card').forEach(card => {
    card.addEventListener('click', () => {
      el.querySelectorAll('.mode-card').forEach(c => c.classList.remove('is-active'));
      card.classList.add('is-active');
      const m = MODES.find(x => x.id === card.dataset.mode);
      summary.textContent = `${m.name} — ${m.desc.split('.')[0]}.`;
      setStepSwitchVisibility(m.id);
    });
  });

  // ── run mode ──
  el.querySelectorAll('.run-mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      el.querySelectorAll('.run-mode-btn').forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
    });
  });

  el.querySelector('#btn-back-to-scenario').addEventListener('click', () => onBack && onBack());
  el.querySelector('#btn-start-run').addEventListener('click', () => onSubmit && onSubmit());

  return el;
}
