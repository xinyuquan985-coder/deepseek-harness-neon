# dsh-mods：DSH 爆改第一弹——辩论模式 + 赛博皮肤 + VS 视图

按"节目优先 + 视觉锚点"路线落地方向 1（双代理辩论台，VS 窗口呈现）与方向 4（赛博主题皮肤）。

## 交付物

```
dsh-mods/
├── debate/                       # 今天即可用（新会话即生效，无需重启）
│   ├── preset/debate/            # 辩论模式预设（standard 底 + 主持人 persona）
│   │   ├── preset.yml
│   │   └── agent.cordis.yml
│   └── skills/debate-arena/SKILL.md   # 辩论编排协议 + VS 战报格式
├── client/                       # UI 层（创造模式现场注入 / 或仓库 PR 持久化）
│   ├── cyber-theme.client.js     # 赛博主题：13 个别名 token + 霓虹扫描线
│   ├── debate-vs-view.client.js  # VS 对决视图：conversation.view 槽位分屏外壳
│   └── inject.md                 # 现场注入剧本（含验收与回滚）
└── tools/check.mjs               # 产物校验脚本
```

## 今天就能用的部分（debate）

1. 运行 `powershell -ExecutionPolicy Bypass -File ..\creator-trial\install.ps1` 的思路相同：
   把 `debate/preset/debate` 拷到 `<DSH_HOME>\.agent-presets\debate\`，
   把 `debate/skills/debate-arena` 拷到 `<DSH_HOME>\skills\`。
2. 新建会话 → 预设选「辩论模式」→ 发任务：
   > 辩题：「AI 自媒体创作者该不该重度使用 DeepSeek Harness」。开场，派出正方反方裁判，打满 5 回合，每回合出 VS 战报。
3. 主持人（主代理）按 debate-arena 技能派出三个可继续子代理，全程 transcript 可回放 = 视频素材。

## UI 层（cyber + VS 视图）

两段路径，详见 `client/inject.md`：
- **现场注入（推荐，出片快）**：创造模式会话里用 cordis_define 动态装进运行中的浏览器，免 rebuild 免重启，过程本身就是节目。
- **持久化（仓库 PR）**：按 packages/client/AGENTS.md 新插件包清单建 `ui-cyber-theme` / `ui-debate-vs`，走测试门禁与 build。

## 纪律（技术观众会拆穿）

- 所有演示真实跑通再拍；VS 视图 v1 是视觉外壳，真实数据接线是 v2——视频里如实说。
- 主题 token 覆盖契约（13 个别名、light/dark 双值）来自 `packages/client/ui-theme/src/client/index.ts`，
  预发布期签名可能变，注入前按 inject.md 核对。

## 修复记录

- **皮肤被设置回滚（已修复）**：持久化版皮肤曾闪一下赛博色就变回原主题。根因是 ui-theme 的
  `ThemeRuntime.adopt()` 在设置文档首次到达时把持久化偏好（light/dark/system）盖回内存中的扩展主题
  `cyber`。修复在 `packages/client/ui-theme/src/client/index.ts`：扩展主题 id（非内置偏好）激活期间，
  adopt 不再覆盖；选回内置外观即交还控制权。回归测试：
  `packages/client/ui-theme/tests/theme.client.spec.ts`（"a published Host section does not revert an
  active in-process extension theme"）。已验证：启动后皮肤保持赛博色（headless 探针时间线 546ms 起不再回滚）。

- **VS 视图 v2 上线（实时看板 + 默认视图）**：`packages/client/ui-debate-vs` 从静态外壳升级为实时看板——
  辩题 + 回合数（解析战报标题）、正方/反方状态卡（子代理目录，点击跳转子代理会话）、每回合 VS 战报流
  （流式 partial 实时渲染）、主持人 lane、裁判席终局判决。`debate` 预设会话首次打开默认停在 VS 对决标签
  （`viewDefaultFor` provide 通道贡献 + `ui-conversation` 的 `resolveActiveView` 默认视图解析；用户手动
  选过的标签始终优先）。输入框是会话级常驻，切到 VS 标签即可直接打字实时调控。识别依赖 debate-arena
  词汇（战报标题 `# ⚔️ 第 <n> 回合`、判决牌/获胜方、子代理标签前缀 正方/反方/裁判）。

- **v2.1 修复（默认视图抢占、等宽、终止）**：
  - 历史遗留的 `view: 'chat'` 持久化不再压住预设默认视图——新增 `viewPicked` 标记，用户点击任意标签后
    才视为显式选择（`ui-conversation` 的 store/`resolveActiveView`，旧快照无此字段自动按未选择处理）。
  - VS 看板重构为 正方(1fr)｜VS(96px)｜反方(1fr) 等宽布局，战报流全宽置下、裁判席置底（修复子代理卡
    落进中间窄列的布局 bug）。
  - 全局补齐「终止」能力：子代理目录中运行中的可继续子代理行出现「终止」按钮（`ui-subagent`，走
    `subagents.interrupt` 接口 + 目录刷新）；VS 看板运行中的正方/反方侧卡同样出现「终止」按钮
    （`ui-debate-vs`）。一次性子代理不可终止（产品契约）。

- **VS 视图 v2.3（辩论节奏看板 + 观众确认门）**：
  - 两栏只输出**辩论内容**（子代理 assistant 发言，取 `data.message.content`；指令/思考/工具事件全部过滤），
    不再显示长指令，也不再提供会跳转层级的入口；实测正方栏输出正方立论/质询/结辩原文，反方栏同。
  - 新增**环节进度条**：读取主持人的 `todos` 投影（回合清单），当前环节高亮、已完成打勾——辩论节奏
    一目了然；有任意辩手运行时中央 VS 徽标脉动。
  - 新增**观众确认门**：debate-arena 技能升级——每个回合战报输出后，主持人必须用 ask_user_question
    向观众确认（开启下一回合 / 加赛调整 / 结束辩论），确认前不进入下一回合；VS 看板在等待确认时
    显示「第 N 回合已收官——观众确认后开启下一回合」横幅（会话内问题即触发）。
