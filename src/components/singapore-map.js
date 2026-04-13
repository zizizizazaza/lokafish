// Singapore map SVG component with district boundaries

// Simplified but recognizable Singapore district paths
export const singaporeDistricts = [
  {
    id: 'central',
    name: 'Central Region',
    subdistrict: 'Marina Bay / Orchard / CBD',
    path: 'M 180,120 L 220,105 L 260,110 L 280,130 L 270,155 L 240,165 L 200,160 L 185,145 Z',
    impact: '$142M', density: 0.95, agents: 420,
    color: '#2383E2'
  },
  {
    id: 'east',
    name: 'East Region',
    subdistrict: 'Changi / Tampines / Bedok',
    path: 'M 280,130 L 320,115 L 370,120 L 400,135 L 395,160 L 360,170 L 320,165 L 280,155 Z',
    impact: '$78M', density: 0.65, agents: 280,
    color: '#0F7B6C'
  },
  {
    id: 'northeast',
    name: 'North-East Region',
    subdistrict: 'Serangoon / Hougang / Punggol',
    path: 'M 220,75 L 260,65 L 300,70 L 320,90 L 320,115 L 280,130 L 260,110 L 220,105 Z',
    impact: '$45M', density: 0.42, agents: 180,
    color: '#D9730D'
  },
  {
    id: 'north',
    name: 'North Region',
    subdistrict: 'Woodlands / Yishun / Sembawang',
    path: 'M 140,50 L 180,40 L 220,45 L 260,50 L 260,65 L 220,75 L 180,80 L 150,75 Z',
    impact: '$28M', density: 0.25, agents: 120,
    color: '#6940A5'
  },
  {
    id: 'west',
    name: 'West Region',
    subdistrict: 'Jurong / Clementi / Bukit Timah',
    path: 'M 80,85 L 120,70 L 150,75 L 180,80 L 180,120 L 185,145 L 170,155 L 140,150 L 100,140 L 80,120 Z',
    impact: '$52M', density: 0.38, agents: 200,
    color: '#E03E3E'
  },
  {
    id: 'south',
    name: 'South Region',
    subdistrict: 'Sentosa / Harbourfront',
    path: 'M 170,155 L 200,160 L 240,165 L 250,178 L 230,190 L 200,192 L 175,185 L 165,170 Z',
    impact: '$35M', density: 0.50, agents: 160,
    color: '#D9730D'
  },
];

// Key landmarks
export const landmarks = [
  { name: 'National Stadium', x: 262, y: 142, icon: '🎤', impact: '$48M' },
  { name: 'Marina Bay Sands', x: 235, y: 150, icon: '🏨', impact: '$89M' },
  { name: 'Changi Airport', x: 370, y: 135, icon: '✈️', impact: '$32M' },
  { name: 'Orchard Road', x: 195, y: 125, icon: '🛍️', impact: '$45M' },
  { name: 'Clarke Quay', x: 210, y: 145, icon: '🍽️', impact: '$22M' },
  { name: 'Sentosa', x: 200, y: 185, icon: '🏝️', impact: '$18M' },
];

export function drawSingaporeMap(canvas, hoveredDistrict = null) {
  const dpr = devicePixelRatio;
  const w = canvas.width / dpr;
  const h = canvas.height / dpr;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  // Water background
  ctx.fillStyle = '#F0F4F8';
  ctx.fillRect(0, 0, w, h);

  // Draw districts
  singaporeDistricts.forEach(district => {
    const path = new Path2D(district.path);
    const isHovered = hoveredDistrict === district.id;

    // Fill with intensity-based color
    const alpha = Math.round(district.density * 180).toString(16).padStart(2, '0');
    ctx.fillStyle = district.color + alpha;
    ctx.fill(path);

    // Border
    ctx.strokeStyle = isHovered ? district.color : 'rgba(55,53,47,0.15)';
    ctx.lineWidth = isHovered ? 2 : 1;
    ctx.stroke(path);

    if (isHovered) {
      ctx.fillStyle = district.color + '30';
      ctx.fill(path);
    }
  });

  // Landmarks
  landmarks.forEach(lm => {
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(lm.icon, lm.x, lm.y + 5);
  });

  // Legend
  ctx.font = '9px Inter, sans-serif';
  ctx.fillStyle = '#787774';
  ctx.textAlign = 'left';
  ctx.fillText('Economic Impact Density (by region)', 12, h - 8);
}
