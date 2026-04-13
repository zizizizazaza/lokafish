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

export function showNodeDetail(overlay, node, edges, allNodes) {
  const modal = overlay.querySelector('#modal-content');
  const connections = [];
  edges.forEach(([from, to]) => {
    if (from === node.id) {
      const target = allNodes.find(n => n.id === to);
      if (target) connections.push(target);
    }
    if (to === node.id) {
      const source = allNodes.find(n => n.id === from);
      if (source) connections.push(source);
    }
  });

  // Generate avatar — use DiceBear for named nodes
  const nodeAvatar = node.label.includes('_')
    ? `<span style="font-size:10px;color:${node.color};font-weight:700;">${node.label.slice(0,2).toUpperCase()}</span>`
    : `<img src="https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(node.label)}" alt="${node.label}" style="width:100%;height:100%;border-radius:inherit;" />`;

  modal.innerHTML = `
    <div class="modal__close" id="modal-close">✕</div>
    <div class="modal__header" style="border-bottom: 1px solid var(--border); padding-bottom: 16px;">
      <div class="modal__avatar" style="background: ${node.color}22; overflow:hidden; width: 48px; height: 48px;">${nodeAvatar}</div>
      <div class="modal__info">
        <div class="modal__name">${node.label}</div>
        <div class="modal__role">Type: ${node.type}</div>
        <span class="badge" style="background: ${node.color}15; color: ${node.color}; margin-top: 4px;">${node.type}</span>
      </div>
      <div class="modal__meta">
        <div class="modal__meta-row"><span>Node ID</span><span class="mono">${node.id}</span></div>
        <div class="modal__meta-row"><span>Size</span><span class="mono">${node.size}</span></div>
        <div class="modal__meta-row"><span>Connections</span><span class="mono">${connections.length}</span></div>
      </div>
    </div>

    <div class="modal__section">
      <div class="modal__section-title">Connected Entities (${connections.length})</div>
      <div class="modal__connections">
        ${connections.map(c => `
          <div class="modal__connection">
            <div class="modal__conn-dot" style="background: ${c.color};"></div>
            <span>${c.label}</span>
            <span class="badge" style="background: ${c.color}15; color: ${c.color}; font-size: 9px;">${c.type}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  overlay.classList.add('open');
  modal.querySelector('#modal-close').addEventListener('click', () => closeModal(overlay));
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
