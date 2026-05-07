// Agent detail modal with personality radar chart

export function createAgentModal() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'agent-modal';
  overlay.innerHTML = `<div class="modal" id="modal-content"></div>`;
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal(overlay);
  });
  document.body.appendChild(overlay);
  return overlay;
}

export function showAgentDetail(overlay, agent, category) {
  const modal = overlay.querySelector('#modal-content');
  const p = agent.personality;
  const avatarHTML = agent.avatar.startsWith('http')
    ? `<img src="${agent.avatar}" alt="${agent.name}" style="width:100%;height:100%;border-radius:inherit;" />`
    : `<span style="font-size:28px">${agent.avatar}</span>`;

  modal.innerHTML = `
    <div class="modal__close" id="modal-close">✕</div>
    <div class="modal__header">
      <div class="modal__avatar" style="background: ${category.bgColor}; overflow:hidden;">${avatarHTML}</div>
      <div class="modal__info">
        <div class="modal__name">${agent.name}</div>
        <div class="modal__role">${agent.role}</div>
        <div style="display: flex; gap: 4px; margin-top: 6px; flex-wrap: wrap;">
          ${agent.traits.map(t => `<span class="badge badge--blue">${t}</span>`).join('')}
        </div>
      </div>
      <div class="modal__meta">
        ${agent.age ? `<div class="modal__meta-row"><span>Age</span><span class="mono">${agent.age}</span></div>` : ''}
        <div class="modal__meta-row"><span>Income</span><span class="mono">${agent.income}</span></div>
        <div class="modal__meta-row"><span>Econ. Weight</span><span class="mono">${(agent.influence * 100).toFixed(0)}%</span></div>
      </div>
    </div>

    <div class="modal__section">
      <div class="modal__section-title">Background</div>
      <div class="modal__section-body">${agent.background}</div>
    </div>

    <div class="modal__grid">
      <div class="modal__section">
        <div class="modal__section-title">Personality Profile (Big Five)</div>
        <canvas id="personality-radar" width="240" height="240"></canvas>
      </div>
      <div class="modal__section">
        <div class="modal__section-title">Personality Breakdown</div>
        ${Object.entries(p).map(([trait, val]) => `
          <div class="modal__trait">
            <div class="modal__trait-label">${capitalizeFirst(trait)}</div>
            <div class="modal__trait-bar"><div class="modal__trait-fill" style="width: ${val}%; background: ${getTraitColor(trait)};"></div></div>
            <div class="modal__trait-val mono">${val}</div>
          </div>
        `).join('')}
      </div>
    </div>

    <div class="modal__section">
      <div class="modal__section-title">Decision Logic</div>
      <div class="modal__section-body" style="background: var(--bg-secondary); padding: 12px; border-radius: 6px; border-left: 3px solid var(--blue);">${agent.decisionLogic}</div>
    </div>

    <div class="modal__section">
      <div class="modal__section-title">Consumption Profile</div>
      <div class="modal__section-body" style="background: var(--bg-secondary); padding: 12px; border-radius: 6px; border-left: 3px solid var(--green);">${agent.consumptionProfile}</div>
    </div>
  `;

  overlay.classList.add('open');
  modal.querySelector('#modal-close').addEventListener('click', () => closeModal(overlay));

  setTimeout(() => drawRadar(modal.querySelector('#personality-radar'), p), 100);
}


