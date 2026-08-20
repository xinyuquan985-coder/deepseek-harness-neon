# 现场注入剧本：把赛博主题与 VS 视图装进正在运行的 Web UI

前提：你的部署带「创造模式」（cordis）预设，它提供 cordis_define / cordis_inspect_* / cordis_run 工具，
可以让代理把客户端插件动态定义进**运行中的浏览器**，无需 rebuild、无需重启。
本会话所在的预设没有这些工具，所以这一步在新会话里完成——这本身就是节目素材。

## 步骤（在「创造模式」新会话中执行）

1. **发任务**：
   > 给当前 Web UI 加两个客户端插件：赛博主题和 VS 对决视图。载荷分别在本机
   > `dsh-mods/client/cyber-theme.client.js` 与 `dsh-mods/client/debate-vs-view.client.js`。
   > 先用 cordis_inspect_list / cordis_inspect_query 核对：ctx.theme 的 register/setTheme 签名、
   > 'conversation.view' 槽位的 PropsRuntime 契约、客户端运行时里 React 的可用导入方式，
   > 再按核对结果修正载荷，逐个 cordis_define + cordis_run，最后报告生效状态。

2. **等待**：工具返回 `starting`/`awaiting-approval` 后停手等系统报告（官方纪律：不要在
   同一轮里干等或轮询）。

3. **验收**：
   - 主题：设置 → 外观里出现 cyber（或界面立即变赛博风）；截图/录屏。
   - VS 视图：任意会话的视图环出现「VS 对决」标签页；截图/录屏。

4. **回滚**：`cordis_stop`（临时停）或 `cordis_undefine`（彻底删）；主题回 `dark`。

## 两个载荷的已知事实与待核对项

| 载荷 | 已按官方契约写死 | 运行前必须核对 |
| --- | --- | --- |
| cyber-theme（v2 全窗口） | ThemeDefinition 结构、13 个别名 token 名单、register 返回值是 disposer、requiresLightAndDark 契约；全窗口三层效果（token 全局换肤 + 氛围层 + HUD 层） | ThemeRuntime 的 setTheme/register 精确签名、inject 键名 |
| debate-vs-view | `slots.inject('conversation.view', …)` 注册姿势（照抄 ui-trajectory 官方样板）、四份 props 纪律 | PropsRuntime 精确字段、React 在客户端运行时中的导入方式 |

## 全窗口验收清单（皮肤，逐项截图）

1. 切换后**整个窗口**变色：侧栏、会话区、详情栏、设置页、编辑器、工具卡片、空白 hero——全部面板同时变赛博（token 挂在 body，天生全局）。
2. 四角 HUD 出现在窗口四角；开机瞬间有一次故障闪烁；底部有缓慢上移的透视网格。
3. 键盘可达：按 Tab 走焦点，焦点环为霓虹青色（未牺牲可用性）。
4. 回滚验证：`setTheme('dark')` 后整个窗口恢复原暗色；`cordis_stop` 后 HUD/网格/扫描线全部消失。
5. 刷新页面：插件在运行时仍处于运行状态时，每次加载会重新注册主题；停用/删除插件后回滚。若刷新后皮肤消失，说明该部署的动态插件不跨加载持久，重跑一次 cordis_run 即可（把这一现象拍进视频反而是好素材）。

## 作用域说明（避免误解）

- **皮肤 = 全窗口**：主题偏好是全局设置，不是会话/任务级；VS 视图标签页才是 session 级（槽位契约 `scope: 'session'`）。
- 主题 token 覆盖不了第三方渲染面（如代码高亮的 shiki 配色、渐变标题字），属于官方 token 契约的已知边界，视频里如实说明。

## 持久化路径（可选，第二步）

现场注入是「整活」；持久化走仓库 PR：新建 `packages/client/ui-cyber-theme` 与
`packages/client/ui-debate-vs`，按 packages/client/AGENTS.md 的
「New plugin package checklist」补齐三处注册（tsconfig 聚合、web-app patch 行、web-app 依赖），
`pnpm run test:gui` 绿，再 `pnpm run build` + 重启 `dsh web`。载荷里的 DOM 直写
（scanline style 标签）在 PR 路径里改放进 CSS Modules。

## 内容脚本钩子

本期视频三段式：① 当场装皮肤（录屏：界面变赛博）→ ② 开 VS 标签页看分屏 → ③ 回放辩论
（transcript）。三个镜头全是真操作，无剪辑特效。
