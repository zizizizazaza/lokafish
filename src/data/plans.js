// Demo plan templates.
//
// When the user submits a scenario on the Input screen we "generate" a
// plan (in reality we pick one of these presets and interpolate the
// scenario text). Each plan mirrors the 8 canonical steps of the
// MiroFish pipeline:
//
//   1. stakeholder_expansion
//   2. ontology_generation
//   3. graph_construction
//   4. entity_extraction
//   5. profile_generation
//   6. simulation_run
//   7. chart_aggregation
//   8. report_generation
//
// The `stage` field maps the step to the backend progress stage so the
// run-time progress bar can highlight the right row.

const US_EQUITY_PLAN = {
  key: 'us-equity',
  title: 'US equity market trajectory',
  matchHint: 'US equity markets · macro drivers',
  steps: [
    {
      n: 1,
      stage: 'expansion',
      tool: 'stakeholder_expansion',
      title: 'Identify stakeholders in US equity markets',
      description: "Expand 'US equity market trends' into relevant stakeholder groups: investors, regulators, exchanges, analysts, corporations, media, algorithms, foreign entities.",
      inputs: [],
      output: 'stakeholder_groups',
      estMinutes: 2,
    },
    {
      n: 2,
      stage: 'ontology',
      tool: 'ontology_generation',
      title: 'Build US equity market ontology',
      description: "Construct domain ontology: entity types (e.g., 'StockIndex', 'FedPolicy', 'EarningsReport'), relations ('influences', 'triggers', 'lags'), and key attributes (volatility, yield, P/E).",
      inputs: ['stakeholder_groups'],
      output: 'ontology_schema',
      estMinutes: 4,
    },
    {
      n: 3,
      stage: 'graph',
      tool: 'graph_construction',
      title: 'Construct knowledge graph from financial sources',
      description: 'Populate Zep knowledge graph using ontology and authoritative financial data (e.g., FRED, SEC filings, Bloomberg consensus, S&P reports) to model macro/micro drivers of US equities.',
      inputs: ['ontology_schema'],
      output: 'graph_id',
      estMinutes: 6,
    },
    {
      n: 4,
      stage: 'entities',
      tool: 'entity_extraction',
      title: 'Extract salient financial entities',
      description: "Extract concrete, actionable entities from the knowledge graph: e.g., 'S&P 500', '10Y Treasury Yield', 'Q2 Earnings Growth', 'Fed Funds Rate', 'VIX', 'Nasdaq Tech Weighting'.",
      inputs: ['graph_id'],
      output: 'entity_list',
      estMinutes: 3,
    },
    {
      n: 5,
      stage: 'simulation_prepare',
      tool: 'profile_generation',
      title: 'Generate OASIS agent profiles',
      description: "Convert extracted entities into 2,000 simulated agents with distinct personas (e.g., 'Value Investor', 'HFT Algorithm', 'Fed Watcher Analyst', 'Retail Trader') and behavior rules grounded in real-world incentives.",
      inputs: ['entity_list'],
      output: 'agent_profiles',
      estMinutes: 5,
    },
    {
      n: 6,
      stage: 'simulation_run',
      tool: 'simulation_run',
      title: 'Run 40-round multi-agent market simulation',
      description: 'Simulate social-media–mediated information diffusion and trading behavior across 2,000 agents for 40 rounds, modeling reactions to macro signals, earnings, policy shifts, and sentiment cascades.',
      inputs: ['agent_profiles'],
      output: 'actions_jsonl',
      estMinutes: 12,
    },
    {
      n: 7,
      stage: 'simulation_run',
      tool: 'chart_aggregation',
      title: 'Aggregate simulation into analytical charts',
      description: 'Produce time-series heatmaps (sector vs. volatility), sentiment trajectories (bullish/bearish ratio), capital flow networks (institutional → retail), and correlation clusters (e.g., rates ↔ tech valuations).',
      inputs: ['actions_jsonl'],
      output: 'charts_data',
      estMinutes: 4,
    },
    {
      n: 8,
      stage: 'report',
      tool: 'report_generation',
      title: 'Generate final markdown report',
      description: 'Synthesize charts, agent behavioral patterns, and causal inferences into a concise, evidence-based report on near-term US equity market trajectory — highlighting drivers, inflection points, and scenario sensitivities.',
      inputs: ['charts_data'],
      output: 'final_report',
      estMinutes: 5,
    },
  ],
};

