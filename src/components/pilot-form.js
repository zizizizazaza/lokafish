// Shared "Request a pilot" modal — opened from the homepage hero CTA and the
// in-demo CTA. Single instance enforced; closes on backdrop, X, or Escape.

export function openPilotForm() {
  if (document.querySelector('.pilot-modal')) return;
  const overlay = document.createElement('div');
  overlay.className = 'pilot-modal';
  overlay.innerHTML = `
    <div class="pilot-modal__backdrop"></div>
    <div class="pilot-modal__card" role="dialog" aria-modal="true" aria-label="Request a pilot">
      <button class="pilot-modal__close" aria-label="Close">×</button>
      <div class="pilot-modal__head">
        <div class="pilot-modal__eyebrow">Get in touch</div>
        <h3 class="pilot-modal__title">Request a pilot.</h3>
        <p class="pilot-modal__sub">Tell us about the scenario you'd like to simulate and we'll be in touch within two business days. Or email <a href="mailto:hello@loka.inc">hello@loka.inc</a>.</p>
      </div>
      <form class="pilot-form" novalidate>
        <label class="pilot-field">
          <span class="pilot-field__label">I'm reaching out about <i>*</i></span>
          <select name="reason" required>
            <option value="">Select one…</option>
            <option>Simulation pilot</option>
            <option>Strategic partnership</option>
            <option>Research collaboration</option>
            <option>Investor inquiry</option>
            <option>Other</option>
          </select>
        </label>
        <div class="pilot-row">
          <label class="pilot-field">
            <span class="pilot-field__label">Name</span>
            <input name="name" type="text" autocomplete="name"/>
          </label>
          <label class="pilot-field">
            <span class="pilot-field__label">Email <i>*</i></span>
            <input name="email" type="email" required autocomplete="email"/>
          </label>
        </div>
        <label class="pilot-field">
          <span class="pilot-field__label">Organization</span>
          <input name="org" type="text" autocomplete="organization"/>
        </label>
        <label class="pilot-field">
          <span class="pilot-field__label">Message <i>*</i></span>
          <textarea name="message" rows="4" required placeholder="Briefly describe the scenario, decision, or research question you'd like to explore."></textarea>
        </label>
        <div class="pilot-form__actions">
          <button type="submit" class="pilot-form__submit">Submit inquiry →</button>
        </div>
        <div class="pilot-form__success" hidden>Thanks — we'll be in touch shortly.</div>
      </form>
    </div>
  `;
  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';

  const close = () => {
    overlay.classList.add('is-leaving');
    setTimeout(() => {
      overlay.remove();
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
    }, 180);
  };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  overlay.querySelector('.pilot-modal__backdrop').addEventListener('click', close);
  overlay.querySelector('.pilot-modal__close').addEventListener('click', close);

  const form = overlay.querySelector('.pilot-form');
  const success = overlay.querySelector('.pilot-form__success');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!form.checkValidity()) { form.reportValidity(); return; }
    form.querySelectorAll('input, select, textarea, button').forEach(el => el.disabled = true);
    success.hidden = false;
    setTimeout(close, 1400);
  });

  requestAnimationFrame(() => overlay.classList.add('is-open'));
}