// ── Node type metadata ────────────────────────────────────────────────────
const NODE_TYPE_META = {
  Person: {
    role: 'Individual Simulation Agent',
    icon: '👤',
    desc: (label) => `${label} is an individual consumer agent in the economic simulation. This agent makes autonomous daily decisions — where to stay, eat, shop, and travel — based on income, personality, and social influence. During the event window, ${label}'s spending behavior is captured and aggregated to compute sectoral GDP contributions.`,
    stats: ['Daily Spend Budget', 'Social Influence', 'Brand Sensitivity', 'Price Elasticity'],
  },
  Company: {
    role: 'Corporate Simulation Node',
    icon: '🏢',
    desc: (label) => `${label} is a corporate entity node representing a business operating in Singapore's tourism and hospitality sector. The simulation tracks this company's capacity utilization, revenue uplift, and workforce demand in response to the event inflow. Its outputs feed directly into the I-O economic model.`,
    stats: ['Revenue Uplift', 'Capacity Util.', 'Workforce Demand', 'Supply Chain Depth'],
  },
  Entity: {
    role: 'Infrastructure / Venue Node',
    icon: '🏟️',
    desc: (label) => `${label} is a key infrastructure or venue node. It acts as a throughput multiplier in the simulation — routing visitor flows, logistics, and economic demand through connected agents. Changes in its capacity or pricing ripple outward through 2nd and 3rd-degree connections, amplifying or dampening the total economic impact.`,
    stats: ['Throughput (daily)', 'Bottleneck Risk', 'Multiplier Effect', 'Conn. Density'],
  },
  GovAgency: {
    role: 'Policy & Regulatory Node',
    icon: '🏛️',
    desc: (label) => `${label} is a government agency node. It exerts policy-level influence across agent categories — setting pricing bands, issuing permits, and controlling visitor quotas. In the simulation, this node's interventions are modeled as constraint shocks that alter the equilibrium outcomes of connected economic agents.`,
    stats: ['Policy Reach', 'Regulatory Force', 'Budget Allocation', 'Intervention Speed'],
  },
  MediaOutlet: {
    role: 'Sentiment Amplifier Node',
    icon: '📡',
    desc: (label) => `${label} is a media and sentiment amplifier node. It propagates information — positive, neutral, or negative — through the consumer agent network, modifying booking intent and spending willingness in real time. A single high-reach post from this node can shift 3–8% of agent demand within a simulation round.`,
    stats: ['Reach Score', 'Sentiment Polarity', 'Virality Index', 'Demand Shift'],
  },
};

