// Report screen — LokaWorld Flow design (Stage 4, light)
// 3-column research-paper layout: TOC sidebar / serif document / chat sidebar.
//
// Content sourced from peter-jim's reference run (Taylor Swift Eras Tour
// Singapore — multi-agent world model simulation, ZH).

const SECTIONS = [
  { id: 'rs-abstract', toc: 'Executive Brief' },
  { id: 'rs-1', toc: '1. Executive Summary' },
  { id: 'rs-2', toc: '2. Situation Assessment' },
  { id: 'rs-3', toc: '3. Core Findings' },
  { id: 'rs-4', toc: '4. Scenario Analysis' },
  { id: 'rs-5', toc: '5. Risk Register' },
  { id: 'rs-6', toc: '6. Recommendations' },
];

const CHAT_HEURISTICS = [
  {
    re: /summary|summarise|关键|核心|总结|key|finding/i,
    a: '核心发现：(1) 净 GDP 贡献保守估计 S$2.5–3.5 亿，远低于流传的 "10 亿" 总支出口径；(2) 酒店业是绝对受益主体，核心区 ADR +35%、入住率达 98%；(3) 樟宜机场国际抵港同比 +40%；(4) 经济效应呈"核心区高集中、外围低渗透"双速结构；(5) 基准情景下季度环比 GDP 贡献 0.1–0.3%。',
  },
  {
    re: /risk|风险|下行|担忧/i,
    a: '主要下行风险：① 极端天气/安全事件中断（概率中、影响高）；② 区域游客的替代效应（概率 >60%，可使净贡献缩水 30–50%）；③ 票务/官方周边收入外流海外（概率 >80%，本地留存被稀释 40%+）；④ 基层小微商户被排除在红利外（概率 >70%）。详见第 5 章风险登记表。',
  },
  {
    re: /actual|真实|实际|对比|history|历史/i,
    a: '与历史对标：基准情景参考了 2019 K-pop 演唱会数据（活动周 Tampines 小贩中心营业额 -7%）和 F1 夜赛对季度 GDP 0.1–0.3% 的贡献区间。Taylor Swift 巡演的国际客流强度高于 F1（樟宜国际抵港 +40% vs F1 时期 +18%），但替代效应风险也更显著。',
  },
  {
    re: /methodology|方法|仿真|simulation|framework/i,
    a: '仿真框架：基于 2,000 个 Agent（按新加坡 2023 人口普查 + HES 2022/23 收入分布抽样），运行 OASIS 多智能体交互引擎 120 轮（覆盖会前 2 周/会期 6 天/会后 2 周）。每个 Agent 携带 180 天传记记忆 + 15–50 节点社交图。Agent 行为聚合后送入投入产出 + Monte Carlo (n=10,000) 量化层。',
  },
  {
    re: /scenario|情景|乐观|悲观/i,
    a: '三情景对比：乐观（0.3–0.5% 季度 GDP，长程国际客 + 文化导览联动）、基准（0.1–0.3%，区域短途客为主）、悲观（< 0.05%，需求转移 + 运营中断）。差异核心在国际客流性质（净新增 vs 转移）、停留时长、本地嵌入深度。详见第 4 章。',
  },
  {
    re: /multiplier|乘数|spillover|溢出/i,
    a: '乘数系数（直接 → 间接）：酒店 1.3–1.5、航空 1.2–1.4、F&B 1.1–1.3、零售 1.0–1.2。空间衰减明显：核心区 3 公里内乘数 >1.3，外围社区跌至 1.0 附近，反映基层商户难以接入主流客流。',
  },
  {
    re: /hotel|酒店|住宿|adr/i,
    a: '酒店业是核心载体：滨海湾/乌节路核心区 ADR +35%、入住率达 98%。直接贡献 S$110–140M（占四大行业近一半）。但红利高度集中于国际连锁 + 高端精品酒店，本地民宿受益有限。Agent #124 数据 + traveltech_2 平台搜索量 +320% 共同验证。',
  },
  {
    re: /substitut|替代|挤出/i,
    a: '替代效应是基准 → 悲观情景的关键变量。当区域游客（雅加达、吉隆坡）将既有娱乐预算转移到 Taylor Swift 巡演时，并未创造净新增需求；本地居民因避堵减少市中心消费，进一步抵消。前期数据（2019 K-pop 演唱会 Tampines -7%）显示这种挤出效应可达营业额 7–10%。',
  },
];

