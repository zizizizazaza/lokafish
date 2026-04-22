// Decision points — demo data for the user-participation workflow.
//
// Each DP represents a checkpoint in the MiroFish pipeline where
// the agent crowd, the external community, or the user themselves
// can influence the outcome. Shapes match the PRD (docs/PRD_user_participation.md §5.2).
//
// All content here is demo-grade (Taylor Swift scenario) — wire to the
// real backend later.

export const PARTICIPATION_MODES = {
  SANDBOX:   'sandbox',
  COMMUNITY: 'community',
  USER:      'user',
};

// SVG icons — stroke style, 20×20, weight 1.5, rounded caps/joins.
const ICON_SANDBOX = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>`;

const ICON_COMMUNITY = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="7" r="3"/><circle cx="17" cy="7" r="3"/><path d="M1 21v-1a7 7 0 0 1 7-7h1"/><path d="M17 14a7 7 0 0 1 7 7v1"/><path d="M13 21v-1a4 4 0 0 0-4-4h-1"/></svg>`;

const ICON_USER = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a5 5 0 1 1 0 10A5 5 0 0 1 12 2z"/><path d="M4 20a8 8 0 0 1 16 0"/><polyline points="9 12 11 14 15 10" transform="translate(0 9)"/></svg>`;

export const MODE_META = {
  [PARTICIPATION_MODES.SANDBOX]: {
    id: PARTICIPATION_MODES.SANDBOX,
    icon: ICON_SANDBOX,
    title: 'Sandbox',
    subtitle: 'AI-only, no human input',
    description: 'Agents decide everything. Fastest, fully reproducible.',
  },
  [PARTICIPATION_MODES.COMMUNITY]: {
    id: PARTICIPATION_MODES.COMMUNITY,
    icon: ICON_COMMUNITY,
    title: 'Community',
    subtitle: 'Crowd votes on each checkpoint',
    description: 'Each decision point goes to a timed community vote.',
  },
  [PARTICIPATION_MODES.USER]: {
    id: PARTICIPATION_MODES.USER,
    icon: ICON_USER,
    title: 'User decision',
    subtitle: 'You control key checkpoints',
    description: 'Simulation pauses at checkpoints you choose. You decide.',
  },
};

