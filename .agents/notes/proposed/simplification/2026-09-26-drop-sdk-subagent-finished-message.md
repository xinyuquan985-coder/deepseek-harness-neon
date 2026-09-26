# Agent Note: Drop the SDK copy of the subagent's last assistant message

Status: proposed

English | [中文](2026-09-26-drop-sdk-subagent-finished-message.zh.md)

## Problem

`SubagentFinishedNotification.lastAssistantMessage` in `packages/sdk/protocol/src/types.ts` copies `subagent/end.lastAssistantMessage` onto `subagent.finished`. `packages/sdk/server/src/server.ts` is the only writer. The in-process field stays load-bearing: `packages/subagent/subagent/src/lifecycle.ts` publishes it, [manager-owned settlement](../../implemented/feature/2026-08-06-manager-owned-subagent-settlement-delivery.md) turns that signal into parent context, and [empty terminal output](../../implemented/bug-fix/2026-08-10-subagent-empty-terminal-message-output.md) defines the shared selection rule for `SubagentResult.output` and the event field.

The JSON-RPC copy has no production reader. `packages/subagent/subagent-dsh-sdk` folds child text from `session.event` with `AssistantOutputFold`. `python/sdk/src/deepseek_harness/client.py` uses `subagent.finished` only to test `parentSessionId` and `childSessionId`, and the Python package does not mention `lastAssistantMessage`. The TypeScript SDK client does not read the field. Server tests, `packages/sdk/client/tests/fake-runtime.ts`, and snapshot fixtures are the readers.

## Proposal

Remove `lastAssistantMessage` from `SubagentFinishedNotification` and stop copying it in the server payload. Keep `provider`, `agentId`, `parentSessionId`, `childSessionId`, `status`, and `stopReason`. Keep `subagent/end.lastAssistantMessage` and `SubagentResult.output` under the existing selection rule. Update the protocol README, server tests, the fake runtime, and JSON-RPC snapshot expected outputs that pin the field.

Do not change `session.finished` or the prompt response. That settlement split belongs to [make JSON-RPC directional](./2026-07-19-make-jsonrpc-directional.md).

## Alternatives considered

**Keep the field so a client can skip the child `session.event` stream.** No in-repo client does this. The child transcript is already on `session.event` for `childSessionId`, which is what `subagent-dsh-sdk` folds. A supported client that needs the text without that subscription can add the field back with that caller.

**Also delete `subagent/end.lastAssistantMessage`.** That field has production consumers in settlement delivery and the result selector. Removing the SDK copy does not remove the event field.

## Acceptance criteria

- `SubagentFinishedNotification` and the server's `subagent.finished` payload omit `lastAssistantMessage`.
- `subagent/end` still carries `lastAssistantMessage` under the current selection rule, including omission when the child produced no output.
- Protocol READMEs, the TypeScript fake runtime, and JSON-RPC snapshot expected outputs match the narrower payload.
- Typecheck, the owning SDK tests, and `pnpm run doc-sync` pass.

## Risks

A client that parsed the field loses it. The repository is unreleased, and no supported SDK client reads it. Reintroduce the field only for a supported client that needs the text without subscribing to the child session. `status` and `stopReason` stay, so binary outcome and the provider reason are unchanged.
