// Plan Screen — Step 2 of 2.
//
// Two-column layout:
//   LEFT  — generated plan (8 steps). Interactive state depends on mode.
//   RIGHT — participation mode picker (Sandbox / Community / User)
//
// Interaction rules per mode:
//   - Sandbox   → plan is read-only
//   - Community → every step gets a "community vote" badge; user cannot tick
//   - User      → every step gets a checkbox; ticked steps pause for the user
//
// Bottom controls (shared across modes): run-mode toggle (demo / real)
// and the Start Run button with the real-mode progress overlay.

import { startPipeline, pollPipeline } from '../lib/project_client.js';
import { createParticipationMode } from '../components/participation-mode.js';
import { createDecisionCard } from '../components/decision-card.js';
import {
  DECISION_POINTS,
  PARTICIPATION_MODES,
  getDecisionPoint,
} from '../data/decision_points.js';
import { getConfig, togglePlanStep, setSelectedPlanSteps, setCurrentPlan } from '../lib/participation_state.js';
import { generatePlanForScenario } from '../data/plans.js';

export function createPlan({ onSubmit, onBack }) {
  const el = document.createElement('div');
  el.className = 'screen plan-screen';
  el.id = 'screen-plan';

  el.innerHTML = `
    <div class="plan-screen__container">
      <div class="plan-screen__main anim-fade-up">
        <div class="input-screen__step">Step 2 of 2</div>
        <div class="plan-screen__heading-row">
          <h2 class="plan-screen__heading" id="plan-title">Generating plan…</h2>
          <button type="button" class="plan-screen__back-btn" id="btn-edit-question">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
            Edit question
          </button>
        </div>
        <div class="plan-screen__meta" id="plan-meta">
          <span class="plan-meta__chip" id="meta-mode">sandbox</span>
          <span class="plan-meta__dot">·</span>
          <span id="meta-nodes">— nodes</span>
          <span class="plan-meta__dot">·</span>
          <span id="meta-minutes">— min est</span>
          <span class="plan-meta__dot">·</span>
          <span id="meta-agents">— agents</span>
          <span class="plan-meta__dot">·</span>
          <span id="meta-rounds">— rounds</span>
        </div>

        <!-- Generating animation -->
        <div class="plan-gen" id="plan-gen">
          <div class="plan-gen__pulse"></div>
          <div class="plan-gen__text">
            <span id="plan-gen-label">Analysing scenario</span><span class="plan-gen__dots"><span>.</span><span>.</span><span>.</span></span>
          </div>
        </div>

        <!-- Two-column layout: plan on the left, governance on the right -->
        <div class="plan-layout" id="plan-layout" hidden>
          <div class="plan-layout__left">
            <div class="plan-layout__section-head">
              <span class="input-section-label plan-screen__section-label plan-layout__label">Plan</span>
              <div class="plan-layout__actions" id="plan-left-actions">
                <button type="button" class="btn btn--ghost btn--sm" data-action="select-defaults">Defaults</button>
                <button type="button" class="btn btn--ghost btn--sm" data-action="select-all">All</button>
                <button type="button" class="btn btn--ghost btn--sm" data-action="select-none">Clear</button>
              </div>
            </div>
            <ol class="plan-steps" id="plan-steps"></ol>
          </div>

          <div class="plan-layout__right">
            <div class="input-section-label plan-screen__section-label plan-layout__label">Participation mode</div>
            <div id="participation-mount"></div>
            <div class="participation__footer" id="participation-footer">
              <button type="button" class="btn btn--ghost btn--sm input-preview-btn" id="btn-preview-card">
                Preview checkpoint card ↗
              </button>
              <span class="participation__footer-hint" id="participation-summary"></span>
            </div>
          </div>
        </div>

        <!-- Decision-card preview modal -->
        <div class="decision-preview" id="decision-preview" hidden>
          <div class="decision-preview__backdrop" data-action="close"></div>
          <div class="decision-preview__panel">
            <button type="button" class="decision-preview__close" data-action="close" aria-label="Close">×</button>
            <div class="decision-preview__picker" id="decision-preview-picker"></div>
            <div class="decision-preview__slot" id="decision-preview-slot"></div>
          </div>
        </div>

        <!-- Run controls row -->
        <div class="plan-run" id="plan-run" hidden>
          <div class="input-section-label plan-screen__section-label">Run mode</div>
          <div class="input-screen__mode-row">
            <button type="button" class="input-mode-btn active" data-mode="demo" id="mode-demo">
              <span class="input-mode-btn__label">Demo</span>
              <span class="input-mode-btn__sub">instant · no API key</span>
            </button>
            <button type="button" class="input-mode-btn" data-mode="real" id="mode-real">
              <span class="input-mode-btn__label">Real analysis</span>
              <span class="input-mode-btn__sub">10–30 min · uses LLM key</span>
            </button>
          </div>
          <div class="input-screen__mode-desc" id="mode-desc">
            Uses the pre-computed Taylor Swift snapshot. No API calls, no wait.
          </div>

          <div class="plan-screen__actions">
            <button class="btn btn--primary input-run-btn" id="btn-run-simulation">
              Start Run
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </button>
          </div>

          <!-- Real-mode progress overlay -->
          <div class="pipeline-progress" id="pipeline-progress" style="display:none;margin-top:24px;padding:20px;border:1px solid var(--border);border-radius:10px;background:var(--bg-subtle);">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
              <div style="font-weight:600;font-size:14px;">Running pipeline</div>
              <div class="mono" id="progress-pct" style="font-size:13px;color:var(--blue);">0%</div>
            </div>
            <div style="height:6px;background:var(--border);border-radius:4px;overflow:hidden;margin-bottom:14px;">
              <div id="progress-bar" style="height:100%;width:0%;background:var(--blue);transition:width 400ms ease;"></div>
            </div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px;font-size:11px;">
              <span class="progress-stage" data-stage="expansion">0. Stakeholders</span>
              <span class="progress-stage" data-stage="ontology">1. Ontology</span>
              <span class="progress-stage" data-stage="graph">2. Graph</span>
              <span class="progress-stage" data-stage="entities">3. Entities</span>
              <span class="progress-stage" data-stage="simulation_prepare">4. Profiles</span>
              <span class="progress-stage" data-stage="simulation_run">5. Simulation</span>
              <span class="progress-stage" data-stage="report">6. Report</span>
            </div>
            <div id="progress-message" style="font-size:12px;color:var(--text-secondary);font-family:var(--font-mono);">Starting...</div>
            <div id="progress-error" style="display:none;margin-top:12px;padding:10px;background:#fee;border:1px solid #fcc;border-radius:6px;font-size:12px;color:#900;"></div>
          </div>
        </div>
      </div>
    </div>
  `;

  // ---------- State ----------
  let currentScenario = '';
  let currentPlan = null;
  let generated = false;
  let runMode = 'demo';

  // ---------- DOM refs ----------
  const titleEl         = el.querySelector('#plan-title');
  const metaModeEl      = el.querySelector('#meta-mode');
  const metaNodesEl     = el.querySelector('#meta-nodes');
  const metaMinutesEl   = el.querySelector('#meta-minutes');
  const metaAgentsEl    = el.querySelector('#meta-agents');
  const metaRoundsEl    = el.querySelector('#meta-rounds');
  const genEl           = el.querySelector('#plan-gen');
  const genLabelEl      = el.querySelector('#plan-gen-label');
  const layoutEl        = el.querySelector('#plan-layout');
  const stepsEl         = el.querySelector('#plan-steps');
  const leftActionsEl   = el.querySelector('#plan-left-actions');
  const participationMount    = el.querySelector('#participation-mount');
  const participationSummary  = el.querySelector('#participation-summary');
  const runBlockEl      = el.querySelector('#plan-run');
  const modeDescEl      = el.querySelector('#mode-desc');
  const backBtn         = el.querySelector('#btn-edit-question');
  const runBtn          = el.querySelector('#btn-run-simulation');
  const progressEl      = el.querySelector('#pipeline-progress');
  const progressBar     = el.querySelector('#progress-bar');
  const progressPct     = el.querySelector('#progress-pct');
  const progressMsg     = el.querySelector('#progress-message');
  const progressErr     = el.querySelector('#progress-error');

  // ---------- Back button ----------
  backBtn.addEventListener('click', () => { onBack?.(); });

  // ---------- Run-mode toggle (demo / real) ----------
  const modeDescs = {
    demo: 'Uses the pre-computed Taylor Swift snapshot. No API calls, no wait.',
    real: 'Runs the full MiroFish pipeline against your scenario. Uses your LLM key; typically 10–30 minutes.',
  };
  el.querySelectorAll('.input-mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      runMode = btn.dataset.mode;
      el.querySelectorAll('.input-mode-btn').forEach(b => b.classList.toggle('active', b === btn));
      modeDescEl.textContent = modeDescs[runMode];
    });
  });

  // ---------- Meta-chip + summary based on current participation cfg ----------
  function userSummary(cfg) {
    const n = cfg.selectedPlanSteps?.length || 0;
    const total = currentPlan?.steps?.length || 8;
    const ref = cfg.communityAsReference ? ' (community shown as reference)' : '';
    return `User · pausing on ${n} of ${total} steps${ref}.`;
  }
  function renderMetaFromCfg(cfg) {
    const mode = cfg.mode;
    if (mode === PARTICIPATION_MODES.SANDBOX) {
      participationSummary.textContent = 'Sandbox · agents decide every step.';
      metaModeEl.textContent = 'sandbox';
      metaModeEl.className = 'plan-meta__chip plan-meta__chip--sandbox';
    } else if (mode === PARTICIPATION_MODES.COMMUNITY) {
      const total = currentPlan?.steps?.length || 8;
      participationSummary.textContent = `Community · ${total} steps routed to the crowd.`;
      metaModeEl.textContent = 'community';
      metaModeEl.className = 'plan-meta__chip plan-meta__chip--community';
    } else {
      participationSummary.textContent = userSummary(cfg);
      metaModeEl.textContent = 'user-led';
      metaModeEl.className = 'plan-meta__chip plan-meta__chip--user';
    }
  }

  // ---------- Participation mode component (right column, no built-in picker) ----------
  const participationEl = createParticipationMode({
    showPicker: false,
    onChange: (cfg) => {
      renderPlanSteps(currentPlan, cfg);
      renderLeftActions(cfg);
      renderMetaFromCfg(cfg);
    },
  });
  participationMount.appendChild(participationEl);

  // ---------- Plan rendering ----------
  function renderPlanSteps(plan, cfg = getConfig()) {
    if (!plan) return;
    const mode = cfg.mode;
    const selected = new Set(cfg.selectedPlanSteps || []);

    stepsEl.className = 'plan-steps plan-steps--' + mode;
    stepsEl.innerHTML = '';

    plan.steps.forEach((step, i) => {
      const li = document.createElement('li');
      const isInteractive = mode === PARTICIPATION_MODES.USER;
      const isChecked = isInteractive && selected.has(step.n);
      const isCommunity = mode === PARTICIPATION_MODES.COMMUNITY;
      li.className = 'plan-step'
        + (isInteractive ? ' plan-step--selectable' : '')
        + (isChecked ? ' plan-step--active' : '')
        + (isCommunity ? ' plan-step--community' : '');
      li.style.animationDelay = `${i * 60}ms`;

      const inputChips = (step.inputs || []).map(x =>
        `<span class="plan-step__io plan-step__io--in">in: <span class="mono">${x}</span></span>`
      ).join('');
      const arrow = step.output
        ? `<span class="plan-step__arrow">→</span><span class="plan-step__io plan-step__io--out mono">${step.output}</span>`
        : '';

      // Right-side control (mode-specific).
      // - User mode: a visible switch so the interaction is obvious.
      // - Community mode: a static "community vote" badge.
      // - Sandbox mode: nothing.
      let control = '';
      if (isInteractive) {
        control = `
          <label class="plan-step__switch" data-step-n="${step.n}">
            <input type="checkbox" class="plan-step__switch-input" data-step-n="${step.n}" ${isChecked ? 'checked' : ''} />
            <span class="plan-step__switch-track"><span class="plan-step__switch-knob"></span></span>
            <span class="plan-step__switch-label">${isChecked ? 'You decide' : 'Agent auto'}</span>
          </label>
        `;
      } else if (isCommunity) {
        control = '<span class="plan-step__badge plan-step__badge--community">community vote</span>';
      }

      // Leading cell: plain number (the switch on the right is now the
      // primary interaction affordance in User mode).
      const lead = `<div class="plan-step__lead"><div class="plan-step__num${isChecked ? ' plan-step__num--interactive' : ''}">${step.n}</div></div>`;

      li.innerHTML = `
        ${lead}
        <div class="plan-step__body">
          <div class="plan-step__title-row">
            <div class="plan-step__title">${step.title}</div>
            ${control}
          </div>
          <div class="plan-step__tool">
            <span class="plan-step__tool-label">Tool</span>
            <span class="plan-step__tool-name mono">${step.tool}</span>
          </div>
          <div class="plan-step__desc">${step.description}</div>
          <div class="plan-step__io-row">
            ${inputChips}
            ${arrow}
          </div>
        </div>
        <div class="plan-step__time mono">~${step.estMinutes}m</div>
      `;

      if (isInteractive) {
        const input = li.querySelector('.plan-step__switch-input');
        input.addEventListener('change', (e) => {
          e.stopPropagation();
          const n = parseInt(e.target.dataset.stepN, 10);
          const next = togglePlanStep(n);
          renderPlanSteps(currentPlan, next);
          renderMetaFromCfg(next);
        });
        // Prevent the card-click handler from double-firing when the
        // user clicks the switch itself.
        li.querySelector('.plan-step__switch').addEventListener('click', (e) => {
          e.stopPropagation();
        });
        // Whole-card click also toggles.
        li.addEventListener('click', () => {
          const next = togglePlanStep(step.n);
          renderPlanSteps(currentPlan, next);
          renderMetaFromCfg(next);
        });
      }

      stepsEl.appendChild(li);
    });
  }

  function renderLeftActions(cfg) {
    // Show Defaults/All/Clear only in User mode.
    const isUser = cfg.mode === PARTICIPATION_MODES.USER;
    leftActionsEl.style.display = isUser ? 'flex' : 'none';
  }

  // Defaults / All / Clear handlers (apply to current plan's step numbers)
  leftActionsEl.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn || !currentPlan) return;
    const action = btn.dataset.action;
    let nextSteps;
    if (action === 'select-defaults') nextSteps = [2, 5, 6, 8].filter(n => n <= currentPlan.steps.length);
    else if (action === 'select-all')   nextSteps = currentPlan.steps.map(s => s.n);
    else if (action === 'select-none')  nextSteps = [];
    else return;
    const next = setSelectedPlanSteps(nextSteps);
    renderPlanSteps(currentPlan, next);
    renderMetaFromCfg(next);
  });

  // ---------- Decision-card preview modal ----------
  const previewEl     = el.querySelector('#decision-preview');
  const previewPicker = el.querySelector('#decision-preview-picker');
  const previewSlot   = el.querySelector('#decision-preview-slot');
  const previewBtn    = el.querySelector('#btn-preview-card');
  let previewActiveDpId = 'DP-3';

  function renderPreviewPicker() {
    previewPicker.innerHTML = '';
    DECISION_POINTS.forEach(dp => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'decision-preview__chip' + (dp.id === previewActiveDpId ? ' active' : '');
      chip.textContent = dp.id;
      chip.title = dp.title;
      chip.addEventListener('click', () => {
        previewActiveDpId = dp.id;
        renderPreviewPicker();
        renderPreviewSlot();
      });
      previewPicker.appendChild(chip);
    });
  }
  function renderPreviewSlot() {
    const dp = getDecisionPoint(previewActiveDpId);
    if (!dp) return;
    const cfg = getConfig();
    const cardMode = cfg.mode === PARTICIPATION_MODES.COMMUNITY ? 'community' : 'preview';
    previewSlot.innerHTML = '';
    const card = createDecisionCard(dp, {
      mode: cardMode,
      communityAsReference: cardMode === 'community'
        ? false
        : (cfg.communityAsReference || cfg.mode === PARTICIPATION_MODES.SANDBOX),
      onResolve: ({ optionId, note }) => {
        const opt = dp.options.find(o => o.id === optionId);
        window.alert(`Preview only — your pick: ${opt?.label || optionId}${note ? `\nNote: ${note}` : ''}`);
        closePreview();
      },
      onSkip: () => {
        window.alert('Preview only — agents would take over this checkpoint.');
        closePreview();
      },
    });
    previewSlot.appendChild(card);
  }
  function openPreview() {
    renderPreviewPicker();
    renderPreviewSlot();
    previewEl.hidden = false;
    document.body.style.overflow = 'hidden';
  }
  function closePreview() {
    previewEl.hidden = true;
    document.body.style.overflow = '';
  }
  previewBtn.addEventListener('click', openPreview);
  previewEl.querySelectorAll('[data-action="close"]').forEach(node => {
    node.addEventListener('click', closePreview);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !previewEl.hidden) closePreview();
  });

  // ---------- Show / reset post-generation UI ----------
  function showPostGenerationUI() {
    generated = true;
    genEl.style.display = 'none';
    layoutEl.hidden  = false;
    runBlockEl.hidden = false;
  }
  function resetPostGenerationUI() {
    generated = false;
    genEl.style.display = '';
    layoutEl.hidden  = true;
    runBlockEl.hidden = true;
    progressEl.style.display = 'none';
    progressErr.style.display = 'none';
    stepsEl.innerHTML = '';
  }

  function runGenerationAnimation() {
    const phases = ['Analysing scenario', 'Selecting tools', 'Estimating cost'];
    let i = 0;
    genLabelEl.textContent = phases[0];
    const id = setInterval(() => {
      i += 1;
      if (i >= phases.length) { clearInterval(id); return; }
      genLabelEl.textContent = phases[i];
    }, 500);
  }

  /**
   * Called by main.js after Step 1.
   */
  el._setScenario = function setScenario(scenario) {
    currentScenario = scenario || '';
    currentPlan = generatePlanForScenario(currentScenario);
    setCurrentPlan(currentPlan);

    titleEl.textContent = currentPlan.title;
    metaNodesEl.textContent   = `${currentPlan.totals.nodes} nodes`;
    metaMinutesEl.textContent = `${currentPlan.totals.minutes} min est`;
    metaAgentsEl.textContent  = `${currentPlan.totals.agents.toLocaleString()} agents`;
    metaRoundsEl.textContent  = `${currentPlan.totals.rounds} rounds`;

    resetPostGenerationUI();
    const cfg = getConfig();
    renderPlanSteps(currentPlan, cfg);
    renderLeftActions(cfg);
    renderMetaFromCfg(cfg);
    runGenerationAnimation();

    window.setTimeout(() => {
      showPostGenerationUI();
    }, 1400);
  };

  // ---------- Run pipeline ----------
  function markStage(activeStage) {
    const order = ['expansion', 'ontology', 'graph', 'entities', 'simulation_prepare', 'simulation_run', 'report'];
    const activeIdx = order.indexOf(activeStage);
    el.querySelectorAll('.progress-stage').forEach(s => {
      const idx = order.indexOf(s.dataset.stage);
      s.classList.remove('active', 'done');
      if (idx < activeIdx) s.classList.add('done');
      else if (idx === activeIdx) s.classList.add('active');
    });
  }

  async function runRealMode(scenario) {
    progressEl.style.display = 'block';
    progressErr.style.display = 'none';
    runBtn.disabled = true;
    runBtn.textContent = 'Running...';
    try {
      const runId = await startPipeline({
        requirement: scenario,
        projectName: scenario.slice(0, 60),
        maxRounds: Math.min(currentPlan?.totals.rounds || 40, 40),
      });
      const final = await pollPipeline(runId, (status) => {
        progressPct.textContent = `${status.progress || 0}%`;
        progressBar.style.width = `${status.progress || 0}%`;
        progressMsg.textContent = status.message || '';
        if (status.stage) markStage(status.stage);
      });
      const projectId = final.project_id;
      if (!projectId) throw new Error('pipeline completed without project_id');
      window.location.hash = `#agents?project=${encodeURIComponent(projectId)}`;
      window.dispatchEvent(new CustomEvent('loka:navigate-to-report', {
        detail: { projectId },
      }));
    } catch (err) {
      progressErr.style.display = 'block';
      progressErr.textContent = `Pipeline failed: ${err.message}`;
      runBtn.disabled = false;
      runBtn.textContent = 'Start Run →';
    }
  }

  runBtn.addEventListener('click', () => {
    if (!generated) return;
    const scenario = currentScenario.trim();
    if (!scenario) return;
    if (runMode === 'real') {
      runRealMode(scenario);
    } else {
      onSubmit?.(scenario);
    }
  });

  return el;
}