// 7 decision points across the 5-stage pipeline. `selectableByDefault`
// marks the 4 nodes we surface as default picks in User mode.
export const DECISION_POINTS = [
  {
    id: 'DP-1',
    stage: 1,
    stageName: 'Ontology',
    title: 'Finalize entity type list',
    description: 'The LLM extracted candidate entity types from your scenario. Accept as-is, prune, or extend before graph building starts.',
    selectableByDefault: true,
    options: [
      { id: 'A', label: 'Accept all 14 extracted types',    summary: 'Trust the LLM extraction. Max coverage, some noise.' },
      { id: 'B', label: 'Prune to 9 core types',            summary: 'Drop low-signal types (sponsors, merchants). Cleaner graph.' },
      { id: 'C', label: 'Add 3 user-defined types',         summary: 'Inject "streaming platform", "luxury brand", "gov body".' },
    ],
    agentOpinions: [
      { agent: 'OntoArchitect',  stance: 'A', reasoning: 'Pruning costs more than noise does — richer graph wins.' },
      { agent: 'DomainAnalyst',  stance: 'B', reasoning: 'Low-signal types will muddy downstream agent profiles.' },
      { agent: 'DataCurator',    stance: 'B', reasoning: 'Cleaner ontology = more honest edge weights.' },
      { agent: 'RedTeamer',      stance: 'C', reasoning: 'Missing "gov body" masks regulatory risk entirely.' },
    ],
    communityVotes: { A: 31, B: 58, C: 41 },
  },

  {
    id: 'DP-2',
    stage: 2,
    stageName: 'Graph build',
    title: 'Confirm critical edge weights',
    description: 'Top 5 highest-weight relations in the extracted KG. Approve, reweight, or drop any edge that looks wrong.',
    selectableByDefault: false,
    options: [
      { id: 'A', label: 'Accept Zep weights unchanged',    summary: 'Ship what the graph says. Fastest.' },
      { id: 'B', label: 'Boost tourism→aviation edge 2×',  summary: 'Align with Changi +20% arrival data.' },
      { id: 'C', label: 'Drop celebrity→luxury edge',      summary: 'Weak signal in the Singapore snapshot.' },
    ],
    agentOpinions: [
      { agent: 'GraphAnalyst',   stance: 'A', reasoning: 'Zep already used embedding similarity. Don\'t second-guess.' },
      { agent: 'MacroAgent',     stance: 'B', reasoning: 'Real-world data supports a stronger tourism→aviation link.' },
      { agent: 'RetailAgent',    stance: 'C', reasoning: 'Luxury uplift is noise compared to F&B / hospitality.' },
    ],
    communityVotes: { A: 22, B: 67, C: 18 },
  },

  {
    id: 'DP-3',
    stage: 3,
    stageName: 'Profiles',
    title: 'Agent population mix',
    description: 'Choose the demographic / behavioral mix for the 2,000 simulated agents. This drives the social feed in Stage 4.',
    selectableByDefault: true,
    options: [
      { id: 'A', label: 'Youth-heavy (18–25, 55%)',        summary: 'Matches Swiftie fan-base. Concert-centric feed.' },
      { id: 'B', label: 'Balanced across ages',             summary: 'Broader economic signal, less fandom noise.' },
      { id: 'C', label: 'Weight by fan profile data',       summary: 'Use Spotify-derived listener demographics.' },
    ],
    agentOpinions: [
      { agent: 'PersonaArchitect', stance: 'A', reasoning: 'Fan-base reality — this is an Eras Tour sim, not a GDP sim.' },
      { agent: 'EconomistAgent',   stance: 'B', reasoning: 'Need older / higher-income agents to model hotel ADR surges.' },
      { agent: 'MarketResearcher', stance: 'C', reasoning: 'Use actual streaming data — it\'s the closest proxy we have.' },
      { agent: 'SocialScientist',  stance: 'A', reasoning: 'Youth-heavy captures word-of-mouth amplification.' },
    ],
    communityVotes: { A: 112, B: 64, C: 86 },
  },

  {
    id: 'DP-4',
    stage: 3,
    stageName: 'Profiles',
    title: 'Representative agent profile review',
    description: 'Five sampled agent profiles — approve the sample, regenerate, or edit individually.',
    selectableByDefault: false,
    options: [
      { id: 'A', label: 'Approve all 5 samples',            summary: 'Ship what was generated.' },
      { id: 'B', label: 'Regenerate sample set',            summary: 'Re-roll with a different random seed.' },
      { id: 'C', label: 'Edit profile #3 (business owner)', summary: 'Manually tweak one outlier profile.' },
    ],
    agentOpinions: [
      { agent: 'QAReviewer',     stance: 'A', reasoning: 'Samples look diverse and plausible.' },
      { agent: 'BiasAuditor',    stance: 'B', reasoning: 'Sample set skews expat — regenerate for local balance.' },
    ],
    communityVotes: { A: 44, B: 29, C: 12 },
  },

  {
    id: 'DP-5',
    stage: 4,
    stageName: 'Simulation',
    title: 'Inject external event',
    description: 'Mid-simulation, inject an exogenous event to stress-test the scenario. Pick one, or keep baseline.',
    selectableByDefault: true,
    options: [
      { id: 'A', label: 'Inject negative event (scandal)',  summary: 'Test downside — artist PR incident mid-tour.' },
      { id: 'B', label: 'Inject positive event (surprise)', summary: 'Test upside — surprise special guest.' },
      { id: 'C', label: 'Keep baseline (no injection)',     summary: 'Pure observation, no shock.' },
    ],
    agentOpinions: [
      { agent: 'RiskAgent',        stance: 'A', reasoning: 'Downside scenarios are what clients pay us to surface.' },
      { agent: 'MarketingAgent',   stance: 'B', reasoning: 'Upside testing reveals ceiling for media campaigns.' },
      { agent: 'PurityAgent',      stance: 'C', reasoning: 'Clean baseline before you add noise.' },
      { agent: 'NarrativeAgent',   stance: 'A', reasoning: 'Story needs a stressor for the report to be interesting.' },
    ],
    communityVotes: { A: 94, B: 71, C: 38 },
  },

  {
    id: 'DP-6',
    stage: 4,
    stageName: 'Simulation',
    title: 'Resolve contested round outcome',
    description: 'Round 34 stalled — agents split 49 / 51 on whether concert-driven demand is sustainable past the tour. Call it.',
    selectableByDefault: true,
    options: [
      { id: 'A', label: 'Sustainable (long-tail effect)',  summary: 'Trust the H1 14.4% hotel-sector growth signal.' },
      { id: 'B', label: 'One-off spike',                   summary: 'Revert to pre-concert baseline within 30 days.' },
      { id: 'C', label: 'Split outcome by sector',         summary: 'Accommodation lasts, retail fades.' },
    ],
    agentOpinions: [
      { agent: 'MacroAgent',      stance: 'A', reasoning: 'Maybank data points to multi-quarter lift.' },
      { agent: 'SkepticAgent',    stance: 'B', reasoning: 'One concert, no real structural demand change.' },
      { agent: 'SectorAgent',     stance: 'C', reasoning: 'Obvious split — hotels vs. retail behave differently.' },
    ],
    communityVotes: { A: 58, B: 33, C: 102 },
  },

  {
    id: 'DP-7',
    stage: 5,
    stageName: 'Report',
    title: 'Approve headline conclusion',
    description: 'ReportAgent drafted the headline. Approve verbatim, soften, or rewrite.',
    selectableByDefault: false,
    options: [
      { id: 'A', label: '"Swiftonomics adds 0.25pp to Q1 GDP"', summary: 'Confident, citation-backed, bold.' },
      { id: 'B', label: '"Concerts contributed measurably..."',  summary: 'Hedged, policy-safe phrasing.' },
      { id: 'C', label: 'Rewrite with your own headline',        summary: 'You take the pen.' },
    ],
    agentOpinions: [
      { agent: 'ReportAgent',    stance: 'A', reasoning: 'Numbers support the claim; confidence reads as authority.' },
      { agent: 'ComplianceAgent', stance: 'B', reasoning: 'Exec audience prefers hedged claims for attribution.' },
    ],
    communityVotes: { A: 73, B: 54, C: 8 },
  },
];

