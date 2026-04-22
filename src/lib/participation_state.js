// Persistent participation config — lives in localStorage so a page
// refresh keeps the user's choices. Single-project scope for now;
// multi-project support can hang a project_id suffix later.

import {
  PARTICIPATION_MODES,
  getDefaultSelectedIds,
} from '../data/decision_points.js';

const STORAGE_KEY = 'loka:participation:v1';

const DEFAULT_CONFIG = {
  mode: PARTICIPATION_MODES.SANDBOX,
  selectedDecisionPoints: [],
  selectedPlanSteps: [2, 5, 6, 8], // Plan-step numbers the user wants to own in User mode.
  communityAsReference: false,  // User mode — also show community votes for reference
};

function read() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_CONFIG };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_CONFIG, ...parsed };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

function write(cfg) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
  } catch {
    /* quota / private-mode — silently drop */
  }
}

export function getConfig() {
  return read();
}

export function setMode(mode) {
  const cfg = read();
  cfg.mode = mode;
  // When switching into USER mode for the first time, pre-pick the defaults.
  if (mode === PARTICIPATION_MODES.USER && cfg.selectedDecisionPoints.length === 0) {
    cfg.selectedDecisionPoints = getDefaultSelectedIds();
  }
  write(cfg);
  return cfg;
}

export function toggleDecisionPoint(dpId) {
  const cfg = read();
  const set = new Set(cfg.selectedDecisionPoints);
  if (set.has(dpId)) set.delete(dpId);
  else set.add(dpId);
  cfg.selectedDecisionPoints = [...set];
  write(cfg);
  return cfg;
}

export function setSelectedDecisionPoints(ids) {
  const cfg = read();
  cfg.selectedDecisionPoints = [...ids];
  write(cfg);
  return cfg;
}

export function setCommunityAsReference(flag) {
  const cfg = read();
  cfg.communityAsReference = !!flag;
  write(cfg);
  return cfg;
}

export function togglePlanStep(stepNumber) {
  const cfg = read();
  const set = new Set(cfg.selectedPlanSteps || []);
  if (set.has(stepNumber)) set.delete(stepNumber);
  else set.add(stepNumber);
  cfg.selectedPlanSteps = [...set].sort((a, b) => a - b);
  write(cfg);
  return cfg;
}

export function setSelectedPlanSteps(stepNumbers) {
  const cfg = read();
  cfg.selectedPlanSteps = [...stepNumbers].sort((a, b) => a - b);
  write(cfg);
  return cfg;
}

// ── Current plan persistence ─────────────────────────────────────────────
// Saved by plan.js once a plan is generated so downstream screens
// (agents.js etc.) can read the 8-step breakdown without re-generating.
const PLAN_STORAGE_KEY = 'loka:currentPlan:v1';

export function setCurrentPlan(plan) {
  try {
    localStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify(plan));
  } catch { /* ignore */ }
  return plan;
}

export function getCurrentPlan() {
  try {
    const raw = localStorage.getItem(PLAN_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function resetConfig() {
  write({ ...DEFAULT_CONFIG });
  return read();
}
