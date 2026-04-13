# Loka — 外部 API 申请说明

Loka demo 需要两个外部 API 跑一次快照采集,之后前端离线演示。

## 需要申请的 API

| # | API | 必需性 | 费用 |
|---|-----|--------|------|
| 1 | LLM Provider(Qwen / DeepSeek / OpenAI 三选一) | 必需 | ¥5–¥30 / 次 |
| 2 | Zep Cloud | 必需 | 免费 |

---

## 1. LLM Provider

**用途**:驱动后端 5 个 pipeline 阶段 —— 本体抽取、Agent 画像生成、多智能体模拟(token 大头,~3000 次调用)、报告生成。

**技术要求**:OpenAI 兼容接口 + 支持 JSON mode + 支持 tool calling。

**推荐**:阿里云百炼 DashScope(`qwen-plus`)
- 申请: https://dashscope.console.aliyun.com/
- 理由:国内免 VPN、MiroFish 官方实测 provider、单次 capture 约 ¥13、新用户有免费额度

**备选**:DeepSeek(更便宜,~¥5/次)/ OpenAI(需境外支付)

**预算建议**:¥50(够跑 3–5 次完整 capture)

---

## 2. Zep Cloud

**用途**:LLM 驱动的时序知识图谱服务,负责把输入文档转成结构化实体-关系图,供后续 agent 生成使用。MiroFish 后端深度集成其 SDK,替换需重写上千行代码。

**申请**: https://www.getzep.com → 注册 → Project → API Keys

**费用**:Developer 免费层 10k messages/月,本项目单次 capture 消耗 200–500 messages,零费用。

---

## 申请清单

- [ ] Zep Cloud 账号(免费)
- [ ] LLM Provider(建议 DashScope,预算 ¥50)

## 数据合规

上传内容:用户输入的经济分析 brief、知识图谱结构、agent 对话历史(均为公开资料 / 合成数据),不含个人信息、财务数据、生产数据。
