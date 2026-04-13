// Analytics — Real Singapore map with Leaflet + interactive charts

import { heatmapData, gdpChartData, industryData, flowData } from '../data/analytics.js';
import { singaporeDistricts, landmarks } from '../components/singapore-map.js';
import { entityTypes } from '../data/agents.js';
import { delay } from '../utils/animation.js';

export function createAnalytics(onComplete) {
  const el = document.createElement('div');
  el.className = 'screen analytics-screen';
  el.id = 'screen-analytics';

  el.innerHTML = `
    <div class="analytics-screen__header anim-fade-up">
      <div class="badge badge--blue" style="margin-bottom: 6px;">Quantitative Analysis</div>
      <h2 class="analytics-screen__title">Simulation Results</h2>
      <p style="color: var(--text-secondary); font-size: 14px;">Click any chart element for detailed breakdowns</p>
    </div>

    <div class="analytics-screen__grid">
      <div class="analytics-panel analytics-panel--wide" style="animation-delay: 0.08s;">
        <div class="analytics-panel__title">Singapore Economic Impact Map</div>
        <div class="analytics-map-wrapper" style="position:relative;">
          <div id="sg-leaflet-map" style="width:100%;height:360px;border-radius:8px;z-index:0;"></div>
          <div id="map-info" style="position:absolute;top:12px;right:12px;width:200px;z-index:1000;background:rgba(255,255,255,0.95);border-radius:8px;padding:12px;box-shadow:0 2px 8px rgba(0,0,0,0.12);font-size:12px;">
            <div id="map-info-title" style="font-weight:600;margin-bottom:4px;">Click a marker</div>
            <div id="map-info-body" style="color:var(--text-secondary);line-height:1.6;">Interact with the map to view district impact data</div>
          </div>
        </div>
        <div class="analytics-map-legend">
          ${singaporeDistricts.map(d => `
            <span class="analytics-map-legend__item" data-district="${d.id}">
              <span class="analytics-map-legend__dot" style="background:${d.color};"></span>
              ${d.name.replace(' Region', '')}
              <span class="mono" style="color: var(--text-muted); font-size: 10px;">${d.impact}</span>
            </span>
          `).join('')}
        </div>
      </div>

      <div class="analytics-panel" style="animation-delay: 0.16s;">
        <div class="analytics-panel__title">GDP Growth Projection</div>
        <canvas id="gdp-canvas" width="500" height="300"></canvas>
        <div class="analytics-tooltip" id="gdp-tooltip"></div>
      </div>

      <div class="analytics-panel" style="animation-delay: 0.24s;">
        <div class="analytics-panel__title">Industry Impact ($M)
          <span class="analytics-panel__subtitle">Click bars for detail</span>
        </div>
        <canvas id="industry-canvas" width="500" height="300"></canvas>
        <div class="analytics-tooltip" id="industry-tooltip"></div>
      </div>

      <div class="analytics-panel" style="animation-delay: 0.32s;">
        <div class="analytics-panel__title">Visitor Origin Distribution
          <span class="analytics-panel__subtitle">Click slices</span>
        </div>
        <canvas id="flow-canvas" width="500" height="300"></canvas>
        <div class="analytics-tooltip" id="flow-tooltip"></div>
      </div>

      <div class="analytics-panel" style="animation-delay: 0.4s;">
        <div class="analytics-panel__title">Sentiment Timeline
          <span class="analytics-panel__subtitle">Hover for values</span>
        </div>
        <canvas id="sentiment-canvas" width="500" height="300"></canvas>
        <div class="analytics-tooltip" id="sentiment-tooltip"></div>
      </div>
    </div>

    <div style="text-align: center; padding: 16px 0;">
      <button class="btn btn--primary btn--lg" id="btn-gen-report">Generate Research Report →</button>
    </div>
  `;

  el.querySelector('#btn-gen-report').addEventListener('click', onComplete);

  // ——— Real Singapore map with Leaflet ———
  const setupLeafletMap = () => {
    const mapContainer = el.querySelector('#sg-leaflet-map');
    if (!mapContainer || !window.L) return;

    const map = L.map(mapContainer, {
      center: [1.3521, 103.8198],
      zoom: 12,
      scrollWheelZoom: false,
      zoomControl: true,
      attributionControl: false,
    });

    // Clean grayscale tile layer from CARTO
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    L.control.attribution({ prefix: false, position: 'bottomleft' })
      .addAttribution('© <a href="https://carto.com">CARTO</a> © <a href="https://osm.org">OSM</a>')
      .addTo(map);

    // Economic impact hotspots
    const hotspots = [
      { lat: 1.3058, lng: 103.8752, name: 'National Stadium', impact: '$48M', density: 0.95, agents: 420, color: '#E03E3E', radius: 700 },
      { lat: 1.2834, lng: 103.8607, name: 'Marina Bay Sands', impact: '$89M', density: 1.0, agents: 380, color: '#2383E2', radius: 800 },
      { lat: 1.3644, lng: 103.9915, name: 'Changi Airport', impact: '$32M', density: 0.65, agents: 280, color: '#0F7B6C', radius: 900 },
      { lat: 1.3048, lng: 103.8318, name: 'Orchard Road', impact: '$45M', density: 0.72, agents: 310, color: '#D9730D', radius: 600 },
      { lat: 1.2906, lng: 103.8465, name: 'Clarke Quay / Boat Quay', impact: '$22M', density: 0.50, agents: 180, color: '#6940A5', radius: 400 },
      { lat: 1.2494, lng: 103.8303, name: 'Sentosa Island', impact: '$18M', density: 0.40, agents: 160, color: '#D9730D', radius: 500 },
      { lat: 1.2814, lng: 103.8505, name: 'CBD / Raffles Place', impact: '$65M', density: 0.85, agents: 350, color: '#2383E2', radius: 600 },
      { lat: 1.4043, lng: 103.7930, name: 'Woodlands', impact: '$12M', density: 0.20, agents: 90, color: '#9B9A97', radius: 400 },
      { lat: 1.3329, lng: 103.7436, name: 'Jurong East', impact: '$18M', density: 0.30, agents: 120, color: '#9B9A97', radius: 450 },
      { lat: 1.3526, lng: 103.9447, name: 'Tampines', impact: '$15M', density: 0.28, agents: 110, color: '#9B9A97', radius: 400 },
      { lat: 1.3502, lng: 103.8713, name: 'Serangoon', impact: '$14M', density: 0.25, agents: 100, color: '#9B9A97', radius: 350 },
      { lat: 1.3375, lng: 103.7764, name: 'Bukit Timah', impact: '$20M', density: 0.35, agents: 140, color: '#0F7B6C', radius: 400 },
    ];

    hotspots.forEach(spot => {
      // Heatmap circle
      const circle = L.circle([spot.lat, spot.lng], {
        radius: spot.radius,
        color: spot.color,
        fillColor: spot.color,
        fillOpacity: 0.22,
        weight: 1.5,
      }).addTo(map);

      // Center dot
      L.circleMarker([spot.lat, spot.lng], {
        radius: 4, color: spot.color, fillColor: spot.color,
        fillOpacity: 0.9, weight: 0,
      }).addTo(map);

      // Popup
      circle.bindPopup(`
        <div style="font-family:Inter,sans-serif;font-size:12px;line-height:1.6;">
          <div style="font-weight:700;font-size:14px;margin-bottom:4px;">${spot.name}</div>
          <div><strong>Economic Impact:</strong> ${spot.impact}</div>
          <div><strong>Active Agents:</strong> ${spot.agents}</div>
          <div><strong>Density:</strong> ${(spot.density * 100).toFixed(0)}%</div>
          <hr style="border:none;border-top:1px solid #eee;margin:6px 0;">
          <div style="font-size:10px;color:#888;">
            Tourism: ${Math.round(spot.density * 42)}% ·
            Hospitality: ${Math.round(spot.density * 38)}% ·
            Retail: ${Math.round(spot.density * 25)}%
          </div>
        </div>
      `, { maxWidth: 240 });

      circle.on('click', () => {
        el.querySelector('#map-info-title').textContent = spot.name;
        el.querySelector('#map-info-body').innerHTML = `
          <div><strong>Impact:</strong> ${spot.impact}</div>
          <div><strong>Agents:</strong> ${spot.agents}</div>
          <div><strong>Density:</strong> ${(spot.density * 100).toFixed(0)}%</div>
        `;
      });

      circle.on('mouseover', () => circle.setStyle({ fillOpacity: 0.45, weight: 2.5 }));
      circle.on('mouseout', () => circle.setStyle({ fillOpacity: 0.22, weight: 1.5 }));
    });

    // Resize fix
    setTimeout(() => map.invalidateSize(), 300);
  };

  el._runAnimation = async () => {
    await delay(100);
    setupLeafletMap();
    await delay(60);
    drawGDPChart(el);
    await delay(60);
    drawIndustryBars(el);
    await delay(60);
    drawVisitorFlow(el);
    await delay(60);
    drawSentimentChart(el);
  };

  return el;
}

