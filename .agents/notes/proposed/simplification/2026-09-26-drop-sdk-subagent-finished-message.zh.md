# Agent Note: 删除 SDK 上对 subagent 最后一条助手消息的副本

Status: proposed

[English](2026-09-26-drop-sdk-subagent-finished-message.md) | 中文

## 问题

`packages/sdk/protocol/src/types.ts` 中的 `SubagentFinishedNotification.lastAssistantMessage` 把 `subagent/end.lastAssistantMessage` 复制到 `subagent.finished`。`packages/sdk/server/src/server.ts` 是唯一的写入方。进程内字段仍然承担负载：`packages/subagent/subagent/src/lifecycle.ts` 发布它，[由管理器负责的结算](../../implemented/feature/2026-08-06-manager-owned-subagent-settlement-delivery.md) 把该信号变成父级上下文，[空的终止输出](../../implemented/bug-fix/2026-08-10-subagent-empty-terminal-message-output.md) 定义了 `SubagentResult.output` 与该事件字段共用的选取规则。

这份 JSON-RPC 副本没有生产读取方。`packages/subagent/subagent-dsh-sdk` 用 `AssistantOutputFold` 从 `session.event` 折叠子文本。`python/sdk/src/deepseek_harness/client.py` 使用 `subagent.finished` 时只检查 `parentSessionId` 与 `childSessionId`，Python 包也不提及 `lastAssistantMessage`。TypeScript SDK 客户端不读取该字段。读取方是服务端测试、`packages/sdk/client/tests/fake-runtime.ts` 与快照夹具。

## 提案

从 `SubagentFinishedNotification` 中删除 `lastAssistantMessage`，并停止在服务端载荷中复制它。保留 `provider`、`agentId`、`parentSessionId`、`childSessionId`、`status` 与 `stopReason`。`subagent/end.lastAssistantMessage` 与 `SubagentResult.output` 仍按现有选取规则保留。更新协议 README、服务端测试、伪运行时，以及钉住该字段的 JSON-RPC 快照预期输出。

不改动 `session.finished` 或提示词响应。那组结算拆分属于 [让 JSON-RPC 完成结果与传输方向单一化](./2026-07-19-make-jsonrpc-directional.md)。

## 备选方案

**保留该字段，以便客户端跳过子会话的 `session.event` 流。** 仓库内没有客户端这样做。子会话记录已经在 `childSessionId` 的 `session.event` 上，`subagent-dsh-sdk` 折叠的就是它。需要这段文本又不订阅该流的受支持客户端，可以连同该调用方一起把字段加回来。

**同时删除 `subagent/end.lastAssistantMessage`。** 该字段在结算投递与结果选取中有生产消费方。删除 SDK 副本并不删除事件字段。

## 验收标准

- `SubagentFinishedNotification` 与服务端的 `subagent.finished` 载荷省略 `lastAssistantMessage`。
- `subagent/end` 仍按当前选取规则携带 `lastAssistantMessage`，包括子 agent 没有产生输出时省略该字段。
- 协议 README、TypeScript 伪运行时与 JSON-RPC 快照预期输出与收窄后的载荷一致。
- 类型检查、所属 SDK 测试与 `pnpm run doc-sync` 通过。

## 风险

解析该字段的客户端会失去它。仓库尚未发布，且没有受支持的 SDK 客户端读取它。只有当受支持的客户端需要这段文本、又不订阅子会话时，才重新引入该字段。`status` 与 `stopReason` 保留，因此二元结果与提供方原因不变。