export function getDecisionPoint(id) {
  return DECISION_POINTS.find(dp => dp.id === id) || null;
}

export function getDefaultSelectedIds() {
  return DECISION_POINTS.filter(dp => dp.selectableByDefault).map(dp => dp.id);
}

// Mapping from plan-step number (as shown on the Plan screen) → the decision
// points that conceptually belong to that step. Used to translate the
// user's "I want to own plan step N" tick into the set of gates that fire
// inside the Simulation phase.
export const PLAN_STEP_TO_DP_IDS = {
  1: [],                    // stakeholder_expansion — no gate
  2: ['DP-1'],              // ontology_generation
  3: ['DP-2'],              // graph_construction
  4: [],                    // entity_extraction — no gate
  5: ['DP-3', 'DP-4'],      // profile_generation
  6: ['DP-5', 'DP-6'],      // simulation_run
  7: [],                    // chart_aggregation — no gate
  8: ['DP-7'],              // report_generation
};

/**
 * Flatten the user's selected plan-step numbers into DP ids, preserving
 * the DECISION_POINTS canonical order.
 */
export function planStepsToDecisionPointIds(planStepNumbers) {
  const want = new Set();
  for (const n of planStepNumbers || []) {
    for (const id of PLAN_STEP_TO_DP_IDS[n] || []) want.add(id);
  }
  return DECISION_POINTS.filter(dp => want.has(dp.id)).map(dp => dp.id);
}

export function computeCommunityLeader(dp) {
  const entries = Object.entries(dp.communityVotes);
  if (!entries.length) return null;
  entries.sort((a, b) => b[1] - a[1]);
  const [optionId, votes] = entries[0];
  const total = entries.reduce((s, [, v]) => s + v, 0);
  return {
    optionId,
    votes,
    total,
    pct: total ? Math.round((votes / total) * 100) : 0,
    option: dp.options.find(o => o.id === optionId),
  };
}

export function computeAgentConsensus(dp) {
  const tally = {};
  for (const op of dp.agentOpinions) {
    tally[op.stance] = (tally[op.stance] || 0) + 1;
  }
  const entries = Object.entries(tally).sort((a, b) => b[1] - a[1]);
  if (!entries.length) return null;
  const [optionId, count] = entries[0];
  return {
    optionId,
    count,
    total: dp.agentOpinions.length,
    option: dp.options.find(o => o.id === optionId),
  };
}
