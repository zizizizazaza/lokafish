// Analytics data — Loka
// Calibrated against real STB, CoStar, Maybank, Trip.com reported data

export const heatmapData = {
  hotspots: [
    { x: 0.35, y: 0.42, label: 'Marina Bay', value: 'S$95M', intensity: 1.0 },
    { x: 0.28, y: 0.35, label: 'Orchard Road', value: 'S$52M', intensity: 0.72 },
    { x: 0.52, y: 0.28, label: 'Changi Airport', value: 'S$75M', intensity: 0.85 },
    { x: 0.33, y: 0.53, label: 'Clarke Quay', value: 'S$28M', intensity: 0.45 },
    { x: 0.22, y: 0.58, label: 'Sentosa/USS', value: 'S$35M', intensity: 0.50 },
    { x: 0.42, y: 0.48, label: 'Nat. Stadium', value: 'S$68M', intensity: 0.90 },
    { x: 0.30, y: 0.65, label: 'Harbourfront', value: 'S$15M', intensity: 0.25 },
    { x: 0.40, y: 0.32, label: 'Gardens by Bay', value: 'S$22M', intensity: 0.35 },
  ],
};

export const gdpChartData = {
  labels: ['W-4', 'W-3', 'W-2', 'W-1', 'Concert', 'W+1', 'W+2', 'W+3', 'W+4'],
  baseline: [100, 100.5, 101, 101.5, 102, 102.5, 102, 101.5, 102],
  withConcert: [100, 103, 115, 138, 186, 155, 128, 112, 108],
};

export const industryData = [
  { label: 'Accommodation', value: 125, color: '#0F7B6C', growth: '+14.4%' },
  { label: 'Aviation', value: 75, color: '#2383E2', growth: '+20%' },
  { label: 'F&B', value: 62, color: '#D9730D', growth: '+3–4x revenue' },
  { label: 'Attractions', value: 45, color: '#6940A5', growth: '+2,373%' },
  { label: 'Transport', value: 20, color: '#2383E2', growth: '+6.8%' },
  { label: 'Retail', value: 48, color: '#E03E3E', growth: '+50% (Klook)' },
  { label: 'Media/Content', value: 15, color: '#AD1A72', growth: '2.1B impressions' },
];

export const flowData = {
  totalVisitors: 300000,  // 300K+ concert attendees, 70% from overseas
  sources: [
    { label: 'China', value: 248, color: '#6940A5' },        // 247,720 — top source market in March
    { label: 'Indonesia', value: 205, color: '#0F7B6C' },    // 205,030
    { label: 'Malaysia', value: 120, color: '#2383E2' },     // 120,260
    { label: 'Australia', value: 100, color: '#DFAB01' },    // 100,400
    { label: 'India', value: 97, color: '#D9730D' },         // 97,050
    { label: 'Japan', value: 65, color: '#E03E3E' },
    { label: 'Thailand', value: 52, color: '#AD1A72' },
    { label: 'Others', value: 593, color: '#9B9A97' },       // remaining of 1.48M total
  ],
};
