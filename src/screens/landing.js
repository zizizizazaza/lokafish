// Landing — Geometric hero background, proper SVG logos, professional content

import { animateCounter } from '../utils/animation.js';

// SVG line icons
const ICONS = {
  database: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>`,
  brain: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 2A5.5 5.5 0 0 0 4 7.5c0 1.58.7 3 1.8 4C4.7 12.5 4 14 4 15.5A5.5 5.5 0 0 0 9.5 21h0"/><path d="M14.5 2A5.5 5.5 0 0 1 20 7.5c0 1.58-.7 3-1.8 4 1.1 1 1.8 2.5 1.8 4a5.5 5.5 0 0 1-5.5 5.5h0"/><path d="M12 2v19"/></svg>`,
  chart: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>`,
  search: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>`,
  globe: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
  layers: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>`,
  zap: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
  file: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,
  shield: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
  cpu: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></svg>`,
  activity: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`,
  target: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>`,
};

// Real recognizable SVG logos (simplified but identifiable)
const LOGOS = {
  ethereum: `<svg width="24" height="24" viewBox="0 0 256 417"><path fill="#343434" d="M127.961 0l-2.795 9.5v275.668l2.795 2.79 127.962-75.638z"/><path fill="#8C8C8C" d="M127.962 0L0 212.32l127.962 75.639V154.158z"/><path fill="#3C3C3B" d="M127.961 312.187l-1.575 1.92V414.45l1.575 4.6L256 236.587z"/><path fill="#8C8C8C" d="M127.962 419.05V312.187L0 236.587z"/></svg>`,
  chainlink: `<svg width="24" height="24" viewBox="0 0 37.8 43.6"><path fill="#2A5ADA" d="M18.9 0l-4.5 2.6L4.5 8.3 0 10.9v21.8l4.5 2.6 10 5.7 4.5 2.6 4.5-2.6 9.9-5.7 4.5-2.6V10.9l-4.5-2.6-9.9-5.7L18.9 0zm0 8.7l8 4.6v9.2l-8 4.6-8-4.6v-9.2l8-4.6z"/></svg>`,
};

