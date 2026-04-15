// inline-charts.js — small, self-contained chart renderers that accept
// their data as a parameter (unlike analytics.js which reads from module
// globals). Used by the Report screen to render [[chart:xxx]] placeholders
// that the LLM embeds in the generated markdown.
//
// Each renderer takes a canvas element + a data payload matching the
// shape that /api/project/<id>/data returns under `analytics.<id>`.

function setupDpr(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const cssW = canvas.clientWidth || 420;
  const cssH = canvas.clientHeight || 180;
  canvas.width = cssW * dpr;
  canvas.height = cssH * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  return { ctx, w: cssW, h: cssH };
}

// ——— GDP line chart ——————————————————————————————————————————————
export function renderGdpChart(canvas, data) {
  if (!canvas || !data || !Array.isArray(data.withConcert) || !data.withConcert.length) {
    drawEmpty(canvas, 'No GDP data');
    return;
  }
  const { ctx, w, h } = setupDpr(canvas);
  const pad = { top: 20, right: 16, bottom: 30, left: 42 };
  const cw = w - pad.left - pad.right;
  const ch = h - pad.top - pad.bottom;

  const labels = data.labels || [];
  const series = data.withConcert;
  const baseline = data.baseline || [];
  const all = [...series, ...baseline];
  const maxVal = Math.max(...all) * 1.1;
  const minVal = Math.max(0, Math.min(...all) * 0.9);

  const getX = (i) => pad.left + (cw / Math.max(1, series.length - 1)) * i;
  const getY = (v) => pad.top + ch - ((v - minVal) / (maxVal - minVal || 1)) * ch;

  // Grid
  ctx.strokeStyle = 'rgba(55,53,47,0.08)'; ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = pad.top + (ch / 4) * i;
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(w - pad.right, y); ctx.stroke();
  }

  // Baseline (dashed)
  if (baseline.length) {
    ctx.beginPath();
    baseline.forEach((v, i) => { i === 0 ? ctx.moveTo(getX(i), getY(v)) : ctx.lineTo(getX(i), getY(v)); });
    ctx.strokeStyle = '#B4B4B0'; ctx.setLineDash([4, 4]); ctx.lineWidth = 1.5; ctx.stroke();
    ctx.setLineDash([]);
  }

  // Primary line
  ctx.beginPath();
  series.forEach((v, i) => { i === 0 ? ctx.moveTo(getX(i), getY(v)) : ctx.lineTo(getX(i), getY(v)); });
  ctx.strokeStyle = '#2383E2'; ctx.lineWidth = 2.5; ctx.stroke();

  // Dots
  series.forEach((v, i) => {
    ctx.beginPath(); ctx.arc(getX(i), getY(v), 3, 0, Math.PI * 2);
    ctx.fillStyle = '#2383E2'; ctx.fill();
  });

  // X labels
  ctx.font = '10px Inter'; ctx.fillStyle = '#9B9A97'; ctx.textAlign = 'center';
  labels.forEach((l, i) => ctx.fillText(l, getX(i), h - 8));

  // Y labels (just min and max)
  ctx.textAlign = 'right';
  ctx.fillText(String(Math.round(maxVal)), pad.left - 4, pad.top + 4);
  ctx.fillText(String(Math.round(minVal)), pad.left - 4, h - pad.bottom);
}

// ——— Industry bar chart ——————————————————————————————————————————
export function renderIndustryChart(canvas, data) {
  if (!canvas || !Array.isArray(data) || !data.length) {
    drawEmpty(canvas, 'No industry data');
    return;
  }
  const { ctx, w, h } = setupDpr(canvas);
  const pad = { top: 14, right: 80, bottom: 14, left: 130 };
  const cw = w - pad.left - pad.right;
  const ch = h - pad.top - pad.bottom;

  const sorted = [...data].sort((a, b) => (b.value || 0) - (a.value || 0));
  const maxVal = Math.max(...sorted.map(d => d.value || 0)) * 1.1 || 1;
  const barH = Math.min(22, (ch / sorted.length) - 5);

  sorted.forEach((item, i) => {
    const y = pad.top + (ch / sorted.length) * i + 2;
    const barW = ((item.value || 0) / maxVal) * cw;

    // Label
    ctx.font = '11px Inter';
    ctx.fillStyle = '#37352F'; ctx.textAlign = 'right';
    ctx.fillText(item.label, pad.left - 8, y + barH / 2 + 4);

    // Bar
    ctx.fillStyle = item.color || '#2383E2';
    ctx.fillRect(pad.left, y, barW, barH);

    // Value
    ctx.font = '10px JetBrains Mono';
    ctx.fillStyle = '#37352F'; ctx.textAlign = 'left';
    const valueStr = typeof item.value === 'number' ? `$${item.value.toFixed(0)}M` : '';
    ctx.fillText(valueStr, pad.left + barW + 6, y + barH / 2 + 4);
  });
}

