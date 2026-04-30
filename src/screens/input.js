// Scenario screen — Lokafish Flow design (Stage 1)
// Conventional form: textarea + horizon/confidence selects + data-source
// checkboxes + advanced disclosure + primary submit button. Right rail
// shows clickable starter scenarios.

const STARTER_EXAMPLES = [
  {
    tag: 'Entertainment',
    title: 'Taylor Swift × Singapore — concert tourism & GDP',
    text: "Predict the economic impact of Taylor Swift's Eras Tour concert series in Singapore. Analyze the effects on tourism, hospitality, aviation, local businesses, and overall GDP contribution. Consider both direct and indirect economic multiplier effects across all relevant industries.",
    active: true,
  },
  {
    tag: 'Macro',
    title: 'Fed cut → Asian markets — cross-border capital flows',
    text: 'Analyze how a 50 basis point Fed rate cut would impact Asian equity markets, currency pairs, and capital flows over the next 6 months.',
  },
  {
    tag: 'Sports',
    title: 'Olympics 2028 LA — infrastructure & tourism multiplier',
    text: 'Model the economic multiplier effects of the 2028 Los Angeles Olympics on Southern California\'s economy, including infrastructure, tourism, and employment.',
  },
  {
    tag: 'Technology',
    title: 'NVIDIA → supply chain — tech-sector cascade',
    text: 'Simulate the ripple effects of an NVIDIA earnings beat/miss on the global semiconductor supply chain, AI infrastructure spending, and tech sector valuations.',
  },
  {
    tag: 'Infrastructure',
    title: 'ASEAN high-speed rail — regional trade & labor',
    text: 'Assess the economic impact of a new high-speed rail connecting Bangkok, Kuala Lumpur, and Singapore on regional trade and labor markets.',
  },
];

const HORIZON_OPTIONS = [
  ['1w',  '1 week'],
  ['2w',  '2 weeks'],
  ['4w',  '4 weeks'],
  ['12w', '12 weeks · quarter'],
  ['52w', '52 weeks · annual'],
];
const CONFIDENCE_OPTIONS = ['80', '90', '95', '99'];