const HERO_STATS = [
  { num: 'S$<em>2.5–3.5</em>亿', label: '净 GDP 贡献（保守估计）<br><span>区分总支出口径与本地价值留存</span>' },
  { num: '<em>+0.1–0.3</em>pp', label: '季度环比 GDP 贡献率<br><span>基准情景，对标 F1 夜赛历史</span>' },
  { num: '<em>+40</em>%', label: '樟宜机场国际抵港同比<br><span>演唱会三晚周末，宽体机频次显著上升</span>' },
];

export function createReport() {
  const el = document.createElement('div');
  el.className = 'screen flow-screen flow-screen--report';
  el.id = 'screen-report';

  const tocHtml = SECTIONS.map(s => `<li><a href="#${s.id}">${s.toc}</a></li>`).join('');
  const heroHtml = HERO_STATS.map(s => `
    <div class="report-doc__hs">
      <div class="report-doc__hs-num">${s.num}</div>
      <div class="report-doc__hs-lbl">${s.label}</div>
    </div>
  `).join('');

  el.innerHTML = `
    <div class="report-shell">
      <aside class="report-toc">
        <div class="report-toc__label">In this report</div>
        <ol class="report-toc__list" id="report-toc-list">${tocHtml}</ol>
        <div class="report-toc__actions">
          <button class="flow-btn flow-btn--ghost flow-btn--sm">↓ Download PDF</button>
          <button class="flow-btn flow-btn--ghost flow-btn--sm">⌘ Cite</button>
          <button class="flow-btn flow-btn--ghost flow-btn--sm" id="btn-restart">↻ New scenario</button>
        </div>
      </aside>

      <article class="report-doc" id="report-doc">
        <header class="report-doc__head">
          <div class="report-doc__meta">
            <span class="report-doc__class">CONFIDENTIAL · DRAFT</span>
            <span class="report-doc__sep">·</span>
            <span>Mar 18 2024</span>
            <span class="report-doc__sep">·</span>
            <span>Run #7c4-a01</span>
          </div>
          <h1 class="report-doc__title">Taylor Swift 时代巡演对新加坡经济的影响 — <em>多 Agent 世界模型</em>仿真分析。</h1>
          <div class="report-doc__byline">
            <span>Prepared by <b>Loka Research</b> · Multi-agent swarm × quantitative economic analysis</span>
          </div>
          <div class="report-doc__hero-stats">${heroHtml}</div>
        </header>

        <section class="report-section" id="rs-abstract">
          <h2 class="report-section__h">Executive Brief</h2>
          <p class="report-section__lead">量化评估 Taylor Swift 时代巡演（Mar 2–9, 2024）通过旅游、酒店、航空等渠道对新加坡 GDP 的直接与间接拉动效应。模拟使用 2,000 个按 DOS 2023 人口普查抽样的 Agent，跑 120 轮 OASIS 多智能体交互，叠加 IO/CGE + Monte Carlo（n=10,000）量化层。<b>核心发现：尽管"超 10 亿新元"的总经济影响被广泛引用，实际净 GDP 贡献更可能落在 S$2.5–3.5 亿区间，主要通过旅游、酒店、航空和本地商业的直接与间接乘数效应实现。</b></p>
        </section>

        <section class="report-section" id="rs-1">
          <h2 class="report-section__h"><span class="report-section__num">01</span>Executive Summary</h2>
          <p>本章分析模拟世界中 Taylor Swift 时代巡演对新加坡 GDP 的总体经济贡献。模拟数据显示，尽管"超 10 亿新元"的总经济影响被广泛引用，<b>实际净 GDP 贡献更可能落在数亿新元区间</b>，主要通过旅游、酒店、航空和本地商业的直接与间接乘数效应实现。</p>

          <h3 class="report-section__h3">直接消费拉动 — 集中在住宿、交通与体验</h3>
          <p>演唱会三晚期间，高端酒店和交通服务出现显著需求激增。某旅游科技平台高级产品经理指出："酒店入住率飙升 35%，尤其是在乌节路和滨海湾区域"。樟宜机场的客流数据印证了国际吸引力：</p>
          <aside class="report-callout">
            <p>"Changi Airport reported a <b>40% YoY increase</b> in international arrivals during concert weekends, with charter flights and last-minute bookings from Southeast Asia and East Asia notably high."</p>
          </aside>
          <p>这种"爆发式消费"模式（burst consumption），让歌迷在短时间内集中支出于机票、住宿和便利性服务，构成 GDP 贡献的直接基础。</p>

          <h3 class="report-section__h3">间接乘数效应 — 从街头小贩到数字支付</h3>
          <p>经济影响远不止于场馆周边。加东地区娘惹菜小贩 Amantha Lim 描述了基层商业的真实受益："Eras Tour 周末，East Coast Lagoon 摊位排起了我自疫情前 CNY 以来没见过的队……Geylang 的香料供应商告诉我那周销售涨了 30%。" 这种涟漪效应贯穿供应链，并延伸至数字领域。一位财富顾问观察到："活动还刺激了 Grab、PayNow 等数字支付的使用"。</p>

          <p>为量化各行业贡献，整合 Agent 提及的关键指标如下：</p>
          <div class="report-data-table">
            <table>
              <thead><tr><th>行业</th><th>影响金额 (S$M)</th><th>关键数据来源</th></tr></thead>
              <tbody>
                <tr><td>住宿</td><td>110–140</td><td>Agent #124: ADR +35%</td></tr>
                <tr><td>航空 / 交通</td><td>65–85</td><td>Agent #164: 客流 +40%</td></tr>
                <tr><td>F&amp;B</td><td>55–70</td><td>Agent #140: 销售 +40%</td></tr>
                <tr><td>零售</td><td>40–55</td><td>Agent #124: 独立商户售罄</td></tr>
              </tbody>
            </table>
          </div>

          <h3 class="report-section__h3">方法论警示 — 区分总支出与净 GDP</h3>
          <p>多位 Agent 强调必须谨慎解读宏观数字。一位资深记者警告："While the claim of 'over S$1 billion' in economic impact sounds impressive, it's crucial to distinguish between gross spending and net GDP contribution. Much of that figure likely includes ticket revenue repatriated overseas, not local value-added." 这意味着，真正的 GDP 贡献需扣除流向海外的票务分成，并考虑是否挤占了常规旅游（替代效应）。政府分析师补充："应采用投入产出模型来隔离真实新增需求"。</p>

          <p><b>泰勒·斯威夫特时代巡演为新加坡带来真实且可观的短期经济提振，保守估计直接与间接 GDP 贡献在 S$2.5–3.5 亿之间</b>。建议政策制定者建立透明的"文化事件经济评估框架"，纳入 SME 参与度和本地价值留存率。</p>
        </section>

        <section class="report-section" id="rs-2">
          <h2 class="report-section__h"><span class="report-section__num">02</span>Situation Assessment</h2>
          <p>本章基于多类利益相关方的言行，描绘演唱会期间新加坡演唱会经济生态的结构性格局。<b>经济影响并非均匀扩散，而是沿"国际客流—高端住宿—本地体验"链条分层传导</b>，核心红利集中于滨海湾与乌节路等枢纽区域，基层小微商户需主动嵌入协作网络才能捕获间接收益。</p>

          <h3 class="report-section__h3">核心枢纽 — 高端酒店与交通节点</h3>
          <p>滨海湾及乌节路区域构成经济生态的"主干道"，承接了大部分国际游客的直接消费。某旅游科技平台产品经理指出："巡演期间从樟宜机场到国家体育场周边的路线规划查询量激增了近 40%。" 这印证了国际客流高度集中于机场—场馆—酒店三角路径。</p>

          <h3 class="report-section__h3">边缘激活 — 基层商户的自组织协作</h3>
          <p>相较之下，加东、惹兰勿刹等非核心区域依赖"涟漪效应"获益。Amantha Lim 描述其被动但真实的参与方式："很多本地年轻人带外国朋友来东海岸打卡……我也主动送了试吃装给滨海湾几家酒店礼宾部，让他们放在欢迎包里。" 这种"非正式协作"凸显基层商户缺乏官方渠道接入主流消费流，必须依靠个人关系网络或社交媒体曝光争取机会。</p>

          <h3 class="report-section__h3">结构性摩擦 — 数据孤岛与可持续压力</h3>
          <p>尽管各方普遍认可短期提振，协作机制存在明显断层。政府政策分析师指出："跨部门信息共享机制显得尤为重要……理想状态下，应建立一个临时联合响应单元，整合交通、环卫、小贩中心及社区组织。" 现实中小商户往往"通过 TikTok 趋势而非行业简报"得知需求激增，错失备货窗口。同时环境压力加剧 — 演唱会日国家体育场站晚间地铁客流激增 30–40%，伴随一次性包装废弃物显著上升。</p>

          <p>为量化各利益相关方角色与挑战：</p>
          <div class="report-data-table">
            <table>
              <thead><tr><th>利益相关方</th><th>核心角色</th><th>主要挑战</th><th>协作模式</th></tr></thead>
              <tbody>
                <tr><td>国际航空公司</td><td>客流导入通道</td><td>行李超规、临时退改</td><td>与机场/地勤标准化</td></tr>
                <tr><td>高端酒店集团</td><td>消费承载核心</td><td>人力与服务峰值压力</td><td>与旅游局共享客流预测</td></tr>
                <tr><td>旅游科技平台</td><td>需求分流与路径优化</td><td>实时事件数据源不足</td><td>API 对接交通与住宿</td></tr>
                <tr><td>基层小贩/小店</td><td>文化体验供给者</td><td>缺乏预警、数字能力有限</td><td>依赖个人网络与社媒</td></tr>
                <tr><td>政府机构</td><td>跨部门协调</td><td>部门壁垒、环保被边缘化</td><td>事后评估为主</td></tr>
              </tbody>
            </table>
          </div>

          <p><b>巡演暴露了新加坡事件经济生态的"双速结构"</b>：高端服务业高效捕获直接收益，基层小微经济体需额外努力才能分得间接红利。</p>
        </section>

        <section class="report-section" id="rs-3">
          <h2 class="report-section__h"><span class="report-section__num">03</span>Core Findings</h2>
          <p>本章聚焦巡演对关键行业的直接经济拉动与间接乘数传导机制。<b>经济影响呈现"核心行业高集中度、边缘行业低渗透率"的非对称结构</b>。</p>

          <div class="report-finding">
            <div class="report-finding__num">F1</div>
            <div>
              <h4 class="report-finding__h">酒店业是绝对受益主体，直接贡献占四大行业总和近一半。</h4>
              <p>核心区 ADR +35%、入住率达 98%。某旅游科技平台数据：演唱会前后周末酒店搜索量激增 320%、短途交通预订翻倍。然而该红利高度集中于国际连锁与高端精品酒店，普通民宿受益有限。</p>
            </div>
          </div>

          <div class="report-finding">
            <div class="report-finding__num">F2</div>
            <div>
              <h4 class="report-finding__h">航空业承受最直接运营压力，CAAS 启动弹性调度池。</h4>
              <p>樟宜资深空管观察："那几天来自北美和澳洲的宽体机起降频次明显上升。" 民航当局动态调度非高峰岗位有资质人员支援，并推进数字化流量预测——但坚持"安全永远第一"的人工决策核心。</p>
            </div>
          </div>

          <div class="report-finding">
            <div class="report-finding__num">F3</div>
            <div>
              <h4 class="report-finding__h">本地餐饮与零售分化受益，老店与打卡店命运迥异。</h4>
              <p>核心动线或具网红属性的摊位日营业额翻 2.5 倍以上；许多传统老店因顾客偏好打卡而非正餐，实际收益甚微。多数摊主选择全家上阵而非雇临时工，坚守品质底线。</p>
            </div>
          </div>

          <div class="report-finding">
            <div class="report-finding__num">F4</div>
            <div>
              <h4 class="report-finding__h">间接乘数效应有限传导，社区互助展现基层韧性。</h4>
              <p>食材供应商普遍维持价格稳定，物流成本小幅上升。商户间通过非正式网络共享资源："隔壁冰水档抬价 30%，我直接改用自家制冰机"。</p>
            </div>
          </div>

          <p>整合 Agent 提供的线索：</p>
          <div class="report-data-table">
            <table>
              <thead><tr><th>行业</th><th>直接影响 (S$M)</th><th>间接乘数系数</th><th>关键证据</th></tr></thead>
              <tbody>
                <tr><td>酒店业</td><td>110–140</td><td>1.3–1.5</td><td>ADR +35%; 平台搜索 +320%</td></tr>
                <tr><td>航空/交通</td><td>65–85</td><td>1.2–1.4</td><td>客流 +40%; 宽体机频次上升</td></tr>
                <tr><td>F&amp;B</td><td>55–70</td><td>1.1–1.3</td><td>日营业额 ×2.5–3</td></tr>
                <tr><td>零售/本地商业</td><td>40–55</td><td>1.0–1.2</td><td>独立商户营收 +50%–150%</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        <section class="report-section" id="rs-4">
          <h2 class="report-section__h"><span class="report-section__num">04</span>Scenario Analysis</h2>
          <p>基于多类 Agent 对巡演经济影响的预期，构建乐观、基准、悲观三种情景。<b>核心差异源于国际客流性质（新增 vs 转移）、本地消费渗透深度及运营风险暴露程度</b>。</p>

          <h3 class="report-section__h3">乐观情景 — 区域联动与文化溢出驱动高增长</h3>
          <p>在最理想条件下，演唱会吸引大量长程国际游客（欧美、澳洲），人均停留 >3 天，主动探索非核心区文化街区。若官方成功设计"文化导览路线"并联动本地商户，<b>F&amp;B 与零售业乘数效应将显著放大，推动总 GDP 贡献逼近 0.4%–0.5% 季度环比增幅</b>。</p>

          <h3 class="report-section__h3">基准情景 — 历史对标下的稳健脉冲</h3>
          <p>假设活动规模与过往大型事件（如 F1 夜赛）持平，观众以区域短途客（印尼、马来西亚）和本地粉丝为主，消费集中于滨海湾–乌节路三角区。政府政策分析师："对季度 GDP 的贡献通常在 0.1–0.3% 之间。" <b>酒店与航空业捕获大部分直接收益，基层商户受益有限。</b></p>

          <h3 class="report-section__h3">悲观情景 — 替代效应与运营中断压制增长</h3>
          <p>当演唱会引发显著"替代效应"或遭遇运营中断（如极端天气），经济影响大幅缩水。政府分析师警告："2019 K-pop 演唱会数据显示，活动周 Tampines 小贩中心营业额反而下降 7%。" 若国际客流仅从邻近城市转移而来，且本地居民因避堵减少市中心消费，<b>净 GDP 贡献可能 < 0.05% 甚至趋近于零</b>。</p>

          <div class="report-data-table">
            <table>
              <thead><tr><th>情景</th><th>GDP 贡献 (季度环比 %)</th><th>核心驱动</th><th>主要风险</th></tr></thead>
              <tbody>
                <tr><td>乐观</td><td>0.3 – 0.5</td><td>长程国际客 + 文化导览联动</td><td>高运营成本、环境压力</td></tr>
                <tr><td>基准</td><td>0.1 – 0.3</td><td>区域短途客、消费集中核心区</td><td>替代效应、基层受益有限</td></tr>
                <tr><td>悲观</td><td>&lt; 0.05</td><td>需求转移、运营中断</td><td>小微商户现金流断裂</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        <section class="report-section" id="rs-5">
          <h2 class="report-section__h"><span class="report-section__num">05</span>Risk Register</h2>
          <p>系统识别巡演对新加坡经济影响的潜在下行风险。<b>若缺乏前瞻性规划与跨部门协同，短期消费脉冲可能被运营中断、价值外流与社区排斥等风险显著抵消。</b></p>

          <ul class="report-risks">
            <li><b>极端天气/安全事件中断演唱会。</b>引发票务与住宿退款潮，损害目的地声誉，需 3–6 个月重建游客意愿。</li>
            <li><b>区域游客的替代效应削弱净新增需求。</b>2019 K-pop 数据显示活动周 Tampines 营业额 -7%，消费并未均匀扩散甚至挤占常规本地支出。</li>
            <li><b>经济价值外流至海外实体。</b>大部分票务收入与官方周边销售流向国际主办方与平台，本地留存率低，表面繁荣下真实 GDP 贡献被大幅稀释。</li>
            <li><b>基层商户被排除在红利之外。</b>"赢家通吃"格局加剧，租金上涨可能加速士绅化，破坏长期社区经济生态。</li>
          </ul>

          <div class="report-data-table">
            <table>
              <thead><tr><th>风险</th><th>概率</th><th>影响</th><th>缓解措施</th></tr></thead>
              <tbody>
                <tr><td>极端天气/安全事件</td><td>中 (30–40%)</td><td>高</td><td>活动取消保险；应急疏散预案</td></tr>
                <tr><td>替代效应（非净新增）</td><td>高 (&gt;60%)</td><td>中高</td><td>"观演 + 文化导览"长停留套餐</td></tr>
                <tr><td>价值外流海外</td><td>高 (&gt;80%)</td><td>高</td><td>本地供应链采购比例；文化活动税</td></tr>
                <tr><td>基层商户被排除</td><td>高 (&gt;70%)</td><td>中</td><td>导览路线纳入传统食阁；优先曝光小微</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        <section class="report-section" id="rs-6">
          <h2 class="report-section__h"><span class="report-section__num">06</span>Recommendations</h2>
          <p>提炼最大化巡演经济红利的<b>四项优先行动</b>，直指前文揭示的"双速经济"痛点，旨在将短期消费脉冲转化为广泛、可持续的 GDP 增长。</p>

          <ol class="report-decisions">
            <li>
              <div class="report-decisions__when">行动一</div>
              <div class="report-decisions__what"><b>建立跨部门"大型活动应急协调机制"</b>。整合 ICA、LTA、CAAS 数据，临时简化短期签证审批，延长樟宜入境通道开放时间。提升国际客流转化率 15–20%。</div>
            </li>
            <li>
              <div class="report-decisions__when">行动二</div>
              <div class="report-decisions__what"><b>强制实施"本地嵌入指数"赋能小微商户</b>。开放脱敏票务数据、临时摊位快审通道、区域专属消费券。基层商户受益面扩大 2–3 倍，间接乘数系数提升至 1.4+。</div>
            </li>
            <li>
              <div class="report-decisions__when">行动三</div>
              <div class="report-decisions__what"><b>创新航空/旅游产品延长停留时间</b>。"观演 + 延长停留"套票、区域红眼航班、阶梯式票价 + 行李激励。平均停留延至 2.5–3 晚，航空/酒店收入 +25%。</div>
            </li>
            <li>
              <div class="report-decisions__when">行动四</div>
              <div class="report-decisions__what"><b>嵌入可持续与社区补偿机制</b>。废弃物附加费、社区艺术基金、宁静时段补偿、本地团队周边制作配额。环境成本降 30%，长期申办竞争力提升。</div>
            </li>
          </ol>

          <p class="report-section__sig">— <i>Loka Research, March 2024</i></p>
        </section>

        <footer class="report-doc__foot">
          <div>Generated by Loka v1.0 · Run #7c4-a01 · 2,000 agents · 120 rounds · 10,000 MC iterations</div>
          <div>This document is a draft. Contact the analyst before circulation.</div>
        </footer>
      </article>

      <aside class="report-chat">
        <div class="report-chat__head">
          <div class="report-chat__title">Ask the model</div>
          <div class="report-chat__sub">Loka has read every line of this report.</div>
        </div>
        <div class="report-chat__body" id="report-chat-body">
          <div class="report-chat__msg">
            <div class="report-chat__avatar">L</div>
            <div class="report-chat__bubble">Hi — I'm Loka, the analyst behind this run. 可以问我任何关于这份报告的问题：核心发现、风险、情景对比、方法论、与历史/真实数据的对比……都行。</div>
          </div>
        </div>
        <div class="report-chat__suggest" id="report-chat-suggest">
          <button class="report-chat__sug">总结核心发现</button>
          <button class="report-chat__sug">主要风险</button>
          <button class="report-chat__sug">三种情景的差异</button>
          <button class="report-chat__sug">替代效应解释</button>
        </div>
        <form class="report-chat__form" id="report-chat-form">
          <input type="text" class="report-chat__input" placeholder="Ask a question…" id="report-chat-input">
          <button type="submit" class="report-chat__send">→</button>
        </form>
      </aside>
    </div>
  `;

  // ── TOC scroll-spy ──
  const tocLinks = el.querySelectorAll('.report-toc__list a');
  function activateLink(id) {
    tocLinks.forEach(a => a.classList.toggle('is-active', a.getAttribute('href') === '#' + id));
  }
  tocLinks.forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      const id = a.getAttribute('href').slice(1);
      const target = el.querySelector('#' + id);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      activateLink(id);
    });
  });
  activateLink(SECTIONS[0].id);

  // ── Chat ──
  const chatBody = el.querySelector('#report-chat-body');
  const chatForm = el.querySelector('#report-chat-form');
  const chatInput = el.querySelector('#report-chat-input');
  function pushMsg(text, who) {
    const msg = document.createElement('div');
    msg.className = 'report-chat__msg' + (who === 'user' ? ' report-chat__msg--user' : '');
    msg.innerHTML = `
      <div class="report-chat__avatar">${who === 'user' ? 'You' : 'L'}</div>
      <div class="report-chat__bubble">${text}</div>
    `;
    chatBody.appendChild(msg);
    chatBody.scrollTop = chatBody.scrollHeight;
  }
  function answer(q) {
    const hit = CHAT_HEURISTICS.find(h => h.re.test(q));
    return hit ? hit.a : "我是演示版 Bot — 关于报告里的核心发现、风险、情景、方法论、酒店/航空/F&B 影响、替代效应、乘数等都可以问，我会从报告内容里答。";
  }
  const suggestEl = el.querySelector('#report-chat-suggest');
  function ask(q) {
    pushMsg(q, 'user');
    if (suggestEl) suggestEl.style.display = 'none';
    setTimeout(() => pushMsg(answer(q), 'bot'), 480);
  }
  chatForm.addEventListener('submit', e => {
    e.preventDefault();
    const v = chatInput.value.trim();
    if (!v) return;
    chatInput.value = '';
    ask(v);
  });
  el.querySelectorAll('.report-chat__sug').forEach(btn => {
    btn.addEventListener('click', () => ask(btn.textContent));
  });

  // legacy hooks
  el._loadProject = () => {};

  return el;
}
