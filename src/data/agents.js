// Agent data — Full persona profiles for Loka

export const agentCategories = [
  {
    id: 'fans-local', icon: '🇸🇬', label: 'Local Taylor Swift Fans', count: 300,
    color: '#2383E2', bgColor: 'rgba(35,131,226,0.08)',
    agents: [
      { name: 'Rachel Lim', role: 'Marketing Manager', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=Rachel', influence: 0.78,
        traits: ['Local Influencer', 'F&B Enthusiast'],
        age: 28, income: 'S$72,000/yr', personality: { openness: 82, conscientiousness: 71, extraversion: 88, agreeableness: 75, neuroticism: 35 },
        background: 'Born and raised in Toa Payoh. NUS Business graduate. Works at a mid-size creative agency in Orchard. Active Instagram lifestyle influencer with 12K followers. Has attended 3 Taylor Swift concerts internationally.',
        decisionLogic: 'Will spend up to 40% of monthly salary on concert-related activities. Likely to extend social outings by 3x during event week. Strong cross-category spender (F&B + retail + transport).',
        consumptionProfile: 'Premium concert tickets ($380), 2 themed dinners ($150 ea.), merchandise ($200), Grab rides ($80), social media content creation (organic reach 45K)' },
      { name: 'Kevin Ng', role: 'University Student, NTU', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=Kevin', influence: 0.52,
        traits: ['Budget-Conscious', 'Social Amplifier'],
        age: 21, income: 'S$8,400/yr (part-time)', personality: { openness: 75, conscientiousness: 55, extraversion: 72, agreeableness: 80, neuroticism: 45 },
        background: 'Year 3 Computer Science student at NTU. Lives in campus housing. Part-time food delivery rider. Runs a meme account with 8K followers. First Taylor Swift concert.',
        decisionLogic: 'Extreme price sensitivity — will camp for cheapest tickets. Spending limited to S$300 total. But social media amplification value is disproportionately high due to viral content creation.',
        consumptionProfile: 'Budget tickets ($128), hawker food only ($30), MRT transport ($8), but generated 23 TikTok videos with combined 1.2M views' },
    ]
  },
  {
    id: 'tourists', icon: '✈️', label: 'Inbound Tourists (SEA)', count: 400,
    color: '#0F7B6C', bgColor: 'rgba(15,123,108,0.08)',
    agents: [
      { name: 'Sarah Chen', role: 'Marketing Executive, KL', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=Sarah', influence: 0.85,
        traits: ['Early Adopter', 'Group Organizer'],
        age: 26, income: 'RM96,000/yr', personality: { openness: 90, conscientiousness: 68, extraversion: 92, agreeableness: 78, neuroticism: 28 },
        background: 'Digital marketing lead at a Malaysian e-commerce startup. Organized a group of 12 friends for the SG trip. Booked AirAsia flights 4 months in advance. Fluent in 3 languages.',
        decisionLogic: 'Group organizer multiplier — her decisions influence 12 others. Will choose mid-range hotels near MRT. Plans to spend 4 days total (2 extra beyond concert).',
        consumptionProfile: 'Return flights ($280), 3 nights hotel ($450), concerts x2 ($760), dining ($320), shopping ($400), attractions ($150). Group total: ~S$28,000' },
      { name: 'Priya Sharma', role: 'Architecture Student, Jakarta', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=Priya', influence: 0.45,
        traits: ['Budget Traveler', 'Photography Focus'],
        age: 23, income: 'IDR 24M/yr (scholarship)', personality: { openness: 88, conscientiousness: 72, extraversion: 50, agreeableness: 82, neuroticism: 55 },
        background: 'Final year architecture student at UI Jakarta. Saved for 8 months to afford this trip. First time visiting Singapore. Plans to document everything for her architecture blog.',
        decisionLogic: 'Will choose cheapest transport and accommodation (hostel). However, her photography content reaches 5K architecture enthusiasts who may plan future SG visits.',
        consumptionProfile: 'Budget flight ($180), hostel 2 nights ($60), concert ($128), street food ($40), MRT pass ($15). Low direct spend, high content value.' },
    ]
  },
  {
    id: 'hotels', icon: '🏨', label: 'Hospitality Operators', count: 150,
    color: '#D9730D', bgColor: 'rgba(217,115,13,0.08)',
    agents: [
      { name: 'Ahmad Ismail', role: 'Hotel Chain GM, Marina Bay', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=Ahmad', influence: 0.82,
        traits: ['Dynamic Pricing', 'Capacity Planning'],
        age: 45, income: 'S$280,000/yr', personality: { openness: 55, conscientiousness: 92, extraversion: 65, agreeableness: 60, neuroticism: 30 },
        background: '20 years in hospitality. Previously Marriott Regional Director. Now GM of a 2,560-room integrated resort. MBA from Cornell Hotel School. Manages S$180M annual revenue.',
        decisionLogic: 'Implements algorithmic dynamic pricing. Concert week: raises rates 45% with 3-night minimum. Activates surge staffing protocol. Extends F&B hours to 2am.',
        consumptionProfile: 'Revenue decisions: $1,200/night premium suites, 94% occupancy target, $8.2M incremental revenue projection for concert week.' },
      { name: 'Tan Xiu Wen', role: 'Restaurant Owner, Clarke Quay', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=TanXiu', influence: 0.55,
        traits: ['Local Network', 'Themed Menu'],
        age: 38, income: 'S$95,000/yr', personality: { openness: 78, conscientiousness: 85, extraversion: 70, agreeableness: 72, neuroticism: 42 },
        background: 'Owns 2 restaurants in Clarke Quay and Boat Quay. Specializes in modern Peranakan cuisine. Instagram-savvy — creates viral food content. Previously worked at Les Amis.',
        decisionLogic: 'Creates limited-time "Eras Tour Menu" themed dishes. Extends operating hours. Hires 8 temp staff. Projects 300% revenue increase during concert week.',
        consumptionProfile: 'Invests $12K in themed decor, $8K in extra ingredients, $6K temp labor. Projects $45K incremental revenue.' },
    ]
  },
  {
    id: 'media', icon: '📰', label: 'Media & KOLs', count: 100,
    color: '#6940A5', bgColor: 'rgba(105,64,165,0.08)',
    agents: [
      { name: 'David Park', role: 'Bloomberg APAC Reporter', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=David', influence: 0.92,
        traits: ['Market Mover', 'Data-Driven'],
        age: 35, income: '$185,000/yr', personality: { openness: 70, conscientiousness: 95, extraversion: 55, agreeableness: 45, neuroticism: 38 },
        background: 'Seoul native. Columbia J-School. Covers APAC macro for Bloomberg. His articles average 800K views. Previously at Reuters Tokyo. Known for data-heavy economic analysis.',
        decisionLogic: 'Publishes 2 data-driven articles on the concert economic impact. First article reaches 1.2M views, creating an information cascade that influences institutional investor sentiment.',
        consumptionProfile: 'Zero direct event spending. But his coverage generates estimated S$32M in media value and influences S$4.5B in institutional capital allocation decisions.' },
      { name: 'Mei Ling Yap', role: 'CNA Entertainment Editor', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=MeiLing', influence: 0.88,
        traits: ['Trend Spotter', 'Regional Reach'],
        age: 32, income: 'S$120,000/yr', personality: { openness: 85, conscientiousness: 80, extraversion: 82, agreeableness: 68, neuroticism: 30 },
        background: '10 years at CNA. Covers entertainment, lifestyle, and cultural economics. Her "Swift Effect" documentary segment was viewed 4.5M times across APAC.',
        decisionLogic: 'Produces a 3-part documentary series. Each segment amplifies tourism narratives, contributing to the "halo effect" in post-event tourism numbers.',
        consumptionProfile: 'Production budget $45K. Content generates 12M total views, credited with 15% of post-event tourism uplift.' },
    ]
  },
  {
    id: 'transport', icon: '🚗', label: 'Transport Operators', count: 150,
    color: '#2383E2', bgColor: 'rgba(35,131,226,0.08)',
    agents: [
      { name: 'Singapore Airlines', role: 'Flag Carrier', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=SIA', influence: 0.95,
        traits: ['Route Optimizer', 'Premium Pricing'],
        age: null, income: 'Rev: S$17.8B', personality: { openness: 60, conscientiousness: 95, extraversion: 50, agreeableness: 55, neuroticism: 20 },
        background: 'National carrier. 192 destinations. Adding 240 supplementary flights on regional routes for concert period. Load factor target: 97%.',
        decisionLogic: 'Deploys A350-900 on high-demand KL/Jakarta/Tokyo routes. Premium cabin upsell strategy: 52% revenue increase. Bundled hotel+flight packages via KrisShop.',
        consumptionProfile: 'Added capacity: 320K seats. Revenue impact: $95M incremental. Fuel/crew costs: $38M. Net contribution: $57M.' },
      { name: 'Grab Holdings', role: 'Ride-Hailing Platform', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=Grab', influence: 0.88,
        traits: ['Surge Analytics', 'Data Aggregator'],
        age: null, income: 'Rev: S$2.3B', personality: { openness: 85, conscientiousness: 80, extraversion: 60, agreeableness: 50, neuroticism: 25 },
        background: 'ASEAN super-app. Deploys 4,000 additional drivers around National Stadium zone. Real-time surge pricing algorithm.',
        decisionLogic: 'Surge pricing 3.8x in stadium area during concert hours. Average fare: $32 (baseline: $12). Driver earnings +280%.',
        consumptionProfile: 'GMV uplift: $8.4M over 6 concert days. Take rate: 25%. Net revenue: $2.1M.' },
    ]
  },
  {
    id: 'govt', icon: '🏛️', label: 'Government Officials', count: 50,
    color: '#E03E3E', bgColor: 'rgba(224,62,62,0.08)',
    agents: [
      { name: 'Ministry of Trade', role: 'Economic Planning Division', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=MTI', influence: 0.98,
        traits: ['Policy Maker', 'GDP Target'],
        age: null, income: 'N/A', personality: { openness: 45, conscientiousness: 98, extraversion: 35, agreeableness: 55, neuroticism: 15 },
        background: 'Responsible for macro-economic forecasting and event impact assessment. Works with Singapore Tourism Board on mega-event strategy. Reports directly to PM\'s office.',
        decisionLogic: 'Evaluates ROI of government investment in event hosting. Every $1 invested → $18.7 in economic return. Sets precedent for future "mega-event fund" policy.',
        consumptionProfile: 'Government investment in concert hosting deal: confidential. Estimated S$30M. ROI: 18.7x.' },
      { name: 'Singapore Tourism Board', role: 'Tourism Promotion', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=STB', influence: 0.94,
        traits: ['Brand Singapore', 'Event Strategy'],
        age: null, income: 'N/A', personality: { openness: 70, conscientiousness: 90, extraversion: 75, agreeableness: 65, neuroticism: 20 },
        background: 'Oversees Singapore\'s tourism strategy. Target: 18.5M visitors by 2027. Uses concert events as anchor to drive tourism infrastructure investment.',
        decisionLogic: 'Allocates S$15M supplementary marketing budget. Targets feeder markets: Malaysia, Indonesia, Japan, China. Post-event "halo" conversion campaign.',
        consumptionProfile: 'Marketing spend: $15M. Projected visitor uplift: 650K. Revenue per visitor: $2,400. Total tourism impact: ~$1.56B (annualized).' },
    ]
  },
  {
    id: 'sponsors', icon: '💼', label: 'Corporate Sponsors', count: 100,
    color: '#D9730D', bgColor: 'rgba(217,115,13,0.08)',
    agents: [
      { name: 'DBS Group', role: 'Title Sponsor', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=DBS', influence: 0.85,
        traits: ['Brand Investment', 'Card Promotions'],
        age: null, income: 'Rev: S$19.4B', personality: { openness: 55, conscientiousness: 88, extraversion: 60, agreeableness: 62, neuroticism: 18 },
        background: 'Southeast Asia\'s largest bank. Title sponsor of the concert series. Cross-sells credit card promotions, wealth management, and PayLah! digital payment.',
        decisionLogic: 'Sponsorship: $8M. Expected credit card acquisition uplift: 45K new accounts. Brand impression value: $28M.',
        consumptionProfile: 'Investment: $8M sponsorship + $3M activation. Revenue: estimated $22M in new card/loan origination over 12 months.' },
    ]
  },
  {
    id: 'residents', icon: '👥', label: 'General Residents', count: 400,
    color: '#9B9A97', bgColor: 'rgba(155,154,151,0.08)',
    agents: [
      { name: 'Maria Santos', role: 'Hotel Housekeeper', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=Maria', influence: 0.20,
        traits: ['Overtime Worker', 'Essential Staff'],
        age: 42, income: 'S$26,400/yr', personality: { openness: 40, conscientiousness: 90, extraversion: 35, agreeableness: 85, neuroticism: 55 },
        background: 'Filipino domestic worker, 12 years in Singapore. Works at Marina Bay Sands housekeeping. Mother of 3 (kids in Philippines). Sends 60% of income home.',
        decisionLogic: 'Concert week means 60hr work weeks (vs 44hr normal). Overtime pay is critical income — earns extra S$480 this week. Minimal direct event spending.',
        consumptionProfile: 'Earns $480 extra overtime. Spends $15 on bubble tea to hand out to colleagues. Sends $400 home to family. Net: $65 local consumption.' },
      { name: 'Rajesh Kumar', role: 'Grab Driver', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=Rajesh', influence: 0.30,
        traits: ['Gig Worker', 'Local Knowledge'],
        age: 34, income: 'S$48,000/yr', personality: { openness: 55, conscientiousness: 75, extraversion: 68, agreeableness: 72, neuroticism: 48 },
        background: 'Former IT support technician. Switched to full-time Grab driving 3 years ago for flexibility. Drives a Toyota Camry Hybrid. Deep knowledge of Singapore routes.',
        decisionLogic: 'Maximizes concert-period earnings by positioning near Stadium MRT exits from 5pm. Targets surge pricing windows. Extends shifts to 14 hours on concert days.',
        consumptionProfile: 'Earnings: $1,800 incremental over concert week (280% uplift). Fuel cost: $320. Net extra income: $1,480. Spends $200 on family dinner to celebrate.' },
    ]
  },
  {
    id: 'finance', icon: '📈', label: 'Financial Analysts', count: 200,
    color: '#2383E2', bgColor: 'rgba(35,131,226,0.08)',
    agents: [
      { name: 'James Tanaka', role: 'GS Macro Analyst, Tokyo', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=James', influence: 0.72,
        traits: ['Sector Coverage', 'Model Builder'],
        age: 31, income: '$220,000/yr', personality: { openness: 72, conscientiousness: 92, extraversion: 48, agreeableness: 55, neuroticism: 40 },
        background: 'Keio University Economics → Goldman Sachs Tokyo. Covers ASEAN macro. Published the "Swift-onomics" research note that was cited by 40+ institutional investors.',
        decisionLogic: 'Publishes research note leading to increased institutional interest in tourism-adjacent SG equities. SIA, CDL Hospitality, CapitaLand see 7-12% stock uplift.',
        consumptionProfile: 'No direct spending. Research note influences $4.5B in capital allocation. Cited in 3 major sell-side reports. Wins internal "Best Thematic Note" award.' },
    ]
  },
  {
    id: 'dining', icon: '🍽️', label: 'F&B Operators', count: 150,
    color: '#0F7B6C', bgColor: 'rgba(15,123,108,0.08)',
    agents: [
      { name: 'Lisa Tan', role: 'Café Chain Owner (3 outlets)', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=Lisa', influence: 0.60,
        traits: ['Themed Menu', 'Social Media'],
        age: 33, income: 'S$140,000/yr', personality: { openness: 88, conscientiousness: 78, extraversion: 82, agreeableness: 70, neuroticism: 35 },
        background: 'Former Starbucks manager. Opened her own specialty coffee chain "Kopi Culture" with 3 outlets in Orchard, Bugis, and Clarke Quay. Known for creative themed drinks.',
        decisionLogic: 'Launches "Eras Tour Latte Collection" — 10 signature drinks themed to album eras. Instagram content goes viral (250K impressions). Orders 3x normal ingredient stock.',
        consumptionProfile: 'Investment: $8K (themed cups, ingredients, decor). Revenue uplift: $35K across 3 outlets over 2 weeks. Net ROI: 337%.' },
    ]
  },
];