// ── Per-node insights ────────────────────────────────────────────────────
// Scenario-aware narrative for famous demo nodes. Keys are matched against
// node.id (lowercase) first, then node.label (lowercase, partial). When a
// match is found we use the custom headline instead of the generic
// type-template — this is what makes the modal actually answer
// "what is this node doing in MY scenario".
const NODE_INSIGHTS = {
  // Taylor Swift demo
  'ts':         'The trigger event. Six SG-exclusive Eras Tour shows. Every downstream signal — bookings, prices, sentiment — originates here.',
  'taylor':     'The trigger event. Six SG-exclusive Eras Tour shows. Every downstream signal — bookings, prices, sentiment — originates here.',
  'sg':         'The host market. All economic effects roll up to this node — the simulation\'s root container for tax, FX, GDP, and sectoral output.',
  'singapore':  'The host market. All economic effects roll up to this node — the simulation\'s root container for tax, FX, GDP, and sectoral output.',
  'stb':        'Policy lever. Issued the S$3M grant that anchored the deal. Briefs media and routes the tourism narrative — its decisions cap or amplify supply.',
  'mti':        'Macro oversight. Owns the GDP-impact narrative and approves cross-ministry coordination on visa, transport and labor rules.',
  'venue':      'Throughput bottleneck. National Stadium\'s 55K capacity × 6 nights defines the hard ceiling on direct attendance and downstream spend.',
  'fans':       'Demand engine. ~300K fans (70% inbound) drive every revenue line — hotels, F&B, retail, transport. Their mix of local vs overseas sets multiplier strength.',
  'mbs':        'Largest single-property beneficiary. 2,560 rooms sold out at premium rates; concert week revenue ≈ S$8.2M incremental.',
  'hotels':     'Supply-side multiplier. Occupancy 92.7% (vs 75% baseline), ADR +12.7% YoY. Its surge sets the benchmark for the whole hospitality sector.',
  'changi':     'The inbound funnel. +20% arrival traffic vs same week 2023. Capacity here gates how much of the demand can actually reach the venue.',
  'airlines':   'Cross-border carrier. Premium fares + capacity adds determine how price-elastic visitors get filtered in.',
  'sia':        'Cross-border carrier. Premium fares + capacity adds determine how price-elastic visitors get filtered in.',
  'airasia':    'Budget carrier. Routes the price-sensitive SEA demand segment that drove 462% accommodation booking growth from KL/Jakarta.',
  'bloomberg':  'Institutional sentiment amplifier. One data-driven article reaches institutional desks; downstream effect on capital allocation is non-trivial.',
  'cna':        'Regional storyteller. Shapes the "Swift Effect" narrative across APAC — directly credited with ~15% of post-event tourism uplift.',
  'media':      'Sentiment loop. Coverage volume and tone modulate fan booking intent in real time — a single viral post can shift 3–8% of demand.',
  'tiktok':     'Organic virality channel. Where the demand cascade actually compounds — every fan video raises ambient awareness for the next booking cohort.',
  'fnb':        'Second-order beneficiary. Concert-week themed menus, extended hours, and surge staffing — the sector that absorbed the largest non-ticket spend.',
  'retail':     'Orchard-belt uplift. Themed displays + tourist transit volume; estimated +S$45M incremental retail.',
  'transport':  'Last-mile capacity. Surge pricing on Grab + MRT/SMRT crowd-control define how smoothly demand reaches the venue every night.',
  'grab':       'Last-mile capacity. Surge pricing on Grab + MRT/SMRT crowd-control define how smoothly demand reaches the venue every night.',
  'econ':       'Outcome aggregator. The sink node where every other agent\'s contribution rolls up into the headline GDP impact figure.',
  'tax':        'Government revenue capture. Sales/tourism tax flow scaled to total spend — the policy ROI on the original grant.',
  'forex':      'External pressure. SGD strength affects how much foreign demand actually clears — a watch-item more than a driver.',
  'klook':      'Booking-platform proxy. Captures attraction & tour bookings (+2,373% vs control window).',
  'shopee':     'E-commerce halo. Themed merch + pre-trip purchases — small absolute number, useful as a sentiment signal.',
  'dbs':        'Payment rails. Card volume here is the cleanest real-time proxy for cross-border consumer spend during the window.',
  'realestate': 'Hotel REITs reflect the supply side\'s monetisation of the surge — useful for the post-event ROI narrative.',
  'labor':      'Bottleneck risk. Temp-staff demand spiked across hospitality + venue + transport — its tightness caps how much extra revenue the sector can capture.',
  'sentosa':    'Spillover venue. Pre/post-concert tourist day-trips — small base, high % uplift.',
};

function getNodeInsight(node) {
  const idKey = (node.id || '').toLowerCase();
  if (NODE_INSIGHTS[idKey]) return NODE_INSIGHTS[idKey];
  const labelKey = (node.label || '').toLowerCase();
  if (NODE_INSIGHTS[labelKey]) return NODE_INSIGHTS[labelKey];
  // Partial match against label tokens
  for (const key of Object.keys(NODE_INSIGHTS)) {
    if (labelKey.includes(key)) return NODE_INSIGHTS[key];
  }
  return null;
}

// Generic relationship labels we treat as low-information when ranking
// the "key signal" — prefer edges with semantic verbs over these.
const GENERIC_REL_LABELS = new Set([
  'related to', 'connected to', 'linked to', 'associated with', 'connects to',
]);