// ——— Shared chart utilities ———

function setupCanvas(canvas) {
  const w = canvas.width, h = canvas.height;
  const dpr = devicePixelRatio;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  return { ctx, w, h };
}

function showTooltip(tooltipEl, x, y, html) {
  tooltipEl.innerHTML = html;
  tooltipEl.style.left = x + 'px';
  tooltipEl.style.top = y + 'px';
  tooltipEl.classList.add('visible');
}

function hideTooltip(tooltipEl) {
  tooltipEl.classList.remove('visible');
}

// ——— GDP Chart ———

function drawGDPChart(el) {
  const canvas = el.querySelector('#gdp-canvas');
  const tooltip = el.querySelector('#gdp-tooltip');
  const { ctx, w, h } = setupCanvas(canvas);
  const data = gdpChartData;
  const pad = { top: 30, right: 20, bottom: 40, left: 45 };
  const cw = w - pad.left - pad.right;
  const ch = h - pad.top - pad.bottom;
  const maxVal = 240, minVal = 85;
  const upper = [100, 112, 135, 170, 245, 210, 168, 140, 128];
  const lower = [100, 98, 102, 120, 175, 148, 118, 102, 98];

  const getX = (i) => pad.left + (cw / (data.labels.length - 1)) * i;
  const getY = (v) => pad.top + ch - ((v - minVal) / (maxVal - minVal)) * ch;

  let hoveredPoint = -1;

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    for (let i = 0; i < data.withConcert.length; i++) {
      if (Math.abs(mx - getX(i)) < 20) {
        hoveredPoint = i;
        showTooltip(tooltip, mx + 10, e.clientY - rect.top - 40, `
          <div style="font-weight:600">${data.labels[i]}</div>
          <div>Projection: <strong>${data.withConcert[i]}</strong></div>
          <div>Baseline: ${data.baseline[i]}</div>
          <div>CI: [${lower[i]}, ${upper[i]}]</div>
          <div style="color:var(--blue)">Uplift: +${data.withConcert[i] - data.baseline[i]}%</div>
        `);
        return;
      }
    }
    hoveredPoint = -1;
    hideTooltip(tooltip);
  });

  canvas.addEventListener('mouseleave', () => { hoveredPoint = -1; hideTooltip(tooltip); });

  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    for (let i = 0; i < data.withConcert.length; i++) {
      if (Math.abs(mx - getX(i)) < 20) {
        showTooltip(tooltip, mx + 10, e.clientY - rect.top - 60, `
          <div style="font-weight:600;font-size:14px;">${data.labels[i]}</div>
          <hr style="border:none;border-top:1px solid var(--border);margin:4px 0;">
          <div>GDP Index: <strong>${data.withConcert[i]}</strong></div>
          <div>Baseline: ${data.baseline[i]}</div>
          <div>80% CI: [${lower[i]} — ${upper[i]}]</div>
          <div style="color:var(--blue);margin-top:4px;">Total Uplift: <strong>+${data.withConcert[i] - data.baseline[i]}%</strong></div>
          <div style="font-size:10px;color:var(--text-muted);margin-top:4px;">Monte Carlo n=10,000</div>
        `);
        return;
      }
    }
  });

  let progress = 0;
  function animate() {
    progress = Math.min(progress + 0.02, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    ctx.clearRect(0, 0, w, h);

    // Grid
    ctx.strokeStyle = 'rgba(55,53,47,0.06)'; ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = pad.top + (ch / 5) * i;
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(w - pad.right, y); ctx.stroke();
      ctx.font = '9px JetBrains Mono, monospace'; ctx.fillStyle = '#B4B4B0'; ctx.textAlign = 'right';
      ctx.fillText((maxVal - ((maxVal - minVal) / 5) * i).toFixed(0), pad.left - 6, y + 4);
    }
    data.labels.forEach((l, i) => {
      ctx.font = '9px Inter, sans-serif'; ctx.fillStyle = '#B4B4B0'; ctx.textAlign = 'center';
      ctx.fillText(l, getX(i), h - pad.bottom + 16);
    });

    const cnt = Math.ceil(data.withConcert.length * eased);

    // CI band
    if (cnt > 1) {
      ctx.beginPath();
      for (let i = 0; i < cnt; i++) ctx.lineTo(getX(i), getY(upper[i]));
      for (let i = cnt - 1; i >= 0; i--) ctx.lineTo(getX(i), getY(lower[i]));
      ctx.closePath();
      ctx.fillStyle = 'rgba(35,131,226,0.08)'; ctx.fill();
    }

    // Baseline
    ctx.beginPath();
    for (let i = 0; i < cnt; i++) {
      if (i === 0) ctx.moveTo(getX(i), getY(data.baseline[i]));
      else ctx.lineTo(getX(i), getY(data.baseline[i]));
    }
    ctx.strokeStyle = '#B4B4B0'; ctx.lineWidth = 1; ctx.setLineDash([4, 4]); ctx.stroke(); ctx.setLineDash([]);

    // Projection
    ctx.beginPath();
    for (let i = 0; i < cnt; i++) {
      if (i === 0) ctx.moveTo(getX(i), getY(data.withConcert[i]));
      else ctx.lineTo(getX(i), getY(data.withConcert[i]));
    }
    ctx.strokeStyle = '#2383E2'; ctx.lineWidth = 2; ctx.stroke();

    for (let i = 0; i < cnt; i++) {
      const isHovered = i === hoveredPoint;
      ctx.beginPath();
      ctx.arc(getX(i), getY(data.withConcert[i]), isHovered ? 5 : 3, 0, Math.PI * 2);
      ctx.fillStyle = isHovered ? '#1a6bc4' : '#2383E2'; ctx.fill();
      if (isHovered) { ctx.strokeStyle = '#2383E2'; ctx.lineWidth = 2; ctx.stroke(); }
    }

    ctx.font = '10px Inter'; ctx.textAlign = 'left';
    ctx.fillStyle = '#B4B4B0'; ctx.fillText('--- Baseline', pad.left, pad.top - 10);
    ctx.fillStyle = '#2383E2'; ctx.fillText('— Projection (80% CI)', pad.left + 70, pad.top - 10);

    if (progress < 1) requestAnimationFrame(animate);
  }
  animate();
}