export const behaviorChain = [
  { icon: '📢', label: 'Announcement', value: 'T-180 days' },
  { icon: '🔍', label: 'Research', value: '12M queries' },
  { icon: '🎫', label: 'Ticket Sales', value: '$48M rev' },
  { icon: '✈️', label: 'Flight Booking', value: '+320K seats' },
  { icon: '🏨', label: 'Hotel Booking', value: '94% occ.' },
  { icon: '🍽️', label: 'F&B Surge', value: '+$67M' },
  { icon: '🛍️', label: 'Retail', value: '+$45M' },
  { icon: '🎤', label: 'Concert Days', value: '6 shows' },
  { icon: '📱', label: 'Social Cascade', value: '4.2M posts' },
  { icon: '📈', label: 'GDP Impact', value: '+$419M' },
];

export const knowledgeGraphNodes = [
  { id: 'ts', label: 'Taylor Swift', x: 0.5, y: 0.18, size: 22, color: '#E03E3E', type: 'Person' },
  { id: 'sg', label: 'Singapore', x: 0.25, y: 0.35, size: 18, color: '#0F7B6C', type: 'Entity' },
  { id: 'stb', label: 'STB', x: 0.08, y: 0.28, size: 12, color: '#E03E3E', type: 'GovAgency' },
  { id: 'airlines', label: 'SIA', x: 0.72, y: 0.55, size: 14, color: '#2383E2', type: 'Company' },
  { id: 'hotels', label: 'MBS Hotels', x: 0.18, y: 0.62, size: 13, color: '#D9730D', type: 'Company' },
  { id: 'media', label: 'Bloomberg', x: 0.82, y: 0.25, size: 11, color: '#6940A5', type: 'MediaOutlet' },
  { id: 'fans', label: 'Fan Base', x: 0.88, y: 0.42, size: 16, color: '#2383E2', type: 'Entity' },
  { id: 'retail', label: 'Orchard Retail', x: 0.35, y: 0.75, size: 11, color: '#D9730D', type: 'Entity' },
  { id: 'fnb', label: 'F&B Sector', x: 0.52, y: 0.78, size: 11, color: '#0F7B6C', type: 'Entity' },
  { id: 'transport', label: 'Grab', x: 0.05, y: 0.5, size: 12, color: '#0F7B6C', type: 'Company' },
  { id: 'venue', label: 'Nat. Stadium', x: 0.42, y: 0.42, size: 14, color: '#0F7B6C', type: 'Entity' },
  { id: 'econ', label: 'GDP Impact', x: 0.22, y: 0.15, size: 15, color: '#2383E2', type: 'Entity' },
  // Additional nodes for complexity
  { id: 'airasia', label: 'AirAsia', x: 0.62, y: 0.68, size: 10, color: '#E03E3E', type: 'Company' },
  { id: 'dbs', label: 'DBS Bank', x: 0.78, y: 0.72, size: 11, color: '#D9730D', type: 'Company' },
  { id: 'cna', label: 'CNA Media', x: 0.92, y: 0.35, size: 10, color: '#6940A5', type: 'MediaOutlet' },
  { id: 'mti', label: 'Min. of Trade', x: 0.12, y: 0.18, size: 11, color: '#E03E3E', type: 'GovAgency' },
  { id: 'changi', label: 'Changi Airport', x: 0.58, y: 0.35, size: 12, color: '#2383E2', type: 'Entity' },
  { id: 'sentosa', label: 'Sentosa', x: 0.30, y: 0.58, size: 10, color: '#0F7B6C', type: 'Entity' },
  { id: 'klook', label: 'Klook', x: 0.68, y: 0.82, size: 9, color: '#D9730D', type: 'Company' },
  { id: 'tiktok', label: 'TikTok', x: 0.92, y: 0.58, size: 10, color: '#6940A5', type: 'MediaOutlet' },
  { id: 'shopee', label: 'Shopee', x: 0.85, y: 0.82, size: 9, color: '#D9730D', type: 'Company' },
  { id: 'labor', label: 'Labor Market', x: 0.15, y: 0.78, size: 10, color: '#9B9A97', type: 'Entity' },
  { id: 'tax', label: 'Tax Revenue', x: 0.08, y: 0.42, size: 10, color: '#E03E3E', type: 'GovAgency' },
  { id: 'forex', label: 'SGD/FX', x: 0.38, y: 0.88, size: 9, color: '#2383E2', type: 'Entity' },
  { id: 'realestate', label: 'Hotels REIT', x: 0.48, y: 0.62, size: 10, color: '#D9730D', type: 'Company' },
];