// ——— Flow pie chart ————————————————————————————————————————————
export function renderFlowChart(canvas, data) {
  if (!canvas || !data || !Array.isArray(data.sources) || !data.sources.length) {
    drawEmpty(canvas, 'No flow data');
    return;
  }
  const { ctx, w, h } = setupDpr(canvas);
  const cx = w * 0.35;
  const cy = h / 2;
  const radius = Math.min(w * 0.3, h * 0.42);

  const total = data.sources.reduce((s, src) => s + (src.value || 0), 0) || 1;
  let startAngle = -Math.PI / 2;
  data.sources.forEach((src) => {
    const slice = ((src.value || 0) / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, startAngle, startAngle + slice);
    ctx.closePath();
    ctx.fillStyle = src.color || '#2383E2';
    ctx.fill();
    startAngle += slice;
  });

  // Legend
  const legendX = cx + radius + 24;
  let ly = cy - (data.sources.length * 16) / 2;
  data.sources.slice(0, 8).forEach((src) => {
    ctx.fillStyle = src.color || '#2383E2';
    ctx.fillRect(legendX, ly, 10, 10);
    ctx.font = '10px Inter'; ctx.fillStyle = '#37352F'; ctx.textAlign = 'left';
    const pct = (((src.value || 0) / total) * 100).toFixed(0);
    ctx.fillText(`${src.label} · ${pct}%`, legendX + 14, ly + 9);
    ly += 16;
  });
}

// ——— Heatmap (rectangular proxy for the leaflet version) ————————
export function renderHeatmapChart(canvas, data) {
  const hotspots = (data && data.hotspots) || [];
  if (!canvas || !hotspots.length) {
    drawEmpty(canvas, 'No geographic heatmap (non-geographic scenario)');
    return;
  }
  const { ctx, w, h } = setupDpr(canvas);

  // Background
  ctx.fillStyle = '#F7F6F3';
  ctx.fillRect(0, 0, w, h);

  hotspots.forEach((s) => {
    const x = s.x * w, y = s.y * h;
    const r = 14 + s.intensity * 24;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, 'rgba(224,62,62,0.72)');
    grad.addColorStop(1, 'rgba(224,62,62,0)');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();

    ctx.font = '10px Inter';
    ctx.fillStyle = '#37352F'; ctx.textAlign = 'center';
    ctx.fillText(s.label, x, y + r + 11);
  });
}

// ——— Sentiment stacked area ——————————————————————————————————————
export function renderSentimentChart(canvas, data) {
  const timeline = (data && data.timeline) || [];
  if (!canvas || !timeline.length) {
    drawEmpty(canvas, 'No sentiment data');
    return;
  }
  const { ctx, w, h } = setupDpr(canvas);
  const pad = { top: 14, right: 16, bottom: 24, left: 36 };
  const cw = w - pad.left - pad.right;
  const ch = h - pad.top - pad.bottom;

  const getX = (i) => pad.left + (cw / Math.max(1, timeline.length - 1)) * i;

  // Grid
  ctx.strokeStyle = 'rgba(55,53,47,0.06)'; ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = pad.top + (ch / 4) * i;
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(w - pad.right, y); ctx.stroke();
  }

  // Score curve (0-100 range)
  ctx.beginPath();
  timeline.forEach((pt, i) => {
    const x = getX(i);
    const y = pad.top + ch - ((pt.score || 50) / 100) * ch;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.strokeStyle = '#0F7B6C'; ctx.lineWidth = 2.5; ctx.stroke();

  // Fill below
  ctx.lineTo(pad.left + cw, pad.top + ch);
  ctx.lineTo(pad.left, pad.top + ch);
  ctx.closePath();
  ctx.fillStyle = 'rgba(15,123,108,0.12)';
  ctx.fill();

  // X labels
  ctx.font = '9px Inter'; ctx.fillStyle = '#9B9A97'; ctx.textAlign = 'center';
  const step = Math.max(1, Math.floor(timeline.length / 6));
  for (let i = 0; i < timeline.length; i += step) {
    ctx.fillText(`R${timeline[i].round}`, getX(i), h - 6);
  }
}

// ——— Shared empty-state ——————————————————————————————————————————
function drawEmpty(canvas, message) {
  if (!canvas) return;
  const { ctx, w, h } = setupDpr(canvas);
  ctx.fillStyle = '#F7F6F3';
  ctx.fillRect(0, 0, w, h);
  ctx.font = '11px Inter'; ctx.fillStyle = '#B4B4B0'; ctx.textAlign = 'center';
  ctx.fillText(message, w / 2, h / 2 + 4);
}

// Dispatcher so report.js can do `render(chartId, canvas, analyticsPayload)`
// without a switch statement.
const RENDERERS = {
  gdp: (canvas, a) => renderGdpChart(canvas, a.gdp),
  industry: (canvas, a) => renderIndustryChart(canvas, a.industry),
  flow: (canvas, a) => renderFlowChart(canvas, a.flow),
  heatmap: (canvas, a) => renderHeatmapChart(canvas, a.heatmap),
  sentiment: (canvas, a) => renderSentimentChart(canvas, a.sentiment),
};

export function renderInlineChart(chartId, canvas, analyticsPayload) {
  const fn = RENDERERS[chartId];
  if (!fn) {
    drawEmpty(canvas, `Unknown chart: ${chartId}`);
    return;
  }
  fn(canvas, analyticsPayload || {});
}

export const CHART_TITLES = {
  gdp: 'GDP Trajectory',
  industry: 'Industry Impact',
  flow: 'Visitor Origin',
  heatmap: 'Geographic Heatmap',
  sentiment: 'Sentiment Timeline',
};