// ——— Industry Bars ———

function drawIndustryBars(el) {
  const canvas = el.querySelector('#industry-canvas');
  const tooltip = el.querySelector('#industry-tooltip');
  const { ctx, w, h } = setupCanvas(canvas);
  const pad = { top: 12, right: 30, bottom: 16, left: 100 };
  const ch = h - pad.top - pad.bottom;
  const barHeight = (ch / industryData.length) - 5;
  const maxVal = Math.max(...industryData.map(d => d.value));
  let hoveredBar = -1;

  const barRects = industryData.map((item, i) => {
    const y = pad.top + (ch / industryData.length) * i + 2;
    const barW = (w - pad.left - pad.right) * (item.value / maxVal);
    return { x: pad.left, y, w: barW, h: barHeight, item };
  });

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    hoveredBar = -1;
    for (let i = 0; i < barRects.length; i++) {
      const r = barRects[i];
      if (mx >= r.x && mx <= r.x + r.w + 60 && my >= r.y && my <= r.y + r.h) {
        hoveredBar = i;
        showTooltip(tooltip, mx + 10, my - 30, `
          <div style="font-weight:600">${r.item.label}</div>
          <div>Impact: <strong>$${r.item.value}M</strong></div>
          <div style="color:var(--green)">Growth: +${r.item.growth}</div>
        `);
        break;
      }
    }
    if (hoveredBar === -1) hideTooltip(tooltip);
  });
  canvas.addEventListener('mouseleave', () => { hoveredBar = -1; hideTooltip(tooltip); });

  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    for (let i = 0; i < barRects.length; i++) {
      const r = barRects[i];
      if (mx >= r.x && mx <= r.x + r.w + 60 && my >= r.y && my <= r.y + r.h) {
        showTooltip(tooltip, mx + 10, my - 50, `
          <div style="font-weight:600;font-size:14px">${r.item.label}</div>
          <hr style="border:none;border-top:1px solid var(--border);margin:4px 0;">
          <div>Direct Revenue: <strong>$${r.item.value}M</strong></div>
          <div>YoY Growth: <strong>${r.item.growth}</strong></div>
          <div>Share of Total: ${(r.item.value / industryData.reduce((s, d) => s + d.value, 0) * 100).toFixed(1)}%</div>
          <div>Employment: ~${Math.round(r.item.value * 28)} jobs</div>
        `);
        break;
      }
    }
  });

  let progress = 0;
  function animate() {
    progress = Math.min(progress + 0.025, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    ctx.clearRect(0, 0, w, h);

    industryData.forEach((item, i) => {
      const r = barRects[i];
      const barW = r.w * eased;
      const isHovered = i === hoveredBar;

      ctx.font = '11px Inter, sans-serif'; ctx.fillStyle = '#787774'; ctx.textAlign = 'right';
      ctx.fillText(item.label, pad.left - 8, r.y + barHeight / 2 + 4);

      ctx.fillStyle = isHovered ? '#E8E8E4' : '#F1F1EF';
      ctx.fillRect(pad.left, r.y, w - pad.left - pad.right, barHeight);

      ctx.fillStyle = isHovered ? item.color : item.color + 'cc';
      ctx.fillRect(pad.left, r.y, barW, barHeight);

      if (eased > 0.5) {
        ctx.font = '10px JetBrains Mono'; ctx.fillStyle = '#37352F'; ctx.textAlign = 'left';
        ctx.fillText(`$${item.value}M`, pad.left + barW + 6, r.y + barHeight / 2 + 4);
      }
    });
    if (progress < 1) requestAnimationFrame(animate);
  }
  animate();
}

