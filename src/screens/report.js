// Report — Two-column: academic paper (left) + AI chat (right)

import { reportContent } from '../data/report.js';
import { Typewriter } from '../utils/typewriter.js';
import { delay } from '../utils/animation.js';

const reportChatResponses = {
  'Summarize the key findings': `Based on the multi-agent simulation (2,000 agents × 120 rounds), validated against Maybank, CoStar, and STB data:

**Total Tourism Receipts: S$350M–S$450M (US$260M–US$375M)**
- Accommodation: S$110–140M (CoStar: occupancy 79.1%, ADR +12.7%)
- Aviation/Transport: S$65–85M (Changi: +20% arrivals, 5.73M pax)
- F&B: S$55–70M (3–4x revenue near National Stadium)
- Retail/Attractions: S$40–55M (Klook bookings +200%)

Key insight: 300K+ attendees, 70% from overseas (STB). Average incremental spending ~US$800 per visitor beyond ticket. GDP contribution: ~0.25 percentage points to Q1 2024 growth.`,

  'What are the main risks?': `Five primary risk vectors identified:

1. **Tourist volume sensitivity** — elasticity 1.8x (most critical)
2. **Travel restrictions** — Could reduce 70% overseas attendance share
3. **Hotel pricing pressure** — elasticity 1.2x; ADR already peaked at S$438.36
4. **Regional competition** — Exclusivity deal was key; without it, demand disperses
5. **Weather/logistics** — Monsoon proximity, stadium capacity constraints

CoStar data shows only 3 days below 70% occupancy all month — demand was resilient. But the model is highly dependent on the "exclusive SE Asian stop" positioning.`,

  'How does this compare to actual results?': `**Loka Projection vs Independently Reported Actuals:**

| Metric | Loka Projection | Actual (Source) |
|--------|----------------|-----------------|
| Tourism Receipts | S$350–450M | US$260–375M (Maybank) |
| Hotel Occupancy (avg) | 78–82% | 79.1% (CoStar/STR) |
| Peak Occupancy | 90–94% | 92.7% (CoStar, Mar 2) |
| ADR | S$340–380 | S$358.91 (CoStar) |
| RevPAR | S$260–300 | S$284.03 (CoStar) |
| Changi Arrivals Change | +18–22% | +20% (Changi Airport) |
| Overseas Attendee Share | 65–75% | ~70% (STB) |

Our projections fell within 3–5% of actual reported metrics. The accommodation forecasts were particularly accurate thanks to CoStar historical calibration.`,

  'Explain the methodology': `**Three-layer quantitative framework:**

1. **Input-Output Model** (Leontief)
   - 67-sector Singapore economy matrix
   - Captures inter-industry demand transmission
   
2. **CGE Model** (Dixon & Rimmer)
   - 12-sector general equilibrium
   - Solves for market-clearing prices, wages, employment
   
3. **Monte Carlo Simulation**
   - n=10,000 iterations
   - ±1σ parameter variation
   - Generates confidence intervals, not point estimates

Agent behavioral data feeds all three models simultaneously. Results are weighted and harmonized to produce the final projection.`,
};