export function createInput(onSubmit) {
  const el = document.createElement('div');
  el.className = 'screen flow-screen flow-screen--scenario';
  el.id = 'screen-input';

  const examplesHtml = STARTER_EXAMPLES.map((e, i) => `
    <div class="sc-example${e.active ? ' is-active' : ''}" data-idx="${i}">
      <span class="sc-example__tag">${e.tag}</span>
      <span class="sc-example__title">${e.title}</span>
    </div>
  `).join('');

  const horizonHtml = HORIZON_OPTIONS.map(([v, label]) =>
    `<option value="${v}"${v === '4w' ? ' selected' : ''}>${label}</option>`
  ).join('');
  const confHtml = CONFIDENCE_OPTIONS.map(c =>
    `<option value="${c}"${c === '80' ? ' selected' : ''}>${c}%</option>`
  ).join('');

  el.innerHTML = `
    <div class="flow-stage">
      <header class="flow-head">
        <div class="flow-head__kicker">
          <span class="flow-head__num">01</span>
          <span>Scenario</span>
        </div>
        <h1 class="flow-head__title">Describe the <em>scenario.</em></h1>
        <p class="flow-head__sub">Loka deploys thousands of autonomous agents against your question. The clearer the framing, the sharper the simulation.</p>
      </header>

      <div class="flow-scenario-grid">
        <div>
          <div class="sc-card">
            <div class="sc-field">
              <label class="sc-field__label" for="scenario-input">Your scenario <span class="req">*</span></label>
              <p class="sc-field__hint">Describe the question you want Loka's agents to investigate. The clearer the framing, the sharper the simulation.</p>
              <div class="sc-input-wrap">
                <textarea class="sc-input" id="scenario-input" placeholder="e.g. Predict the economic impact of…">${STARTER_EXAMPLES[0].text}</textarea>
                <div class="sc-input-meta">
                  <span id="char-count">0 chars</span>
                  <span><kbd>⌘</kbd> <kbd>↵</kbd> to submit</span>
                </div>
              </div>
            </div>

            <div class="sc-grid-2">
              <div class="sc-field">
                <label class="sc-field__label" for="select-horizon">Time horizon</label>
                <p class="sc-field__hint">How far ahead to forecast.</p>
                <div class="sc-select-wrap">
                  <select class="sc-select" id="select-horizon">${horizonHtml}</select>
                </div>
              </div>
              <div class="sc-field">
                <label class="sc-field__label" for="select-confidence">Confidence level</label>
                <p class="sc-field__hint">Width of the simulation confidence interval.</p>
                <div class="sc-select-wrap">
                  <select class="sc-select" id="select-confidence">${confHtml}</select>
                </div>
              </div>
            </div>

            <div class="sc-field">
              <span class="sc-field__label">Data sources</span>
              <p class="sc-field__hint">Choose where the agents pull data from. You can pick both.</p>
              <div class="sc-checkboxes">
                <label class="sc-check is-on" id="pill-ai-data">
                  <span class="sc-check__box"><svg viewBox="0 0 16 16"><polyline points="3,9 7,12 13,5"/></svg></span>
                  <span class="sc-check__body">
                    <span class="sc-check__name">Auto-collect public data</span>
                    <span class="sc-check__desc">Web search, news, public datasets, financial APIs.</span>
                  </span>
                </label>
                <label class="sc-check" id="pill-upload">
                  <span class="sc-check__box"><svg viewBox="0 0 16 16"><polyline points="3,9 7,12 13,5"/></svg></span>
                  <span class="sc-check__body">
                    <span class="sc-check__name">Upload my own data</span>
                    <span class="sc-check__desc">Attach PDFs, CSVs, or spreadsheets to ground the analysis.</span>
                  </span>
                </label>
              </div>
              <div class="sc-upload" id="upload-area">
                ↑ Drop files, or click to browse — PDF · CSV · XLSX · JSON · max 50 MB / file
              </div>
            </div>

            <button type="button" class="sc-adv-trigger" id="advanced-toggle">
              <span class="caret">▾</span>
              <span>Advanced settings</span>
            </button>

            <!-- Advanced tray now lives inside the card so it disclosure-expands
                 in place rather than as a full-bleed strip below the grid. -->
            <div class="sc-adv" id="advanced">
              <div class="sc-adv__inner">
                <div class="sc-adv__grid">
                  <div class="sc-param">
                    <div class="sc-param__head">
                      <span class="sc-param__label">Simulation rounds</span>
                      <span class="sc-param__value" id="val-rounds">120</span>
                    </div>
                    <input type="range" min="40" max="200" value="120" step="10" id="slider-rounds" />
                    <div class="sc-param__hint">Higher = more precise, longer runtime.</div>
                  </div>
                  <div class="sc-param">
                    <div class="sc-param__head">
                      <span class="sc-param__label">Agent population</span>
                      <span class="sc-param__value" id="val-agents">2,000</span>
                    </div>
                    <input type="range" min="500" max="10000" value="2000" step="500" id="slider-agents" />
                    <div class="sc-param__hint">Heterogeneous agents in the sandbox.</div>
                  </div>
                  <div class="sc-param">
                    <div class="sc-param__head"><span class="sc-param__label">Scenario mode</span></div>
                    <div class="sc-param__seg" id="seg-scenario-mode">
                      <button type="button" data-val="single">Single</button>
                      <button type="button" data-val="dual" class="is-on">Dual</button>
                      <button type="button" data-val="triple">Triple</button>
                    </div>
                    <div class="sc-param__hint">Dual = optimistic + pessimistic. Triple adds a base case.</div>
                  </div>
                  <div class="sc-param" style="grid-column: 1 / -1;">
                    <div class="sc-param__head"><span class="sc-param__label">Economic models</span></div>
                    <div class="sc-param__chips" id="model-chips">
                      <button type="button" class="sc-param__chip is-on" data-key="io">Input-Output</button>
                      <button type="button" class="sc-param__chip is-on" data-key="cge">CGE</button>
                      <button type="button" class="sc-param__chip is-on" data-key="mc">Monte Carlo</button>
                      <button type="button" class="sc-param__chip" data-key="dsge">DSGE</button>
                      <button type="button" class="sc-param__chip" data-key="var">VAR / Bayesian</button>
                    </div>
                  </div>
                  <div class="sc-param" style="grid-column: 1 / -1;">
                    <div class="sc-param__head">
                      <span class="sc-param__label">Geographic scope</span>
                      <span style="font-family: 'Inter Tight', sans-serif; font-size: 0.82rem; color: var(--flow-muted-soft);">inferred from scenario</span>
                    </div>
                    <div style="font-family: 'Inter Tight', sans-serif; font-size: 0.95rem; line-height: 1.7; color: var(--flow-muted);">
                      <span style="font-family: 'Source Serif 4', serif; font-weight: 500; font-size: 1.15rem; letter-spacing: -0.005em; color: var(--flow-fg);">Singapore</span>
                      <span style="color: var(--flow-muted-soft);"> — primary</span>
                      <span style="color: var(--flow-line-strong);"> · </span>
                      <span>Malaysia · Indonesia · Thailand · Japan · China · Australia</span>
                      <span style="color: var(--flow-muted-soft);"> — spillover</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="sc-submit-row">
              <button type="button" class="flow-btn flow-btn--lg" id="btn-generate-plan">
                Generate plan <span aria-hidden="true">→</span>
              </button>
            </div>
          </div>
        </div>

        <aside class="sc-examples">
          <div class="sc-examples__head">Starters</div>
          ${examplesHtml}
        </aside>
      </div>
    </div>
  `;

  const ta         = el.querySelector('#scenario-input');
  const charCount  = el.querySelector('#char-count');
  const advToggle  = el.querySelector('#advanced-toggle');
  const adv        = el.querySelector('#advanced');
  const submitBtn  = el.querySelector('#btn-generate-plan');
  const sliderR    = el.querySelector('#slider-rounds');
  const valR       = el.querySelector('#val-rounds');
  const sliderA    = el.querySelector('#slider-agents');
  const valA       = el.querySelector('#val-agents');
  const seg        = el.querySelector('#seg-scenario-mode');
  const checks     = el.querySelectorAll('.sc-check');
  const uploadArea = el.querySelector('#upload-area');
  let scenarioMode = 'dual';

  function updateChar() {
    const n = ta.value.length;
    charCount.textContent = `${n.toLocaleString()} chars`;
  }
  function bindSlider(slider, valEl) {
    slider.addEventListener('input', () => {
      valEl.textContent = parseInt(slider.value, 10).toLocaleString();
    });
  }

  ta.addEventListener('input', updateChar);
  updateChar();
  bindSlider(sliderR, valR);
  bindSlider(sliderA, valA);

  advToggle.addEventListener('click', () => {
    advToggle.classList.toggle('is-open');
    adv.classList.toggle('is-open');
  });

  seg.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      seg.querySelectorAll('button').forEach(b => b.classList.remove('is-on'));
      btn.classList.add('is-on');
      scenarioMode = btn.dataset.val;
    });
  });

  el.querySelectorAll('#model-chips .sc-param__chip').forEach(chip => {
    chip.addEventListener('click', () => chip.classList.toggle('is-on'));
  });

  checks.forEach(c => {
    c.addEventListener('click', e => {
      e.preventDefault();
      c.classList.toggle('is-on');
      if (c.id === 'pill-upload') {
        uploadArea.classList.toggle('is-visible', c.classList.contains('is-on'));
      }
    });
  });

  el.querySelectorAll('.sc-example').forEach(ex => {
    ex.addEventListener('click', () => {
      el.querySelectorAll('.sc-example').forEach(o => o.classList.remove('is-active'));
      ex.classList.add('is-active');
      ta.value = STARTER_EXAMPLES[parseInt(ex.dataset.idx, 10)].text;
      updateChar();
      ta.focus();
    });
  });

  submitBtn.addEventListener('click', () => {
    const scenario = ta.value.trim();
    if (!scenario) { ta.focus(); return; }
    onSubmit && onSubmit(scenario);
  });

  ta.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') submitBtn.click();
  });

  return el;
}
