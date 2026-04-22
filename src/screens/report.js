// Report — Two-column: academic paper (left) + AI chat (right)
//
// Peter-jim's visual paper template preserved for demo mode. In real
// mode (_loadProject called with a project id), the paper is swapped to
// the consulting-template layout with per-section role badges and
// inline chart placeholders.

import { reportContent as staticReportContent } from '../data/report.js';
import { delay } from '../utils/animation.js';
import { fetchProjectData, adaptReportForFrontend } from '../lib/project_client.js';
import { renderInlineChart, CHART_TITLES } from '../components/inline-charts.js';
import { createAnalyticsSection } from './analytics.js';

// Mutable so _loadProject can swap to a backend-fetched consulting report.
let reportContent = staticReportContent;
// Analytics payload cached from the most recent _loadProject call, used
// to render [[chart:xxx]] inline placeholders without a second fetch.
let cachedAnalytics = null;
// Conversation history for the real LLM chat. Pushed/popped as the user
// interacts; the full array is POSTed to /api/chat/stream each turn.
const chatHistory = [];
// The currently-loaded project id (null in demo mode) — used by the
// Download Markdown button to build the correct URL.
let currentProjectId = null;

// Suggested questions seeding the chat; content comes from the LLM at runtime.
const chatSuggestionQuestions = [
  'Summarize the key findings',
  'What are the main risks?',
  'How does this compare to actual results?',
  'Explain the methodology',
];

// Role badge labels for consulting-template sections (real mode).
const ROLE_LABELS = {
  strategist: 'Strategy Partner',
  analyst: 'Senior Analyst',
  risk_officer: 'Chief Risk Officer',
  finance: 'Finance Analyst',
  policy: 'Policy Analyst',
};
const ROLE_COLORS = {
  strategist: '#2383E2',
  analyst: '#0F7B6C',
  risk_officer: '#E03E3E',
  finance: '#D9730D',
  policy: '#6940A5',
};

const SYSTEM_PROMPT =
  'You are Loka AI, an analyst embedded in the Loka research report. ' +
  "Answer the user's questions using the REPORT CONTEXT below. " +
  'Cite specific numbers, sections, or findings whenever possible. ' +
  'Keep answers under 250 words unless the user asks for more detail. ' +
  'If the report does not contain the answer, say so plainly.';

