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

// Seeded pseudo-random stat values per node
function nodeStatValue(nodeId, idx) {
  const seed = nodeId.charCodeAt(0) + nodeId.charCodeAt(nodeId.length - 1) + idx * 37;
  return 42 + (seed * 1317) % 51; // 42–92
}

export function showNodeDetail(overlay, node, edges, allNodes) {
  const modal = overlay.querySelector('#modal-content');

  // Gather connections — edges are now {from, to, label} objects
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

  // Group unique connections by type
  const byType = {};
  uniqueConns.forEach(c => {
    if (!byType[c.node.type]) byType[c.node.type] = [];
    byType[c.node.type].push(c);
  });

  // Use DiceBear for all real-name nodes; initials fallback for short IDs
  const nodeAvatar = node.id.length <= 3 && !node.id.startsWith('n')
    ? `<span style="font-size:10px;color:${node.color};font-weight:700;">${node.label.slice(0,2).toUpperCase()}</span>`
    : `<img src="https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(node.label)}" alt="${node.label}" style="width:100%;height:100%;border-radius:inherit;" />`;

  const meta   = NODE_TYPE_META[node.type] || NODE_TYPE_META['Entity'];
  const isCore = !node.id.startsWith('n');

  // Simulate stats
  const statValues = meta.stats.map((label, i) => ({
    label,
    value: nodeStatValue(node.id, i),
  }));

  // Derived econ weight (bigger nodes = higher weight)
  const econWeight = Math.min(99, Math.round((node.size / 20) * 100));

  modal.innerHTML = `
    <div class="modal__close" id="modal-close">✕</div>

    <!-- Header -->
    <div class="nmd-header">
      <div class="nmd-avatar" style="background: ${node.color}20; border: 1.5px solid ${node.color}40;">
        ${nodeAvatar}
      </div>
      <div class="nmd-title-block">
        <div class="nmd-label">${node.label}</div>
        <div class="nmd-role-tag" style="color:${node.color};">${meta.icon} ${meta.role}</div>
        <div style="display:flex;gap:5px;margin-top:4px;">
          <span class="badge" style="background:${node.color}2E;color:${node.color};border:1px solid ${node.color}55;font-weight:700;">${node.type}</span>
          ${isCore ? `<span class="badge badge--blue" style="font-weight:700;">Core Node</span>` : ''}
        </div>
      </div>
      <div class="nmd-quickstats">
        <div class="nmd-qs"><div class="nmd-qs-val">${uniqueConns.length}</div><div class="nmd-qs-key">Connections</div></div>
        <div class="nmd-qs"><div class="nmd-qs-val">${econWeight}%</div><div class="nmd-qs-key">Econ Weight</div></div>
        <div class="nmd-qs"><div class="nmd-qs-val">${Math.round(node.size * 8)}</div><div class="nmd-qs-key">Influence pts</div></div>
      </div>
    </div>

    <!-- What this node does -->
    <div class="nmd-explain">
      <div class="nmd-explain-badge">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
        How this node affects the simulation
      </div>
      <div class="nmd-explain-text">${meta.desc(node.label)}</div>
    </div>

    <!-- Simulation metrics -->
    <div class="nmd-metrics-grid">
      ${statValues.map((s, i) => `
        <div class="nmd-metric">
          <div class="nmd-metric-bar-wrap">
            <div class="nmd-metric-bar" style="width:${s.value}%;background:${node.color};"></div>
          </div>
          <div class="nmd-metric-row">
            <span class="nmd-metric-label">${s.label}</span>
            <span class="nmd-metric-val" style="color:${node.color};">${s.value}<span style="font-size:9px;opacity:0.55;font-weight:400;">/100</span></span>
          </div>
        </div>
      `).join('')}
    </div>

    <!-- Simulate interaction CTA -->
    <div class="nmd-simulate-row">
      <button class="nmd-sim-btn" id="nmd-sim-btn">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        Simulate 1 Round Interaction
      </button>
      <div class="nmd-sim-result" id="nmd-sim-result" style="display:none;"></div>
    </div>

    <!-- Connected entities grouped by type with relationship labels -->
    <div class="nmd-connections-section">
      <div class="nmd-section-title">Connected Entities (${uniqueConns.length})</div>
      <div class="nmd-connections-help">These nodes send or receive economic signals to/from <strong>${node.label}</strong> in each simulation round. Arrows show direction; labels show relationship type.</div>
      ${Object.entries(byType).map(([type, conns]) => `
        <div class="nmd-type-group">
          <div class="nmd-type-label">${type} <span class="nmd-type-count">${conns.length}</span></div>
          <div class="nmd-chips">
            ${conns.slice(0, 24).map(c => `
              <div class="nmd-chip nmd-chip--clickable"
                style="border-color:${c.node.color}30;cursor:pointer;"
                data-cname="${c.node.label.replace(/"/g,'&quot;')}"
                data-ctype="${c.node.type}"
                data-crel="${c.label.replace(/"/g,'&quot;')}"
                data-cdir="${c.dir}"
                data-ccolor="${c.node.color}">
                <span class="nmd-chip-dot" style="background:${c.node.color};"></span>
                <span class="nmd-chip-name">${c.node.label}</span>
                <span class="nmd-chip-rel" style="color:${c.node.color};">${c.dir === 'out' ? '→' : '←'} ${c.label}</span>
              </div>
            `).join('')}
            ${conns.length > 24 ? `<div class="nmd-chip nmd-chip--more">+${conns.length - 24} more</div>` : ''}
          </div>
        </div>
      `).join('')}
    </div>
  `;

  overlay.classList.add('open');
  modal.querySelector('#modal-close').addEventListener('click', () => closeModal(overlay));

  // ── Chip click popover ─────────────────────────────────────────────────
  let chipPop = modal.querySelector('.nmd-chip-popover');
  if (!chipPop) {
    chipPop = document.createElement('div');
    chipPop.className = 'nmd-chip-popover';
    chipPop.style.display = 'none';
    modal.appendChild(chipPop);
  }

  function closePop() { chipPop.style.display = 'none'; }

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

      const chipRect  = chip.getBoundingClientRect();
      const modalRect = modal.getBoundingClientRect();
      const topInModal   = chipRect.bottom - modalRect.top + modal.scrollTop + 6;
      let  leftInModal   = chipRect.left   - modalRect.left;
      chipPop.style.display = 'block';
      const popW = chipPop.offsetWidth || 280;
      const maxLeft = modal.clientWidth - popW - 12;
      leftInModal = Math.max(8, Math.min(leftInModal, maxLeft));
      chipPop.style.top  = topInModal + 'px';
      chipPop.style.left = leftInModal + 'px';

      chipPop.querySelector('.nmd-cpop-close').addEventListener('click', e2 => {
        e2.stopPropagation(); closePop();
      });
    });
  });

  modal.addEventListener('click', () => closePop());

  // Simulate interaction button
  const simBtn    = modal.querySelector('#nmd-sim-btn');
  const simResult = modal.querySelector('#nmd-sim-result');
  const simTexts  = [
    `📡 Round simulated: ${node.label} processed ${Math.floor(Math.random()*400+80)} agent interactions. Demand signal propagated to ${Math.floor(uniqueConns.length * 0.35)} downstream nodes. Estimated round contribution: S$${(Math.random()*4+0.5).toFixed(1)}M.`,
    `🔁 Round output: ${node.label} transmitted behavioral signals across ${uniqueConns.length} edges. ${Math.floor(uniqueConns.length * 0.2)} agents updated spending intent. Net sentiment shift: +${(Math.random()*8+1).toFixed(1)}pp.`,
    `📊 Simulation step: ${node.label} registered ${Math.floor(Math.random()*300+200)} inbound events. Economic multiplier applied: ${(Math.random()*0.6+1.6).toFixed(2)}×. Throughput within normal range.`,
  ];
  let simIdx = 0;
  simBtn.addEventListener('click', () => {
    closePop();
    simResult.style.display = 'block';
    simResult.textContent = '';
    simResult.classList.add('nmd-sim-result--typing');
    const text = simTexts[simIdx % simTexts.length];
    simIdx++;
    let i = 0;
    simBtn.disabled = true;
    simBtn.style.opacity = '0.5';
    const interval = setInterval(() => {
      simResult.textContent += text[i++];
      if (i >= text.length) {
        clearInterval(interval);
        simBtn.disabled = false;
        simBtn.style.opacity = '1';
        simBtn.innerHTML = `
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          Simulate Next Round
        `;
      }
    }, 18);
  });
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
