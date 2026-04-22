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

        <!-- Generating animation — multi-phase activity trace + skeleton
             of the 8 plan rows. Each phase references keywords parsed
             from the user's own scenario so the trace feels concrete,
             and resolves one skeleton row at a time so the left column
             never feels empty. -->
        <div class="plan-gen" id="plan-gen">
          <div class="plan-gen__head">
            <div class="plan-gen__pulse"></div>
            <div class="plan-gen__text">
              <span id="plan-gen-label">Analysing scenario</span><span class="plan-gen__dots"><span>.</span><span>.</span><span>.</span></span>
            </div>
            <div class="plan-gen__progress">
              <div class="plan-gen__progress-bar" id="plan-gen-bar"></div>
            </div>
          </div>
          <ul class="plan-gen__trace" id="plan-gen-trace"></ul>
        </div>

        <!-- Two-column layout: plan on the left, governance on the right.
             ALWAYS visible so the right-hand mode picker is never
             hidden. The left column starts as 8 skeleton rows and
             resolves to real step rows once the user submits a
             scenario and the generation animation runs. -->
        <div class="plan-layout" id="plan-layout">
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
  const metaModeEl      = null;
  const metaNodesEl     = null;
  const metaMinutesEl   = null;
  const metaAgentsEl    = null;
  const metaRoundsEl    = null;
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
    // Meta chips were removed from the top of the plan screen — the
    // only remaining meta copy is the participation summary hint in
    // the right column.
    const mode = cfg.mode;
    if (mode === PARTICIPATION_MODES.SANDBOX) {
      participationSummary.textContent = 'Sandbox · agents decide every step.';
    } else if (mode === PARTICIPATION_MODES.COMMUNITY) {
      const total = currentPlan?.steps?.length || 8;
      participationSummary.textContent = `Community · ${total} steps routed to the crowd.`;
    } else {
      participationSummary.textContent = userSummary(cfg);
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
    // Collapse the generation banner; the plan layout has already been
    // visible (with skeletons filling in) since the animation started.
    genEl.classList.add('plan-gen--done');
    runBlockEl.hidden = false;
    // Remove the banner entirely after its fade-out animation
    window.setTimeout(() => { genEl.style.display = 'none'; }, 350);
  }
  function resetPostGenerationUI() {
    generated = false;
    // Cancel any in-flight generation timers from a previous run
    if (el._planGenTimers) {
      el._planGenTimers.forEach((t) => clearTimeout(t));
      el._planGenTimers = null;
    }
    genEl.style.display = '';
    genEl.classList.remove('plan-gen--done');
    // Layout stays visible at all times — we just swap the left
    // column between skeletons and real rows.
    runBlockEl.hidden = true;
    progressEl.style.display = 'none';
    progressErr.style.display = 'none';
    stepsEl.innerHTML = '';
  }

  // Render N skeleton rows in the plan-steps list. Used while the AI is
  // "thinking" so the user doesn't stare at an empty column. The first
  // row is marked active (with a spinner) so the user can see which
  // step the agent is currently processing.
  function renderPlanSkeletons(plan) {
    stepsEl.innerHTML = '';
    for (let i = 0; i < plan.steps.length; i++) {
      appendSkeletonRow(i + 1, i === 0);
    }
  }
  function appendSkeletonRow(n, isActive = false) {
    const li = document.createElement('li');
    li.className = isActive
      ? 'plan-step plan-step--skeleton plan-step--skeleton-active'
      : 'plan-step plan-step--skeleton';
    li.dataset.skeletonN = String(n);
    li.innerHTML = `
      <div class="plan-step__lead">
        <div class="plan-step__num plan-step__num--skeleton">
          ${isActive ? '<span class="plan-step__spinner"></span>' : n}
        </div>
      </div>
      <div class="plan-step__body">
        <div class="skeleton skeleton--title"></div>
        <div class="skeleton skeleton--line skeleton--line-a"></div>
        <div class="skeleton skeleton--line skeleton--line-b"></div>
      </div>
      <div class="skeleton skeleton--time"></div>
    `;
    stepsEl.appendChild(li);
  }

  // Render the plan list with the first `resolvedCount` rows as real
  // step cards and the rest as skeletons. Called incrementally by the
  // generation animation so the left column "fills in" one row at a
  // time while the AI trace scrolls on the right.
  function renderPlanListWithProgress(plan, cfg, resolvedCount) {
    if (resolvedCount >= plan.steps.length) {
      renderPlanSteps(plan, cfg);
      return;
    }
    renderPlanSteps(plan, cfg);
    // Replace the remaining rows (after resolvedCount) with skeletons.
    // The FIRST unresolved row gets an "active" highlight so the user
    // can see exactly which step the agent is processing right now.
    const rows = Array.from(stepsEl.children);
    for (let i = resolvedCount; i < rows.length; i++) {
      const n = i + 1;
      const isActive = (i === resolvedCount);
      const li = document.createElement('li');
      li.className = isActive
        ? 'plan-step plan-step--skeleton plan-step--skeleton-active'
        : 'plan-step plan-step--skeleton';
      li.dataset.skeletonN = String(n);
      li.innerHTML = `
        <div class="plan-step__lead">
          <div class="plan-step__num plan-step__num--skeleton">${isActive ? '' : n}</div>
        </div>
        <div class="plan-step__body">
          <div class="skeleton skeleton--title"></div>
          <div class="skeleton skeleton--line skeleton--line-a"></div>
          <div class="skeleton skeleton--line skeleton--line-b"></div>
        </div>
        <div class="skeleton skeleton--time"></div>
      `;
      if (isActive) {
        // Replace the "number" with a small spinner so it's obvious
        // which row the agent is thinking about.
        const numEl = li.querySelector('.plan-step__num');
        if (numEl) numEl.innerHTML = '<span class="plan-step__spinner"></span>';
      }
      rows[i].replaceWith(li);
    }
    // Mark the newly-resolved row with a fade-in flourish
    const resolvedRow = stepsEl.children[resolvedCount - 1];
    if (resolvedRow && !resolvedRow.classList.contains('plan-step--skeleton')) {
      resolvedRow.classList.add('plan-step--resolving');
      requestAnimationFrame(() =>
        requestAnimationFrame(() => resolvedRow.classList.remove('plan-step--resolving'))
      );
    }
  }

  function runGenerationAnimation(plan, cfg) {
    // Continuous "thinking stream" — a long list of short sub-thoughts
    // that stream upward inside a fixed-height viewport so the banner
    // always feels like an active agent reasoning out loud. A subset
    // of those thoughts also resolve the matching skeleton row on the
    // left, so the plan fills in in sync with the narration.
    const barEl   = el.querySelector('#plan-gen-bar');
    const traceEl = el.querySelector('#plan-gen-trace');
    if (traceEl) traceEl.innerHTML = '';
    if (barEl) barEl.style.width = '0%';

    const scenarioBits = deriveScenarioBits(currentScenario, plan);
    const stream = buildThoughtStream(plan, scenarioBits);

    const timers = [];
    stream.forEach((s) => {
      timers.push(setTimeout(() => {
        if (s.label) genLabelEl.textContent = s.label;
        if (barEl && typeof s.pct === 'number') barEl.style.width = `${s.pct}%`;

        if (traceEl && s.text) {
          const li = document.createElement('li');
          li.className = 'plan-gen__trace-item';
          li.innerHTML = `
            <span class="plan-gen__trace-dot"></span>
            <span class="plan-gen__trace-text">${s.text}</span>
          `;
          traceEl.appendChild(li);
          requestAnimationFrame(() => li.classList.add('is-visible'));
          // Auto-scroll so the latest thought is always visible; older
          // ones slide up and fade behind the top mask.
          traceEl.scrollTop = traceEl.scrollHeight;
          // Mark older lines as "settled" so they dim slightly —
          // keeps focus on the newest 2-3 thoughts.
          const items = traceEl.querySelectorAll('.plan-gen__trace-item');
          items.forEach((n, idx) => {
            n.classList.toggle('is-settled', idx < items.length - 2);
          });
        }

        if (s.resolveStep) {
          renderPlanListWithProgress(plan, cfg, s.resolveStep);
        }
      }, s.at));
    });
    el._planGenTimers = timers;
  }

  // Extract a handful of readable keywords / entities from the raw
  // scenario text so the trace copy can reference them concretely.
  // Never returns empty arrays — falls back to plan metadata.
  function deriveScenarioBits(scenario, plan) {
    const raw = String(scenario || '').trim();
    const firstPhrase = raw
      .split(/[.。!?？\n]/)[0]
      .slice(0, 80)
      .trim();

    // Grab nouns/named entities: sequences of letters/CJK, filtering
    // short stopwords. Keep original casing for display.
    const tokens = raw.match(/[A-Za-z][A-Za-z0-9'-]{2,}|[\u4e00-\u9fff]{2,}/g) || [];
    const stop = new Set([
      'the','and','for','with','into','from','that','this','about',
      'have','will','should','could','when','what','where','which',
      '如何','怎么','怎样','我们','他们','是否','可以','应该',
    ]);
    const seen = new Set();
    const keywords = [];
    for (const t of tokens) {
      const k = t.toLowerCase();
      if (stop.has(k) || seen.has(k)) continue;
      seen.add(k);
      keywords.push(t);
      if (keywords.length >= 6) break;
    }

    // Pull entity / relation language from the plan's ontology step
    const ontologyStep = plan.steps.find(s => s.stage === 'ontology');
    const entityHint = ontologyStep
      ? (ontologyStep.description.match(/entity types[^\.]*/i)?.[0] || '')
      : '';

    return {
      firstPhrase: firstPhrase || plan.title,
      keywords: keywords.length ? keywords : [plan.title],
      topKeyword: keywords[0] || plan.title.split(' ')[0],
      entityHint,
      domain: plan.matchHint || plan.title,
    };
  }

  // Build a continuous stream of short "thoughts" the agent narrates
  // while planning. Each phase (one per plan step) gets 3-4 sub-thoughts
  // that fire in sequence — feels like watching a reasoning agent work,
  // not a 6-item checklist. Some thoughts also resolve skeleton rows
  // on the left, keeping the plan list in sync with the narration.
  function buildThoughtStream(plan, bits) {
    const kw1 = bits.keywords[0] || bits.topKeyword;
    const kw2 = bits.keywords[1] || kw1;
    const kw3 = bits.keywords[2] || kw2;
    const kwList = bits.keywords.slice(0, 3).join(', ') || kw1;
    const firstPhrase = truncate(bits.firstPhrase, 42);
    const agents = plan.totals.agents.toLocaleString();
    const rounds = plan.totals.rounds;
    const nodes  = plan.totals.nodes;

    // Each entry: { label?, thoughts: [string], resolveAtEnd?: boolean }
    // Labels update the main banner line. Every phase ends by resolving
    // its matching skeleton row on the left.
    const phases = [
      {
        label: 'Reading scenario',
        thoughts: [
          `Parsing prompt: "${firstPhrase}"`,
          `Key concepts surfacing: ${kwList}`,
          `Tagging tone, domain, and time horizon`,
          `Locking in primary focus: ${kw1}`,
        ],
      },
      {
        label: 'Expanding stakeholders',
        thoughts: [
          `Fanning out from ${kw1} to adjacent actors`,
          `Checking who is affected directly vs. indirectly`,
          `Grouping stakeholders into coalitions`,
          `Drafted stakeholder map · ${kw2 !== kw1 ? kw2 : 'coalition-A'}, ${kw3 !== kw1 && kw3 !== kw2 ? kw3 : 'coalition-B'}, …`,
        ],
      },
      {
        label: 'Designing ontology',
        thoughts: [
          `Picking entity types that matter here`,
          `Proposing relations: influences, depends-on, blocks`,
          `Cross-checking against prior ${kw1} cases`,
          `Ontology locked · ready for graph`,
        ],
      },
      {
        label: 'Wiring knowledge graph',
        thoughts: [
          `Seeding graph with ~${nodes} nodes`,
          `Connecting ${kw1} to related entities`,
          `Pruning low-signal edges`,
          `Graph coherent · no orphan clusters`,
        ],
      },
      {
        label: 'Extracting salient entities',
        thoughts: [
          `Ranking entities by centrality`,
          `Highlighting ${kwList}`,
          `Flagging entities that may trigger decision points`,
          `Shortlist finalised`,
        ],
      },
      {
        label: 'Rendering persona profiles',
        thoughts: [
          `Sampling demographic slices from the graph`,
          `Writing Big-Five profiles per persona`,
          `Calibrating belief + interest vectors`,
          `Profiles ready for the simulator`,
        ],
      },
      {
        label: `Budgeting ${agents} agents × ${rounds} rounds`,
        thoughts: [
          `Allocating agent quota across coalitions`,
          `Sizing ${rounds} dialogue rounds per gate`,
          `Reserving compute headroom for adversarial turns`,
          `Simulation plan compiled`,
        ],
      },
      {
        label: 'Finalising plan',
        thoughts: [
          `Wiring chart aggregators · signals + timelines`,
          `Reserving report slots · narrative + figures`,
          `Linking decision-point triggers into the run`,
          `Plan ready · handing off to the runner`,
        ],
      },
    ];

    // Time budget: ~9.5s total. Distribute evenly by phase, then
    // evenly within each phase. Give a small 500ms lead-in so the
    // first thought doesn't land the instant the banner appears.
    const startDelay = 500;
    const totalMs = 9500;
    const perPhase = totalMs / phases.length;
    const stream = [];
    phases.forEach((phase, pi) => {
      const phaseStart = startDelay + pi * perPhase;
      const subCount = phase.thoughts.length;
      phase.thoughts.forEach((text, ti) => {
        // Stagger sub-thoughts within the phase, leaving the last slot
        // for the skeleton-row resolution so the row fills in right as
        // the "locked-in" thought lands.
        const at = Math.round(phaseStart + (ti / subCount) * perPhase);
        const isLast = (ti === subCount - 1);
        const pct = Math.round(((pi + (ti + 1) / subCount) / phases.length) * 100);
        stream.push({
          at,
          text,
          label: ti === 0 ? phase.label : undefined,
          pct,
          resolveStep: isLast ? (pi + 1) : undefined,
        });
      });
    });
    return stream;
  }

  function truncate(s, n) {
    s = String(s || '').trim();
    return s.length > n ? s.slice(0, n - 1) + '…' : s;
  }

  /**
   * Called by main.js after Step 1.
   */
  el._setScenario = function setScenario(scenario) {
    currentScenario = scenario || '';
    currentPlan = generatePlanForScenario(currentScenario);
    setCurrentPlan(currentPlan);

    titleEl.textContent = currentPlan.title;

    resetPostGenerationUI();
    const cfg = getConfig();
    // Layout is always visible. The left column gets 8 skeleton rows
    // that resolve one-by-one as each trace phase fires.
    renderPlanSkeletons(currentPlan);
    renderLeftActions(cfg);
    renderMetaFromCfg(cfg);
    genEl.classList.remove('plan-gen--idle');
    runGenerationAnimation(currentPlan, cfg);

    // Hold the loading state long enough for the full thinking stream
    // to play out. Stream spans ~10s (500ms lead-in + 9.5s thoughts);
    // give a ~400ms settle buffer before revealing the run button.
    window.setTimeout(() => {
      showPostGenerationUI();
    }, 10400);
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

  // ---------- Initial paint ----------
  // Render 8 placeholder skeleton rows on mount so the left column is
  // never empty — even before the user submits a scenario. Right column
  // (participation mode picker) is already mounted above.
  {
    const placeholderPlan = generatePlanForScenario('');
    renderPlanSkeletons(placeholderPlan);
    // Dim the generation banner until a scenario fires — it shouldn't
    // look like it's "working" when nothing has been submitted.
    genEl.classList.add('plan-gen--idle');
  }

  // ---------- Auto-start hook ----------
  // main.js calls `screen._runAnimation()` the first time a screen is
  // activated. If the user navigated here directly (via the navbar,
  // for instance) instead of submitting from Input, `_setScenario`
  // was never called — so fall back to a generic scenario so the
  // thinking-stream animation still plays and the banner isn't empty.
  el._runAnimation = function runAnimation() {
    if (generated) return;                  // already finished a run
    if (currentScenario) return;            // Input path already ran it
    el._setScenario('Explore the current scenario');
  };

  return el;
}
