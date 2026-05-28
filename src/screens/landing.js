import { createHomeDemo } from '../components/home-demo.js';
import { openPilotForm } from '../components/pilot-form.js';

// Landing — LokaWorld Home v3 (editorial b&w + particle globe + ticker + pipeline)
//
// Self-contained module that returns the landing root <div>. Three.js is loaded
// from a CDN <script> tag in index.html, so we read it from `window.THREE`.
//
// Exit hook: the legacy `onStart` callback (passed by main.js) is wired to all
// three CTAs (hero, end CTA, nav). Click → goToScreen(1) → Scenario.

const FONT_OPTIONS = [
  { id: 'familjen',     name: 'Familjen Grotesk · nordic',           family: "'Familjen Grotesk', system-ui, sans-serif", weight: 700, style: 'normal', tracking: '-0.035em' },
  { id: 'inter-tight',  name: 'Inter Tight · baseline',              family: "'Inter Tight', system-ui, sans-serif",      weight: 800, style: 'normal', tracking: '-0.04em'  },
];

// Event organizers, sports federations, governments and concert promoters —
// the kinds of authorities whose decisions Loka can simulate the impact of
// (e.g. Taylor Swift's Eras Tour x Singapore, FIFA World Cup, Olympics).
const TICKER_ICONS = {
  FIFA:                    `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18M6 6l12 12M18 6L6 18"/></svg>`,
  'Formula 1':             `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 17h7l4-4h7M3 17l3-3h6"/><circle cx="6" cy="19" r="1.4" fill="currentColor"/><circle cx="18" cy="19" r="1.4" fill="currentColor"/></svg>`,
  IOC:                     `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="6" cy="10" r="3"/><circle cx="12" cy="10" r="3"/><circle cx="18" cy="10" r="3"/><circle cx="9" cy="15" r="3"/><circle cx="15" cy="15" r="3"/></svg>`,
  UEFA:                    `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="9"/><path d="M5 8l7 4 7-4M5 16l7-4 7 4"/></svg>`,
  NBA:                     `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="9"/><path d="M3 12c3 0 6 3 9 3s6-3 9-3M12 3c0 3 3 6 3 9s-3 6-3 9M12 3c0 3-3 6-3 9s3 6 3 9"/></svg>`,
  'Live Nation':           `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M9 18V6l11 6-11 6z"/><path d="M4 5v14"/></svg>`,
  AEG:                     `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 19L12 4l8 15"/><path d="M7 14h10"/></svg>`,
  Ticketmaster:            `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4V8z"/><path d="M11 7v10"/></svg>`,
  'Red Bull':              `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M5 13c0-4 3-7 7-7s7 3 7 7-3 6-7 6-7-2-7-6z"/><path d="M9 11l3 5 3-5"/></svg>`,
  'Singapore Tourism Board': `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 20c2-6 6-9 8-9s6 3 8 9"/><circle cx="12" cy="6" r="2.5"/><path d="M4 20h16"/></svg>`,
  'Monetary Authority of Singapore': `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 10l9-6 9 6"/><path d="M5 10v9M19 10v9M9 10v9M15 10v9M3 19h18"/></svg>`,
  'Marina Bay Sands':      `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M5 18V8M12 18V6M19 18V8"/><path d="M3 18h18"/><path d="M3 8c4-1 14-1 18 0"/></svg>`,
  Coachella:               `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 19l9-14 9 14"/><path d="M7 19v-4M17 19v-4"/></svg>`,
  Glastonbury:             `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 20l8-12 8 12"/><path d="M9 20v-5h6v5"/></svg>`,
  'Universal Music':       `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="9"/><path d="M9 8v6a2 2 0 0 0 4 0V8M13 8v6a2 2 0 0 0 4 0V8"/></svg>`,
  'NFL':                   `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6"><ellipse cx="12" cy="12" rx="9" ry="5" transform="rotate(-20 12 12)"/><path d="M9 11l6 2M10 9l4 6"/></svg>`,
  'Olympic Games':         `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M5 7l7-4 7 4-7 4-7-4z"/><path d="M5 7v6l7 4 7-4V7"/></svg>`,
  'World Expo':            `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="9"/><path d="M3 12c3-3 15-3 18 0M3 12c3 3 15 3 18 0M12 3v18"/></svg>`,
};