// ——— Visitor Flow (Donut) ———

function drawVisitorFlow(el) {
  const canvas = el.querySelector('#flow-canvas');
  const tooltip = el.querySelector('#flow-tooltip');
  const { ctx, w, h } = setupCanvas(canvas);
  const d = flowData;
  const total = d.sources.reduce((s, v) => s + v.value, 0);
  const cx = w * 0.34, cy = h * 0.5;
  const outerR = Math.min(w, h) * 0.33;
  const innerR = outerR * 0.6;

  const slices = [];
  let angle = -Math.PI / 2;
  d.sources.forEach(src => {
    const start = angle;
    const sweep = (src.value / total) * Math.PI * 2;
    slices.push({ start, end: start + sweep, src });
    angle += sweep;
  });

  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left - cx;
    const my = e.clientY - rect.top - cy;
    const dist = Math.sqrt(mx * mx + my * my);
    if (dist >= innerR && dist <= outerR) {
      const clickAngle = Math.atan2(my, mx);
      const normAngle = clickAngle < -Math.PI / 2 ? clickAngle + Math.PI * 2 : clickAngle;
      for (const slice of slices) {
        const ns = slice.start < -Math.PI / 2 ? slice.start + Math.PI * 2 : slice.start;
        const ne = slice.end < -Math.PI / 2 ? slice.end + Math.PI * 2 : slice.end;
        if (normAngle >= ns && normAngle < ne) {
          showTooltip(tooltip, e.clientX - rect.left + 10, e.clientY - rect.top - 50, `
            <div style="font-weight:600;font-size:14px">${slice.src.label}</div>
            <div>Visitors: <strong>${slice.src.value}K</strong></div>
            <div>Share: ${(slice.src.value / total * 100).toFixed(1)}%</div>
            <div>Avg. Spend: $${Math.round(1200 + Math.random() * 1800)}/person</div>
            <div>Stay Duration: ${(1.5 + Math.random() * 3).toFixed(1)} days</div>
          `);
          return;
        }
      }
    }
    hideTooltip(tooltip);
  });

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left - cx;
    const my = e.clientY - rect.top - cy;
    const dist = Math.sqrt(mx * mx + my * my);
    canvas.style.cursor = (dist >= innerR && dist <= outerR) ? 'pointer' : 'default';
  });

  let progress = 0;
  function animate() {
    progress = Math.min(progress + 0.02, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    ctx.clearRect(0, 0, w, h);
    let a = -Math.PI / 2;
    const totalAngle = Math.PI * 2 * eased;
    d.sources.forEach(src => {
      const slice = (src.value / total) * totalAngle;
      ctx.beginPath();
      ctx.arc(cx, cy, outerR, a, a + slice);
      ctx.arc(cx, cy, innerR, a + slice, a, true);
      ctx.closePath();
      ctx.fillStyle = src.color + 'dd'; ctx.fill();
      a += slice;
    });
    ctx.font = '600 16px Inter'; ctx.fillStyle = '#37352F'; ctx.textAlign = 'center';
    ctx.fillText(`${Math.round(d.totalVisitors * eased / 1000)}K`, cx, cy);
    ctx.font = '9px Inter'; ctx.fillStyle = '#B4B4B0';
    ctx.fillText('Total Visitors', cx, cy + 14);

    const lx = w * 0.64; let ly = h * 0.1;
    d.sources.forEach(src => {
      ctx.fillStyle = src.color; ctx.fillRect(lx, ly - 4, 6, 6);
      ctx.font = '11px Inter'; ctx.fillStyle = '#37352F'; ctx.textAlign = 'left';
      ctx.fillText(src.label, lx + 12, ly + 3);
      ctx.font = '9px JetBrains Mono'; ctx.fillStyle = '#B4B4B0';
      ctx.fillText(`${(src.value / total * 100).toFixed(1)}%  ${src.value}K`, lx + 12, ly + 15);
      ly += 28;
    });
    if (progress < 1) requestAnimationFrame(animate);
  }
  animate();
}

