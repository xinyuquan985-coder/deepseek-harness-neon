# Agent Note: 删除没有消费者的注册表变更事件

Status: proposed

[English](2026-09-26-drop-unconsumed-registry-change-events.md) | 中文

## 问题

`tools/change`、`system-prompt/change` 与 `skills/change` 会被发出，但没有任何处理方。`ToolRuntime` 与 `SystemPrompt` 传给 `ScopedLayers` 的回调只负责发出前两个事件（`packages/core/tools/src/index.ts`、`packages/core/system-prompt/src/index.ts`）。`SkillRuntime.notifyChange()` 在 `invalidateCache()` 递增 `revision` 之后发出第三个事件（`packages/skill/skill/src/index.ts`）。在 `packages/**/src` 与 `examples/**/src` 中搜索，这三个事件都没有 `ctx.on` 或 `ctx.remote.$on` 监听器。生成的事件目录只列出生产方，消费方列为空。监听器只出现在单元测试、仅发出事件名的不变量冒烟，以及一个会记录 `tools/change` 的 host-runner 测试夹具中。

[远程事件投递](../../implemented/architecture/2026-08-10-remote-event-delivery.md) 已经记录这三个事件没有消费者，并把它们排除在 `ctx.remote.$on` 允许名单之外，只称为扩展位。提示词组装也不使用它们。[可重建请求](../../implemented/architecture/2026-07-05-reconstructable-requests.md) 在每个步骤渲染提示词并比较渲染结果，并拒绝由 `tools/change` 或 `system-prompt/change` 驱动的组装。技能目录的 `revision` 计数器才让后续 `collect()` 看到新技能；该事件只是观察者钩子。[Subagent 提供方生命周期](../../implemented/architecture/2026-07-05-subagent-provider-lifecycle-events.md) 仍写着 `tools/change` 会使提示词组装保持最新，这与逐步渲染相矛盾。

`commands/change` 是对照事件。它位于 `packages/api/remotes/src/remote-events.ts` 的允许名单上，客户端运行时会转发它。

## 提案

删除这三个事件声明、它们的发出点、仅为这些发出点而存在的监听器回滚与计数测试，以及生成目录中的对应条目。`ToolRuntime` 与 `SystemPrompt` 构造 `ScopedLayers` 时不再提供变更回调。把 `onChange` 改为可选，这样没有观察者的注册表不必传入空函数；`CommandRuntime` 保留其回调。`SkillRuntime.invalidateCache()` 保留修订号递增与缓存清除，`notifyChange()` 删除。原先统计 `skills/change` 的技能测试改为断言 `collect()` 或修订号。

更新子系统页面、包 README，以及点名这些事件的 JSDoc。改正远程事件注记中仍把这三个事件称为扩展位的那一句，以及 subagent 生命周期注记中把提示词组装保持最新归功于 `tools/change` 的那一句。保留 `commands/change`、`llm/adapters-updated` 以及其余每个已列入允许名单的事件。在层动作内部抛出的注册仍通过现有的 `ScopedLayers` 撤销回滚；该路径不依赖这些事件。

## 备选方案

**把这三个事件保留为扩展位。** 远程事件注记记录了这一选择，树外插件也可以监听。这个扩展位在仓库内没有监听器，组装也有意不建立在它之上，回滚测试只为保护一个无人处理的通知而存在。等第一个生产监听器出现时再把事件加回来。

**只删除 `tools/change` 与 `system-prompt/change`，保留 `skills/change`。** 技能注册表已经容纳监听器失败，使刷新不能破坏目录更新。这套容纳面对的是同一组空的监听器。保留三者之一，就会留下远程事件注记已经把它们归为一组的那套观察者协议。

**改由这些事件驱动提示词或技能刷新。** [可重建请求](../../implemented/architecture/2026-07-05-reconstructable-requests.md) 已经拒绝事件驱动的提示词组装。技能刷新已经在 `collect()` 内部以 `revision` 为键。

## 验收标准

- `packages/**/src`、测试、README 与生成目录中不再出现 `tools/change`、`system-prompt/change` 与 `skills/change`。
- `commands/change` 仍会发出，并留在远程允许名单上。
- 逐步提示词组装与技能 `collect()` 保持当前结果。
- 类型检查、所属包测试与 `pnpm run doc-sync` 通过。

## 风险

监听这些事件的树外插件会失去该信号。仓库尚未发布，因此保留未使用的通知代价更大。当生产监听器无法通过读取注册表看到变更时，再重新引入其中一个事件。抛出异常的观察者将不能再拒绝一次工具、提示词或技能注册，因为那条回滚只为这些发出点而存在。