const PARTNER_ICONS = {
  data: [
    ['Bloomberg', `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="4" width="18" height="16" rx="1"/><path d="M3 9h18M3 15h18M9 4v16M15 4v16"/></svg>`],
    ['Reuters', `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="9"/><path d="M3 12a9 9 0 0 0 18 0"/><path d="M12 3v18"/></svg>`],
    ['S&amp;P Global', `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 17 L9 11 L13 14 L21 6"/><path d="M15 6h6v6"/></svg>`],
    ['MSCI', `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="9"/><path d="M7 16V8l5 5 5-5v8"/></svg>`],
    ['FactSet', `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="4" y="5" width="16" height="14" rx="1"/><path d="M8 9h8M8 13h8M8 17h5"/></svg>`],
    ['Refinitiv', `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M5 19V8l7-4 7 4v11"/><path d="M9 19v-6h6v6"/></svg>`],
  ],
  chain: [
    ['Ethereum', `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 2 5 12.5 12 16l7-3.5L12 2z" opacity="0.6"/><path d="M12 17 5 13.5 12 22l7-8.5L12 17z"/></svg>`],
    ['Solana', `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M6 7l4-3h8l-4 3H6z" fill="currentColor"/><path d="M6 13l4-3h8l-4 3H6z" fill="currentColor"/><path d="M6 19l4-3h8l-4 3H6z" fill="currentColor"/></svg>`],
    ['Chainlink', `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z"/></svg>`],
    ['Polygon', `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M9 4l-5 3v6l5 3 6-3 5 3V10l-5-3-6 3z"/></svg>`],
    ['The Graph', `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="9" cy="9" r="4"/><circle cx="18" cy="18" r="3"/><path d="M12 12l4 4"/><path d="M19 4l-2 2"/></svg>`],
    ['Avalanche', `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 3 L21 19 H15 L13 16 H11 L9 19 H3 L12 3z"/></svg>`],
  ],
};

