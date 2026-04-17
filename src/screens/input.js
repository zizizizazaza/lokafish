// Input Screen — with Advanced Configuration Panel
//
// Two submission modes:
//   demo   → jump to pre-baked Taylor Swift snapshot (original behavior)
//   real   → POST /api/project/run, poll, navigate to ?project=<id>

import { startPipeline, pollPipeline } from '../lib/project_client.js';
import { createParticipationMode } from '../components/participation-mode.js';
import { createDecisionCard } from '../components/decision-card.js';
import {
  DECISION_POINTS,
  PARTICIPATION_MODES,
  getDecisionPoint,
} from '../data/decision_points.js';
import { getConfig } from '../lib/participation_state.js';

export function createInput(onSubmit) {
  const el = document.createElement('div');
  el.className = 'screen input-screen';
  el.id = 'screen-input';

  const defaultScenario = "Predict the economic impact of Taylor Swift's Eras Tour concert series in Singapore. Analyze the effects on tourism, hospitality, aviation, local businesses, and overall GDP contribution. Consider both direct and indirect economic multiplier effects across all relevant industries.";

  el.innerHTML = `
    <div class="input-screen__container">
      <div class="input-screen__main anim-fade-up">
        <div class="input-screen__step">Step 1 of 2</div>
        <h2 class="input-screen__heading">Configure your simulation</h2>
        <p class="input-screen__lead">Describe the scenario. Set governance. Run.</p>

        <div class="input-section-label">Scenario</div>
        <div class="input-screen__textarea-wrap">
          <textarea class="input-screen__textarea" id="scenario-input" placeholder="e.g., Predict the economic impact of a major event on a city's GDP, tourism, and local businesses...">${defaultScenario}</textarea>
          <div class="input-screen__char-count" id="char-count"></div>
        </div>

        <div class="input-section-label">Data sources</div>
        <div class="input-screen__toggles">
          <div class="input-screen__toggle-row">
            <div>
              <div class="input-screen__toggle-label">Autonomous Data Collection</div>
              <div class="input-screen__toggle-desc">Loka agents autonomously gather and synthesize relevant public data</div>
            </div>
            <div class="toggle-switch on" id="toggle-ai-data"><div class="toggle-switch__knob"></div></div>
          </div>

          <div class="input-screen__toggle-row">
            <div>
              <div class="input-screen__toggle-label">Upload Custom Data</div>
              <div class="input-screen__toggle-desc">Provide proprietary datasets, internal reports, or research papers</div>
            </div>
            <div class="toggle-switch" id="toggle-upload"><div class="toggle-switch__knob"></div></div>
          </div>
        </div>

        <div class="input-screen__upload" id="upload-area">
          <div style="font-size: 28px; margin-bottom: 6px; opacity: 0.4;">↑</div>
          <div style="font-size: 14px; color: var(--text-secondary); margin-bottom: 4px;">Drop files here or click to browse</div>
          <div>Supports PDF, CSV, XLSX, JSON — Max 50MB per file</div>
        </div>

        <div class="input-section-label">Model parameters</div>
        <!-- ADVANCED SETTINGS PANEL -->
        <div class="advanced-panel" id="advanced-panel">
          <div class="advanced-panel__header" id="advanced-toggle">
            <span class="advanced-panel__arrow" id="advanced-arrow">▸</span>
            <span>Advanced Configuration</span>
          </div>
          <div class="advanced-panel__body" id="advanced-body">
            <div class="advanced-panel__grid">
              <div class="advanced-param">
                <div class="advanced-param__header">
                  <span class="advanced-param__label">Simulation Rounds</span>
                  <span class="advanced-param__value mono" id="val-rounds">120</span>
                </div>
                <input type="range" min="40" max="200" value="120" step="10" id="slider-rounds" />
                <div class="advanced-param__hint">Higher = more precise predictions, longer runtime</div>
              </div>

              <div class="advanced-param">
                <div class="advanced-param__header">
                  <span class="advanced-param__label">Agent Population</span>
                  <span class="advanced-param__value mono" id="val-agents">2,000</span>
                </div>
                <input type="range" min="500" max="10000" value="2000" step="500" id="slider-agents" />
                <div class="advanced-param__hint">Number of autonomous agents to deploy in sandbox</div>
              </div>

              <div class="advanced-param">
                <div class="advanced-param__header">
                  <span class="advanced-param__label">Monte Carlo Iterations</span>
                  <span class="advanced-param__value mono" id="val-monte">10,000</span>
                </div>
                <input type="range" min="1000" max="50000" value="10000" step="1000" id="slider-monte" />
                <div class="advanced-param__hint">For confidence interval calculation</div>
              </div>

              <div class="advanced-param">
                <div class="advanced-param__header">
                  <span class="advanced-param__label">Confidence Level</span>
                  <span class="advanced-param__value mono" id="val-confidence">80%</span>
                </div>
                <select id="select-confidence" class="advanced-select">
                  <option value="80" selected>80%</option>
                  <option value="90">90%</option>
                  <option value="95">95%</option>
                  <option value="99">99%</option>
                </select>
              </div>

              <div class="advanced-param">
                <div class="advanced-param__header">
                  <span class="advanced-param__label">Time Horizon</span>
                </div>
                <select id="select-horizon" class="advanced-select">
                  <option value="1w">1 Week</option>
                  <option value="2w">2 Weeks</option>
                  <option value="4w" selected>4 Weeks</option>
                  <option value="12w">12 Weeks (Quarter)</option>
                  <option value="52w">52 Weeks (Annual)</option>
                </select>
              </div>

              <div class="advanced-param">
                <div class="advanced-param__header">
                  <span class="advanced-param__label">Scenario Mode</span>
                </div>
                <div class="advanced-radios">
                  <label class="advanced-radio"><input type="radio" name="scenario-mode" value="dual" checked /> <span>Dual (Optimistic + Pessimistic)</span></label>
                  <label class="advanced-radio"><input type="radio" name="scenario-mode" value="single" /> <span>Single Baseline</span></label>
                  <label class="advanced-radio"><input type="radio" name="scenario-mode" value="triple" /> <span>Triple (Bull / Base / Bear)</span></label>
                </div>
              </div>

              <div class="advanced-param" style="grid-column: 1 / -1;">
                <div class="advanced-param__header">
                  <span class="advanced-param__label">Economic Models</span>
                </div>
                <div class="advanced-checkboxes">
                  <label class="advanced-checkbox"><input type="checkbox" checked /> <span>Input-Output Model</span></label>
                  <label class="advanced-checkbox"><input type="checkbox" checked /> <span>CGE (Computable General Equilibrium)</span></label>
                  <label class="advanced-checkbox"><input type="checkbox" checked /> <span>Monte Carlo Simulation</span></label>
                  <label class="advanced-checkbox"><input type="checkbox" /> <span>DSGE (Dynamic Stochastic)</span></label>
                  <label class="advanced-checkbox"><input type="checkbox" /> <span>VAR / Bayesian VAR</span></label>
                </div>
              </div>

              <div class="advanced-param" style="grid-column: 1 / -1;">
                <div class="advanced-param__header">
                  <span class="advanced-param__label">Geographic Scope</span>
                </div>
                <div class="advanced-geo">
                  <div class="advanced-geo__primary">
                    <span class="badge badge--blue">Primary</span>
                    <span>Singapore</span>
                  </div>
                  <div class="advanced-geo__secondary">
                    <span class="badge badge--orange">Secondary (Spillover)</span>
                    <span style="color: var(--text-secondary)">Malaysia · Indonesia · Thailand · Japan · China · Australia</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="input-section-label">Simulation governance</div>
        <!-- PARTICIPATION MODE + DECISION-POINT PICKER -->
        <div id="participation-mount"></div>
        <div class="participation__footer" id="participation-footer">
          <button type="button" class="btn btn--ghost btn--sm input-preview-btn" id="btn-preview-card">
            Preview checkpoint card ↗
          </button>
          <span class="participation__footer-hint" id="participation-summary"></span>
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

        <div class="input-section-label">Run mode</div>
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

        <div class="input-screen__actions">
          <button class="btn btn--primary input-run-btn" id="btn-run-simulation">
            Run World Simulation
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

      <div class="input-screen__sidebar anim-fade-up delay-2">
        <div class="input-screen__sidebar-title">Example Scenarios</div>
        
        <div class="input-screen__scenario-card" data-scenario="Predict the economic impact of Taylor Swift's Eras Tour concert series in Singapore. Analyze effects on tourism, hospitality, aviation, and GDP.">
          <div class="tag">Entertainment</div>
          <div><strong>Taylor Swift Eras Tour × Singapore</strong></div>
          <div style="margin-top: 4px;">Concert-driven tourism & GDP analysis</div>
        </div>

        <div class="input-screen__scenario-card" data-scenario="Analyze how a 50 basis point Fed rate cut would impact Asian equity markets, currency pairs, and capital flows over the next 6 months.">
          <div class="tag" style="background: var(--orange-dim); color: var(--orange);">Macro</div>
          <div><strong>Fed Rate Decision → Asian Markets</strong></div>
          <div style="margin-top: 4px;">Cross-border capital flow simulation</div>
        </div>

        <div class="input-screen__scenario-card" data-scenario="Model the economic multiplier effects of the 2028 Los Angeles Olympics on Southern California's economy, including infrastructure, tourism, and employment.">
          <div class="tag" style="background: var(--green-dim); color: var(--green);">Sports</div>
          <div><strong>Olympics 2028 LA Economic Model</strong></div>
          <div style="margin-top: 4px;">Infrastructure & tourism multiplier</div>
        </div>

        <div class="input-screen__scenario-card" data-scenario="Simulate the ripple effects of an NVIDIA earnings beat/miss on the global semiconductor supply chain, AI infrastructure spending, and tech sector valuations.">
          <div class="tag">Technology</div>
          <div><strong>NVIDIA Earnings → Supply Chain</strong></div>
          <div style="margin-top: 4px;">Tech sector cascade analysis</div>
        </div>

        <div class="input-screen__scenario-card" data-scenario="Assess the economic impact of a new high-speed rail connecting Bangkok, Kuala Lumpur, and Singapore on regional trade and labor markets.">
          <div class="tag" style="background: var(--purple-dim); color: var(--purple);">Infrastructure</div>
          <div><strong>ASEAN High-Speed Rail</strong></div>
          <div style="margin-top: 4px;">Regional trade & labor dynamics</div>
        </div>
      </div>
    </div>
  `;

  // Toggles
  el.querySelector('#toggle-ai-data').addEventListener('click', function() { this.classList.toggle('on'); });
  el.querySelector('#toggle-upload').addEventListener('click', function() {
    this.classList.toggle('on');
    el.querySelector('#upload-area').classList.toggle('visible', this.classList.contains('on'));
  });

  // Advanced panel toggle
  el.querySelector('#advanced-toggle').addEventListener('click', () => {
    const body = el.querySelector('#advanced-body');
    const arrow = el.querySelector('#advanced-arrow');
    body.classList.toggle('open');
    arrow.textContent = body.classList.contains('open') ? '▾' : '▸';
  });

  // Slider value updates
  el.querySelector('#slider-rounds').addEventListener('input', (e) => {
    el.querySelector('#val-rounds').textContent = e.target.value;
  });
  el.querySelector('#slider-agents').addEventListener('input', (e) => {
    el.querySelector('#val-agents').textContent = parseInt(e.target.value).toLocaleString();
  });
  el.querySelector('#slider-monte').addEventListener('input', (e) => {
    el.querySelector('#val-monte').textContent = parseInt(e.target.value).toLocaleString();
  });
  el.querySelector('#select-confidence').addEventListener('change', (e) => {
    el.querySelector('#val-confidence').textContent = e.target.value + '%';
  });

  // Char counter
  const scenarioInput = el.querySelector('#scenario-input');
  const charCountEl   = el.querySelector('#char-count');
  function updateCharCount() {
    const n = scenarioInput.value.length;
    charCountEl.textContent = n > 0 ? `${n} chars` : '';
  }
  scenarioInput.addEventListener('input', updateCharCount);
  updateCharCount();

  // Scenario cards
  el.querySelectorAll('.input-screen__scenario-card').forEach(card => {
    card.addEventListener('click', () => {
      scenarioInput.value = card.dataset.scenario;
      updateCharCount();
    });
  });

  // ---------- Participation mode mount ----------
  const participationMount = el.querySelector('#participation-mount');
  const participationSummary = el.querySelector('#participation-summary');

  function renderParticipationSummary(cfg) {
    const mode = cfg.mode;
    if (mode === PARTICIPATION_MODES.SANDBOX) {
      participationSummary.textContent = 'Sandbox · agents decide every checkpoint.';
    } else if (mode === PARTICIPATION_MODES.COMMUNITY) {
      participationSummary.textContent = `Community · ${DECISION_POINTS.length} checkpoints routed to the crowd.`;
    } else {
      const n = cfg.selectedDecisionPoints.length;
      const ref = cfg.communityAsReference ? ' (community shown as reference)' : '';
      participationSummary.textContent = `User · pausing on ${n} of ${DECISION_POINTS.length} checkpoints${ref}.`;
    }
  }

  const participationEl = createParticipationMode({
    onChange: (cfg) => renderParticipationSummary(cfg),
  });
  participationMount.appendChild(participationEl);
  renderParticipationSummary(getConfig());

  // ---------- Decision card preview modal ----------
  const previewEl      = el.querySelector('#decision-preview');
  const previewPicker  = el.querySelector('#decision-preview-picker');
  const previewSlot    = el.querySelector('#decision-preview-slot');
  const previewBtn     = el.querySelector('#btn-preview-card');

  let previewActiveDpId = 'DP-3';

  function renderPreviewPicker() {
    previewPicker.innerHTML = '';
    DECISION_POINTS.forEach(dp => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'decision-preview__chip' + (dp.id === previewActiveDpId ? ' active' : '');
      chip.textContent = `${dp.id}`;
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
    // Card mode in preview mirrors the configured mode — but always demo-only.
    const cardMode = cfg.mode === PARTICIPATION_MODES.COMMUNITY ? 'community' : 'preview';
    previewSlot.innerHTML = '';
    const card = createDecisionCard(dp, {
      mode: cardMode,
      communityAsReference: cardMode === 'community' ? false : (cfg.communityAsReference || cfg.mode === PARTICIPATION_MODES.SANDBOX),
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

  // Mode toggle (demo / real)
  let currentMode = 'demo';
  const modeDescEl = el.querySelector('#mode-desc');
  const modeDescs = {
    demo: 'Uses the pre-computed Taylor Swift snapshot. No API calls, no wait.',
    real: 'Runs the full MiroFish pipeline against your scenario. Uses your LLM key; typically 10–30 minutes.',
  };
  el.querySelectorAll('.input-mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentMode = btn.dataset.mode;
      el.querySelectorAll('.input-mode-btn').forEach(b => b.classList.toggle('active', b === btn));
      modeDescEl.textContent = modeDescs[currentMode];
    });
  });

  // Progress helpers
  const progressEl = el.querySelector('#pipeline-progress');
  const progressBar = el.querySelector('#progress-bar');
  const progressPct = el.querySelector('#progress-pct');
  const progressMsg = el.querySelector('#progress-message');
  const progressErr = el.querySelector('#progress-error');
  const runBtn = el.querySelector('#btn-run-simulation');

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
      const rounds = parseInt(el.querySelector('#slider-rounds').value, 10);
      const maxRounds = Math.min(rounds, 40);

      const runId = await startPipeline({
        requirement: scenario,
        projectName: scenario.slice(0, 60),
        maxRounds,
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
      runBtn.textContent = 'Run World Simulation →';
    }
  }

  el.querySelector('#btn-run-simulation').addEventListener('click', () => {
    const scenario = el.querySelector('#scenario-input').value.trim();
    if (!scenario) return;
    if (currentMode === 'real') {
      runRealMode(scenario);
    } else {
      onSubmit(scenario);
    }
  });

  return el;
}