const TAYLOR_PLAN = {
  key: 'taylor-swift',
  title: "Taylor Swift · Eras Tour economic impact",
  matchHint: 'Concert-driven tourism & GDP',
  steps: [
    {
      n: 1,
      stage: 'expansion',
      tool: 'stakeholder_expansion',
      title: 'Identify stakeholders in the Eras Tour impact',
      description: 'Expand the scenario into relevant stakeholder groups: concert attendees, hotels, airlines, F&B operators, retailers, tourism board, local SMEs, ride-hail platforms, media, the artist team.',
      inputs: [],
      output: 'stakeholder_groups',
      estMinutes: 2,
    },
    {
      n: 2,
      stage: 'ontology',
      tool: 'ontology_generation',
      title: 'Build Eras Tour economic ontology',
      description: "Construct domain ontology: entity types ('ConcertEvent', 'HotelADR', 'VisitorArrival', 'GDPComponent'), relations ('drives', 'multiplies', 'spills over'), and attributes (occupancy, ticket yield, length-of-stay).",
      inputs: ['stakeholder_groups'],
      output: 'ontology_schema',
      estMinutes: 4,
    },
    {
      n: 3,
      stage: 'graph',
      tool: 'graph_construction',
      title: 'Construct knowledge graph from tourism data',
      description: 'Populate Zep knowledge graph using ontology and authoritative sources (Changi arrivals, Maybank hotel data, STB quarterly, Spotify demographics) to model direct and indirect economic flows.',
      inputs: ['ontology_schema'],
      output: 'graph_id',
      estMinutes: 6,
    },
    {
      n: 4,
      stage: 'entities',
      tool: 'entity_extraction',
      title: 'Extract salient economic entities',
      description: "Extract concrete, actionable entities from the knowledge graph: e.g., 'Hotel ADR (+37%)', 'F1 weekend arrivals baseline', 'Tour-linked F&B spend', 'Swiftie age cohort', 'Regional spillover multiplier'.",
      inputs: ['graph_id'],
      output: 'entity_list',
      estMinutes: 3,
    },
    {
      n: 5,
      stage: 'simulation_prepare',
      tool: 'profile_generation',
      title: 'Generate OASIS agent profiles',
      description: "Convert extracted entities into 2,000 simulated agents with distinct personas ('Swiftie traveler', 'Hotel yield manager', 'Retailer', 'Tourism official', 'Local resident') and incentive-grounded behavior rules.",
      inputs: ['entity_list'],
      output: 'agent_profiles',
      estMinutes: 5,
    },
    {
      n: 6,
      stage: 'simulation_run',
      tool: 'simulation_run',
      title: 'Run 40-round multi-agent impact simulation',
      description: 'Simulate social-media–mediated information diffusion, booking and spending behavior across 2,000 agents for 40 rounds, modeling reactions to announcements, price surges, and word-of-mouth cascades.',
      inputs: ['agent_profiles'],
      output: 'actions_jsonl',
      estMinutes: 12,
    },
    {
      n: 7,
      stage: 'simulation_run',
      tool: 'chart_aggregation',
      title: 'Aggregate simulation into analytical charts',
      description: 'Produce time-series heatmaps (sector vs. week), sentiment trajectories, capital flow networks (tourists → SMEs), and correlation clusters (concert dates ↔ hotel rates ↔ F&B revenue).',
      inputs: ['actions_jsonl'],
      output: 'charts_data',
      estMinutes: 4,
    },
    {
      n: 8,
      stage: 'report',
      tool: 'report_generation',
      title: 'Generate final markdown report',
      description: 'Synthesize charts, agent behavior, and causal inference into a concise evidence-based report on the Eras Tour\'s GDP contribution — quantifying drivers, multipliers, and downside sensitivities.',
      inputs: ['charts_data'],
      output: 'final_report',
      estMinutes: 5,
    },
  ],
};

function inferTopic(scenario) {
  const s = (scenario || '').trim();
  if (!s) return 'the target scenario';
  // Pull first clause (before first period / line / Chinese 。)
  const head = s.split(/[。.\n]/)[0].trim();
  return head.length > 90 ? head.slice(0, 88) + '…' : head;
}

