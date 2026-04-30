// Loka — Main Application Router

import './style.css';
import { createLanding } from './screens/landing.js';
import { createInput } from './screens/input.js';
import { createPlan } from './screens/plan.js';
import { createAgents } from './screens/agents.js';
import { createReport } from './screens/report.js';

const app = document.querySelector('#app');
let currentScreen = 0;
const screens = [];

// Flow nav — matches the Lokafish Flow design (sentence-case step pills,
// Inter Tight 13.6px, JetBrains Mono numerals). Brand collapses to "← back"
// on every screen except Home.
const navbar = document.createElement('nav');
navbar.className = 'flow-nav';
navbar.innerHTML = `
  <div class="flow-nav__brand">
    <button type="button" class="flow-nav__brand-link" data-screen="0">
      <span class="flow-nav__brand-back">← back</span>
      <span class="flow-nav__brand-name">Lokafish</span>
    </button>
  </div>
  <div class="flow-nav__steps" id="nav-steps">
    <button class="flow-nav__step is-active" data-screen="1"><span class="flow-nav__step-num">01</span><span>Scenario</span></button>
    <div class="flow-nav__step-line"></div>
    <button class="flow-nav__step" data-screen="2"><span class="flow-nav__step-num">02</span><span>Plan</span></button>
    <div class="flow-nav__step-line"></div>
    <button class="flow-nav__step" data-screen="3"><span class="flow-nav__step-num">03</span><span>Simulation</span></button>
    <div class="flow-nav__step-line"></div>
    <button class="flow-nav__step" data-screen="4"><span class="flow-nav__step-num">04</span><span>Report</span></button>
  </div>
  <button class="flow-nav__cta" data-screen="1">Start simulation →</button>
`;

navbar.querySelector('.flow-nav__brand-link').addEventListener('click', () => goToScreen(0));
navbar.querySelectorAll('.flow-nav__step').forEach(btn => {
  btn.addEventListener('click', () => goToScreen(parseInt(btn.dataset.screen)));
});
navbar.querySelector('.flow-nav__cta').addEventListener('click', () => goToScreen(1));

function goToScreen(index) {
  if (index === currentScreen) return;
  if (screens[currentScreen]) screens[currentScreen].classList.remove('active');

  // Steps map to screens 1..4 (Home is no longer in the step rail)
  navbar.querySelectorAll('.flow-nav__step').forEach((btn) => {
    const i = parseInt(btn.dataset.screen, 10);
    btn.classList.remove('is-active', 'is-done');
    if (i < index)      btn.classList.add('is-done');
    else if (i === index) btn.classList.add('is-active');
  });
  // Brand back-link: hide on Home, show on every other screen
  navbar.querySelector('.flow-nav__brand').classList.toggle('flow-nav__brand--inner', index !== 0);
  // Toggle CTA visibility — only show on Home as a quick "Start simulation"
  navbar.querySelector('.flow-nav__cta').style.display = (index === 0) ? '' : 'none';
  // Dark mode for Simulation stage — flips nav colors via body class
  document.body.classList.toggle('is-dark', index === 3);

  currentScreen = index;

  if (screens[currentScreen]) {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    const screen = screens[currentScreen];
    screen.style.animation = 'none';
    screen.offsetHeight;
    screen.style.animation = '';
    screen.classList.add('active');

    if (screen._runAnimation && !screen._animated) {
      screen._animated = true;
      setTimeout(() => screen._runAnimation(), 300);
    }
  }

  if (index === 0) {
    navbar.style.transform = 'translateY(-100%)';
  } else {
    navbar.style.transform = 'translateY(0)';
  }
}

function init() {
  const landing   = createLanding(() => goToScreen(1));
  const input     = createInput((scenario) => {
    if (plan._setScenario) plan._setScenario(scenario);
    goToScreen(2);
  });
  const plan      = createPlan({
    onSubmit: () => goToScreen(3),
    onBack:   () => goToScreen(1),
  });
  const agents    = createAgents(() => goToScreen(4));
  const report    = createReport();

  screens.push(landing, input, plan, agents, report);

  setTimeout(() => {
    const restartBtn = report.querySelector('#btn-restart');
    if (restartBtn) restartBtn.addEventListener('click', () => {
      screens.forEach(s => s._animated = false);
      goToScreen(0);
    });
  }, 100);

  // Real-mode input screen dispatches this event after the pipeline
  // completes. Hydrate every data-driven screen and jump to agents so
  // the user walks through the full visualization of THEIR data.
  function loadProjectIntoAllScreens(projectId) {
    if (!projectId) return;
    screens.forEach(s => s._animated = false);
    if (agents._loadProject)    agents._loadProject(projectId);
    if (report._loadProject)    report._loadProject(projectId);
  }

  window.addEventListener('loka:navigate-to-report', (e) => {
    const projectId = e.detail && e.detail.projectId;
    loadProjectIntoAllScreens(projectId);
    // Start at the agents screen (index 3) — the user walks through
    // agents → analytics → report.
    goToScreen(3);
  });

  // If the page loads with #agents?project=xxx / #report?project=xxx
  // already in the URL, hydrate and jump. (Analytics was merged into
  // the Report screen — #analytics still works but lands on Report.)
  if (window.location.hash) {
    const hashScreens = { '#agents': 3, '#analytics': 4, '#report': 4 };
    const screenKey = Object.keys(hashScreens).find(k => window.location.hash.startsWith(k));
    const m = window.location.hash.match(/project=([^&]+)/);
    if (m && m[1]) {
      const pid = decodeURIComponent(m[1]);
      setTimeout(() => {
        loadProjectIntoAllScreens(pid);
        goToScreen(hashScreens[screenKey] ?? 4);
      }, 150);
    }
  }

  navbar.style.transform = 'translateY(-100%)';
  navbar.style.transition = 'transform 0.3s ease';
  app.appendChild(navbar);
  screens.forEach(screen => app.appendChild(screen));
  landing.classList.add('active');
}

init();