export function showNodeDetail(overlay, node, edges, allNodes) {
  const modal = overlay.querySelector('#modal-content');

  // Gather connections — edges are {from, to, label} objects
  const connections = [];
  edges.forEach(edge => {
    if (edge.from === node.id) {
      const target = allNodes.find(n => n.id === edge.to);
      if (target) connections.push({ node: target, label: edge.label, dir: 'out' });
    }
    if (edge.to === node.id) {
      const source = allNodes.find(n => n.id === edge.from);
      if (source) connections.push({ node: source, label: edge.label, dir: 'in' });
    }
  });
  // De-duplicate by node id (keep first occurrence)
  const seen = new Set();
  const uniqueConns = connections.filter(c => {
    if (seen.has(c.node.id)) return false;
    seen.add(c.node.id); return true;
  });

  // Rank: partner.size desc → semantic (non-generic) label first → label A→Z
  const ranked = [...uniqueConns].sort((a, b) => {
    const sa = a.node.size || 0, sb = b.node.size || 0;
    if (sb !== sa) return sb - sa;
    const ga = GENERIC_REL_LABELS.has((a.label || '').toLowerCase()) ? 1 : 0;
    const gb = GENERIC_REL_LABELS.has((b.label || '').toLowerCase()) ? 1 : 0;
    if (ga !== gb) return ga - gb;
    return (a.node.label || '').localeCompare(b.node.label || '');
  });

  // Distinct partner types — used as a real "type diversity" stat
  const linkedTypes = new Set(uniqueConns.map(c => c.node.type)).size;

  // Hub rank by degree across the whole graph (real, derived from edges)
  const degree = new Map();
  edges.forEach(e => {
    degree.set(e.from, (degree.get(e.from) || 0) + 1);
    degree.set(e.to,   (degree.get(e.to)   || 0) + 1);
  });
  const sortedDegrees = [...degree.entries()].sort((a, b) => b[1] - a[1]);
  const rankIdx = sortedDegrees.findIndex(([id]) => id === node.id);
  const hubRank = rankIdx >= 0 ? rankIdx + 1 : null;
  const totalRanked = sortedDegrees.length || allNodes.length;

  // Pick the single most informative edge: top-ranked partner with a
  // non-generic label (falls back to top-ranked overall).
  const keySignal = ranked.find(c => !GENERIC_REL_LABELS.has((c.label || '').toLowerCase())) || ranked[0] || null;

  // Use DiceBear for real-name nodes; initials fallback for short IDs
  const nodeAvatar = node.id.length <= 3 && !node.id.startsWith('n')
    ? `<span style="font-size:10px;color:${node.color};font-weight:700;">${node.label.slice(0,2).toUpperCase()}</span>`
    : `<img src="https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(node.label)}" alt="${node.label}" style="width:100%;height:100%;border-radius:inherit;" />`;

  const meta    = NODE_TYPE_META[node.type] || NODE_TYPE_META['Entity'];
  const isCore  = !node.id.startsWith('n');
  const insight = getNodeInsight(node);

  // Connection list rendering — compact 2-col grid, filterable by direction & type
  const VISIBLE = 8;
  const renderConnRow = (c) => {
    const tMeta = NODE_TYPE_META[c.node.type] || NODE_TYPE_META['Entity'];
    return `
    <div class="nmd-conn-row nmd-chip--clickable"
      data-cname="${c.node.label.replace(/"/g,'&quot;')}"
      data-ctype="${c.node.type}"
      data-crel="${c.label.replace(/"/g,'&quot;')}"
      data-cdir="${c.dir}"
      data-ccolor="${c.node.color}">
      <span class="nmd-conn-arrow" style="color:${c.node.color};">${c.dir === 'out' ? '→' : '←'}</span>
      <span class="nmd-conn-body">
        <span class="nmd-conn-name">
          <span class="nmd-conn-icon" aria-hidden="true">${tMeta.icon}</span>
          <span class="nmd-conn-label">${c.node.label}</span>
        </span>
        <span class="nmd-conn-rel" style="color:${c.node.color};">${c.label}</span>
      </span>
    </div>`;
  };

  const outConns = ranked.filter(c => c.dir === 'out');
  const inConns  = ranked.filter(c => c.dir === 'in');

  // Count by type for the type-filter pills (only show pills with >=1)
  const typeCounts = {};
  ranked.forEach(c => {
    typeCounts[c.node.type] = (typeCounts[c.node.type] || 0) + 1;
  });
  // Stable order: Person, Company, Entity, GovAgency, MediaOutlet, then anything else
  const TYPE_ORDER = ['Person', 'Company', 'Entity', 'GovAgency', 'MediaOutlet'];
  const typeKeys = [
    ...TYPE_ORDER.filter(t => typeCounts[t]),
    ...Object.keys(typeCounts).filter(t => !TYPE_ORDER.includes(t)),
  ];

  const visibleRows = ranked.slice(0, VISIBLE).map(renderConnRow).join('');
  const hiddenRows  = ranked.slice(VISIBLE).map(renderConnRow).join('');
  const moreCount   = Math.max(0, ranked.length - VISIBLE);

  modal.innerHTML = `
    <div class="modal__close" id="modal-close">✕</div>

    <!-- 1. WHO — identity header -->
    <div class="nmd-header">
      <div class="nmd-avatar" style="background: ${node.color}20; border: 1.5px solid ${node.color}40;">
        ${nodeAvatar}
      </div>
      <div class="nmd-title-block">
        <div class="nmd-label">${node.label}</div>
        <div class="nmd-role-tag" style="color:${node.color};">${meta.icon} ${meta.role}</div>
        <div style="display:flex;gap:5px;margin-top:4px;">
          <span class="badge" style="background:${node.color}2E;color:${node.color};border:1px solid ${node.color}55;font-weight:700;">${node.type}</span>
          ${isCore ? `<span class="badge badge--blue" style="font-weight:700;">Core node</span>` : ''}
        </div>
      </div>
      <div class="nmd-quickstats">
        <div class="nmd-qs"><div class="nmd-qs-val">${uniqueConns.length}</div><div class="nmd-qs-key">Connections</div></div>
        <div class="nmd-qs"><div class="nmd-qs-val">${linkedTypes}</div><div class="nmd-qs-key">Linked types</div></div>
        ${hubRank ? `<div class="nmd-qs"><div class="nmd-qs-val">#${hubRank}<span style="font-size:10px;opacity:.55;font-weight:500;">/${totalRanked}</span></div><div class="nmd-qs-key">Hub rank</div></div>` : ''}
      </div>
    </div>

    <!-- 2. ROLE — what this node does in THIS scenario -->
    <div class="nmd-explain">
      <div class="nmd-explain-badge">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
        Role in this scenario
      </div>
      <div class="nmd-explain-text">${insight || meta.desc(node.label)}</div>
      ${keySignal ? `
        <div class="nmd-keysignal" style="border-left-color:${node.color};">
          <span class="nmd-keysignal-tag" style="color:${node.color};">Key signal</span>
          <span style="opacity:.7;">${keySignal.dir === 'out' ? node.label : keySignal.node.label}</span>
          <span style="color:${keySignal.node.color};font-weight:600;font-style:italic;margin:0 4px;">${keySignal.dir === 'out' ? '→' : '←'} ${keySignal.label} →</span>
          <span style="font-weight:600;color:var(--nmd-text, var(--text-primary));">${keySignal.dir === 'out' ? keySignal.node.label : node.label}</span>
        </div>
      ` : ''}
    </div>

    <!-- 3. WHO — ranked connections -->
    <div class="nmd-connections-section">
      <div class="nmd-conn-head">
        <div class="nmd-section-title">Connected entities</div>
        <div class="nmd-conn-filters" role="tablist">
          <button class="nmd-filter is-active" data-filter="all"  type="button">All <em>${uniqueConns.length}</em></button>
          ${outConns.length ? `<button class="nmd-filter" data-filter="out" type="button">→ Out <em>${outConns.length}</em></button>` : ''}
          ${inConns.length  ? `<button class="nmd-filter" data-filter="in"  type="button">← In  <em>${inConns.length}</em></button>` : ''}
        </div>
      </div>
      <div class="nmd-connections-help">Ranked by partner influence. The verb after each row shows what kind of relationship it is.</div>
      ${typeKeys.length > 1 ? `
        <div class="nmd-type-filters" role="tablist">
          <button class="nmd-tfilter is-active" data-type="all" type="button">All types</button>
          ${typeKeys.map(t => {
            const tm = NODE_TYPE_META[t] || NODE_TYPE_META['Entity'];
            return `<button class="nmd-tfilter" data-type="${t}" type="button"><span class="nmd-tfilter-icon">${tm.icon}</span>${t}<em>${typeCounts[t]}</em></button>`;
          }).join('')}
        </div>
      ` : ''}
      <div class="nmd-conn-grid" id="nmd-conn-list">${visibleRows}</div>
      ${moreCount > 0 ? `
        <div class="nmd-conn-grid" id="nmd-conn-hidden" style="display:none;">${hiddenRows}</div>
        <button id="nmd-conn-toggle" type="button">Show all ${uniqueConns.length} (+${moreCount})</button>
      ` : ''}
      <div class="nmd-conn-empty" id="nmd-conn-empty" style="display:none;">No connections match this filter.</div>
    </div>
  `;

  overlay.classList.add('open');
  modal.querySelector('#modal-close').addEventListener('click', () => closeModal(overlay));

  // ── Chip click popover ─────────────────────────────────────────────────
  // Append to overlay (full-viewport, position:fixed) instead of modal so
  // it can never be clipped by the modal's scroll container.
  let chipPop = overlay.querySelector('.nmd-chip-popover');
  if (!chipPop) {
    chipPop = document.createElement('div');
    chipPop.className = 'nmd-chip-popover';
    chipPop.style.display = 'none';
    overlay.appendChild(chipPop);
  }

  function closePop() { chipPop.style.display = 'none'; }
  // Don't let clicks inside the popover bubble up to modal/overlay close handlers.
  chipPop.addEventListener('click', e => e.stopPropagation());

  modal.querySelectorAll('.nmd-chip--clickable').forEach(chip => {
    chip.addEventListener('click', e => {
      e.stopPropagation();
      const cname  = chip.dataset.cname;
      const ctype  = chip.dataset.ctype;
      const crel   = chip.dataset.crel;
      const cdir   = chip.dataset.cdir;
      const ccolor = chip.dataset.ccolor;

      const meta = NODE_TYPE_META[ctype] || NODE_TYPE_META['Entity'];

      const fromLabel = cdir === 'out' ? node.label : cname;
      const toLabel   = cdir === 'out' ? cname       : node.label;
      const relHtml   = `<span style="opacity:.7">${fromLabel}</span> <span class="nmd-cpop-arrow">→</span> <em style="color:${ccolor};font-style:normal;font-weight:600;">${crel}</em> <span class="nmd-cpop-arrow">→</span> <span style="opacity:.7">${toLabel}</span>`;

      const fullDesc = meta.desc(cname);
      const shortDesc = fullDesc.length > 160 ? fullDesc.slice(0, 157) + '…' : fullDesc;

      chipPop.innerHTML = `
        <div class="nmd-cpop-header">
          <span class="nmd-cpop-dot" style="background:${ccolor};"></span>
          <span class="nmd-cpop-name">${cname}</span>
          <span class="nmd-cpop-badge" style="background:${ccolor}2E;color:${ccolor};border:1px solid ${ccolor}55;">${meta.icon} ${ctype}</span>
          <button class="nmd-cpop-close" title="Close">✕</button>
        </div>
        <div class="nmd-cpop-rel">${relHtml}</div>
        <div class="nmd-cpop-desc">${shortDesc}</div>
      `;

      const chipRect = chip.getBoundingClientRect();
      // Position with viewport coordinates — popover is fixed-position so
      // it isn't bound by the modal's scroll container.
      chipPop.style.display = 'block';
      const popW = chipPop.offsetWidth || 280;
      const popH = chipPop.offsetHeight || 120;
      const margin = 8;
      // Prefer below the chip; flip above if there isn't room.
      let top = chipRect.bottom + 6;
      if (top + popH > window.innerHeight - margin) {
        top = Math.max(margin, chipRect.top - popH - 6);
      }
      let left = chipRect.left;
      const maxLeft = window.innerWidth - popW - margin;
      left = Math.max(margin, Math.min(left, maxLeft));
      chipPop.style.top  = top  + 'px';
      chipPop.style.left = left + 'px';

      chipPop.querySelector('.nmd-cpop-close').addEventListener('click', e2 => {
        e2.stopPropagation(); closePop();
      });
    });
  });

  modal.addEventListener('click', () => closePop());

  // ── Direction + type filters ───────────────────────────────────────────
  const dirBtns    = modal.querySelectorAll('.nmd-filter');
  const typeBtns   = modal.querySelectorAll('.nmd-tfilter');
  const listEl     = modal.querySelector('#nmd-conn-list');
  const hiddenBox  = modal.querySelector('#nmd-conn-hidden');
  const toggleBtn  = modal.querySelector('#nmd-conn-toggle');
  const emptyEl    = modal.querySelector('#nmd-conn-empty');

  let dirFilter  = 'all';
  let typeFilter = 'all';

  function applyFilters() {
    let shown = 0;
    let hiddenShown = 0;
    const apply = (root, isHidden) => {
      if (!root) return 0;
      let n = 0;
      root.querySelectorAll('.nmd-conn-row').forEach(row => {
        const dir = row.dataset.cdir;
        const t   = row.dataset.ctype;
        const ok = (dirFilter === 'all' || dir === dirFilter)
                && (typeFilter === 'all' || t   === typeFilter);
        row.style.display = ok ? '' : 'none';
        if (ok) n++;
      });
      return n;
    };
    shown       = apply(listEl, false);
    hiddenShown = apply(hiddenBox, true);
    if (emptyEl) emptyEl.style.display = (shown + hiddenShown === 0) ? '' : 'none';
  }

  dirBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      dirBtns.forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      dirFilter = btn.dataset.filter;
      applyFilters();
    });
  });

  typeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      typeBtns.forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      typeFilter = btn.dataset.type;
      applyFilters();
    });
  });

  // ── "Show all" toggle for the connections list ─────────────────────────
  if (toggleBtn && hiddenBox) {
    let expanded = false;
    toggleBtn.addEventListener('click', () => {
      expanded = !expanded;
      hiddenBox.style.display = expanded ? '' : 'none';
      toggleBtn.textContent = expanded
        ? 'Show fewer'
        : `Show all ${uniqueConns.length} (+${moreCount})`;
    });
  }
}


function closeModal(overlay) {
  overlay.classList.remove('open');
}

function capitalizeFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function getTraitColor(trait) {
  const colors = { openness: '#2383E2', conscientiousness: '#0F7B6C', extraversion: '#D9730D', agreeableness: '#6940A5', neuroticism: '#E03E3E' };
  return colors[trait] || '#9B9A97';
}

function drawRadar(canvas, personality) {
  if (!canvas) return;
  const size = 240;
  const dpr = devicePixelRatio;
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  canvas.style.width = size + 'px';
  canvas.style.height = size + 'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const cx = size / 2;
  const cy = size / 2;
  const r = 90;
  const traits = Object.keys(personality);
  const values = Object.values(personality);
  const n = traits.length;

  // Background rings
  for (let ring = 1; ring <= 4; ring++) {
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const angle = (Math.PI * 2 / n) * i - Math.PI / 2;
      const x = cx + Math.cos(angle) * (r * ring / 4);
      const y = cy + Math.sin(angle) * (r * ring / 4);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = 'rgba(55,53,47,0.08)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Axes
  for (let i = 0; i < n; i++) {
    const angle = (Math.PI * 2 / n) * i - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
    ctx.strokeStyle = 'rgba(55,53,47,0.06)';
    ctx.stroke();
  }

  // Data polygon
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const angle = (Math.PI * 2 / n) * i - Math.PI / 2;
    const val = values[i] / 100;
    const x = cx + Math.cos(angle) * r * val;
    const y = cy + Math.sin(angle) * r * val;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = 'rgba(35,131,226,0.12)';
  ctx.fill();
  ctx.strokeStyle = '#2383E2';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Points + labels
  for (let i = 0; i < n; i++) {
    const angle = (Math.PI * 2 / n) * i - Math.PI / 2;
    const val = values[i] / 100;
    const px = cx + Math.cos(angle) * r * val;
    const py = cy + Math.sin(angle) * r * val;
    ctx.beginPath();
    ctx.arc(px, py, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#2383E2';
    ctx.fill();

    const lx = cx + Math.cos(angle) * (r + 16);
    const ly = cy + Math.sin(angle) * (r + 16);
    ctx.font = '10px Inter, sans-serif';
    ctx.fillStyle = '#787774';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(capitalizeFirst(traits[i].slice(0, 4)), lx, ly);
  }
}