export function createLanding(onStart) {
  const el = document.createElement('div');
  el.className = 'screen landing-v3';
  el.id = 'screen-landing';

  const dataPartners = PARTNER_ICONS.data.map(([name, svg]) => `<span class="lv3-partner">${svg}<span>${name}</span></span>`).join('');
  const chainPartners = PARTNER_ICONS.chain.map(([name, svg]) => `<span class="lv3-partner">${svg}<span>${name}</span></span>`).join('');

  el.innerHTML = `
    <div class="lv3-root">
      <!-- nav -->
      <nav class="lv3-nav">
        <div class="lv3-nav__brand">LokaWorld</div>
        <button class="lv3-nav__cta" data-action="start">Start simulation →</button>
      </nav>

      <!-- HERO -->
      <section class="lv3-hero">
        <div class="lv3-hero__left">
          <span class="lv3-hero__badge">World model · Economic simulation</span>
          <h1 class="lv3-hero__title">
            Simulate the <em>economy</em>.
          </h1>
          <p class="lv3-hero__sub">
            Loka deploys <strong>thousands of autonomous AI agents</strong> against a real-world economic scenario, then returns <strong>institutional-grade quantitative simulations</strong> with confidence intervals — not text, but actionable numbers.
          </p>
          <div class="lv3-hero__cta-row">
            <button class="lv3-btn lv3-btn--primary" data-action="pilot">Request a pilot →</button>
            <button class="lv3-btn lv3-btn--ghost" data-action="learn">Learn more ↓</button>
          </div>
        </div>

        <div class="lv3-hero__center">
          <div class="lv3-aperture__rings lv3-aperture__rings--2"></div>
          <div class="lv3-aperture__rings"></div>
          <div class="lv3-aperture">
            <div class="lv3-canvas-container"></div>
            <div class="lv3-aperture-overlay">
              <div class="lv3-aperture__brand">Loka World</div>
            </div>
          </div>
        </div>

        <div class="lv3-hero__right">
          <div class="lv3-stat-block">
            <div class="lv3-stat-block__label">Agent profiles</div>
            <div class="lv3-stat-block__value" data-count="2000" data-suffix="+">0+</div>
            <div class="lv3-stat-block__sub">Sampled from real demographic statistics</div>
          </div>
          <div class="lv3-stat-block">
            <div class="lv3-stat-block__label">Industries</div>
            <div class="lv3-stat-block__value" data-count="200" data-suffix="+">0+</div>
            <div class="lv3-stat-block__sub">Sectors covered across 67 financial categories</div>
          </div>
          <div class="lv3-stat-block">
            <div class="lv3-stat-block__label">Backtest accuracy</div>
            <div class="lv3-stat-block__value" data-count="94" data-suffix="%">0%</div>
            <div class="lv3-stat-block__sub">Validated against historical events</div>
          </div>
        </div>
      </section>

      <!-- ticker -->
      <div class="lv3-ticker">
        <div class="lv3-ticker__track"></div>
      </div>

      <!-- PIPELINE -->
      <section class="lv3-section lv3-section--pipe" id="how">
        <div class="lv3-pipe-head">
          <div class="lv3-pipe-head__left">
            <span class="lv3-section__label">Fig. 03 · Architecture</span>
            <h2 class="lv3-section__title">From a sentence to a structured forecast — in five stages.</h2>
          </div>
          <div class="lv3-pipe-head__right">
            <p class="lv3-pipe-head__desc">Loka's MiroFish pipeline turns one line of plain English into a fully visualized, quantitative report. Each stage is grounded in a different model — language, knowledge graph, agent swarm, econometric, generative.</p>
            <div class="lv3-pipe-head__meta">
              <div><span class="lv3-pipe-head__metaLabel">Runtime</span><span class="lv3-pipe-head__metaVal">10–30 min</span></div>
              <div><span class="lv3-pipe-head__metaLabel">Backtest</span><span class="lv3-pipe-head__metaVal">94.0%</span></div>
              <div><span class="lv3-pipe-head__metaLabel">Agents</span><span class="lv3-pipe-head__metaVal">up to 10K</span></div>
            </div>
          </div>
        </div>

        <div class="lv3-rail">
          <svg class="lv3-rail__line" viewBox="0 0 1200 120" preserveAspectRatio="none" aria-hidden="true">
            <defs><marker id="lv3-arrowEnd" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 Z" fill="#000"/></marker></defs>
            <path d="M30,60 L1170,60" stroke="#000" stroke-width="1" fill="none" marker-end="url(#lv3-arrowEnd)"/>
          </svg>
          <div class="lv3-rail__row">
            <div class="lv3-stage">
              <div class="lv3-stage__viz lv3-stage__viz--input">
                <div class="lv3-kbd">"</div>
                <div class="lv3-kbd-line"><span></span><span></span><span></span></div>
                <div class="lv3-kbd-line"><span></span><span></span></div>
                <div class="lv3-cursor"></div>
              </div>
              <div class="lv3-stage__num">01</div>
              <h4 class="lv3-stage__title">Scenario parsing</h4>
              <p class="lv3-stage__desc">One sentence → event, geography, time horizon, industries.</p>
              <div class="lv3-stage__tag">LLM ontology</div>
            </div>
            <div class="lv3-stage">
              <div class="lv3-stage__viz lv3-stage__viz--grid" data-viz="agents"></div>
              <div class="lv3-stage__num">02</div>
              <h4 class="lv3-stage__title">World construction</h4>
              <p class="lv3-stage__desc">Sample 500 – 10,000 agents from real population data.</p>
              <div class="lv3-stage__tag">Zep knowledge graph</div>
            </div>
            <div class="lv3-stage">
              <div class="lv3-stage__viz lv3-stage__viz--net">
                <svg viewBox="0 0 120 120" data-viz="net"></svg>
              </div>
              <div class="lv3-stage__num">03</div>
              <h4 class="lv3-stage__title">Agent simulation</h4>
              <p class="lv3-stage__desc">OASIS swarm. Dual-scenario, 40–200 rounds with persistent memory.</p>
              <div class="lv3-stage__tag">Camel-OASIS</div>
            </div>
            <div class="lv3-stage">
              <div class="lv3-stage__viz lv3-stage__viz--dist">
                <svg viewBox="0 0 120 120" preserveAspectRatio="none">
                  <path d="M0,110 C20,110 30,40 60,40 C90,40 100,110 120,110 L120,120 L0,120 Z" fill="#000" opacity="0.08"/>
                  <path d="M0,110 C20,110 30,40 60,40 C90,40 100,110 120,110" stroke="#000" stroke-width="1.2" fill="none"/>
                  <line x1="60" y1="20" x2="60" y2="115" stroke="#000" stroke-dasharray="2,3" stroke-width="0.8"/>
                  <line x1="40" y1="115" x2="40" y2="95" stroke="#000" stroke-width="0.8"/>
                  <line x1="80" y1="115" x2="80" y2="95" stroke="#000" stroke-width="0.8"/>
                </svg>
              </div>
              <div class="lv3-stage__num">04</div>
              <h4 class="lv3-stage__title">Quantitative engine</h4>
              <p class="lv3-stage__desc">IO + CGE + Monte Carlo (10K). Behavior → GDP metrics with CI.</p>
              <div class="lv3-stage__tag">IO + CGE + MC</div>
            </div>
            <div class="lv3-stage">
              <div class="lv3-stage__viz lv3-stage__viz--report">
                <div class="lv3-rep-bar"><span style="width:78%"></span></div>
                <div class="lv3-rep-bar"><span style="width:54%"></span></div>
                <div class="lv3-rep-bar"><span style="width:88%"></span></div>
                <div class="lv3-rep-bar"><span style="width:32%"></span></div>
                <div class="lv3-rep-tile"></div>
              </div>
              <div class="lv3-stage__num">05</div>
              <h4 class="lv3-stage__title">Visualization</h4>
              <p class="lv3-stage__desc">Heatmaps, flows, confidence intervals, recommendations — six interactive screens.</p>
              <div class="lv3-stage__tag">ReportAgent ReAct</div>
            </div>
          </div>
        </div>

        <!-- IO row -->
        <div class="lv3-iorow" id="io">
          <div class="lv3-iorow__col">
            <div class="lv3-iorow__label">Input</div>
            <div class="lv3-iorow__card lv3-iorow__card--input">
              <div class="lv3-iorow__text">Singapore unveils a $5B tourism stimulus<br>over the next 18 months.</div>
            </div>
          </div>
          <div class="lv3-iorow__arrow" aria-hidden="true">
            <svg viewBox="0 0 80 16" preserveAspectRatio="none">
              <path d="M0,8 L72,8" stroke="#000" stroke-width="1" fill="none"/>
              <path d="M64,2 L72,8 L64,14" stroke="#000" stroke-width="1" fill="none"/>
            </svg>
          </div>
          <div class="lv3-iorow__col">
            <div class="lv3-iorow__label">Output</div>
            <div class="lv3-iorow__card lv3-iorow__card--output">
              <div class="lv3-iorow__metric">
                <div class="lv3-iorow__metricVal">+1.42<span>%</span></div>
                <div class="lv3-iorow__metricLabel">GDP impact, 18 mo (95% CI: 1.18 – 1.71%)</div>
              </div>
              <div class="lv3-iorow__sectors">
                <div><span>Tourism</span><b>+8.4%</b></div>
                <div><span>F&amp;B</span><b>+3.1%</b></div>
                <div><span>Retail</span><b>+2.6%</b></div>
                <div><span>Transport</span><b>+1.9%</b></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- PARTNERS -->
      <section class="lv3-section lv3-section--partners" id="partners">
        <div class="lv3-partners-head">
          <span class="lv3-section__label">Fig. 04 · Ecosystem</span>
          <h2 class="lv3-section__title">Data infrastructure &amp; settlement partners.</h2>
          <p class="lv3-partners-head__desc">Loka integrates with leading data platforms and blockchain settlement layers for transparent, auditable simulations.</p>
        </div>
        <div class="lv3-partner-block">
          <div class="lv3-partner-block__label">Data providers</div>
          <div class="lv3-partner-block__items">${dataPartners}</div>
        </div>
        <div class="lv3-partner-block">
          <div class="lv3-partner-block__label">Blockchain &amp; settlement</div>
          <div class="lv3-partner-block__items">${chainPartners}</div>
        </div>
      </section>

      <!-- END CTA -->
      <section class="lv3-end-cta">
        <h2 class="lv3-end-cta__title">Start your<br><em>first simulation.</em></h2>
        <p class="lv3-end-cta__sub">Run a multi-agent simulation against your own scenario, get a structured analysis report — all from a clone-and-go web UI.</p>
        <button class="lv3-btn lv3-btn--primary" data-action="start">Start simulation →</button>
      </section>

      <footer class="lv3-foot">
        <div>LokaWorld · 2026</div>
        <div>Self-hosted · open-source · agentic intelligence</div>
      </footer>
    </div>
  `;

  // ─── Wire CTA buttons ───
  el.querySelectorAll('[data-action="start"]').forEach(btn => {
    btn.addEventListener('click', () => onStart && onStart());
  });
  el.querySelectorAll('[data-action="pilot"]').forEach(btn => {
    btn.addEventListener('click', openPilotForm);
  });

  // ─── Inject home demo (Fig. 02 · Live demo) between ticker and pipeline ───
  const pipeSection = el.querySelector('.lv3-section--pipe');
  if (pipeSection) {
    const demo = createHomeDemo({ onStart });
    pipeSection.parentNode.insertBefore(demo, pipeSection);
  }
  el.querySelector('[data-action="learn"]')?.addEventListener('click', () => {
    el.querySelector('#how')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  el.querySelectorAll('.lv3-nav__links a').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      const t = el.querySelector(a.getAttribute('href'));
      if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  // ─── Build ticker ───
  const tickerTrack = el.querySelector('.lv3-ticker__track');
  const partners = Object.keys(TICKER_ICONS);
  const partnerHtml = partners.map(p => `<span class="lv3-ticker__item">${TICKER_ICONS[p]}<span class="sym">${p.replace('&', '&amp;')}</span></span>`).join('');
  tickerTrack.innerHTML = partnerHtml + partnerHtml;

  // ─── Build agent grid (stage 2) ───
  const grid = el.querySelector('[data-viz="agents"]');
  if (grid) {
    for (let i = 0; i < 100; i++) {
      const d = document.createElement('div');
      const r = Math.random();
      if (r < 0.3)      d.style.opacity = '0.18';
      else if (r < 0.55) d.style.opacity = '0.45';
      else if (r < 0.8)  d.style.opacity = '0.75';
      else               d.style.opacity = '1';
      grid.appendChild(d);
    }
  }
  // ─── Build network (stage 3) ───
  const net = el.querySelector('[data-viz="net"]');
  if (net) {
    const ns = 'http://www.w3.org/2000/svg';
    const N = 14;
    const nodes = [];
    for (let i = 0; i < N; i++) {
      nodes.push({ x: 12 + Math.random() * 96, y: 12 + Math.random() * 96 });
    }
    for (let i = 0; i < N; i++) {
      const dists = nodes.map((n, j) => ({ j, d: (n.x - nodes[i].x) ** 2 + (n.y - nodes[i].y) ** 2 }))
        .filter(o => o.j !== i).sort((a, b) => a.d - b.d).slice(0, 2);
      dists.forEach(o => {
        const l = document.createElementNS(ns, 'line');
        l.setAttribute('x1', nodes[i].x);
        l.setAttribute('y1', nodes[i].y);
        l.setAttribute('x2', nodes[o.j].x);
        l.setAttribute('y2', nodes[o.j].y);
        net.appendChild(l);
      });
    }
    nodes.forEach((n, i) => {
      const c = document.createElementNS(ns, 'circle');
      c.setAttribute('cx', n.x);
      c.setAttribute('cy', n.y);
      c.setAttribute('r', i === 5 || i === 9 ? 3 : 2);
      net.appendChild(c);
    });
  }

  // ─── Counter animation when visible ───
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        animateCount(e.target);
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.4 });
  el.querySelectorAll('[data-count]').forEach(node => obs.observe(node));

  function animateCount(node) {
    const target = parseInt(node.dataset.count, 10);
    const suffix = node.dataset.suffix || '';
    const dur = 1800;
    const start = performance.now();
    function frame(now) {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      const v = Math.round(target * eased);
      node.textContent = v.toLocaleString() + suffix;
      if (t < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  // ─── Particle globe (initialised lazily once el is in DOM) ───
  let globeStarted = false;
  const start = () => {
    if (globeStarted) return;
    globeStarted = true;
    initGlobe(el);
  };
  // Fire once main.js attaches the element + applies .active class.
  el._runAnimation = start;
  // Also fire automatically — landing is the initial screen and main.js
  // only invokes _runAnimation on goToScreen, not on initial mount.
  setTimeout(start, 400);

  return el;
}

function initGlobe(el) {
  const container = el.querySelector('.lv3-canvas-container');
  if (!container || !window.THREE) return;
  const THREE = window.THREE;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
  camera.position.z = 150;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(container.clientWidth || 400, container.clientHeight || 400);
  container.appendChild(renderer.domElement);

  const particleCount = 2200;
  const particlesGeometry = new THREE.BufferGeometry();
  const particlesPosition = new Float32Array(particleCount * 3);
  const velocities = [];

  for (let i = 0; i < particleCount * 3; i += 3) {
    const r = 100 * Math.cbrt(Math.random());
    const theta = Math.random() * 2 * Math.PI;
    const phi = Math.acos(2 * Math.random() - 1);
    particlesPosition[i]     = r * Math.sin(phi) * Math.cos(theta);
    particlesPosition[i + 1] = r * Math.sin(phi) * Math.sin(theta);
    particlesPosition[i + 2] = r * Math.cos(phi);
    velocities.push({
      x: (Math.random() - 0.5) * 0.18,
      y: (Math.random() - 0.5) * 0.18,
      z: (Math.random() - 0.5) * 0.18,
    });
  }
  particlesGeometry.setAttribute('position', new THREE.BufferAttribute(particlesPosition, 3));

  const particleMaterial = new THREE.PointsMaterial({
    color: 0x000000, size: 1.4, transparent: true, opacity: 0.8,
  });
  const particleSystem = new THREE.Points(particlesGeometry, particleMaterial);
  scene.add(particleSystem);

  const lineMaterial = new THREE.LineBasicMaterial({
    color: 0x000000, transparent: true, opacity: 0.15,
  });
  const lineGeometry = new THREE.BufferGeometry();
  const linePositions = [];
  const maxDistance = 15;
  for (let i = 0; i < particleCount; i++) {
    for (let j = i + 1; j < particleCount; j++) {
      const ix = i*3, iy = i*3+1, iz = i*3+2;
      const jx = j*3, jy = j*3+1, jz = j*3+2;
      const dx = particlesPosition[ix] - particlesPosition[jx];
      const dy = particlesPosition[iy] - particlesPosition[jy];
      const dz = particlesPosition[iz] - particlesPosition[jz];
      const distSq = dx*dx + dy*dy + dz*dz;
      if (distSq < maxDistance * maxDistance) {
        if (Math.random() > 0.8) continue;
        linePositions.push(
          particlesPosition[ix], particlesPosition[iy], particlesPosition[iz],
          particlesPosition[jx], particlesPosition[jy], particlesPosition[jz],
        );
      }
    }
  }
  lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
  const lines = new THREE.LineSegments(lineGeometry, lineMaterial);
  scene.add(lines);

  let time = 0;
  function animate() {
    requestAnimationFrame(animate);
    time += 0.005;
    particleSystem.rotation.y = time * 0.5;
    particleSystem.rotation.x = time * 0.2;
    lines.rotation.y = time * 0.5;
    lines.rotation.x = time * 0.2;
    const positions = particleSystem.geometry.attributes.position.array;
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      positions[i3]     += velocities[i].x;
      positions[i3 + 1] += velocities[i].y;
      positions[i3 + 2] += velocities[i].z;
      const d = positions[i3]*positions[i3] + positions[i3+1]*positions[i3+1] + positions[i3+2]*positions[i3+2];
      if (d > 12000) {
        velocities[i].x *= -1;
        velocities[i].y *= -1;
        velocities[i].z *= -1;
      }
    }
    particleSystem.geometry.attributes.position.needsUpdate = true;
    renderer.render(scene, camera);
  }
  animate();

  function sizeGlobe() {
    const w = container.clientWidth, h = container.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', sizeGlobe);
  // size after layout settles
  requestAnimationFrame(sizeGlobe);
  setTimeout(sizeGlobe, 300);
}
