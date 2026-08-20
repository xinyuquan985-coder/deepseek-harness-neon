# creator-trial：DSH「内容创作」预设 + 3 个创作者技能

面向 AI 自媒体创作者的 DSH 开箱即用试验包。目标是让一个非开发者装上 DSH 后，第一次价值时刻从"读懂 cordis 教程"提前到"新建会话 → 选「内容创作」→ 直接开工"。

## 文件结构

```
creator-trial/
├── preset/creator/
│   ├── preset.yml          # 显示元数据（名称/描述）
│   └── agent.cordis.yml    # 组合：standard 全量拷贝，仅替换 persona（与官方 standard 逐行 diff 验证）
├── skills/
│   ├── topic-research/SKILL.md   # 选题调研：检索取证 → 选题卡评分决策
│   ├── review-draft/SKILL.md     # 测评稿起草：结论/证据/成本/风险/适用条件五段结构
│   └── video-script/SKILL.md     # 视频脚本初稿：口播稿 + 分镜表 + 录屏清单
├── install.ps1 / uninstall.ps1
└── tools/check.mjs         # 验证脚本
```

## 安装

```powershell
powershell -ExecutionPolicy Bypass -File install.ps1
```

安装目标（尊重 `DSH_HOME`，默认 `~\.dsh`）：

- 预设 → `<dshHome>\.agent-presets\creator\`（官方用户预设目录）
- 技能 → `<dshHome>\skills\`（官方用户技能目录，skill-filesystem 默认扫描）

**无需重启服务**：预设 roster 每次读取都重新扫描磁盘；新会话即可在预设选择器看到「内容创作」。

## 验证清单

1. 新建会话，预设选择器出现「内容创作」且无损坏标记（broken）。
2. 会话技能目录出现 topic-research / review-draft / video-script。
3. 跑一个真实任务，例如："用 topic-research 调研本周 AI 选题，输出 3 张选题卡"。
4. 检查 token 消耗（会话统计），对照之前的量级估算（¥0.2~1/次）。

## 注意事项

- 用户预设信任等级 = shell 访问（官方语义）；本预设只是官方 standard 的 persona 变体，未引入新插件。
- 技能装在用户技能目录，对所有预设的会话可见（官方设计如此）；如需只对 creator 预设可见，后续版本改用 `skill-filesystem` 的 `customSkillDirs` 指向预设内 skills 目录。
- 预设组合基于官方 `standard`（当前 0.1.0-rc.5）。官方升级后如有破坏性变更，重新从新 standard 拷贝一次、只替换 persona 即可跟上。

## 卸载

```powershell
powershell -ExecutionPolicy Bypass -File uninstall.ps1
```

## 路线图（v2+）

1. npm bundle 化：`"dsh": { "bundle": { "patch": "./cordis.patch.yml" } }`，走 `dsh plugin --profile <name> add` 分发。
2. Hero 任务模板卡：选题调研 / 测评稿 / 脚本初稿三个一键任务入口。
3. Windows 一键安装器：把 Node 前置与 `npx @deepseek-ai/dsh web` 打包成下载即用。
