// Report screen — Lokafish Flow design (Stage 4, light)
// 3-column research-paper layout: TOC sidebar / serif document / chat sidebar.

const SECTIONS = [
  { id: 'rs-abstract', toc: 'Abstract' },
  { id: 'rs-1',        toc: '1. Introduction' },
  { id: 'rs-2',        toc: '2. Methodology' },
  { id: 'rs-3',        toc: '3. Findings' },
  { id: 'rs-4',        toc: '4. Risks & limitations' },
  { id: 'rs-5',        toc: '5. Decision log' },
  { id: 'rs-6',        toc: '6. Closing' },
];

const CHAT_HEURISTICS = [
  {
    re: /summary|summarise|key|findings/i,
    a: 'Five findings: (1) S$372M tourism receipts mean, σ=S$48M; (2) 8–12 week halo effect post-event; (3) Changi arrivals +20%, validated by STB; (4) hotel ADR rises 38% in central districts; (5) +0.25pp Q1 GDP contribution.',
  },
  {
    re: /halo|long.?tail|after|post/i,
    a: 'The halo emerges from social-amplified return visits and word-of-mouth among SEA tourists. Traditional I-O models miss this tail because they don\'t simulate individual agent memory or social-network propagation.',
  },
  {
    re: /stress|sensitivity|robust/i,
    a: 'Halo magnitude is most sensitive: ±25% on social propagation coefficients shifts halo from 6w to 14w. The receipts forecast (S$310–480M @ 80% CI) is robust to ±15% in agent population mix.',
  },
  {
    re: /counterfactual|baseline|no.event/i,
    a: 'The no-concert baseline uses a synthetic-control match: weighted Mar 2023 + seasonal adjustment. Uncertainty widens beyond 4w post-event because the base period\'s social-media patterns don\'t cleanly project.',
  },
];

