# Agent Note: Fold the shared sandbox result classifiers

Status: proposed

English | [中文](2026-09-26-fold-sandbox-result-classifiers.zh.md)

## Problem

`packages/shell/bash-sandbox/src/helpers.ts` and `packages/shell/pwsh-sandbox/src/helpers.ts` implement the same four functions: `isRunnerSpawnFailure`, `classifyDenial`, `classifyRunnerFailure`, and `matchesSignature`. The pwsh file documents itself as a call-for-call mirror and wraps the body in `jscpd:ignore`. The function bodies match. The JSDoc on `isRunnerSpawnFailure` has already diverged. The only production importers are `bash-sandbox/src/index.ts` and `pwsh-sandbox/src/index.ts`. Each package's sandbox spec re-tests the helpers directly.

[pwsh tool bash parity](../../implemented/feature/2026-08-02-pwsh-tool-bash-parity.md) deferred a fully shared tool implementation until a third shell dialect or the persistent-PTY twin makes the abstraction observable. That deferral covers the tool and executor twins (`render.ts`, `background.ts`, and `startArgv`). These helpers classify sandbox stderr and Node spawn errors. They do not mention bash or pwsh.

`@deepseek-ai/dsh-shell` already depends on `@deepseek-ai/dsh-sandbox`, so it can see `RunnerFailureRule`, and it owns `ShellRunResult`. Both sandbox executors already depend on `@deepseek-ai/dsh-shell`. [Prune dead public API](./2026-07-04-prune-dead-core-spine-api.md) still lists `classifyDenial` and `classifyRunnerFailure` as bash-sandbox package-root exports to demote. They are not root exports today; `index.ts` only imports them from `helpers.ts`.

## Proposal

Move the four functions into `@deepseek-ai/dsh-shell` and export them next to `parseExitStatus`. Delete both `helpers.ts` files. Both executors import the single module. Move the helper unit tests into `dsh-shell` and delete the duplicated helper describes from the two sandbox specs. Keep one executor-level assertion in each sandbox package that denial and runner failure still reach `ShellRunResult`.

Do not merge the bash and pwsh tools, executors, or sandbox argv wrappers. Do not re-export the classifiers from `@deepseek-ai/dsh-bash-sandbox` or `@deepseek-ai/dsh-pwsh-sandbox`. When this lands, remove `classifyDenial` and `classifyRunnerFailure` from the bash-sandbox row of the prune note; leave the rest of that inventory alone.

## Alternatives considered

**Keep the pwsh file as a marked mirror.** The parity note treats structural twins as the foundation for a later shared tool base. These helpers are not that base: they have no dialect delta, and the drifted JSDoc shows the mirror is already drifting. A third shell would otherwise need a third copy.

**Fold the background `ShellProcess` adapter in `bash-local` and `pwsh-local` in the same change.** That block is also duplicated, but it sits inside `startArgv`, beside the UTF-8 preamble and the dialect argv. The parity note deferred that executor merge until a third dialect shows the abstraction. The classifiers do not need that wait.

**Put the helpers in `@deepseek-ai/dsh-sandbox`.** `RunnerFailureRule` lives there, but the denial helpers take `ShellRunResult`, and `@deepseek-ai/dsh-sandbox` does not depend on `@deepseek-ai/dsh-shell`. Adding that dependency points the service definition at one consumer. `@deepseek-ai/dsh-shell` already depends in the other direction.

## Acceptance criteria

- `bash-sandbox` and `pwsh-sandbox` no longer contain a classifier implementation or a `jscpd:ignore` around one.
- Both executors import `isRunnerSpawnFailure`, `classifyDenial`, `classifyRunnerFailure`, and `matchesSignature` from `@deepseek-ai/dsh-shell`.
- Foreground denial, runner-spawn failure, and background runner failure keep their current `ShellRunResult` facts in both packages.
- The prune note's bash-sandbox row no longer names `classifyDenial` or `classifyRunnerFailure`.
- Typecheck, the owning shell and sandbox package tests, and `pnpm run doc-sync` pass.

## Risks

`@deepseek-ai/dsh-shell` gains four exports that only the two sandbox executors call. That is a smaller public set than two drifting copies, and the executors are already its consumers. A future classifier that really does differ by shell should fork at that difference, not restore the whole file. The bash and pwsh sandbox executors stay separate packages.