// ——— Sentiment Chart ———

function drawSentimentChart(el) {
  const canvas = el.querySelector('#sentiment-canvas');
  const tooltip = el.querySelector('#sentiment-tooltip');
  const { ctx, w, h } = setupCanvas(canvas);
  const pad = { top: 30, right: 20, bottom: 35, left: 45 };
  const cw = w - pad.left - pad.right;
  const ch = h - pad.top - pad.bottom;

  const sentimentData = [
    { label: 'W-4', positive: 0.35, neutral: 0.55, negative: 0.10 },
    { label: 'W-3', positive: 0.42, neutral: 0.48, negative: 0.10 },
    { label: 'W-2', positive: 0.58, neutral: 0.35, negative: 0.07 },
    { label: 'W-1', positive: 0.72, neutral: 0.23, negative: 0.05 },
    { label: 'Event', positive: 0.88, neutral: 0.10, negative: 0.02 },
    { label: 'W+1', positive: 0.75, neutral: 0.20, negative: 0.05 },
    { label: 'W+2', positive: 0.60, neutral: 0.32, negative: 0.08 },
    { label: 'W+3', positive: 0.48, neutral: 0.42, negative: 0.10 },
    { label: 'W+4', positive: 0.40, neutral: 0.48, negative: 0.12 },
  ];

  const getX = (i) => pad.left + (cw / (sentimentData.length - 1)) * i;

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    for (let i = 0; i < sentimentData.length; i++) {
      if (Math.abs(mx - getX(i)) < 20) {
        const d = sentimentData[i];
        showTooltip(tooltip, mx + 10, e.clientY - rect.top - 40, `
          <div style="font-weight:600">${d.label}</div>
          <div style="color:#0F7B6C">Positive: ${(d.positive * 100).toFixed(0)}%</div>
          <div style="color:#B4B4B0">Neutral: ${(d.neutral * 100).toFixed(0)}%</div>
          <div style="color:#E03E3E">Negative: ${(d.negative * 100).toFixed(0)}%</div>
        `);
        return;
      }
    }
    hideTooltip(tooltip);
  });

  canvas.addEventListener('mouseleave', () => hideTooltip(tooltip));

  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    for (let i = 0; i < sentimentData.length; i++) {
      if (Math.abs(mx - getX(i)) < 20) {
        const d = sentimentData[i];
        showTooltip(tooltip, mx + 10, e.clientY - rect.top - 60, `
          <div style="font-weight:600;font-size:14px">${d.label}</div>
          <hr style="border:none;border-top:1px solid var(--border);margin:4px 0;">
          <div style="color:#0F7B6C">Positive: <strong>${(d.positive * 100).toFixed(0)}%</strong></div>
          <div style="color:#9B9A97">Neutral: ${(d.neutral * 100).toFixed(0)}%</div>
          <div style="color:#E03E3E">Negative: ${(d.negative * 100).toFixed(0)}%</div>
          <div style="font-size:10px;color:var(--text-muted);margin-top:4px;">
            Posts analyzed: ${Math.round(4200 * (1 + i * 0.3)).toLocaleString()}<br>
            Net sentiment: +${(d.positive - d.negative).toFixed(2)}
          </div>
        `);
        return;
      }
    }
  });

  let progress = 0;
  function animate() {
    progress = Math.min(progress + 0.02, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    ctx.clearRect(0, 0, w, h);

    // Grid
    ctx.strokeStyle = 'rgba(55,53,47,0.06)'; ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + (ch / 4) * i;
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(w - pad.right, y); ctx.stroke();
      ctx.font = '9px JetBrains Mono'; ctx.fillStyle = '#B4B4B0'; ctx.textAlign = 'right';
      ctx.fillText(`${100 - i * 25}%`, pad.left - 6, y + 4);
    }

    const cnt = Math.ceil(sentimentData.length * eased);

    // Stacked area
    ['negative', 'neutral', 'positive'].forEach((key, layerIdx) => {
      const colors = { negative: '#E03E3E', neutral: '#B4B4B0', positive: '#0F7B6C' };
      const alphas = { negative: '20', neutral: '15', positive: '25' };
      ctx.beginPath();
      for (let i = 0; i < cnt; i++) {
        const d = sentimentData[i];
        let yBase = 0;
        if (layerIdx >= 1) yBase += d.negative;
        if (layerIdx >= 2) yBase += d.neutral;
        const yTop = pad.top + ch - (yBase + d[key]) * ch;
        if (i === 0) ctx.moveTo(getX(i), yTop);
        else ctx.lineTo(getX(i), yTop);
      }
      for (let i = cnt - 1; i >= 0; i--) {
        const d = sentimentData[i];
        let yBase = 0;
        if (layerIdx >= 1) yBase += d.negative;
        if (layerIdx >= 2) yBase += d.neutral;
        const yBottom = pad.top + ch - yBase * ch;
        ctx.lineTo(getX(i), yBottom);
      }
      ctx.closePath();
      ctx.fillStyle = colors[key] + alphas[key];
      ctx.fill();

      // Line on top
      ctx.beginPath();
      for (let i = 0; i < cnt; i++) {
        const d = sentimentData[i];
        let yBase = 0;
        if (layerIdx >= 1) yBase += d.negative;
        if (layerIdx >= 2) yBase += d.neutral;
        const yTop = pad.top + ch - (yBase + d[key]) * ch;
        if (i === 0) ctx.moveTo(getX(i), yTop);
        else ctx.lineTo(getX(i), yTop);
      }
      ctx.strokeStyle = colors[key] + '88';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });

    // X labels
    sentimentData.forEach((d, i) => {
      ctx.font = '9px Inter'; ctx.fillStyle = '#B4B4B0'; ctx.textAlign = 'center';
      ctx.fillText(d.label, getX(i), h - pad.bottom + 16);
    });

    // Legend
    ctx.font = '9px Inter'; ctx.textAlign = 'left';
    [['Positive', '#0F7B6C'], ['Neutral', '#B4B4B0'], ['Negative', '#E03E3E']].forEach(([label, color], i) => {
      ctx.fillStyle = color;
      ctx.fillRect(pad.left + i * 70, pad.top - 12, 8, 8);
      ctx.fillStyle = '#787774';
      ctx.fillText(label, pad.left + i * 70 + 12, pad.top - 5);
    });

    if (progress < 1) requestAnimationFrame(animate);
  }
  animate();
}