function buildGenericPlan(scenario) {
  const topic = inferTopic(scenario);
  return {
    key: 'generic',
    title: topic,
    matchHint: 'Custom scenario',
    steps: [
      {
        n: 1, stage: 'expansion', tool: 'stakeholder_expansion',
        title: `Identify stakeholders for "${topic}"`,
        description: `Expand the scenario into relevant stakeholder groups (actors, institutions, counter-parties, observers) that materially influence outcomes in "${topic}".`,
        inputs: [], output: 'stakeholder_groups', estMinutes: 2,
      },
      {
        n: 2, stage: 'ontology', tool: 'ontology_generation',
        title: 'Build domain ontology',
        description: 'Construct entity types, relations, and key attributes that let downstream stages reason about the scenario with a shared vocabulary.',
        inputs: ['stakeholder_groups'], output: 'ontology_schema', estMinutes: 4,
      },
      {
        n: 3, stage: 'graph', tool: 'graph_construction',
        title: 'Construct knowledge graph from authoritative sources',
        description: 'Populate a Zep knowledge graph using the ontology and reputable data sources, capturing the causal drivers and feedback loops relevant to the scenario.',
        inputs: ['ontology_schema'], output: 'graph_id', estMinutes: 6,
      },
      {
        n: 4, stage: 'entities', tool: 'entity_extraction',
        title: 'Extract salient entities',
        description: 'Extract concrete, actionable entities from the knowledge graph — the specific names, metrics, and events the simulation will reason over.',
        inputs: ['graph_id'], output: 'entity_list', estMinutes: 3,
      },
      {
        n: 5, stage: 'simulation_prepare', tool: 'profile_generation',
        title: 'Generate OASIS agent profiles',
        description: 'Convert extracted entities into 2,000 simulated agents with distinct personas and behavior rules grounded in real-world incentives relevant to the scenario.',
        inputs: ['entity_list'], output: 'agent_profiles', estMinutes: 5,
      },
      {
        n: 6, stage: 'simulation_run', tool: 'simulation_run',
        title: 'Run 40-round multi-agent simulation',
        description: 'Simulate information diffusion and decision behavior across 2,000 agents for 40 rounds, capturing how the system reacts to shocks, signals, and sentiment cascades.',
        inputs: ['agent_profiles'], output: 'actions_jsonl', estMinutes: 12,
      },
      {
        n: 7, stage: 'simulation_run', tool: 'chart_aggregation',
        title: 'Aggregate simulation into analytical charts',
        description: 'Produce time-series, flow networks, and correlation clusters that make the agents\' collective behavior legible to a human analyst.',
        inputs: ['actions_jsonl'], output: 'charts_data', estMinutes: 4,
      },
      {
        n: 8, stage: 'report', tool: 'report_generation',
        title: 'Generate final markdown report',
        description: 'Synthesize charts, agent behavioral patterns, and causal inferences into a concise, evidence-based report highlighting drivers, inflection points, and scenario sensitivities.',
        inputs: ['charts_data'], output: 'final_report', estMinutes: 5,
      },
    ],
  };
}

export const PLAN_DEFAULTS = {
  agents: 2000,
  rounds: 40,
};

/**
 * Return a plan object for the given scenario. Keyword-matches two
 * hand-tuned presets, otherwise returns a generic template with the
 * scenario topic interpolated.
 */
export function generatePlanForScenario(scenario) {
  const s = (scenario || '').toLowerCase();
  if (/(us equit|us stock|s&p\s*500|nasdaq|\bfed\b|treasury|美股|道琼|纳指|联储)/.test(s)) {
    return withTotals(US_EQUITY_PLAN, scenario);
  }
  if (/(taylor|swift|eras tour|concert|演唱会)/.test(s)) {
    return withTotals(TAYLOR_PLAN, scenario);
  }
  return withTotals(buildGenericPlan(scenario), scenario);
}

function withTotals(plan, scenario) {
  const minutes = plan.steps.reduce((a, s) => a + (s.estMinutes || 0), 0);
  return {
    ...plan,
    scenario: scenario || '',
    totals: {
      nodes: plan.steps.length,
      minutes,
      agents: PLAN_DEFAULTS.agents,
      rounds: PLAN_DEFAULTS.rounds,
    },
  };
}
