# Agent Note: Drop unconsumed registry change events

Status: proposed

English | [中文](2026-09-26-drop-unconsumed-registry-change-events.zh.md)

## Problem

`tools/change`, `system-prompt/change`, and `skills/change` are emitted and never handled. `ToolRuntime` and `SystemPrompt` pass a `ScopedLayers` callback that only emits the first two (`packages/core/tools/src/index.ts`, `packages/core/system-prompt/src/index.ts`). `SkillRuntime.notifyChange()` emits the third after `invalidateCache()` bumps `revision` (`packages/skill/skill/src/index.ts`). A search of `packages/**/src` and `examples/**/src` finds no `ctx.on` or `ctx.remote.$on` listener for any of the three. The generated event catalog lists a producer and an empty consumer column. Listeners exist only in unit tests, invariant smokes that emit the name, and a host-runner test fixture that logs `tools/change`.

[Remote event delivery](../../implemented/architecture/2026-08-10-remote-event-delivery.md) already records the three events as having no consumer and keeps them off the `ctx.remote.$on` allowlist, calling them an extension seat. Prompt assembly does not use them either. [Reconstructable requests](../../implemented/architecture/2026-07-05-reconstructable-requests.md) renders the prompt on every step and compares the rendered value, and rejects assembly driven by `tools/change` or `system-prompt/change`. The skill catalog's `revision` counter is what makes a later `collect()` see a new skill; the event is only an observer hook. [Subagent provider lifecycle](../../implemented/architecture/2026-07-05-subagent-provider-lifecycle-events.md) still says `tools/change` keeps prompt assembly current, which the per-step render contradicts.

`commands/change` is the contrasting event. It is on the allowlist in `packages/api/remotes/src/remote-events.ts`, and the client runtime forwards it.

## Proposal

Delete the three event declarations, their emits, the listener-rollback and listener-count tests that exist only for those emits, and the generated catalog entries. `ToolRuntime` and `SystemPrompt` construct `ScopedLayers` with no change callback. Make `onChange` optional so a registry with no observer does not pass an empty function; `CommandRuntime` keeps its callback. `SkillRuntime.invalidateCache()` keeps the revision bump and cache clear, and `notifyChange()` goes away. Skill tests that counted `skills/change` assert `collect()` or the revision instead.

Update the subsystem pages, package READMEs, and JSDoc that name the events. Amend the remote-event sentence that still calls the three an extension seat, and the subagent-lifecycle sentence that credits `tools/change` with keeping prompt assembly current. Leave `commands/change`, `llm/adapters-updated`, and every other allowlisted event in place. Registration that throws inside the layer action still rolls back through the existing `ScopedLayers` undo; that path does not depend on these events.

## Alternatives considered

**Keep the three events as extension seats.** The remote-event note records that choice, and an out-of-tree plugin could listen. That seat has no in-repo listener, assembly was deliberately not built on it, and the rollback tests exist only to protect a notification nobody handles. Add the event back with the first production listener.

**Delete only `tools/change` and `system-prompt/change`, and keep `skills/change`.** The skill registry already contains listener failures so a refresh cannot break catalog updates. That containment has the same empty listener set. Keeping one of the three preserves the observer protocol the remote-event note already grouped with the other two.

**Drive prompt or skill refresh from these events.** [Reconstructable requests](../../implemented/architecture/2026-07-05-reconstructable-requests.md) already rejected event-driven prompt assembly. Skill refresh already keys off `revision` inside `collect()`.

## Acceptance criteria

- `tools/change`, `system-prompt/change`, and `skills/change` are absent from `packages/**/src`, tests, READMEs, and generated catalogs.
- `commands/change` still emits and stays on the remote allowlist.
- Per-step prompt assembly and skill `collect()` keep their current results.
- Typecheck, the owning package tests, and `pnpm run doc-sync` pass.

## Risks

An out-of-tree plugin that listened would lose the signal. The repository is unreleased, so carrying an unused notification is the larger cost. Reintroduce one event when a production listener cannot see the change by reading the registry. A throwing observer can no longer reject a tool, prompt, or skill registration, because that rollback existed only for these emits.
