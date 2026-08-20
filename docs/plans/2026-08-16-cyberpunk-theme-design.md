# 赛博朋克 2077 主题皮肤设计

日期:2026-08-16。状态:设计进行中(待确认:角色阵容、视觉效果细节)。

## 目标与已确认决策

- 整个 Web GUI 增加「赛博朋克」外观档,作为外观设置的第 4 个持久化选项;浅色、深色、跟随系统三档保留,随时可切回。
- 对话框增加角色皮肤:用户与助手消息带头像框、角色名牌,可换皮肤。
- 用户在 2026-08-16 会话中确认:上线方式为「外观设置新增第 4 个选项」;质量保证采用 token 数学 + WCAG 对比度计算 + 快照测试 + 截图像素采样 + 真机验收。

## 架构现状(权威事实)

- 主题服务在 [ui-theme/src/client/index.ts](../../packages/client/ui-theme/src/client/index.ts):`ThemeRuntime` 内置 `light`/`dark` 两个 `ThemeDefinition`(`BUILTIN_THEMES`),`register()` 接受第三方主题,`setTheme(id)` 切换;偏好从 `preference → themes.find(id)` 解析,`system` 按 OS 配色解析。代码注释明示:非内置 id 不进入 settings schema、不持久化。
- 偏好 schema 在 [ui-theme/src/theme-settings.ts](../../packages/client/ui-theme/src/theme-settings.ts):`THEME_PREFERENCES = ['light', 'dark', 'system']`,持久化于用户设置文档。
- [ui-layout 的 ThemePresenter](../../packages/client/ui-layout/src/client/theme-presenter.ts) 把快照投影到 DOM:`html color-scheme`、`body[data-ds-dark-theme]`、活动主题的别名 token 作为 body 内联变量、`meta[name="theme-color"]`。它只写自己写过的属性,dispose 时收回。
- 已存在 `ui-cyber-theme` 包:注册 `cyber` 主题(13 个别名 token)并在 apply 时强制 `setTheme('cyber')`。该行为与选定的 UX(可选第 4 档)冲突,且注册主题不持久化;其 token 将迁入 ui-theme 内置档。

## 设计决策

1. cyber 升格为 ui-theme 内置主题档:加入 `THEME_PREFERENCES`、`BUILTIN_THEMES`、boot 脚本与外观行第 4 立方体,获得持久化与 schema 校验。
2. 删除 ui-cyber-theme 包及全部布线(bundle 行、web-app 依赖、聚合 tsconfig 引用、README);其配色并入 ui-theme。
3. 新建 `ui-persona` 客户端插件承载角色皮肤(角色数待用户确认,默认双角色)。
4. ThemePresenter 增加 `body[data-theme-id]` 属性(仅写自己设置的 id),作为赛博朋克效果层(扫描线、霓虹辉光)的 CSS 门控;效果样式归 ui-theme 所有。

## 配色 token(已通过 WCAG 验证)

主色板:夜城黄 `#FCE400`(品牌)、黑墙青 `#00F0FF`(业务/链接)、近黑蓝底 `#05070D`。下表每一对前景/背景均经 WCAG 相对亮度公式计算,正文对背景 ≥ 4.5:1,全部达标。

| token | 值 | 用途 | 对 bg-base 对比度 |
| --- | --- | --- | --- |
| `--dsw-alias-bg-base` | `#05070D` | 应用底色 | — |
| `--dsw-alias-bg-layer-1` | `#0A0F1C` | 一级浮层 | — |
| `--dsw-alias-bg-layer-2` | `#10182B` | 二级浮层 | — |
| `--dsw-alias-bg-layer-3` | `#16203A` | 三级浮层 | — |
| `--dsw-alias-bg-overlay` | `#16213A` | 弹层 | — |
| `--dsw-alias-brand-primary` | `#FCE400` | 品牌/主按钮 | 15.6:1 |
| `--dsw-alias-label-primary` | `#D6F5FF` | 正文 | 17.6:1 |
| `--dsw-alias-label-secondary` | `#8FA8C9` | 次要文字 | 8.3:1 |
| `--dsw-alias-label-tertiary` | `#6E86A8` | 弱化文字 | 5.4:1 |
| `--dsw-alias-state-error-primary` | `#FF2E63` | 错误 | 5.6:1 |
| `--dsw-alias-state-success-primary` | `#00FF9D` | 成功 | 15.1:1 |
| `--dsw-alias-state-warn-primary` | `#FF9E00` | 警告 | 9.7:1 |
| `--dsw-alias-brand-business` | `#00F0FF` | 业务/链接 | 14.3:1 |

按钮规则:主按钮填充 `#FCE400`,按钮文字用近黑 `#0A0A0A`(对比 15.3:1),实现时通过 `--dsw-alias-label-primary-foreground` 的 cyber 覆盖值达成,不新增专用 token。其余别名(border、button、interactive、markdown、scrollbar、specific-*、shadow)在实现时逐个给出 cyber 值,规则同上:前景对所在背景 ≥ 4.5:1,边框与阴影不做文字对比要求。

## 效果层(ui-theme 所有,门控于 body[data-theme-id="cyber"])

