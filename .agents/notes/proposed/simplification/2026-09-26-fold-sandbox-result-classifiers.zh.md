# Agent Note: 合并共用的沙箱结果分类器

Status: proposed

[English](2026-09-26-fold-sandbox-result-classifiers.md) | 中文

## 问题

`packages/shell/bash-sandbox/src/helpers.ts` 与 `packages/shell/pwsh-sandbox/src/helpers.ts` 实现同样的四个函数：`isRunnerSpawnFailure`、`classifyDenial`、`classifyRunnerFailure` 与 `matchesSignature`。pwsh 文件把自己写成逐调用镜像，并用 `jscpd:ignore` 包住函数体。函数体一致。`isRunnerSpawnFailure` 的 JSDoc 已经分叉。仅有的生产导入方是 `bash-sandbox/src/index.ts` 与 `pwsh-sandbox/src/index.ts`。每个包的沙箱规格都直接重测这些辅助函数。

[pwsh 工具与 bash 对齐](../../implemented/feature/2026-08-02-pwsh-tool-bash-parity.md) 把完全共享的工具实现推迟到出现第三种 shell 方言或持久 PTY 孪生、使抽象可观察之时。该推迟覆盖工具与执行器孪生（`render.ts`、`background.ts` 与 `startArgv`）。这些辅助函数分类的是沙箱 stderr 与 Node 生成错误。它们不提及 bash 或 pwsh。

`@deepseek-ai/dsh-shell` 已经依赖 `@deepseek-ai/dsh-sandbox`，因此能看到 `RunnerFailureRule`，并且它拥有 `ShellRunResult`。两个沙箱执行器都已经依赖 `@deepseek-ai/dsh-shell`。[裁剪无用的公开 API](./2026-07-04-prune-dead-core-spine-api.md) 仍把 `classifyDenial` 与 `classifyRunnerFailure` 列为 bash-sandbox 包根导出、准备降级。它们今天不是根导出；`index.ts` 只从 `helpers.ts` 导入它们。

## 提案

把这四个函数移入 `@deepseek-ai/dsh-shell`，并与 `parseExitStatus` 一起导出。删除两个 `helpers.ts`。两个执行器导入这一个模块。把辅助函数的单元测试移入 `dsh-shell`，并删除两份沙箱规格中重复的辅助函数 describe。每个沙箱包保留一条执行器级断言，证明拒绝与 runner 失败仍进入 `ShellRunResult`。

不合并 bash 与 pwsh 的工具、执行器或沙箱 argv 包装。不从 `@deepseek-ai/dsh-bash-sandbox` 或 `@deepseek-ai/dsh-pwsh-sandbox` 再导出这些分类器。本提案落地时，从裁剪注记的 bash-sandbox 行中去掉 `classifyDenial` 与 `classifyRunnerFailure`；该清单的其余部分不动。

## 备选方案

**把 pwsh 文件保留为带标记的镜像。** 对齐注记把结构孪生视为日后共享工具基座的基础。这些辅助函数不是那个基座：它们没有方言差异，而已经分叉的 JSDoc 表明镜像正在漂移。否则第三种 shell 还需要第三份副本。

**在同一次变更中折叠 `bash-local` 与 `pwsh-local` 里的后台 `ShellProcess` 适配器。** 那一块也是重复的，但它位于 `startArgv` 内部，旁边是 UTF-8 前导码与方言 argv。对齐注记把该执行器合并推迟到第三种方言显出抽象之时。分类器不需要等待这一步。

**把辅助函数放进 `@deepseek-ai/dsh-sandbox`。** `RunnerFailureRule` 住在那里，但拒绝辅助函数接收 `ShellRunResult`，而 `@deepseek-ai/dsh-sandbox` 不依赖 `@deepseek-ai/dsh-shell`。加上该依赖会让服务定义指向一个消费方。`@deepseek-ai/dsh-shell` 已经沿相反方向依赖。

## 验收标准

- `bash-sandbox` 与 `pwsh-sandbox` 不再包含分类器实现，也不再有包住它的 `jscpd:ignore`。
- 两个执行器都从 `@deepseek-ai/dsh-shell` 导入 `isRunnerSpawnFailure`、`classifyDenial`、`classifyRunnerFailure` 与 `matchesSignature`。
- 前台拒绝、runner 生成失败与后台 runner 失败在两个包中都保持当前的 `ShellRunResult` 事实。
- 裁剪注记的 bash-sandbox 行不再点名 `classifyDenial` 或 `classifyRunnerFailure`。
- 类型检查、所属 shell 与沙箱包测试，以及 `pnpm run doc-sync` 通过。

## 风险

`@deepseek-ai/dsh-shell` 会增加四个仅由两个沙箱执行器调用的导出。这比两份正在漂移的副本更小，而执行器已经是它的消费方。将来若某个分类器确实按 shell 不同，应在该差异处分叉，而不是恢复整个文件。bash 与 pwsh 沙箱执行器仍是独立的包。
