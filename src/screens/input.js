// Input Screen — with Advanced Configuration Panel

export function createInput(onSubmit) {
  const el = document.createElement('div');
  el.className = 'screen input-screen';
  el.id = 'screen-input';

  const defaultScenario = "Predict the economic impact of Taylor Swift's Eras Tour concert series in Singapore. Analyze the effects on tourism, hospitality, aviation, local businesses, and overall GDP contribution. Consider both direct and indirect economic multiplier effects across all relevant industries.";

  el.innerHTML = `
    <div class="input-screen__container">
      <div class="input-screen__main anim-fade-up">
        <h2 class="input-screen__heading">Describe Prediction Scenario</h2>
        <textarea class="input-screen__textarea" id="scenario-input" placeholder="e.g., Predict the economic impact of a major event on a city's GDP, tourism, and local businesses...">${defaultScenario}</textarea>
        
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

        <div class="input-screen__upload" id="upload-area">
          <div style="font-size: 28px; margin-bottom: 6px; opacity: 0.4;">↑</div>
          <div style="font-size: 14px; color: var(--text-secondary); margin-bottom: 4px;">Drop files here or click to browse</div>
          <div>Supports PDF, CSV, XLSX, JSON — Max 50MB per file</div>
        </div>

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

        <div class="input-screen__actions">
          <button class="btn btn--primary btn--lg" id="btn-run-simulation">Run World Simulation →</button>
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

  // Scenario cards
  el.querySelectorAll('.input-screen__scenario-card').forEach(card => {
    card.addEventListener('click', () => {
      el.querySelector('#scenario-input').value = card.dataset.scenario;
    });
  });

  el.querySelector('#btn-run-simulation').addEventListener('click', () => {
    const scenario = el.querySelector('#scenario-input').value;
    if (scenario.trim()) onSubmit(scenario);
  });

  return el;
}
