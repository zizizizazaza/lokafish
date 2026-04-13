// Report — Two-column: academic paper (left) + AI chat (right)

import { reportContent as staticReportContent } from '../data/report.js';
import { delay } from '../utils/animation.js';
import { fetchProjectData, adaptReportForFrontend } from '../lib/project_client.js';

// The screen starts out rendering the static Taylor Swift snapshot. If
// createReport's `_loadProject(id)` hook is called later, we fetch the
// project from the backend and swap the rendered content in place.
let reportContent = staticReportContent;

// Suggested questions that seed the chat — content comes from the LLM at runtime.
const chatSuggestionQuestions = [
  'Summarize the key findings',
  'What are the main risks?',
  'How does this compare to actual results?',
  'Explain the methodology',
];

// Strip HTML tags so the report context stays compact and LLM-friendly.
function stripHtml(s) {
  return String(s || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

// Build a compact text version of the report to use as LLM context.
// We keep the abstract in full but trim each section body to ~600 chars
// so the system prompt does not blow past the model's context window.
function buildReportContext() {
  const parts = [];
  parts.push(`TITLE: ${reportContent.title}`);
  if (reportContent.subtitle) parts.push(`SUBTITLE: ${reportContent.subtitle}`);
  parts.push(`\nABSTRACT:\n${stripHtml(reportContent.abstract)}`);
  parts.push(`\nSECTIONS:`);
  for (const s of reportContent.sections) {
    const body = stripHtml(s.body);
    const trimmed = body.length > 600 ? body.slice(0, 600) + '…' : body;
    parts.push(`\n[${s.num}] ${s.title}\n${trimmed}`);
  }
  if (reportContent.risks && reportContent.risks.length) {
    parts.push(`\nRISK FACTORS:\n${reportContent.risks.map(r => '- ' + stripHtml(r)).join('\n')}`);
  }
  return parts.join('\n');
}

// Conversation history for this chat session. Pushed/popped as the user
// interacts; the full array is sent to /api/chat/stream each turn so the
// LLM remembers prior messages.
const chatHistory = [];

const SYSTEM_PROMPT =
  'You are Loka AI, an analyst embedded in the Loka research report. ' +
  "Answer the user's questions using the REPORT CONTEXT below. " +
  'Cite specific numbers, sections, or findings whenever possible. ' +
  'Keep answers under 250 words unless the user asks for more detail. ' +
  'If the report does not contain the answer, say so plainly.';

/**
 * Stream a chat response from /api/chat/stream and call onDelta(text)
 * for every text fragment. Returns a promise that resolves to the full
 * concatenated reply when the stream finishes.
 *
 * The user's message is appended to chatHistory before sending; the
 * assistant reply is appended on success.
 */
async function streamChatApi(userMessage, { onFirstDelta, onDelta }) {
  chatHistory.push({ role: 'user', content: userMessage });

  const res = await fetch('/api/chat/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: chatHistory,
      // Rebuild context each turn so that _loadProject can swap the
      // underlying report and the chat will see the new content.
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

    // SSE events are separated by a blank line. Process each complete event.
    let sep;
    while ((sep = buf.indexOf('\n\n')) !== -1) {
      const eventBlock = buf.slice(0, sep);
      buf = buf.slice(sep + 2);

      // Each line within may start with "data: ". Concat data lines.
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

  // Stream ended without an explicit done marker — still commit history.
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

  // Chat functionality — calls real backend LLM (/api/chat) with conversation history.
  async function sendChat(question) {
    const messagesEl = el.querySelector('#report-chat-messages');

    // User message
    const userMsg = document.createElement('div');
    userMsg.className = 'report-chat__msg report-chat__msg--user';
    userMsg.innerHTML = `
      <div class="report-chat__msg-content">${question}</div>
    `;
    messagesEl.appendChild(userMsg);
    messagesEl.scrollTop = messagesEl.scrollHeight;

    // Build thinking steps — animated while the LLM call is in-flight.
    const svgDoc = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';
    const svgTable = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 3v18"/></svg>';
    const svgCheck = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>';
    const svgRuler = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>';
    const svgPen = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>';
    const thinkingSteps = [
      { icon: svgDoc, text: 'Scanning report sections & appendices...' },
      { icon: svgTable, text: 'Retrieving relevant data tables & figures...' },
      { icon: svgCheck, text: 'Cross-validating with simulation logs (120 rounds)...' },
      { icon: svgRuler, text: 'Checking confidence intervals & sensitivity ranges...' },
      { icon: svgPen, text: 'Composing response...' },
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

    // Reveal thinking steps with a steady cadence until the first token
    // arrives from the LLM. Then the thinking element gets replaced.
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

    // The streaming AI message bubble is created lazily on the first delta.
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
      await streamChatApi(question, { onFirstDelta, onDelta });
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

  /**
   * Swap the report content to one fetched from /api/project/<id>/data.
   * Called by main.js when the user completes a real-mode pipeline run.
   * Falls back to showing an error banner inside the paper div if fetch fails.
   */
  el._loadProject = async (projectId) => {
    if (!projectId) return;
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
      // Update module-level var so chat context uses the fresh report
      reportContent = adapted;
      // Reset chat history — it was about the previous report
      chatHistory.length = 0;

      // Re-render the paper div from the new reportContent
      paperEl.innerHTML = buildPaperHtml(reportContent);

      // Re-bind TOC clicks (innerHTML wiped the handlers)
      paperEl.querySelectorAll('.report-toc__item').forEach(item => {
        item.addEventListener('click', (e) => {
          e.preventDefault();
          const target = paperEl.querySelector(item.getAttribute('href'));
          if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      });

      // Animate reveal
      const sections = paperEl.querySelectorAll('[data-reveal]');
      for (const section of sections) {
        section.classList.add('visible');
        section.style.opacity = '1';
        section.style.transform = 'translateY(0)';
        section.style.transition = 'all 0.35s ease';
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
 * Build the inner HTML of the report paper div from a reportContent object.
 * Extracted so _loadProject can re-render the same template with new data.
 */
function buildPaperHtml(content) {
  return `
    <div class="report-header anim-fade-up">
      <div class="report-header__left">
        <div class="report-header__logo"><span class="accent-text">Loka</span> Research</div>
        <div class="report-header__meta">
          Model: ${content.model || 'Loka World Model Engine v1.0'}<br/>
          Engine: Loka World Model v1.0
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
      <div class="report-paper-authors">Loka World Model Engine v1.0 · Autonomous Multi-Agent Simulation</div>
    </div>

    <div class="report-toc" data-reveal>
      <div class="report-toc__title">Table of Contents</div>
      <div class="report-toc__items">
        <a class="report-toc__item" href="#abstract">Abstract</a>
        ${(content.sections || []).map(s => `<a class="report-toc__item" href="#section-${s.num}"><span class="mono">${s.num}</span> ${s.title}</a>`).join('')}
      </div>
    </div>

    <div class="report-section" data-reveal id="abstract">
      <div class="report-section__title">Abstract</div>
      <div class="report-section__body report-abstract">${content.abstract || ''}</div>
    </div>

    ${(content.sections || []).map(s => `
      <div class="report-section" data-reveal id="section-${s.num}">
        <div class="report-section__title"><span class="mono" style="margin-right: 8px;">${s.num}.</span>${s.title}</div>
        <div class="report-section__body">${s.body || ''}</div>
      </div>
    `).join('')}

    <div class="report-actions anim-fade-up">
      <button class="btn btn--secondary" id="btn-restart">New Analysis</button>
    </div>
  `;
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