export function createLanding(onStart) {
  const el = document.createElement('div');
  el.className = 'screen landing';
  el.id = 'screen-landing';

  el.innerHTML = `
    <section class="landing__hero">
      <canvas class="landing__geo-bg" id="geo-bg"></canvas>
      <div class="landing__content">
        <div class="landing__badge anim-fade-up">
          <span class="badge badge--blue">World Model for Economic Prediction</span>
        </div>
        <h1 class="landing__title anim-fade-up delay-1">Loka</h1>
        <p class="landing__subtitle anim-fade-up delay-2">
          Simulate real-world economic events with thousands of autonomous AI agents.<br/>
          Generate institutional-grade quantitative predictions with confidence intervals.
        </p>
        <div class="landing__stats anim-fade-up delay-3">
          <div class="landing__stat">
            <div class="landing__stat-value" data-count="2000">0</div>
            <div class="landing__stat-label">Agent Profiles</div>
          </div>
          <div class="landing__stat">
            <div class="landing__stat-value" data-count="200">0</div>
            <div class="landing__stat-label">Industries</div>
          </div>
          <div class="landing__stat">
            <div class="landing__stat-value" data-count="47">0</div>
            <div class="landing__stat-label">Countries</div>
          </div>
          <div class="landing__stat">
            <div class="landing__stat-value" data-count="94">0</div>
            <div class="landing__stat-label">Backtest Accuracy</div>
          </div>
        </div>
        <div class="landing__cta anim-fade-up delay-4">
          <button class="btn btn--primary btn--lg" id="btn-start-prediction">Start Prediction →</button>
          <button class="btn btn--secondary btn--lg" id="btn-scroll-down">Learn More ↓</button>
        </div>
      </div>
      <div class="landing__ticker">
        <div class="landing__ticker-track">${generateTickerItems()}${generateTickerItems()}</div>
      </div>
    </section>

    <!-- WHAT IS LOKA -->
    <section class="landing__section" id="section-what">
      <div class="landing__section-inner">
        <div class="landing__section-label">What is Loka</div>
        <h2 class="landing__section-title">The world's first financial scenario world model</h2>
        <p class="landing__section-desc">Input an economic event. Loka builds a digital sandbox with real demographic data, deploys thousands of AI agents, and simulates the cascading economic impacts.</p>
        <div class="landing__features">
          <div class="landing__feature-card">
            <div class="landing__feature-icon" style="color: var(--blue);">${ICONS.database}</div>
            <div class="landing__feature-title">Population Database</div>
            <div class="landing__feature-desc">Agents generated from real demographic statistics. Each agent carries occupational background, income level, and decision logic grounded in census data.</div>
          </div>
          <div class="landing__feature-card">
            <div class="landing__feature-icon" style="color: var(--purple);">${ICONS.brain}</div>
            <div class="landing__feature-title">Swarm Intelligence</div>
            <div class="landing__feature-desc">2,000+ agents interact in a digital sandbox, forming emergent economic behaviors through simulated social networks and behavioral contagion dynamics.</div>
          </div>
          <div class="landing__feature-card">
            <div class="landing__feature-icon" style="color: var(--green);">${ICONS.chart}</div>
            <div class="landing__feature-title">Quantitative Output</div>
            <div class="landing__feature-desc">GDP impact, confidence intervals, industry breakdowns, sensitivity analysis with Monte Carlo simulation (n=10,000). Not text — actionable numbers.</div>
          </div>
        </div>
      </div>
    </section>

    <!-- ARCHITECTURE -->
    <section class="landing__section landing__section--alt" id="section-how">
      <div class="landing__section-inner">
        <div class="landing__section-label">Architecture</div>
        <h2 class="landing__section-title">Five-layer prediction pipeline</h2>
        <div class="landing__pipeline">
          <div class="landing__pipe-step">
            <div class="landing__pipe-icon" style="color: var(--blue);">${ICONS.search}</div>
            <div class="landing__pipe-num">01</div>
            <div class="landing__pipe-title">Scenario Parsing</div>
            <div class="landing__pipe-desc">NL input → event, geography, time horizon, industries extraction.</div>
          </div>
          <div class="landing__pipe-arrow">→</div>
          <div class="landing__pipe-step">
            <div class="landing__pipe-icon" style="color: var(--green);">${ICONS.globe}</div>
            <div class="landing__pipe-num">02</div>
            <div class="landing__pipe-title">World Construction</div>
            <div class="landing__pipe-desc">Sample 500–10,000 agents from population database, weighted by impact.</div>
          </div>
          <div class="landing__pipe-arrow">→</div>
          <div class="landing__pipe-step">
            <div class="landing__pipe-icon" style="color: var(--orange);">${ICONS.layers}</div>
            <div class="landing__pipe-num">03</div>
            <div class="landing__pipe-title">Agent Simulation</div>
            <div class="landing__pipe-desc">OASIS framework. Dual-scenario parallel, 40–200 rounds with memory.</div>
          </div>
          <div class="landing__pipe-arrow">→</div>
          <div class="landing__pipe-step">
            <div class="landing__pipe-icon" style="color: var(--red);">${ICONS.zap}</div>
            <div class="landing__pipe-num">04</div>
            <div class="landing__pipe-title">Quantitative Engine</div>
            <div class="landing__pipe-desc">IO models, CGE equilibrium, Monte Carlo (10K+). Agent → GDP metrics.</div>
          </div>
          <div class="landing__pipe-arrow">→</div>
          <div class="landing__pipe-step">
            <div class="landing__pipe-icon" style="color: var(--purple);">${ICONS.file}</div>
            <div class="landing__pipe-num">05</div>
            <div class="landing__pipe-title">Visualization</div>
            <div class="landing__pipe-desc">Heatmaps, flows, confidence intervals, strategic recommendations.</div>
          </div>
        </div>
      </div>
    </section>

    <!-- TECHNICAL SPECS -->
    <section class="landing__section" id="section-specs">
      <div class="landing__section-inner">
        <div class="landing__section-label">Technical Specifications</div>
        <h2 class="landing__section-title">Enterprise-grade infrastructure</h2>
        <div class="landing__specs-grid">
          <div class="landing__spec-card">
            <div class="landing__spec-icon" style="color: var(--blue);">${ICONS.cpu}</div>
            <div class="landing__spec-label">Computation</div>
            <div class="landing__spec-value">10,000</div>
            <div class="landing__spec-unit">Monte Carlo iterations per run</div>
          </div>
          <div class="landing__spec-card">
            <div class="landing__spec-icon" style="color: var(--green);">${ICONS.activity}</div>
            <div class="landing__spec-label">Accuracy</div>
            <div class="landing__spec-value">94%</div>
            <div class="landing__spec-unit">Historical backtest accuracy</div>
          </div>
          <div class="landing__spec-card">
            <div class="landing__spec-icon" style="color: var(--orange);">${ICONS.target}</div>
            <div class="landing__spec-label">Coverage</div>
            <div class="landing__spec-value">67</div>
            <div class="landing__spec-unit">Economic sectors modeled</div>
          </div>
          <div class="landing__spec-card">
            <div class="landing__spec-icon" style="color: var(--purple);">${ICONS.shield}</div>
            <div class="landing__spec-label">Validation</div>
            <div class="landing__spec-value">3</div>
            <div class="landing__spec-unit">Complementary economic models (IO + CGE + MC)</div>
          </div>
          <div class="landing__spec-card">
            <div class="landing__spec-icon" style="color: var(--red);">${ICONS.globe}</div>
            <div class="landing__spec-label">Scale</div>
            <div class="landing__spec-value">10K</div>
            <div class="landing__spec-unit">Max concurrent agent population</div>
          </div>
          <div class="landing__spec-card">
            <div class="landing__spec-icon" style="color: var(--blue);">${ICONS.layers}</div>
            <div class="landing__spec-label">Framework</div>
            <div class="landing__spec-value">OASIS</div>
            <div class="landing__spec-unit">Multi-agent interaction platform</div>
          </div>
        </div>
      </div>
    </section>

    <!-- DIFFERENTIATION -->
    <section class="landing__section landing__section--alt" id="section-diff">
      <div class="landing__section-inner">
        <div class="landing__section-label">Why Loka</div>
        <h2 class="landing__section-title">Three layers beyond existing solutions</h2>
        <div class="landing__comparison">
          <table class="landing__table">
            <thead><tr><th></th><th>Traditional Econometrics</th><th>MiroFish</th><th class="landing__table-highlight">Loka</th></tr></thead>
            <tbody>
              <tr><td class="landing__table-label">Agent Source</td><td>N/A (statistical model)</td><td>LLM-generated personas</td><td class="landing__table-highlight">Real population statistics database</td></tr>
              <tr><td class="landing__table-label">Output</td><td>Point estimates</td><td>Text prediction report</td><td class="landing__table-highlight">Quantitative metrics + CI + visualization</td></tr>
              <tr><td class="landing__table-label">Industry Depth</td><td>Macro only</td><td>General purpose</td><td class="landing__table-highlight">67-sector financial specialization</td></tr>
              <tr><td class="landing__table-label">Validation</td><td>Historical regression</td><td>None</td><td class="landing__table-highlight">Historical backtesting (94% acc.)</td></tr>
              <tr><td class="landing__table-label">Geographic</td><td>—</td><td>—</td><td class="landing__table-highlight">District-level heatmap visualization</td></tr>
              <tr><td class="landing__table-label">Confidence</td><td>None</td><td>None</td><td class="landing__table-highlight">80/90/95% CI with Monte Carlo</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <!-- ECOSYSTEM PARTNERS -->
    <section class="landing__section" id="section-trust">
      <div class="landing__section-inner">
        <div class="landing__section-label">Ecosystem</div>
        <h2 class="landing__section-title">Data infrastructure & settlement partners</h2>
        <p class="landing__section-desc" style="margin-bottom: 32px;">Loka integrates with leading data platforms and blockchain settlement layers for transparent, auditable prediction outputs.</p>
        <div class="landing__partners">
          <div class="landing__partner-row">
            <div class="landing__partner-label">Blockchain</div>
            <div class="landing__partner-logos">
              ${[
                { name: 'Ethereum', svg: `<svg viewBox="0 0 256 417" width="28" height="28"><path fill="#343434" d="M127.961 0l-2.795 9.5v275.668l2.795 2.79 127.962-75.638z"/><path fill="#8C8C8C" d="M127.962 0L0 212.32l127.962 75.639V154.158z"/><path fill="#3C3C3B" d="M127.961 312.187l-1.575 1.92V414.45l1.575 4.6L256 236.587z"/><path fill="#8C8C8C" d="M127.962 419.05V312.187L0 236.587z"/></svg>` },
                { name: 'Solana', svg: `<svg viewBox="0 0 397 312" width="28" height="22"><linearGradient id="s1" x1="0" y1="312" x2="397" y2="0" gradientUnits="userSpaceOnUse"><stop stop-color="#9945FF"/><stop offset="1" stop-color="#14F195"/></linearGradient><path fill="url(#s1)" d="M64.6 237.9c2.4-2.4 5.7-3.8 9.2-3.8h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1l62.7-62.7zM64.6 3.8C67.1 1.4 70.4 0 73.8 0h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1L64.6 3.8zM332.1 120.9c-2.4-2.4-5.7-3.8-9.2-3.8H5.5c-5.8 0-8.7 7-4.6 11.1l62.7 62.7c2.4 2.4 5.7 3.8 9.2 3.8h317.4c5.8 0 8.7-7 4.6-11.1l-62.7-62.7z"/></svg>` },
                { name: 'Chainlink', svg: `<svg viewBox="0 0 37.8 43.6" width="22" height="26"><path fill="#2A5ADA" d="M18.9 0l-4.5 2.6L4.5 8.3 0 10.9v21.8l4.5 2.6 10 5.7 4.5 2.6 4.5-2.6 9.9-5.7 4.5-2.6V10.9l-4.5-2.6-9.9-5.7L18.9 0zm0 8.7l8 4.6v9.2l-8 4.6-8-4.6v-9.2l8-4.6z"/></svg>` },
                { name: 'Polygon', svg: `<svg viewBox="0 0 38 33" width="26" height="22"><path fill="#8247E5" d="M29 10.2c-.7-.4-1.6-.4-2.4 0L21 13.5l-3.8 2.1-5.5 3.3c-.7.4-1.6.4-2.4 0l-4.3-2.5c-.7-.4-1.2-1.2-1.2-2.1v-5c0-.8.4-1.6 1.2-2.1l4.3-2.5c.7-.4 1.6-.4 2.4 0l4.3 2.5c.7.4 1.2 1.2 1.2 2.1v3.3l3.8-2.2V7c0-.8-.4-1.6-1.2-2.1l-8-4.7c-.7-.4-1.6-.4-2.4 0L1.2 5C.4 5.4 0 6.2 0 7v9.4c0 .8.4 1.6 1.2 2.1l8.1 4.7c.7.4 1.6.4 2.4 0l5.5-3.2 3.8-2.2 5.5-3.2c.7-.4 1.6-.4 2.4 0l4.3 2.5c.7.4 1.2 1.2 1.2 2.1v5c0 .8-.4 1.6-1.2 2.1l-4.3 2.5c-.7.4-1.6.4-2.4 0l-4.3-2.5c-.7-.4-1.2-1.2-1.2-2.1v-3.2l-3.8 2.2v3.3c0 .8.4 1.6 1.2 2.1l8.1 4.7c.7.4 1.6.4 2.4 0l8.1-4.7c.7-.4 1.2-1.2 1.2-2.1V17c0-.8-.4-1.6-1.2-2.1L29 10.2z"/></svg>` },
                { name: 'The Graph', svg: `<svg viewBox="0 0 24 24" width="26" height="26"><circle cx="12" cy="12" r="11" fill="#6747ED"/><circle cx="12" cy="8" r="3" fill="white"/><path d="M7 17.5a5 5 0 0110 0" fill="none" stroke="white" stroke-width="2"/></svg>` },
                { name: 'Avalanche', svg: `<svg viewBox="0 0 254 254" width="24" height="24"><circle cx="127" cy="127" r="127" fill="#E84142"/><path fill="white" d="M171.8 130.3c4.4-7.6 11.5-7.6 15.9 0l27.4 48.1c4.4 7.6.8 13.9-8 13.9h-55.1c-8.7 0-12.3-6.2-8-13.9l27.8-48.1zM118.8 48c4.4-7.6 11.4-7.6 15.8 0l5.4 9.8 12.9 23.2c3.5 7.2 3.5 15.7 0 22.9l-34.7 60c-4.4 7.2-11.9 11.6-20.2 11.6H55.8c-8.7 0-12.3-6.2-8-13.9L118.8 48z"/></svg>` },
              ].map(p => `<div class="landing__partner-item"><div class="landing__partner-icon">${p.svg}</div><span>${p.name}</span></div>`).join('')}
            </div>
          </div>
          <div class="landing__partner-row">
            <div class="landing__partner-label">Data Providers</div>
            <div class="landing__partner-logos">
              ${[
                { name: 'Bloomberg', svg: `<svg viewBox="0 0 120 24" width="80" height="16"><text x="0" y="18" font-family="Arial,sans-serif" font-weight="bold" font-size="18" fill="#1E1E1E">Bloomberg</text></svg>` },
                { name: 'Reuters', svg: `<svg viewBox="0 0 100 24" width="64" height="16"><text x="0" y="18" font-family="Arial,sans-serif" font-weight="bold" font-size="17" fill="#FF8000">Reuters</text></svg>` },
                { name: 'S&P Global', svg: `<svg viewBox="0 0 110 24" width="72" height="16"><text x="0" y="18" font-family="Arial,sans-serif" font-weight="bold" font-size="16" fill="#CC0000">S&amp;P Global</text></svg>` },
                { name: 'MSCI', svg: `<svg viewBox="0 0 60 24" width="48" height="16"><text x="0" y="18" font-family="Arial,sans-serif" font-weight="bold" font-size="18" fill="#00A1DE">MSCI</text></svg>` },
                { name: 'FactSet', svg: `<svg viewBox="0 0 80 24" width="56" height="16"><text x="0" y="18" font-family="Arial,sans-serif" font-weight="bold" font-size="17" fill="#003DA5">FactSet</text></svg>` },
                { name: 'Refinitiv', svg: `<svg viewBox="0 0 90 24" width="60" height="16"><text x="0" y="18" font-family="Arial,sans-serif" font-weight="bold" font-size="16" fill="#001DF5">Refinitiv</text></svg>` },
              ].map(p => `<div class="landing__partner-item"><div class="landing__partner-text-logo">${p.svg}</div></div>`).join('')}
            </div>
          </div>
        </div>
        <div style="text-align: center; margin-top: 48px;">
          <button class="btn btn--primary btn--lg" id="btn-bottom-cta">Start Your First Prediction →</button>
        </div>
      </div>
    </section>
  `;

  setTimeout(() => {
    initGeometricBackground(el.querySelector('#geo-bg'));
    el.querySelectorAll('[data-count]').forEach(counter => {
      const target = parseInt(counter.dataset.count);
      if (target === 94) animateCounter(counter, target, 1800, '', '%');
      else if (target >= 1000) animateCounter(counter, target, 2000, '', '+');
      else animateCounter(counter, target, 1800, '', '+');
    });
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => { if (entry.isIntersecting) entry.target.classList.add('visible'); });
    }, { threshold: 0.1 });
    el.querySelectorAll('.landing__feature-card, .landing__pipe-step, .landing__section, .landing__spec-card').forEach(item => observer.observe(item));
  }, 200);

  el.querySelector('#btn-start-prediction').addEventListener('click', onStart);
  el.querySelector('#btn-scroll-down').addEventListener('click', () => {
    el.querySelector('#section-what').scrollIntoView({ behavior: 'smooth' });
  });
  el.querySelector('#btn-bottom-cta').addEventListener('click', onStart);
  return el;
}