export function createReport() {
  const el = document.createElement('div');
  el.className = 'screen report-screen';
  el.id = 'screen-report';

  const chatSuggestions = Object.keys(reportChatResponses);

  el.innerHTML = `
    <div class="report-layout">
      <!-- LEFT: Paper -->
      <div class="report-paper" id="report-paper">
        <div class="report-header anim-fade-up">
          <div class="report-header__left">
            <div class="report-header__logo"><span class="accent-text">Loka</span> Research</div>
            <div class="report-header__meta">
              Model: ${reportContent.model}<br/>
              Engine: Loka World Model v1.0
            </div>
          </div>
          <div class="report-header__right">
            <div class="report-header__classification">${reportContent.classification}</div>
            <div class="report-header__date">${reportContent.date}</div>
          </div>
        </div>

        <div class="report-paper-title" data-reveal>
          <h1>${reportContent.title}</h1>
          <p class="report-paper-subtitle">${reportContent.subtitle}</p>
          <div class="report-paper-authors">Loka World Model Engine v1.0 · Autonomous Multi-Agent Simulation</div>
        </div>

        <div class="report-toc" data-reveal>
          <div class="report-toc__title">Table of Contents</div>
          <div class="report-toc__items">
            <a class="report-toc__item" href="#abstract">Abstract</a>
            ${reportContent.sections.map(s => `<a class="report-toc__item" href="#section-${s.num}"><span class="mono">${s.num}</span> ${s.title}</a>`).join('')}
            <a class="report-toc__item" href="#references">References</a>
            <a class="report-toc__item" href="#appendix">Appendix: Risk Factors</a>
          </div>
        </div>

        <div class="report-section" data-reveal id="abstract">
          <div class="report-section__title">Abstract</div>
          <div class="report-section__body report-abstract">${reportContent.abstract}</div>
        </div>

        <div class="report-section" data-reveal>
          <div class="report-mini-chart">
            <canvas id="report-mini-chart" width="620" height="120"></canvas>
          </div>
          <div style="text-align:center;font-size:11px;color:var(--text-muted);margin-top:4px;">
            Figure 1: GDP Impact Projection — Baseline vs. Concert Scenario
          </div>
        </div>

        ${reportContent.sections.map(s => `
          <div class="report-section" data-reveal id="section-${s.num}">
            <div class="report-section__title"><span class="mono" style="margin-right: 8px;">${s.num}.</span>${s.title}</div>
            <div class="report-section__body">${s.body}</div>
          </div>
        `).join('')}

        <div class="report-section" data-reveal id="references">
          <div class="report-section__title">References</div>
          <div class="report-references">
            ${reportContent.references.map((ref, i) => `<div class="report-ref">[${i + 1}] ${ref}</div>`).join('')}
          </div>
        </div>

        <div class="report-section" data-reveal id="appendix">
          <div class="report-section__title">Appendix A: Risk Factors</div>
          ${reportContent.risks.map(r => `<div class="report-risk">⚠ ${r}</div>`).join('')}
        </div>

        <div class="report-actions anim-fade-up">
          <button class="btn btn--primary" id="btn-export-pdf">Export PDF</button>
          <button class="btn btn--secondary">Share Report</button>
          <button class="btn btn--secondary" id="btn-restart">New Analysis</button>
        </div>

        <div style="text-align:center;padding:32px 0 16px;color:var(--text-muted);font-size:11px;">
          Generated by Loka World Model Engine v1.0 · ${reportContent.date}<br/>
          © 2026 Loka. All rights reserved.
        </div>
      </div>

      <!-- RIGHT: Chat -->
      <div class="report-chat">
        <div class="report-chat__header">
          <div class="report-chat__header-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            Ask about this report
          </div>
          <div class="report-chat__header-tag">AI Analyst</div>
        </div>
        <div class="report-chat__messages" id="report-chat-messages">
          <div class="report-chat__msg report-chat__msg--ai">
            <div class="report-chat__msg-avatar">LK</div>
            <div class="report-chat__msg-content">
              <div class="report-chat__msg-name">Loka AI</div>
              I've analyzed the full research report. Ask me anything about the methodology, findings, risks, or strategic implications. I have access to all simulation data and can provide deeper analysis on any section.
            </div>
          </div>
        </div>
        <div class="report-chat__suggestions" id="report-suggestions">
          ${chatSuggestions.map(s => `<button class="report-chat__suggestion">${s}</button>`).join('')}
        </div>
        <div class="report-chat__input">
          <input type="text" placeholder="Ask about the report..." id="report-chat-input" />
          <button class="btn btn--primary btn--sm" id="btn-report-send">→</button>
        </div>
      </div>
    </div>
  `;

  // TOC clicks
  el.querySelectorAll('.report-toc__item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const target = el.querySelector(item.getAttribute('href'));
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  // Export
  el.querySelector('#btn-export-pdf').addEventListener('click', () => {
    const btn = el.querySelector('#btn-export-pdf');
    btn.textContent = '✓ Exported';
    btn.disabled = true;
    setTimeout(() => { btn.textContent = 'Export PDF'; btn.disabled = false; }, 2000);
  });

  // Chat functionality
  function sendChat(question) {
    const messagesEl = el.querySelector('#report-chat-messages');

    // User message
    const userMsg = document.createElement('div');
    userMsg.className = 'report-chat__msg report-chat__msg--user';
    userMsg.innerHTML = `
      <div class="report-chat__msg-content">${question}</div>
    `;
    messagesEl.appendChild(userMsg);
    messagesEl.scrollTop = messagesEl.scrollHeight;

    const response = reportChatResponses[question] || `I've analyzed the report data regarding your question. Based on the simulation parameters (2,000 agents, 120 rounds, 10K Monte Carlo iterations), the relevant findings suggest further investigation into the specific metrics you're inquiring about. The confidence interval for this particular analysis is within the projected range of ±12%.`;

    // Build thinking steps — using inline SVG icons (no emoji)
    const svgDoc = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';
    const svgTable = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 3v18"/></svg>';
    const svgCheck = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>';
    const svgRuler = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>';
    const svgPen = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>';
    const thinkingSteps = [
      { icon: svgDoc, text: 'Scanning report sections & appendices...', duration: 700 },
      { icon: svgTable, text: 'Retrieving relevant data tables & figures...', duration: 1000 },
      { icon: svgCheck, text: 'Cross-validating with simulation logs (120 rounds)...', duration: 1100 },
      { icon: svgRuler, text: 'Checking confidence intervals & sensitivity ranges...', duration: 800 },
      { icon: svgPen, text: 'Composing response...', duration: 500 },
    ];

    // Create thinking container
    const thinkingEl = document.createElement('div');
    thinkingEl.className = 'report-chat__msg report-chat__msg--ai';
    thinkingEl.innerHTML = `
      <div class="report-chat__msg-avatar">LK</div>
      <div class="report-chat__msg-content">
        <div class="report-chat__msg-name">Loka AI</div>
        <div class="chat-thinking-flow">
          <div class="chat-thinking-flow__header">
            <span class="chat-thinking-flow__spinner"></span>
            <span>Analyzing query...</span>
          </div>
          <div class="chat-thinking-flow__steps"></div>
        </div>
      </div>
    `;
    messagesEl.appendChild(thinkingEl);
    messagesEl.scrollTop = messagesEl.scrollHeight;

    const stepsContainer = thinkingEl.querySelector('.chat-thinking-flow__steps');

    // Reveal steps one by one
    let totalDelay = 400;
    thinkingSteps.forEach((step, idx) => {
      setTimeout(() => {
        const stepEl = document.createElement('div');
        stepEl.className = 'chat-thinking-flow__step';
        stepEl.innerHTML = `<span class="chat-thinking-flow__step-icon">${step.icon}</span><span class="chat-thinking-flow__step-text">${step.text}</span>`;
        stepsContainer.appendChild(stepEl);
        messagesEl.scrollTop = messagesEl.scrollHeight;

        // Mark step as done after its duration
        setTimeout(() => {
          stepEl.classList.add('done');
          stepEl.querySelector('.chat-thinking-flow__step-text').textContent = step.text.replace('...', ' — done');
        }, step.duration);
      }, totalDelay);
      totalDelay += step.duration + 300;
    });

    // After all steps done, replace thinking with response
    setTimeout(() => {
      thinkingEl.remove();

      const aiMsg = document.createElement('div');
      aiMsg.className = 'report-chat__msg report-chat__msg--ai';
      aiMsg.innerHTML = `
        <div class="report-chat__msg-avatar">LK</div>
        <div class="report-chat__msg-content">
          <div class="report-chat__msg-name">Loka AI</div>
          <div class="report-chat__msg-text"></div>
        </div>
      `;
      messagesEl.appendChild(aiMsg);
      messagesEl.scrollTop = messagesEl.scrollHeight;

      const textEl = aiMsg.querySelector('.report-chat__msg-text');
      textEl.style.whiteSpace = 'pre-wrap';
      const tw = new Typewriter(textEl, { speed: 8, html: false });
      tw.type(response).then(() => { messagesEl.scrollTop = messagesEl.scrollHeight; });
    }, totalDelay + 500);
  }

  el.querySelectorAll('.report-chat__suggestion').forEach(btn => {
    btn.addEventListener('click', () => { sendChat(btn.textContent); btn.remove(); });
  });
  el.querySelector('#btn-report-send').addEventListener('click', () => {
    const input = el.querySelector('#report-chat-input');
    if (input.value.trim()) { sendChat(input.value.trim()); input.value = ''; }
  });
  el.querySelector('#report-chat-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') el.querySelector('#btn-report-send').click();
  });

  el._runAnimation = async () => {
    await delay(150);
    const sections = el.querySelectorAll('[data-reveal]');
    for (const section of sections) {
      section.classList.add('visible');
      section.style.opacity = '1';
      section.style.transform = 'translateY(0)';
      section.style.transition = 'all 0.35s ease';
      await delay(100);
    }
    drawMiniChart(el.querySelector('#report-mini-chart'));
  };

  return el;
}