export const knowledgeGraphEdges = [
  ['ts', 'sg'], ['ts', 'fans'], ['ts', 'media'], ['ts', 'venue'], ['ts', 'cna'],
  ['sg', 'stb'], ['sg', 'hotels'], ['sg', 'transport'], ['sg', 'econ'], ['sg', 'mti'], ['sg', 'changi'],
  ['stb', 'media'], ['stb', 'airlines'], ['stb', 'mti'], ['stb', 'tax'],
  ['fans', 'airlines'], ['fans', 'hotels'], ['fans', 'retail'], ['fans', 'fnb'], ['fans', 'tiktok'],
  ['fans', 'klook'], ['fans', 'airasia'], ['fans', 'sentosa'],
  ['hotels', 'transport'], ['hotels', 'realestate'], ['hotels', 'labor'],
  ['venue', 'transport'], ['venue', 'fnb'], ['venue', 'labor'],
  ['media', 'fans'], ['media', 'cna'], ['media', 'tiktok'],
  ['retail', 'fnb'], ['retail', 'shopee'],
  ['airlines', 'transport'], ['airlines', 'changi'], ['airlines', 'airasia'],
  ['econ', 'stb'], ['econ', 'mti'], ['econ', 'tax'], ['econ', 'forex'],
  ['dbs', 'shopee'], ['dbs', 'fans'], ['dbs', 'hotels'],
  ['labor', 'fnb'], ['labor', 'hotels'], ['labor', 'transport'],
  ['changi', 'airasia'], ['klook', 'sentosa'],
  ['realestate', 'econ'], ['forex', 'airlines'],
];

export const kgLogMessages = [
  '→ Extracting entities from scenario...',
  '→ Entity: Taylor Swift [PERSON, Influence: 0.99]',
  '→ Entity: Singapore [LOCATION, GDP: $397B]',
  '→ Entity: National Stadium [VENUE, Cap: 55,000]',
  '→ Relationship: Taylor Swift → performs_at → National Stadium',
  '→ Expanding: Airlines ↔ Hotels ↔ Transport supply chain',
  '→ Adding: Media outlets, Government agencies, Sponsors',
  '→ Injecting model: Tourism multiplier = 2.4x',
  '→ GraphRAG complete. 25 nodes, 46 edges.',
  '→ Confidence: 0.94 — Ready for agent injection.',
];

export const entityTypes = {
  'Person': '#E03E3E',
  'Company': '#D9730D',
  'Entity': '#2383E2',
  'GovAgency': '#E03E3E',
  'MediaOutlet': '#6940A5',
};
