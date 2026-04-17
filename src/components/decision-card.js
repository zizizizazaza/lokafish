// Decision card — shown when the workflow pauses at a checkpoint.
//
// Three stacked panels (per the user's spec):
//   1. Agents' opinions — what each named agent voted for + one-line reasoning
//   2. Community vote — the option currently winning + full tally bars
//   3. Your decision — options + optional free-form note, "Confirm" commits
//
// Modes it supports:
//   - 'user'     : full interactive card (default), user submits
//   - 'community': informational preview (no user submission), just shows tally
//   - 'preview'  : same as user but no side effects; used for the sidebar preview
//
// The card exits with `onResolve({ optionId, note, source })` so the caller
// can drive the workflow state machine when we wire it up.

import {
  computeAgentConsensus,
  computeCommunityLeader,
} from '../data/decision_points.js';

export function createDecisionCard(dp, {
  mode = 'user',
  communityAsReference = true,
  onResolve,
  onSkip,
} = {}) {
  const el = document.createElement('div');
  el.className = 'decision-card';
  el.dataset.dpId = dp.id;

  const leader = computeCommunityLeader(dp);
  const consensus = computeAgentConsensus(dp);
  const communityTotal = leader?.total ?? 0;
  const showCommunity = mode === 'community' || (mode !== 'community' && communityAsReference);

  // Option lookup for label rendering.
  const byId = Object.fromEntries(dp.options.map(o => [o.id, o]));

  // ---------- Render ----------
  el.innerHTML = `
    <header class="decision-card__header">
      <div class="decision-card__stage">Stage ${dp.stage} · ${dp.stageName}</div>
      <div class="decision-card__id">${dp.id}</div>
    </header>
    <h3 class="decision-card__title">${dp.title}</h3>
    <p class="decision-card__desc">${dp.description}</p>

    <section class="decision-card__section">
      <div class="decision-card__section-head">
        <span class="decision-card__section-title">Agent opinions</span>
        <span class="decision-card__section-meta">
          ${consensus ? `Consensus: <b>${consensus.option?.label ?? consensus.optionId}</b> · ${consensus.count}/${consensus.total}` : 'No agents weighed in'}
        </span>
      </div>
      <ul class="agent-opinions"></ul>
    </section>

    ${showCommunity ? `
    <section class="decision-card__section">
      <div class="decision-card__section-head">
        <span class="decision-card__section-title">
          Community vote
          ${mode !== 'community' ? '<span class="pill pill--muted">reference only</span>' : ''}
        </span>
        <span class="decision-card__section-meta">${communityTotal} votes</span>
      </div>
      <ul class="community-tally"></ul>
      ${leader ? `<div class="decision-card__leader">Top pick: <b>${leader.option?.label ?? leader.optionId}</b> · ${leader.pct}%</div>` : ''}
    </section>` : ''}

    ${mode !== 'community' ? `
    <section class="decision-card__section decision-card__section--action">
      <div class="decision-card__section-head">
        <span class="decision-card__section-title">Your decision</span>
      </div>
      <ul class="user-options"></ul>
      <textarea class="decision-card__note" id="decision-note"
        placeholder="Optional — why did you pick this? (will be quoted in the final report)"></textarea>
      <div class="decision-card__actions">
        <button type="button" class="btn btn--ghost btn--sm" data-action="skip">Let agents decide</button>
        <button type="button" class="btn btn--primary btn--sm" data-action="submit" disabled>Confirm decision</button>
      </div>
    </section>` : ''}
  `;

  // ---------- Agent opinions list ----------
  const agentUl = el.querySelector('.agent-opinions');
  dp.agentOpinions.forEach(op => {
    const opt = byId[op.stance];
    const li = document.createElement('li');
    li.className = 'agent-opinion';
    li.innerHTML = `
      <span class="agent-opinion__avatar">${op.agent.slice(0, 2).toUpperCase()}</span>
      <div class="agent-opinion__body">
        <div class="agent-opinion__head">
          <span class="agent-opinion__name">${op.agent}</span>
          <span class="agent-opinion__stance">votes <b>${opt?.label ?? op.stance}</b></span>
        </div>
        <div class="agent-opinion__reason">"${op.reasoning}"</div>
      </div>
    `;
    agentUl.appendChild(li);
  });

  // ---------- Community tally ----------
  if (showCommunity) {
    const tallyUl = el.querySelector('.community-tally');
    dp.options.forEach(opt => {
      const votes = dp.communityVotes[opt.id] || 0;
      const pct = communityTotal ? Math.round((votes / communityTotal) * 100) : 0;
      const isLeader = leader && leader.optionId === opt.id;
      const li = document.createElement('li');
      li.className = 'community-bar' + (isLeader ? ' community-bar--leader' : '');
      li.innerHTML = `
        <div class="community-bar__head">
          <span class="community-bar__label">${opt.label}</span>
          <span class="community-bar__pct">${pct}%<span class="community-bar__votes"> · ${votes}</span></span>
        </div>
        <div class="community-bar__track"><div class="community-bar__fill" style="width:${pct}%"></div></div>
      `;
      tallyUl.appendChild(li);
    });
  }

  // ---------- User decision options ----------
  let selectedOptionId = null;
  if (mode !== 'community') {
    const userUl = el.querySelector('.user-options');
    const submitBtn = el.querySelector('[data-action="submit"]');
    const skipBtn   = el.querySelector('[data-action="skip"]');
    const noteEl    = el.querySelector('#decision-note');

    dp.options.forEach(opt => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'user-option';
      btn.dataset.optionId = opt.id;
      btn.innerHTML = `
        <span class="user-option__radio"></span>
        <span class="user-option__body">
          <span class="user-option__label">${opt.label}</span>
          <span class="user-option__summary">${opt.summary}</span>
        </span>
      `;
      btn.addEventListener('click', () => {
        selectedOptionId = opt.id;
        userUl.querySelectorAll('.user-option').forEach(b => b.classList.toggle('active', b === btn));
        submitBtn.disabled = false;
      });
      const li = document.createElement('li');
      li.appendChild(btn);
      userUl.appendChild(li);
    });

    submitBtn.addEventListener('click', () => {
      if (!selectedOptionId) return;
      onResolve?.({
        dpId: dp.id,
        optionId: selectedOptionId,
        note: noteEl.value.trim(),
        source: 'user',
      });
    });

    skipBtn.addEventListener('click', () => {
      const fallback = consensus?.optionId || leader?.optionId || dp.options[0]?.id;
      onSkip?.({
        dpId: dp.id,
        optionId: fallback,
        source: 'agent-fallback',
      });
    });
  }

  return el;
}