function drawMiniChart(canvas) {
  if (!canvas) return;
  const w = 620, h = 120;
  canvas.width = w * devicePixelRatio;
  canvas.height = h * devicePixelRatio;
  canvas.style.width = '100%';
  canvas.style.maxWidth = w + 'px';
  canvas.style.height = h + 'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(devicePixelRatio, devicePixelRatio);

  const data = [100, 105, 118, 145, 210, 178, 142, 120, 112];
  const upper = [100, 112, 135, 170, 245, 210, 168, 140, 128];
  const lower = [100, 98, 102, 120, 175, 148, 118, 102, 98];
  const baseline = [100, 101, 102, 103, 104, 105, 106, 107, 108];
  const labels = ['W-4', 'W-3', 'W-2', 'W-1', 'Event', 'W+1', 'W+2', 'W+3', 'W+4'];
  const pad = { top: 16, right: 20, bottom: 28, left: 40 };
  const cw = w - pad.left - pad.right;
  const ch = h - pad.top - pad.bottom;
  const maxVal = 260, minVal = 85;

  const getX = (i) => pad.left + (cw / (data.length - 1)) * i;
  const getY = (v) => pad.top + ch - ((v - minVal) / (maxVal - minVal)) * ch;

  ctx.beginPath();
  for (let i = 0; i < upper.length; i++) ctx.lineTo(getX(i), getY(upper[i]));
  for (let i = lower.length - 1; i >= 0; i--) ctx.lineTo(getX(i), getY(lower[i]));
  ctx.closePath();
  ctx.fillStyle = 'rgba(35,131,226,0.08)';
  ctx.fill();

  ctx.beginPath();
  baseline.forEach((v, i) => { if (i === 0) ctx.moveTo(getX(i), getY(v)); else ctx.lineTo(getX(i), getY(v)); });
  ctx.strokeStyle = '#B4B4B0'; ctx.lineWidth = 1; ctx.setLineDash([4, 4]); ctx.stroke(); ctx.setLineDash([]);

  ctx.beginPath();
  data.forEach((v, i) => { if (i === 0) ctx.moveTo(getX(i), getY(v)); else ctx.lineTo(getX(i), getY(v)); });
  ctx.strokeStyle = '#2383E2'; ctx.lineWidth = 2; ctx.stroke();

  data.forEach((v, i) => {
    ctx.beginPath(); ctx.arc(getX(i), getY(v), 3, 0, Math.PI * 2);
    ctx.fillStyle = '#2383E2'; ctx.fill();
  });

  labels.forEach((l, i) => {
    ctx.font = '9px Inter'; ctx.fillStyle = '#B4B4B0'; ctx.textAlign = 'center';
    ctx.fillText(l, getX(i), h - 6);
  });

  ctx.font = '10px JetBrains Mono'; ctx.fillStyle = '#2383E2'; ctx.textAlign = 'center';
  ctx.fillText('+102% GDP uplift', getX(4), getY(210) - 10);
}
