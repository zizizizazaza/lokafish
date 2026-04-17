// Participation mode selector + decision-point picker.
//
// Drops onto the input screen. Renders:
//   - 3 mode cards (Sandbox / Community / User) — radio behaviour
//   - A picker for decision points, revealed when User mode is selected
//   - A "community as reference" toggle, shown only in User mode
//
// State is persisted via lib/participation_state.js so refreshing the
// page or navigating back to input doesn't clear the user's picks.

import {
  PARTICIPATION_MODES,
  MODE_META,
  DECISION_POINTS,
} from '../data/decision_points.js';
import {
  getConfig,
  setMode,
  toggleDecisionPoint,
  setSelectedDecisionPoints,
  setCommunityAsReference,
} from '../lib/participation_state.js';

export function createParticipationMode({ onChange } = {}) {
  const el = document.createElement('div');
  el.className = 'participation';

  el.innerHTML = `
    <div class="participation__header">
      <div>
        <div class="participation__title">Participation mode</div>
        <div class="participation__subtitle">Decide who drives the key checkpoints in your simulation.</div>
      </div>
    </div>

    <div class="participation__modes" id="participation-modes"></div>

    <div class="participation__picker" id="participation-picker">
      <div class="participation__picker-head">
        <div>
          <div class="participation__picker-title">Checkpoints you want to weigh in on</div>
          <div class="participation__picker-subtitle">
            We default to the four highest-leverage nodes. You can toggle any of the 7.
          </div>
        </div>
        <div class="participation__picker-actions">
          <button type="button" class="btn btn--ghost btn--sm" data-action="pick-defaults">Defaults</button>
          <button type="button" class="btn btn--ghost btn--sm" data-action="pick-all">Select all</button>
          <button type="button" class="btn btn--ghost btn--sm" data-action="pick-none">Clear</button>
        </div>
      </div>

      <ul class="dp-list" id="dp-list"></ul>

      <label class="participation__ref" id="participation-ref">
        <input type="checkbox" id="community-ref" />
        <span>
          <strong>Show community votes as reference</strong> — they appear on each decision card, but you still have final say.
        </span>
      </label>
    </div>
  `;

  const modesWrap = el.querySelector('#participation-modes');
  const pickerEl  = el.querySelector('#participation-picker');
  const dpListEl  = el.querySelector('#dp-list');
  const refInput  = el.querySelector('#community-ref');

  // ---------- Build mode cards once ----------
  const cardEls = {};
  Object.values(MODE_META).forEach(meta => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'participation-mode-card';
    card.dataset.mode = meta.id;
    card.innerHTML = `
      <div class="participation-mode-card__top">
        <span class="participation-mode-card__icon">${meta.icon}</span>
        <span class="participation-mode-card__check">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </span>
      </div>
      <div class="participation-mode-card__title">${meta.title}</div>
      <div class="participation-mode-card__desc">${meta.subtitle}</div>
      <div class="participation-mode-card__badge">${meta.id}</div>
    `;
    card.addEventListener('click', () => {
      const cfg = setMode(meta.id);
      renderAll(cfg);
      onChange?.(cfg);
    });
    cardEls[meta.id] = card;
    modesWrap.appendChild(card);
  });

  function renderModes(active) {
    Object.entries(cardEls).forEach(([id, card]) => {
      card.classList.toggle('active', id === active);
    });
  }

  // ---------- Render DP list ----------
  function renderPicker(cfg) {
    const isUser = cfg.mode === PARTICIPATION_MODES.USER;
    pickerEl.classList.toggle('open', isUser);
    if (!isUser) return;

    dpListEl.innerHTML = '';
    DECISION_POINTS.forEach(dp => {
      const checked = cfg.selectedDecisionPoints.includes(dp.id);
      const li = document.createElement('li');
      li.className = 'dp-item' + (checked ? ' active' : '');
      li.innerHTML = `
        <label class="dp-item__row">
          <input type="checkbox" ${checked ? 'checked' : ''} data-dp-id="${dp.id}" />
          <span class="dp-item__stage">S${dp.stage}</span>
          <span class="dp-item__body">
            <span class="dp-item__title">${dp.id} · ${dp.title}</span>
            <span class="dp-item__desc">${dp.description}</span>
          </span>
        </label>
      `;
      li.querySelector('input').addEventListener('change', () => {
        const next = toggleDecisionPoint(dp.id);
        renderPicker(next);
        onChange?.(next);
      });
      dpListEl.appendChild(li);
    });

    refInput.checked = !!cfg.communityAsReference;
  }

  function renderAll(cfg) {
    renderModes(cfg.mode);
    renderPicker(cfg);
  }

  // ---------- Picker action buttons ----------
  pickerEl.querySelector('[data-action="pick-defaults"]').addEventListener('click', () => {
    const defaults = DECISION_POINTS.filter(d => d.selectableByDefault).map(d => d.id);
    const cfg = setSelectedDecisionPoints(defaults);
    renderPicker(cfg);
    onChange?.(cfg);
  });
  pickerEl.querySelector('[data-action="pick-all"]').addEventListener('click', () => {
    const all = DECISION_POINTS.map(d => d.id);
    const cfg = setSelectedDecisionPoints(all);
    renderPicker(cfg);
    onChange?.(cfg);
  });
  pickerEl.querySelector('[data-action="pick-none"]').addEventListener('click', () => {
    const cfg = setSelectedDecisionPoints([]);
    renderPicker(cfg);
    onChange?.(cfg);
  });

  refInput.addEventListener('change', () => {
    const cfg = setCommunityAsReference(refInput.checked);
    onChange?.(cfg);
  });

  // ---------- Initial render ----------
  renderAll(getConfig());

  return el;
}