// Strip HTML tags so the report context stays compact and LLM-friendly.
function stripHtml(s) {
  return String(s || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

// Build a compact text version of the report to use as LLM context.
function buildReportContext() {
  const parts = [];
  parts.push(`TITLE: ${reportContent.title || ''}`);
  if (reportContent.subtitle) parts.push(`SUBTITLE: ${reportContent.subtitle}`);
  parts.push(`\nABSTRACT:\n${stripHtml(reportContent.abstract)}`);
  parts.push(`\nSECTIONS:`);
  for (const s of (reportContent.sections || [])) {
    const body = stripHtml(s.body);
    const trimmed = body.length > 600 ? body.slice(0, 600) + '…' : body;
    parts.push(`\n[${s.num}] ${s.title}\n${trimmed}`);
  }
  if (reportContent.risks && reportContent.risks.length) {
    parts.push(`\nRISK FACTORS:\n${reportContent.risks.map(r => '- ' + stripHtml(r)).join('\n')}`);
  }
  return parts.join('\n');
}

/**
 * Stream a chat response from /api/chat/stream and call onDelta(text)
 * for every text fragment. Returns a promise that resolves to the full
 * concatenated reply when the stream finishes.
 */
async function streamChatApi(userMessage, { onFirstDelta, onDelta }) {
  chatHistory.push({ role: 'user', content: userMessage });

  const res = await fetch('/api/chat/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: chatHistory,
      context: buildReportContext(),
      system: SYSTEM_PROMPT,
    }),
  });
  if (!res.ok || !res.body) {
    throw new Error(`chat stream ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buf = '';
  let full = '';
  let firstDeltaSeen = false;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });

    let sep;
    while ((sep = buf.indexOf('\n\n')) !== -1) {
      const eventBlock = buf.slice(0, sep);
      buf = buf.slice(sep + 2);

      const dataLines = eventBlock
        .split('\n')
        .filter((l) => l.startsWith('data:'))
        .map((l) => l.slice(5).trimStart());
      if (!dataLines.length) continue;
      const payload = dataLines.join('\n');
      let parsed;
      try {
        parsed = JSON.parse(payload);
      } catch {
        continue;
      }
      if (parsed.error) throw new Error(parsed.error);
      if (parsed.done) {
        if (full) chatHistory.push({ role: 'assistant', content: full });
        return full;
      }
      if (parsed.delta) {
        if (!firstDeltaSeen) {
          firstDeltaSeen = true;
          onFirstDelta && onFirstDelta();
        }
        full += parsed.delta;
        onDelta && onDelta(parsed.delta);
      }
    }
  }

  if (full) chatHistory.push({ role: 'assistant', content: full });
  return full;
}

export function createReport() {
  const el = document.createElement('div');
  el.className = 'screen report-screen';
  el.id = 'screen-report';

  const chatSuggestions = chatSuggestionQuestions;

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

        <div class="report-key-metrics" data-reveal>
          <div class="report-key-metric">
            <div class="report-key-metric__label">Tourism Receipts</div>
            <div class="report-key-metric__value report-key-metric__value--blue">S$350–450M</div>
            <div class="report-key-metric__sub">80% CI: [S$310M, S$480M]</div>
          </div>
          <div class="report-key-metric">
            <div class="report-key-metric__label">GDP Impact</div>
            <div class="report-key-metric__value report-key-metric__value--green">+0.25pp</div>
            <div class="report-key-metric__sub">Q1 2024 Growth</div>
          </div>
          <div class="report-key-metric">
            <div class="report-key-metric__label">Hotel Occupancy</div>
            <div class="report-key-metric__value report-key-metric__value--purple">79.1%</div>
            <div class="report-key-metric__sub">Peak: 92.7% (CoStar)</div>
          </div>
          <div class="report-key-metric">
            <div class="report-key-metric__label">Overseas Attendees</div>
            <div class="report-key-metric__value report-key-metric__value--orange">~70%</div>
            <div class="report-key-metric__sub">of 300K+ total</div>
          </div>
        </div>

        <div class="report-toc" data-reveal>
          <div class="report-toc__title">Table of Contents</div>
          <div class="report-toc__items">
            <a class="report-toc__item" href="#abstract">Abstract</a>
            <a class="report-toc__item" href="#analytics"><span class="mono">§</span> Quantitative Analytics</a>
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

        <!-- Analytics section — previously a standalone screen, now
             embedded into the paper so the report is the single source
             of truth for both narrative and quantitative evidence. -->
        <div class="report-section report-section--analytics" data-reveal id="analytics">
          <div class="report-section__title"><span class="mono">§</span>Quantitative Analytics</div>
          <div class="report-section__body">
            <p style="color:var(--text-secondary);font-size:13px;margin:0 0 14px;">
              Interactive dashboards derived from the multi-agent simulation. Click any chart element for detailed breakdowns.
            </p>
          </div>
          <div id="report-analytics-mount"></div>
        </div>

        ${reportContent.sections.map(s => `
          <div class="report-section" data-reveal id="section-${s.num}">
            <div class="report-section__title"><span class="mono">${s.num}</span>${s.title}</div>
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

        <div style="text-align:center;padding:32px 0 16px;">
          <div style="width:80px;height:3px;background:linear-gradient(90deg,#2383E2,#0F7B6C,#6940A5);border-radius:2px;margin:0 auto 16px;"></div>
          <div style="color:var(--text-muted);font-size:11px;line-height:1.8;">
            Generated by <strong style="color:var(--text-secondary);">Loka World Model Engine v1.0</strong> · ${reportContent.date}<br/>
            Multi-Agent Swarm Simulation × Quantitative Economic Analysis<br/>
            © 2026 Loka. All rights reserved.
          </div>
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
        <!-- Active chart-selection context. Shown when the user clicks a
             chart data point; the chip scopes their next question to
             that data and can be dismissed with the × button. -->
        <div class="report-chat__context" id="report-chat-context" hidden>
          <div class="report-chat__context-head">
            <svg class="report-chat__context-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            <span class="report-chat__context-label">Asking about</span>
            <button class="report-chat__context-clear" id="report-chat-context-clear" aria-label="Clear selection">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div class="report-chat__context-chart" id="report-chat-context-chart"></div>
          <div class="report-chat__context-value" id="report-chat-context-value"></div>
          <div class="report-chat__context-summary" id="report-chat-context-summary"></div>
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

  // ── Chart-selection context ─────────────────────────────────────────
  // Listens for `loka:chart-selected` events dispatched by the embedded
  // analytics section (map click, bar click, pie slice, sentiment dot,
  // GDP point). The chip above the chat input shows the selection and
  // scopes the next outgoing question to that data point.
  let activeChartSelection = null;
  const ctxEl         = el.querySelector('#report-chat-context');
  const ctxChartEl    = el.querySelector('#report-chat-context-chart');
  const ctxValueEl    = el.querySelector('#report-chat-context-value');
  const ctxSummaryEl  = el.querySelector('#report-chat-context-summary');
  const ctxClearEl    = el.querySelector('#report-chat-context-clear');
  const chatInputEl   = el.querySelector('#report-chat-input');

  function showChartContext(sel) {
    activeChartSelection = sel;
    if (!ctxEl) return;
    ctxChartEl.textContent   = sel.chart;
    ctxValueEl.textContent   = sel.label;
    ctxSummaryEl.textContent = sel.summary || '';
    ctxEl.hidden = false;
    // Nudge the input placeholder so users know questions are scoped
    if (chatInputEl) chatInputEl.placeholder = `Ask about ${sel.label}…`;
  }
  function clearChartContext() {
    activeChartSelection = null;
    if (!ctxEl) return;
    ctxEl.hidden = true;
    if (chatInputEl) chatInputEl.placeholder = 'Ask about the report...';
  }
  if (ctxClearEl) ctxClearEl.addEventListener('click', clearChartContext);

  const onChartSelected = (e) => {
    if (!e.detail) return;
    showChartContext(e.detail);
    // Pull focus to the chat input so the next keystroke flows there
    if (chatInputEl) chatInputEl.focus();
  };
  window.addEventListener('loka:chart-selected', onChartSelected);

  // Chat functionality
  // Chat — calls real backend LLM (/api/chat/stream) with conversation history.
  async function sendChat(question) {
    const messagesEl = el.querySelector('#report-chat-messages');

    // Snapshot and clear the chart-selection chip so the next question
    // starts fresh. The snapshot is attached to the user's message
    // bubble (for display) AND prepended to the LLM payload (as scope).
    const selection = activeChartSelection;
    clearChartContext();

    const userMsg = document.createElement('div');
    userMsg.className = 'report-chat__msg report-chat__msg--user';
    const selBadge = selection
      ? `<div class="report-chat__msg-badge">
           <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
           <span>${selection.chart} · <strong>${selection.label}</strong></span>
         </div>`
      : '';
    userMsg.innerHTML = `<div class="report-chat__msg-content">${selBadge}${question}</div>`;
    messagesEl.appendChild(userMsg);
    messagesEl.scrollTop = messagesEl.scrollHeight;

    // The message handed to the LLM includes a short context preamble
    // so the model can anchor its answer on the selected data point.
    const llmQuestion = selection
      ? `[Context: user clicked "${selection.chart}" → ${selection.label}. ${selection.summary || ''}]\n\n${question}`
      : question;

    const svgDoc = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';
    const svgTable = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 3v18"/></svg>';
    const svgCheck = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>';
    const svgRuler = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>';
    const svgPen = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>';
    const thinkingSteps = [
      { icon: svgDoc,   text: 'Scanning report sections & appendices...' },
      { icon: svgTable, text: 'Retrieving relevant data tables & figures...' },
      { icon: svgCheck, text: 'Cross-validating with simulation logs...' },
      { icon: svgRuler, text: 'Checking confidence intervals & sensitivity ranges...' },
      { icon: svgPen,   text: 'Composing response...' },
    ];

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

    let cancelSteps = false;
    (async () => {
      for (let i = 0; i < thinkingSteps.length; i++) {
        if (cancelSteps) break;
        const step = thinkingSteps[i];
        const stepEl = document.createElement('div');
        stepEl.className = 'chat-thinking-flow__step';
        stepEl.innerHTML = `<span class="chat-thinking-flow__step-icon">${step.icon}</span><span class="chat-thinking-flow__step-text">${step.text}</span>`;
        stepsContainer.appendChild(stepEl);
        messagesEl.scrollTop = messagesEl.scrollHeight;
        await delay(700);
        if (!cancelSteps) {
          stepEl.classList.add('done');
          stepEl.querySelector('.chat-thinking-flow__step-text').textContent = step.text.replace('...', ' — done');
        }
      }
    })();

    let aiMsg = null;
    let textEl = null;

    const onFirstDelta = () => {
      cancelSteps = true;
      thinkingEl.remove();
      aiMsg = document.createElement('div');
      aiMsg.className = 'report-chat__msg report-chat__msg--ai';
      aiMsg.innerHTML = `
        <div class="report-chat__msg-avatar">LK</div>
        <div class="report-chat__msg-content">
          <div class="report-chat__msg-name">Loka AI</div>
          <div class="report-chat__msg-text"></div>
        </div>
      `;
      messagesEl.appendChild(aiMsg);
      textEl = aiMsg.querySelector('.report-chat__msg-text');
      textEl.style.whiteSpace = 'pre-wrap';
    };

    const onDelta = (delta) => {
      if (!textEl) return;
      textEl.append(delta);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    };

    try {
      await streamChatApi(llmQuestion, { onFirstDelta, onDelta });
    } catch (err) {
      cancelSteps = true;
      if (thinkingEl.parentNode) thinkingEl.remove();
      const errMsg = document.createElement('div');
      errMsg.className = 'report-chat__msg report-chat__msg--ai';
      errMsg.innerHTML = `
        <div class="report-chat__msg-avatar">LK</div>
        <div class="report-chat__msg-content">
          <div class="report-chat__msg-name">Loka AI</div>
          <div class="report-chat__msg-text" style="color:#c33;">Sorry, I couldn't reach the analysis backend. (${err.message})</div>
        </div>
      `;
      messagesEl.appendChild(errMsg);
    }
    messagesEl.scrollTop = messagesEl.scrollHeight;
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

  // Mount the analytics panels inline inside the paper. Keep a handle so
  // _runAnimation / _loadProject can forward their hooks to this section.
  const analyticsSection = createAnalyticsSection();
  const analyticsMount = el.querySelector('#report-analytics-mount');
  if (analyticsMount) analyticsMount.appendChild(analyticsSection.element);

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
    const miniCanvas = el.querySelector('#report-mini-chart');
    if (miniCanvas) drawMiniChart(miniCanvas);
    // Fire the embedded analytics animation (map + 4 charts)
    if (analyticsSection.runAnimation) {
      analyticsSection.runAnimation().catch((err) =>
        console.warn('analytics section animation failed:', err)
      );
    }
    // Hydrate any inline chart placeholders that the real-mode consulting
    // template paper might have inserted.
    hydrateInlineCharts(el.querySelector('#report-paper'), cachedAnalytics);
  };

  /**
   * Real-mode hook — fetch /api/project/<id>/data, swap the paper
   * innerHTML to the consulting-template layout with role badges and
   * inline chart placeholders, then hydrate charts and reset chat.
   */
  el._loadProject = async (projectId) => {
    if (!projectId) return;
    currentProjectId = projectId;
    const paperEl = el.querySelector('#report-paper');
    const loadingBanner = `
      <div style="padding:40px;text-align:center;color:var(--text-secondary);">
        <div style="font-size:14px;margin-bottom:8px;">Loading project ${projectId}...</div>
        <div style="font-size:12px;">Fetching analysis results from backend</div>
      </div>`;
    paperEl.innerHTML = loadingBanner;

    try {
      const data = await fetchProjectData(projectId);
      const adapted = adaptReportForFrontend(data);
      reportContent = adapted;
      cachedAnalytics = data.analytics || null;
      chatHistory.length = 0;

      // Re-render the paper div using the consulting-template layout
      paperEl.innerHTML = buildConsultingPaperHtml(reportContent);

      // Hydrate the [[chart:xxx]] inline placeholders
      hydrateInlineCharts(paperEl, cachedAnalytics);

      // Re-bind the restart button (innerHTML wiped the handler)
      const restart = paperEl.querySelector('#btn-restart');
      if (restart) restart.addEventListener('click', () => {
        window.location.hash = '';
        window.location.reload();
      });

      // Re-bind TOC clicks
      paperEl.querySelectorAll('.report-toc__item').forEach(item => {
        item.addEventListener('click', (e) => {
          e.preventDefault();
          const target = paperEl.querySelector(item.getAttribute('href'));
          if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      });

      // Reveal all sections immediately
      paperEl.querySelectorAll('[data-reveal]').forEach(section => {
        section.classList.add('visible');
        section.style.opacity = '1';
        section.style.transform = 'translateY(0)';
        section.style.transition = 'all 0.35s ease';
      });

      // Re-insert the analytics section (paper.innerHTML wiped its mount).
      // Appending it after the last data-reveal keeps it inside the paper
      // scroll column, directly before the global report actions.
      const analyticsWrap = document.createElement('div');
      analyticsWrap.className = 'report-section report-section--analytics';
      analyticsWrap.id = 'analytics';
      analyticsWrap.innerHTML = `
        <div class="report-section__title"><span class="mono">§</span>Quantitative Analytics</div>
        <div class="report-section__body">
          <p style="color:var(--text-secondary);font-size:13px;margin:0 0 14px;">
            Interactive dashboards derived from the multi-agent simulation.
          </p>
        </div>
      `;
      analyticsWrap.appendChild(analyticsSection.element);
      const actionsEl = paperEl.querySelector('.report-actions');
      if (actionsEl) actionsEl.parentNode.insertBefore(analyticsWrap, actionsEl);
      else paperEl.appendChild(analyticsWrap);

      // Hydrate the analytics section with backend data and fire its
      // chart animation so the embedded map + 4 charts match this project.
      if (analyticsSection.loadProject) {
        try { await analyticsSection.loadProject(projectId); } catch (e) { /* no-op */ }
      }
      if (analyticsSection.runAnimation) {
        analyticsSection.runAnimation().catch((err) =>
          console.warn('analytics section animation failed:', err)
        );
      }

      // Reset chat panel to a fresh greeting
      const messagesEl = el.querySelector('#report-chat-messages');
      if (messagesEl) {
        messagesEl.innerHTML = `
          <div class="report-chat__msg report-chat__msg--ai">
            <div class="report-chat__msg-avatar">LK</div>
            <div class="report-chat__msg-content">
              <div class="report-chat__msg-name">Loka AI</div>
              I've loaded your analysis for project <code>${projectId}</code>. Ask me anything about the findings, methodology, or implications.
            </div>
          </div>`;
      }
    } catch (err) {
      paperEl.innerHTML = `
        <div style="padding:40px;text-align:center;">
          <div style="color:#c33;font-size:14px;margin-bottom:8px;">Failed to load project</div>
          <div style="color:var(--text-secondary);font-size:12px;font-family:var(--font-mono);">${err.message}</div>
        </div>`;
    }
  };

  return el;
}

/**
 * Build the consulting-template paper HTML for real-mode reports.
 * Each section gets a coloured role badge above its title, and
 * [[chart:xxx]] placeholders in the body are kept as divs that
 * hydrateInlineCharts will render into canvases.
 */
function buildConsultingPaperHtml(content) {
  const sectionHtml = (s) => {
    const role = s.role;
    const badge = role && ROLE_LABELS[role]
      ? `<div class="report-role-badge" style="--role-color:${ROLE_COLORS[role] || '#9B9A97'}">
           <span class="report-role-badge__dot"></span>
           <span class="report-role-badge__name">${ROLE_LABELS[role]}</span>
         </div>`
      : '';
    return `
      <div class="report-section" data-reveal id="section-${s.num}">
        ${badge}
        <div class="report-section__title"><span class="mono" style="margin-right: 8px;">${s.num}.</span>${s.title}</div>
        <div class="report-section__body">${s.body || ''}</div>
      </div>`;
  };

  return `
    <div class="report-header anim-fade-up">
      <div class="report-header__left">
        <div class="report-header__logo"><span class="accent-text">Loka</span> Consulting</div>
        <div class="report-header__meta">
          Model: ${content.model || 'Loka Multi-Agent Simulation'}<br/>
          Engine: Loka Consulting AI
        </div>
      </div>
      <div class="report-header__right">
        <div class="report-header__classification">${content.classification || 'CONFIDENTIAL'}</div>
        <div class="report-header__date">${content.date || ''}</div>
      </div>
    </div>

    <div class="report-paper-title" data-reveal>
      <h1>${content.title || ''}</h1>
      <p class="report-paper-subtitle">${content.subtitle || ''}</p>
      <div class="report-paper-authors">Loka Consulting AI · Multi-Agent Simulation Analysis</div>
    </div>

    <div class="report-toc" data-reveal>
      <div class="report-toc__title">Table of Contents</div>
      <div class="report-toc__items">
        <a class="report-toc__item" href="#abstract">Executive Brief</a>
        ${(content.sections || []).map(s => `<a class="report-toc__item" href="#section-${s.num}"><span class="mono">${s.num}</span> ${s.title}</a>`).join('')}
      </div>
    </div>

    <div class="report-section" data-reveal id="abstract">
      <div class="report-section__title">Executive Brief</div>
      <div class="report-section__body report-abstract">${content.abstract || ''}</div>
    </div>

    ${(content.sections || []).map(sectionHtml).join('')}

    <div class="report-actions anim-fade-up">
      <button class="btn btn--secondary" id="btn-restart">New Analysis</button>
    </div>
  `;
}

/**
 * Scan a freshly rendered paper element for `.inline-chart[data-chart=...]`
 * placeholders and draw a canvas into each one using the analytics payload
 * cached from /api/project/<id>/data.
 */
function hydrateInlineCharts(paperEl, analytics) {
  if (!paperEl || !analytics) return;
  const placeholders = paperEl.querySelectorAll('.inline-chart');
  placeholders.forEach((div) => {
    const chartId = div.dataset.chart;
    if (!chartId) return;
    // Skip if already hydrated (caption + canvas children present)
    if (div.querySelector('canvas')) return;
    div.innerHTML = `
      <div class="inline-chart__caption">Figure — ${CHART_TITLES[chartId] || chartId}</div>
      <canvas class="inline-chart__canvas"></canvas>
    `;
    const canvas = div.querySelector('canvas');
    requestAnimationFrame(() => {
      try {
        renderInlineChart(chartId, canvas, analytics);
      } catch (err) {
        console.warn('inline chart render failed:', chartId, err);
      }
    });
  });
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

  const data = [100, 102, 108, 126, 182, 145, 120, 108, 104];
  const upper = [100, 106, 118, 142, 210, 168, 135, 118, 112];
  const lower = [100, 98, 100, 114, 158, 128, 108, 100, 97];
  const baseline = [100, 100.3, 100.6, 100.8, 101, 101.2, 101, 100.8, 101];
  const labels = ['W-4', 'W-3', 'W-2', 'W-1', 'Event', 'W+1', 'W+2', 'W+3', 'W+4'];
  const pad = { top: 16, right: 20, bottom: 28, left: 40 };
  const cw = w - pad.left - pad.right;
  const ch = h - pad.top - pad.bottom;
  const maxVal = 230, minVal = 85;

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
  ctx.fillText('+80% GDP uplift at peak', getX(4), getY(182) - 10);
}
