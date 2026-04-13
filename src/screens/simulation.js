// Screen 4: World Simulation — Loka

import { simulationPosts, chatResponses, metricsTimeline, metricsBaseline } from '../data/simulation.js';
import { Typewriter } from '../utils/typewriter.js';
import { delay } from '../utils/animation.js';

export function createSimulation(onComplete) {
  const el = document.createElement('div');
  el.className = 'screen sim-screen';
  el.id = 'screen-simulation';

  const suggestions = Object.keys(chatResponses);

  el.innerHTML = `
    <div class="sim-screen__top-bar">
      <div class="sim-screen__round">
        <span style="color: var(--text-muted);">Simulation</span> 
        Round <span id="round-counter">0</span> / 120
      </div>
      <div class="sim-screen__speed">
        <span>Speed:</span>
        <input type="range" min="1" max="10" value="5" id="speed-slider" />
        <span id="speed-label">5×</span>
      </div>
      <div>
        <button class="btn btn--sm btn--secondary" id="btn-skip-sim">Skip to Results →</button>
      </div>
    </div>

    <div class="sim-screen__body">
      <div class="sim-screen__feed" id="sim-feed">
        <div style="text-align: center; padding: 40px; color: var(--text-muted);">
          <div style="font-size: 14px;">Initializing world simulation...</div>
        </div>
      </div>
      
      <div class="sim-screen__chat">
        <div class="sim-screen__chat-header">Query the Model</div>
        <div class="sim-screen__chat-messages" id="chat-messages">
          <div class="chat-msg chat-msg--ai">
            Welcome to the Loka simulation environment. I'm monitoring 2,000 agents across 10 demographic categories. Ask me about economic projections, industry impacts, or strategic recommendations.
          </div>
        </div>
        <div class="sim-screen__chat-suggestions" id="chat-suggestions">
          ${suggestions.map(s => `<button class="chat-suggestion">${s}</button>`).join('')}
        </div>
        <div class="sim-screen__chat-input">
          <input type="text" placeholder="Ask the model..." id="chat-input" />
          <button class="btn btn--primary btn--sm" id="btn-chat-send">→</button>
        </div>
      </div>
    </div>

    <div class="sim-screen__metrics">
      <div class="sim-metric">
        <div class="sim-metric__label">TOURISM RECEIPTS</div>
        <div class="sim-metric__value accent-text" id="metric-gdp">S$0M</div>
        <div class="sim-metric__delta" style="color: var(--green);" id="metric-gdp-delta">Calculating...</div>
      </div>
      <div class="sim-metric">
        <div class="sim-metric__label">TEMP. JOBS</div>
        <div class="sim-metric__value gold-text" id="metric-jobs">0</div>
        <div class="sim-metric__delta" style="color: var(--green);" id="metric-jobs-delta">Ramping up</div>
      </div>
      <div class="sim-metric">
        <div class="sim-metric__label">HOTEL OCCUPANCY</div>
        <div class="sim-metric__value" style="color: var(--text-primary);" id="metric-occupancy">75%</div>
        <div class="sim-metric__delta" style="color: var(--green);" id="metric-occ-delta">Baseline</div>
      </div>
      <div class="sim-metric">
        <div class="sim-metric__label">CHANGI PAX (WK)</div>
        <div class="sim-metric__value" style="color: var(--text-primary);" id="metric-flights">175K</div>
        <div class="sim-metric__delta" style="color: var(--green);" id="metric-flights-delta">Monitoring</div>
      </div>
    </div>
  `;

  el.querySelector('#speed-slider').addEventListener('input', (e) => {
    el.querySelector('#speed-label').textContent = e.target.value + '×';
  });

  function sendChat(question) {
    const messagesEl = el.querySelector('#chat-messages');
    const userMsg = document.createElement('div');
    userMsg.className = 'chat-msg chat-msg--user';
    userMsg.textContent = question;
    messagesEl.appendChild(userMsg);
    messagesEl.scrollTop = messagesEl.scrollHeight;

    const response = chatResponses[question] || 'Processing query across active agents. Preliminary results suggest reviewing the analytics dashboard for detailed breakdowns. Confidence intervals will sharpen as simulation rounds complete.';

    // Build thinking steps — using inline SVG icons (no emoji)
    const svgSearch = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>';
    const svgData = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>';
    const svgModel = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>';
    const svgCalc = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>';
    const svgPen = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>';
    const thinkingSteps = [
      { icon: svgSearch, text: 'Searching simulation knowledge base...', duration: 800 },
      { icon: svgData, text: 'Querying agent behavioral data (2,000 agents × 120 rounds)...', duration: 1200 },
      { icon: svgModel, text: 'Cross-referencing I-O model & CGE equilibrium outputs...', duration: 1000 },
      { icon: svgCalc, text: 'Running Monte Carlo validation (n=10,000)...', duration: 900 },
      { icon: svgPen, text: 'Synthesizing analysis...', duration: 600 },
    ];

    // Create the thinking container
    const thinkingMsg = document.createElement('div');
    thinkingMsg.className = 'chat-msg chat-msg--ai';
    thinkingMsg.innerHTML = `
      <div class="chat-thinking-flow">
        <div class="chat-thinking-flow__header">
          <span class="chat-thinking-flow__spinner"></span>
          <span>Analyzing query...</span>
        </div>
        <div class="chat-thinking-flow__steps"></div>
      </div>
    `;
    messagesEl.appendChild(thinkingMsg);
    messagesEl.scrollTop = messagesEl.scrollHeight;

    const stepsContainer = thinkingMsg.querySelector('.chat-thinking-flow__steps');

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

    // After all steps done, replace with actual response
    setTimeout(() => {
      thinkingMsg.remove();
      const aiMsg = document.createElement('div');
      aiMsg.className = 'chat-msg chat-msg--ai';
      aiMsg.style.whiteSpace = 'pre-wrap';
      messagesEl.appendChild(aiMsg);
      messagesEl.scrollTop = messagesEl.scrollHeight;
      const tw = new Typewriter(aiMsg, { speed: 8, html: false });
      tw.type(response).then(() => { messagesEl.scrollTop = messagesEl.scrollHeight; });
    }, totalDelay + 500);
  }

  el.querySelectorAll('.chat-suggestion').forEach(btn => {
    btn.addEventListener('click', () => { sendChat(btn.textContent); btn.remove(); });
  });
  el.querySelector('#btn-chat-send').addEventListener('click', () => {
    const input = el.querySelector('#chat-input');
    if (input.value.trim()) { sendChat(input.value.trim()); input.value = ''; }
  });
  el.querySelector('#chat-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') el.querySelector('#btn-chat-send').click();
  });
  el.querySelector('#btn-skip-sim').addEventListener('click', onComplete);

  el._runAnimation = async () => {
    const feedEl = el.querySelector('#sim-feed');
    const roundEl = el.querySelector('#round-counter');
    await delay(800);
    feedEl.innerHTML = '';

    for (let i = 0; i < simulationPosts.length; i++) {
      const post = simulationPosts[i];
      const roundNum = Math.round(((i + 1) / simulationPosts.length) * 120);
      roundEl.textContent = roundNum;

      const metricIdx = Math.min(Math.floor((i / simulationPosts.length) * metricsTimeline.length), metricsTimeline.length - 1);
      const m = metricsTimeline[metricIdx];
      el.querySelector('#metric-gdp').textContent = `S$${m.gdp[0]}–${m.gdp[1]}M`;
      el.querySelector('#metric-gdp-delta').textContent = `80% CI range`;
      el.querySelector('#metric-jobs').textContent = `${m.jobs[0].toLocaleString()}–${m.jobs[1].toLocaleString()}`;
      el.querySelector('#metric-jobs-delta').textContent = `projected range`;
      el.querySelector('#metric-occupancy').textContent = `${m.occupancy[0]}–${m.occupancy[1]}%`;
      el.querySelector('#metric-occ-delta').textContent = `+${m.occupancy[0] - metricsBaseline.occupancy}–${m.occupancy[1] - metricsBaseline.occupancy}pp vs baseline`;
      const fLowK = Math.round(m.flights[0] / 1000);
      const fHighK = Math.round(m.flights[1] / 1000);
      el.querySelector('#metric-flights').textContent = `${fLowK}–${fHighK}K`;
      const fLow = Math.round(((m.flights[0] - metricsBaseline.flights) / metricsBaseline.flights) * 100);
      const fHigh = Math.round(((m.flights[1] - metricsBaseline.flights) / metricsBaseline.flights) * 100);
      el.querySelector('#metric-flights-delta').textContent = `+${fLow}–${fHigh}% vs normal`;

      const postEl = document.createElement('div');
      postEl.className = 'sim-post';
      const avatarContent = post.avatar.startsWith('http')
        ? `<img src="${post.avatar}" alt="${post.handle}" style="width:100%;height:100%;border-radius:50%;" />`
        : post.avatar;
      postEl.innerHTML = `
        <div class="sim-post__avatar">${avatarContent}</div>
        <div class="sim-post__content">
          <div class="sim-post__handle">${post.handle} <span>@${post.username} · ${post.time}</span></div>
          <div class="sim-post__text">${post.text}</div>
          <div class="sim-post__metrics">
            <span>↑ ${post.likes.toLocaleString()}</span>
            <span>↻ ${post.reposts.toLocaleString()}</span>
            <span>Sentiment: ${post.sentiment}</span>
          </div>
        </div>
      `;
      feedEl.appendChild(postEl);
      feedEl.scrollTop = feedEl.scrollHeight;
      await delay(2500);
    }

    roundEl.textContent = '120';
    await delay(1000);

    const completeMsg = document.createElement('div');
    completeMsg.className = 'sim-post';
    completeMsg.style.borderColor = 'var(--blue)';
    completeMsg.innerHTML = `
      <div class="sim-post__avatar">✓</div>
      <div class="sim-post__content">
        <div class="sim-post__handle" style="color: var(--blue);">Loka Engine</div>
        <div class="sim-post__text" style="color: var(--text-primary);">
          Simulation complete. 120 rounds processed across 2,000 agents. Ready to generate analytics and report.
        </div>
        <div style="margin-top: 10px;">
          <button class="btn btn--primary btn--sm" id="btn-view-analytics">View Analytics →</button>
        </div>
      </div>
    `;
    feedEl.appendChild(completeMsg);
    feedEl.scrollTop = feedEl.scrollHeight;
    completeMsg.querySelector('#btn-view-analytics').addEventListener('click', onComplete);
  };

  return el;
}