// ============================================================
// MiroFish-style Live Knowledge Graph Background
// ============================================================
function initGeometricBackground(canvas) {
  if (!canvas) return;
  const parent = canvas.parentElement;
  let W = parent.offsetWidth;
  let H = parent.offsetHeight;
  const dpr = Math.min(devicePixelRatio, 2);

  function resize() {
    W = parent.offsetWidth;
    H = parent.offsetHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.scale(dpr, dpr);
  }

  const ctx = canvas.getContext('2d');
  resize();
  window.addEventListener('resize', () => { ctx.setTransform(1,0,0,1,0,0); resize(); rebuildGraph(); });

  // ── Node types & colors (MiroFish palette)
  const NODE_TYPES = [
    { type: 'University',     color: '#4FC3F7', glow: '#0288D1' },
    { type: 'Organization',   color: '#81C784', glow: '#388E3C' },
    { type: 'Person',         color: '#FFB74D', glow: '#F57C00' },
    { type: 'GovernmentAgency', color: '#CE93D8', glow: '#7B1FA2' },
    { type: 'MediaOutlet',    color: '#F48FB1', glow: '#C2185B' },
    { type: 'Student',        color: '#80DEEA', glow: '#00838F' },
    { type: 'Professor',      color: '#FFCC02', glow: '#F9A825' },
    { type: 'Alumni',         color: '#A5D6A7', glow: '#2E7D32' },
  ];

  let nodes = [], edges = [], pulses = [];
  const mouse = { x: -9999, y: -9999 };

  parent.addEventListener('mousemove', e => {
    const r = parent.getBoundingClientRect();
    mouse.x = e.clientX - r.left;
    mouse.y = e.clientY - r.top;
  });
  parent.addEventListener('mouseleave', () => { mouse.x = -9999; mouse.y = -9999; });

  function rebuildGraph() {
    nodes = [];
    edges = [];
    pulses = [];

    const NODE_COUNT = Math.floor((W * H) / 22000);
    const count = Math.max(28, Math.min(NODE_COUNT, 55));

    // Hub nodes (large, center-ish)
    const hubCount = Math.max(4, Math.floor(count * 0.18));
    for (let i = 0; i < count; i++) {
      const isHub = i < hubCount;
      const typeInfo = NODE_TYPES[Math.floor(Math.random() * NODE_TYPES.length)];
      const margin = isHub ? 120 : 60;
      nodes.push({
        id: i,
        x: margin + Math.random() * (W - margin * 2),
        y: margin + Math.random() * (H - margin * 2),
        vx: (Math.random() - 0.5) * 0.18,
        vy: (Math.random() - 0.5) * 0.18,
        r: isHub ? 10 + Math.random() * 8 : 3.5 + Math.random() * 4,
        color: typeInfo.color,
        glow: typeInfo.glow,
        type: typeInfo.type,
        isHub,
        pulsePhase: Math.random() * Math.PI * 2,
        labelOpacity: 0,
      });
    }

    // Spatial force-directed initial push + edges
    const MAX_EDGE_DIST = Math.min(W, H) * 0.32;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < MAX_EDGE_DIST) {
          // hub nodes connect more readily
          const threshold = (nodes[i].isHub || nodes[j].isHub) ? 0.72 : 0.42;
          if (Math.random() < threshold * (1 - d / MAX_EDGE_DIST)) {
            edges.push({ a: i, b: j, flow: 0, flowSpeed: 0.4 + Math.random() * 0.8 });
          }
        }
      }
    }

    // Seed initial signal pulses
    for (let k = 0; k < 12; k++) spawnPulse();
  }

  function spawnPulse() {
    if (edges.length === 0) return;
    const edge = edges[Math.floor(Math.random() * edges.length)];
    const reversed = Math.random() > 0.5;
    pulses.push({
      edge,
      t: Math.random(),
      speed: 0.003 + Math.random() * 0.006,
      reversed,
      color: nodes[reversed ? edge.b : edge.a].color,
      opacity: 0.9,
      size: 2.5 + Math.random() * 2,
    });
  }

  rebuildGraph();

  // ── Animation loop
  let raf;
  function draw() {
    ctx.clearRect(0, 0, W, H);
    const time = performance.now() * 0.001;

    // ── 1. Draw edges
    for (const e of edges) {
      const na = nodes[e.a], nb = nodes[e.b];
      const dx = nb.x - na.x, dy = nb.y - na.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Proximity to mouse brightens the edge
      const midX = (na.x + nb.x) / 2, midY = (na.y + nb.y) / 2;
      const mdx = midX - mouse.x, mdy = midY - mouse.y;
      const mDist = Math.sqrt(mdx * mdx + mdy * mdy);
      const mouseBoost = Math.max(0, 1 - mDist / 180) * 0.4;

      const baseAlpha = (na.isHub || nb.isHub) ? 0.22 : 0.10;
      const alpha = Math.min(0.55, baseAlpha + mouseBoost);

      ctx.beginPath();
      ctx.moveTo(na.x, na.y);
      ctx.lineTo(nb.x, nb.y);
      ctx.strokeStyle = `rgba(100,160,255,${alpha})`;
      ctx.lineWidth = (na.isHub || nb.isHub) ? 1.2 : 0.6;
      ctx.stroke();
    }

    // ── 2. Draw & update signal pulses
    for (let i = pulses.length - 1; i >= 0; i--) {
      const p = pulses[i];
      p.t += p.speed;
      if (p.t > 1) {
        pulses.splice(i, 1);
        if (Math.random() < 0.85) spawnPulse(); // keep pool alive
        continue;
      }
      const t = p.reversed ? 1 - p.t : p.t;
      const na = nodes[p.edge.a], nb = nodes[p.edge.b];
      const px = na.x + (nb.x - na.x) * t;
      const py = na.y + (nb.y - na.y) * t;

      // Trailing glow — convert hex to rgba for gradient
      const hexToRgba = (hex, a) => {
        const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
        return `rgba(${r},${g},${b},${a})`;
      };
      const grad = ctx.createRadialGradient(px, py, 0, px, py, p.size * 3.5);
      grad.addColorStop(0, hexToRgba(p.color, p.opacity));
      grad.addColorStop(1, 'transparent');
      ctx.beginPath();
      ctx.arc(px, py, p.size * 3.5, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      // Core dot
      ctx.beginPath();
      ctx.arc(px, py, p.size, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.opacity;
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // ── 3. Update node physics + draw
    for (const n of nodes) {
      // Mouse repulsion
      const mdx = n.x - mouse.x, mdy = n.y - mouse.y;
      const mDist = Math.sqrt(mdx * mdx + mdy * mdy);
      const repelRadius = 120;
      if (mDist < repelRadius && mDist > 0) {
        const force = (1 - mDist / repelRadius) * 1.2;
        n.vx += (mdx / mDist) * force;
        n.vy += (mdy / mDist) * force;
      }

      // Gentle drift + boundary bounce
      n.x += n.vx;
      n.y += n.vy;
      n.vx *= 0.985;
      n.vy *= 0.985;
      const pad = n.r + 24;
      if (n.x < pad)      { n.x = pad;      n.vx = Math.abs(n.vx) * 0.7; }
      if (n.x > W - pad)  { n.x = W - pad;  n.vx = -Math.abs(n.vx) * 0.7; }
      if (n.y < pad)      { n.y = pad;      n.vy = Math.abs(n.vy) * 0.7; }
      if (n.y > H - pad)  { n.y = H - pad;  n.vy = -Math.abs(n.vy) * 0.7; }

      // Pulse ring (hub nodes breathe)
      const pulse = (Math.sin(time * 1.4 + n.pulsePhase) * 0.5 + 0.5);

      if (n.isHub) {
        // Outer glow ring
        const ringR = n.r + 6 + pulse * 8;
        const rinGrad = ctx.createRadialGradient(n.x, n.y, n.r, n.x, n.y, ringR + 8);
        rinGrad.addColorStop(0, n.color + '55');
        rinGrad.addColorStop(1, 'transparent');
        ctx.beginPath();
        ctx.arc(n.x, n.y, ringR + 8, 0, Math.PI * 2);
        ctx.fillStyle = rinGrad;
        ctx.fill();
      }

      // Node glow
      const glowR = n.r * (n.isHub ? 3.5 : 2.8);
      const gGrad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, glowR);
      gGrad.addColorStop(0, n.color + (n.isHub ? 'CC' : '88'));
      gGrad.addColorStop(0.4, n.glow + '44');
      gGrad.addColorStop(1, 'transparent');
      ctx.beginPath();
      ctx.arc(n.x, n.y, glowR, 0, Math.PI * 2);
      ctx.fillStyle = gGrad;
      ctx.fill();

      // Core node
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fillStyle = n.color;
      ctx.fill();

      // White core highlight
      ctx.beginPath();
      ctx.arc(n.x - n.r * 0.28, n.y - n.r * 0.28, n.r * 0.35, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fill();

      // Label (hub nodes + mouse-nearby nodes)
      const labelDist = Math.sqrt(mdx * mdx + mdy * mdy);
      const wantLabel = n.isHub || labelDist < 80;
      n.labelOpacity += wantLabel ? 0.06 : -0.04;
      n.labelOpacity = Math.max(0, Math.min(1, n.labelOpacity));

      if (n.labelOpacity > 0.01) {
        ctx.save();
        ctx.globalAlpha = n.labelOpacity * 0.92;
        ctx.font = `${n.isHub ? 600 : 500} ${n.isHub ? 11 : 10}px Inter, sans-serif`;
        ctx.fillStyle = '#E8F4FF';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        // Subtle pill background
        const lbl = n.type;
        const tw = ctx.measureText(lbl).width;
        const lx = n.x - tw / 2 - 4, ly = n.y + n.r + 5;
        ctx.fillStyle = 'rgba(8, 22, 55, 0.65)';
        ctx.beginPath();
        ctx.roundRect(lx, ly, tw + 8, 15, 4);
        ctx.fill();
        ctx.fillStyle = n.color;
        ctx.fillText(lbl, n.x, ly + 2);
        ctx.restore();
      }
    }

    // ── 4. Occasionally spawn new pulses to keep it alive
    if (Math.random() < 0.04 && pulses.length < 35) spawnPulse();

    raf = requestAnimationFrame(draw);
  }

  draw();

  // Cleanup on screen hide
  const observer = new MutationObserver(() => {
    if (!parent.closest('.active')) { cancelAnimationFrame(raf); observer.disconnect(); }
  });
  observer.observe(document.body, { attributes: true, subtree: true, attributeFilter: ['class'] });
}

function generateTickerItems() {
  const items = [
    { symbol: 'SPX', value: '5,234.18', change: '+1.2%', up: true },
    { symbol: 'AAPL', value: '$198.45', change: '+2.8%', up: true },
    { symbol: 'BTC/USD', value: '$97,342', change: '+4.1%', up: true },
    { symbol: 'SGD/USD', value: '0.7523', change: '-0.3%', up: false },
    { symbol: 'ETH', value: '$3,891', change: '+5.2%', up: true },
    { symbol: 'Gold', value: '$2,891', change: '+0.8%', up: true },
    { symbol: 'GDP SG', value: '$397B', change: '+3.1%', up: true },
    { symbol: 'Tourism', value: '$28.1B', change: '+12.4%', up: true },
  ];
  return items.map(item => `
    <div class="landing__ticker-item">
      <span>${item.symbol}</span>
      <span style="color: var(--text-primary)">${item.value}</span>
      <span class="${item.up ? 'up' : 'down'}">${item.change}</span>
    </div>
  `).join('');
}