- 扫描线:fixed 全屏 overlay,`repeating-linear-gradient` 2~4% 透明度;`prefers-reduced-motion: reduce` 时完全关闭。
- 霓虹辉光:`--dsw-shadow-lv1..3` 在 cyber 档替换为青色/黄色辉光阴影,组件无需改动。
- 用户气泡:夜城黄底 + 近黑字(新增 `--dsw-specific-bubble-foreground` token,默认值 = `--dsw-alias-label-primary`,cyber 值 = `#0A0A0A`;MessageItem 气泡文字改消费该 token)。
- 斜切角(notch):头像框与角色名牌使用 clip-path 切角,风格致敬夜之城 HUD,不搬运任何版权素材。

## 角色皮肤(ui-persona,待确认)

- 默认双角色:用户 = 网络行者(V 风格义体),助手 = 黑墙 AI(Alt 风格虚体);子代理、工作流代理复用助手皮肤的颜色变体。用户未确认前按双角色推进。
- 肖像为原创 SVG 矢量(坐标文本可控),不生成位图、不搬 CDPR 原画。

## 验证计划

1. `pnpm run test:gui`(改动即跑)。
2. `DSH_SNAPSHOT=refresh pnpm run test:web` 刷新外观行等预期快照后,再跑 `DSH_SNAPSHOT=replay pnpm run test:web` 断言组装产物。
3. 对 127.0.0.1:3080 真机截图做像素采样:验证背景色、霓虹边框、扫描线实际渲染。
4. 用户在真机刷新验收,不满意处按反馈迭代。

## 实施状态

1. ✅ ui-theme cyber 内置档(偏好/schema/boot/第 4 立方体/locales/IconGlitch16);`test:gui` 相关规格全绿。
2. ✅ ThemePresenter `data-theme-id`;`cyber-effects.css`(扫描线、霓虹辉光、夜景晕影);气泡前景 token;MessageItem 消费。
3. ✅ ui-cyber-theme 包及全部布线已删除;lockfile 已更新。
4. ✅ ui-persona 包:`conversation.chat.persona` 键位插槽(user/steering/assistant-step)、斜切角头像框、原创 SVG 肖像(网络行者/黑墙 AI)、名牌双语;规格全绿(应用接线/销毁 + 组件渲染)。
5. ✅ 交互动效层:扫描线漂移、悬停故障闪、按压黄辉、聚焦光环、标签选中黄条、输入框聚焦辉光、语音聆听脉冲;全部按 prefers-reduced-motion 豁免。
6. ✅ ui-voice-input 包:会话头部麦克风开关(SpeechRecognition 特性检测、zh-CN、最终文本 append 进草稿、仅赛博朋克主题可见、IconMicOutline16);规格全绿。
7. ✅ 新增 `apps/web/tests/cyber-theme.e2e.ts` + 自建无-cwd 种子夹具(`snapshots/cyber-theme/seed.jsonl`):真实宿主+浏览器断言 cyber 调色板、扫描线伪元素、persona 双角色行、黄底黑字气泡、语音开关明暗门控;golden 已录制且 replay 确定性通过。
8. ✅ 3080 真机像素采样:cyber 档激活、bg `#05070D`、brand `#FCE400`、border-l2 `rgba(0,240,255,0.32)`、5% 扫描线、零控制台错误。
9. ✅ 用户重启服务后 3080 真机验收通过:persona「黑墙 AI」行、麦克风「语音输入」按钮、黄底黑字用户气泡、cyber 主题全部实测渲染,零控制台错误;截图存 `logs/cyber-final.png`。
10. ✅ 构建链全绿:新 e2e 注册进 client exclude + host include 后,全量 `build:lib:client` 与 `build:lib:host` 均通过(此前 vendor/hmr 报错为该注册缺失导致的跨程序编译级联)。

### 环境备注

- 本机 `npm` 不在 PATH,根 `build`/`test:web` 脚本内部调用 npm 会失败,等价步骤须用 pnpm 直跑(或 `pnpm exec vitest --config vitest.web.config.ts`)。
- Playwright 浏览器需按 pin 版本安装:`node node_modules/.pnpm/playwright@1.61.1/node_modules/playwright/cli.js install chromium`(通用 `pnpm exec playwright` 装的是错误修订 1223,测试要 1228)。
- 沙箱内禁止运行 pnpm install(会 EPERM 中断并破坏 node_modules 工作区链接);安装类命令改从 worker 侧 spawn 执行且不中断。
- 工作树中 ui-subagent、ui-conversation contract、未跟踪的 ui-debate-vs 等属于其他会话的在途改动;`test:gui` 的 scrollbar(debate-vs)与 code-block 超时失败系其所致,不属于本主题改动。
- `pnpm install` 后 tsc -b 会重新编译 vendor/hmr 并暴露其 `exactOptionalPropertyTypes` 既有类型错误(增量缓存失效触发),需由 owner 修复;期间新包节点面产物可用 `pnpm --filter <pkg> bundle` + 手写 lib/index.js 兜底。
- Windows 下共享夹具的 `{{cwd}}` 替换会产生非法 JSON 反斜杠,新夹具首行必须不含 cwd。