export function createReport() {
  const el = document.createElement('div');
  el.className = 'screen flow-screen flow-screen--report';
  el.id = 'screen-report';

  const tocHtml = SECTIONS.map(s => `<li><a href="#${s.id}">${s.toc}</a></li>`).join('');

  el.innerHTML = `
    <div class="report-shell">
      <aside class="report-toc">
        <div class="report-toc__label">In this report</div>
        <ol class="report-toc__list" id="report-toc-list">${tocHtml}</ol>
        <div class="report-toc__actions">
          <button class="flow-btn flow-btn--ghost flow-btn--sm">↓ Download PDF</button>
          <button class="flow-btn flow-btn--ghost flow-btn--sm">⌘ Cite</button>
          <button class="flow-btn flow-btn--ghost flow-btn--sm" id="btn-restart">↻ New scenario</button>
        </div>
      </aside>

      <article class="report-doc" id="report-doc">
        <header class="report-doc__head">
          <div class="report-doc__meta">
            <span class="report-doc__class">CONFIDENTIAL · DRAFT</span>
            <span class="report-doc__sep">·</span>
            <span>Mar 18 2024</span>
            <span class="report-doc__sep">·</span>
            <span>Run #7c4-a01</span>
          </div>
          <h1 class="report-doc__title">Economic impact of the <em>Eras Tour</em> in Singapore — a multi-agent world simulation.</h1>
          <div class="report-doc__byline">
            <span>Prepared by <b>Loka Research</b> · Multi-agent swarm × quantitative economic analysis</span>
          </div>
          <div class="report-doc__hero-stats">
            <div class="report-doc__hs">
              <div class="report-doc__hs-num">S$<em>372</em>M</div>
              <div class="report-doc__hs-lbl">Projected tourism receipts<br><span>80% CI: S$310M – S$480M</span></div>
            </div>
            <div class="report-doc__hs">
              <div class="report-doc__hs-num"><em>+0.25</em>pp</div>
              <div class="report-doc__hs-lbl">Q1 real GDP contribution<br><span>vs counterfactual baseline</span></div>
            </div>
            <div class="report-doc__hs">
              <div class="report-doc__hs-num"><em>92.7</em>%</div>
              <div class="report-doc__hs-lbl">Peak hotel occupancy<br><span>concert weekend, central districts</span></div>
            </div>
          </div>
        </header>

        <section class="report-section" id="rs-abstract">
          <h2 class="report-section__h">Abstract</h2>
          <p class="report-section__lead">We deploy 2,000 demographically-grounded autonomous agents in a digital twin of Singapore's economy to forecast the impact of Taylor Swift's six-night Eras Tour residency at the National Stadium (Mar 2–9, 2024). Through 120 rounds of behavioural simulation processed via Input-Output, CGE and Monte Carlo (n=10,000) frameworks, we project tourism receipts of <b>S$350M–S$450M</b> with 80% CI [S$310M, S$480M]. The forecast aligns with Maybank Research and is corroborated by STB-reported visitor arrivals (+45% YoY in Mar 2024). Accommodation (peak occupancy 92.7%) and aviation (+20% Changi arrivals) emerge as primary beneficiaries; we identify a previously undocumented halo effect of 8–12 weeks post-event.</p>
        </section>

        <section class="report-section" id="rs-1">
          <h2 class="report-section__h"><span class="report-section__num">01</span>Introduction</h2>
          <p>Large-scale entertainment events are a significant yet poorly understood driver of urban economic activity. Traditional econometric approaches rely on historical regression and input-output tables [Crompton, 1995] but fail to capture the emergent dynamics of crowd behaviour, social media amplification and cross-industry consumption cascading.</p>
          <p>The advent of LLM-powered multi-agent systems [Park et al., 2023] opens a new paradigm: simulating individual-level economic decisions within a structured world model, then aggregating behaviours to produce macroeconomic projections. This paper introduces the <b>Loka World Model Engine</b>, addressing three gaps in existing approaches through a five-layer architecture that integrates real population statistics, multi-agent behavioural simulation and established quantitative economic frameworks.</p>
          <aside class="report-callout">
            <div class="report-callout__label">Note from the analyst</div>
            <p>This run was executed in <b>Sandbox + Light Touch</b> mode — agents operate autonomously but pauses occur at three key checkpoints for analyst input. See decision log in §5.</p>
          </aside>
        </section>

        <section class="report-section" id="rs-2">
          <h2 class="report-section__h"><span class="report-section__num">02</span>Methodology</h2>
          <h3 class="report-section__h3">2.1 &nbsp; Population database &amp; agent generation</h3>
          <p>Unlike LLM-generated fictional personas, Loka agents are sampled from a structured population database grounded in Singapore's Department of Statistics census (2023). Each profile carries: SSOC 2020 occupational classification, HES 2022/23 income distribution, consumption-expenditure patterns and residential location.</p>
          <h3 class="report-section__h3">2.2 &nbsp; Agent architecture</h3>
          <p>Each agent is an autonomous decision-making unit with: <i>(i)</i> a biographical memory module storing 180 days of temporal context, <i>(ii)</i> a social network graph connecting 15–50 other agents, <i>(iii)</i> a consumption decision function parameterised by income, personality and social influence, and <i>(iv)</i> an information-processing module that evaluates incoming signals against personal relevance criteria.</p>
          <h3 class="report-section__h3">2.3 &nbsp; Simulation framework</h3>
          <p>We employ the OASIS multi-agent interaction framework in dual-scenario parallel mode. Each run consists of 120 rounds spanning a 4-week horizon (pre-event 2w, event 6d, post-event 2w). Agents interact through simulated social networks, make consumption decisions and generate transactions that feed into the quantitative analysis layer.</p>
        </section>

        <section class="report-section" id="rs-3">
          <h2 class="report-section__h"><span class="report-section__num">03</span>Findings</h2>
          <p>We summarise five key findings from the simulation, in order of magnitude of economic impact.</p>

          <div class="report-finding">
            <div class="report-finding__num">F1</div>
            <div>
              <h4 class="report-finding__h">Tourism receipts of S$350M–S$450M, concentrated in 3 sectors.</h4>
              <p>Across 10,000 Monte Carlo iterations, projected direct tourism receipts converge on a mean of <b>S$372M</b> (σ=S$48M). Accommodation (38% share), F&amp;B (24%) and retail (19%) absorb the majority of inflows.</p>
            </div>
          </div>

          <div class="report-finding">
            <div class="report-finding__num">F2</div>
            <div>
              <h4 class="report-finding__h">An 8–12 week halo effect previously absent in econometric models.</h4>
              <p>Simulated agents continue to elevate consumption 14.4% above baseline well after the concert weekend, driven by social-media-amplified return visits and word-of-mouth among SEA tourists.</p>
            </div>
          </div>

          <div class="report-finding">
            <div class="report-finding__num">F3</div>
            <div>
              <h4 class="report-finding__h">Changi arrivals projected +20%, validated by STB data.</h4>
              <p>Inbound arrivals during Mar 2024 are projected at +20% week-on-week vs Feb baseline, peaking on concert eve. Subsequently confirmed by STB monthly statistics: 1.48M international visitors (+45% YoY).</p>
            </div>
          </div>

          <div class="report-finding">
            <div class="report-finding__num">F4</div>
            <div>
              <h4 class="report-finding__h">Hotel occupancy of 92.7% in central districts; ADR rises 38%.</h4>
              <p>Average Daily Rate in Orchard, Marina Bay and Bras Basah districts rises 38% during the concert window. Outer-ring districts show muted +9% impact.</p>
            </div>
          </div>

          <div class="report-finding">
            <div class="report-finding__num">F5</div>
            <div>
              <h4 class="report-finding__h">Q1 real GDP contribution of +0.25pp — small at macro, large at margin.</h4>
              <p>Aggregate contribution to Q1 2024 real GDP growth is estimated at <b>+0.25 percentage points</b>. While modest in absolute terms, this single six-night event accounts for ~7% of the quarter's total expansion.</p>
            </div>
          </div>
        </section>

        <section class="report-section" id="rs-4">
          <h2 class="report-section__h"><span class="report-section__num">04</span>Risks &amp; limitations</h2>
          <ul class="report-risks">
            <li><b>Agent calibration drift.</b> Personality priors are sampled from 2008 norms; cohort effects since may shift consumption response.</li>
            <li><b>Social-media virality is hard to forecast.</b> Halo magnitude is highly sensitive to assumed propagation coefficients; ±25% shifts halo from 6w to 14w.</li>
            <li><b>Single-event modelling.</b> The framework does not model crowding-out — concurrent events at lesser venues during the same week may divert receipts.</li>
            <li><b>Counterfactual baseline.</b> The "no-concert" baseline relies on a synthetic-control match using Mar 2023 + seasonal adjustment.</li>
          </ul>
        </section>

        <section class="report-section" id="rs-5">
          <h2 class="report-section__h"><span class="report-section__num">05</span>Decision log</h2>
          <p>Three analyst checkpoints occurred during this run (Light-Touch mode):</p>
          <ol class="report-decisions">
            <li>
              <div class="report-decisions__when">After step 02 · Plan</div>
              <div class="report-decisions__what"><b>Selected sandbox + light-touch participation.</b> Agent autonomy retained; pauses at 3 economic checkpoints.</div>
            </li>
            <li>
              <div class="report-decisions__when">Round 38 · Pre-event peak</div>
              <div class="report-decisions__what"><b>Approved tourism inflow assumption</b> (35K SEA / 18K AU+NZ) over baseline-only fallback.</div>
            </li>
            <li>
              <div class="report-decisions__when">Round 91 · Halo modelling</div>
              <div class="report-decisions__what"><b>Extended halo window from 6w → 12w.</b> Justified by social-listening data showing sustained engagement on TikTok.</div>
            </li>
          </ol>
        </section>

        <section class="report-section" id="rs-6">
          <h2 class="report-section__h"><span class="report-section__num">06</span>Closing</h2>
          <p>Within the bounds of the calibration and the assumptions noted in §4, we are confident the projected receipts and halo dynamic are robust signals — not artefacts of model construction.</p>
          <p class="report-section__sig">— <i>Loka Research, March 2024</i></p>
        </section>

        <footer class="report-doc__foot">
          <div>Generated by Loka v1.0 · Run #7c4-a01 · 2,000 agents · 120 rounds · 10,000 MC iterations</div>
          <div>This document is a draft. Contact the analyst before circulation.</div>
        </footer>
      </article>

      <aside class="report-chat">
        <div class="report-chat__head">
          <div class="report-chat__title">Ask the model</div>
          <div class="report-chat__sub">Loka has read every line of this report.</div>
        </div>
        <div class="report-chat__body" id="report-chat-body">
          <div class="report-chat__msg">
            <div class="report-chat__avatar">L</div>
            <div class="report-chat__bubble">Hi — I'm Loka, the analyst behind this run. Ask me to clarify any finding, walk through the methodology, or stress-test an assumption.</div>
          </div>
        </div>
        <div class="report-chat__suggest" id="report-chat-suggest">
          <button class="report-chat__sug">Summarise key findings</button>
          <button class="report-chat__sug">Why is the halo 8–12 weeks?</button>
          <button class="report-chat__sug">Stress-test the receipts forecast</button>
        </div>
        <form class="report-chat__form" id="report-chat-form">
          <input type="text" class="report-chat__input" placeholder="Ask a question…" id="report-chat-input">
          <button type="submit" class="report-chat__send">→</button>
        </form>
      </aside>
    </div>
  `;

  // ── TOC scroll-spy ──
  const tocLinks = el.querySelectorAll('.report-toc__list a');
  function activateLink(id) {
    tocLinks.forEach(a => a.classList.toggle('is-active', a.getAttribute('href') === '#' + id));
  }
  tocLinks.forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      const id = a.getAttribute('href').slice(1);
      const target = el.querySelector('#' + id);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      activateLink(id);
    });
  });
  activateLink(SECTIONS[0].id);

  // ── Chat ──
  const chatBody = el.querySelector('#report-chat-body');
  const chatForm = el.querySelector('#report-chat-form');
  const chatInput = el.querySelector('#report-chat-input');
  function pushMsg(text, who) {
    const msg = document.createElement('div');
    msg.className = 'report-chat__msg' + (who === 'user' ? ' report-chat__msg--user' : '');
    msg.innerHTML = `
      <div class="report-chat__avatar">${who === 'user' ? 'You' : 'L'}</div>
      <div class="report-chat__bubble">${text}</div>
    `;
    chatBody.appendChild(msg);
    chatBody.scrollTop = chatBody.scrollHeight;
  }
  function answer(q) {
    const hit = CHAT_HEURISTICS.find(h => h.re.test(q));
    return hit ? hit.a : "I'm a demo bot — ask about the findings, halo, stress-test, or counterfactual baseline and I'll respond from the report's content.";
  }
  function ask(q) {
    pushMsg(q, 'user');
    setTimeout(() => pushMsg(answer(q), 'bot'), 480);
  }
  chatForm.addEventListener('submit', e => {
    e.preventDefault();
    const v = chatInput.value.trim();
    if (!v) return;
    chatInput.value = '';
    ask(v);
  });
  el.querySelectorAll('.report-chat__sug').forEach(btn => {
    btn.addEventListener('click', () => ask(btn.textContent));
  });

  // legacy hooks
  el._loadProject = () => {};

  return el;
}
