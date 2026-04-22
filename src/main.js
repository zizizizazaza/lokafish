// Loka — Main Application Router

import './style.css';
import { createLanding } from './screens/landing.js';
import { createInput } from './screens/input.js';
import { createPlan } from './screens/plan.js';
import { createAgents } from './screens/agents.js';
import { createAnalytics } from './screens/analytics.js';
import { createReport } from './screens/report.js';

const app = document.querySelector('#app');
let currentScreen = 0;
const screens = [];

const navbar = document.createElement('nav');
navbar.className = 'navbar';
navbar.innerHTML = `
  <div class="navbar__logo">
    <div class="navbar__logo-icon">LK</div>
    <span>Loka</span>
  </div>
  <div class="navbar__steps" id="nav-steps">
    <button class="navbar__step active" data-screen="0"><span class="navbar__step-dot"></span> Home</button>
    <div class="navbar__step-line"></div>
    <button class="navbar__step" data-screen="1"><span class="navbar__step-dot"></span> Scenario</button>
    <div class="navbar__step-line"></div>
    <button class="navbar__step" data-screen="2"><span class="navbar__step-dot"></span> Plan</button>
    <div class="navbar__step-line"></div>
    <button class="navbar__step" data-screen="3"><span class="navbar__step-dot"></span> Simulation</button>
    <div class="navbar__step-line"></div>
    <button class="navbar__step" data-screen="4"><span class="navbar__step-dot"></span> Analytics</button>
    <div class="navbar__step-line"></div>
    <button class="navbar__step" data-screen="5"><span class="navbar__step-dot"></span> Report</button>
  </div>
  <div class="navbar__actions">
    <button class="btn btn--ghost btn--sm" style="font-family: var(--font-mono); font-size: 11px;">v1.0</button>
  </div>
`;

navbar.querySelectorAll('.navbar__step').forEach(btn => {
  btn.addEventListener('click', () => goToScreen(parseInt(btn.dataset.screen)));
});

function goToScreen(index) {
  if (index === currentScreen) return;
  if (screens[currentScreen]) screens[currentScreen].classList.remove('active');

  navbar.querySelectorAll('.navbar__step').forEach((btn, i) => {
    btn.classList.remove('active');
    if (i < index) btn.classList.add('completed');
    if (i === index) btn.classList.add('active');
  });

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
  const analytics = createAnalytics(() => goToScreen(5));
  const report    = createReport();

  screens.push(landing, input, plan, agents, analytics, report);

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
    if (analytics._loadProject) analytics._loadProject(projectId);
    if (report._loadProject)    report._loadProject(projectId);
  }

  window.addEventListener('loka:navigate-to-report', (e) => {
    const projectId = e.detail && e.detail.projectId;
    loadProjectIntoAllScreens(projectId);
    // Start at the agents screen (index 3) — the user walks through
    // agents → analytics → report.
    goToScreen(3);
  });

  // If the page loads with #agents?project=xxx / #analytics?project=xxx /
  // #report?project=xxx already in the URL, hydrate and jump.
  if (window.location.hash) {
    const hashScreens = { '#agents': 3, '#analytics': 4, '#report': 5 };
    const screenKey = Object.keys(hashScreens).find(k => window.location.hash.startsWith(k));
    const m = window.location.hash.match(/project=([^&]+)/);
    if (m && m[1]) {
      const pid = decodeURIComponent(m[1]);
      setTimeout(() => {
        loadProjectIntoAllScreens(pid);
        goToScreen(hashScreens[screenKey] ?? 5);
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
