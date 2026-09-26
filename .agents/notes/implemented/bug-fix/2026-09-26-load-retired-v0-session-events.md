# Agent Note: Load sessions written with retired v0 request and mode events

Status: implemented

English | [中文](2026-09-26-load-retired-v0-session-events.zh.md)

## Problem

Sessions written by an earlier build stayed at `SESSION_FORMAT_VERSION` 0 and then failed to open after an update. Seed, append, and load rejected three retired records: `request/header-delta`, a `request/header` whose reason is `fallback`, and `mode/set`. The refusal covered the whole log, including the messages around those records. The [session log version mechanism](../architecture/2026-08-10-session-log-version-mechanism.md) already requires an older log to be converted in memory. Two other same-version changes already do that for [pre-identity messages](2026-07-28-load-pre-identity-session-messages.md) and [pre-react-loop sessions](2026-08-04-load-pre-react-loop-sessions.md).

## Decision

`PersistenceCoordinator` upgrades the three stored shapes in the read view used by `load`, `inspect`, `readFrom`, HMR prefix comparison, and ownerless-state claims. The file on disk stays append-only. Sequence numbers stay equal to the stored positions so the next append continues the log.

A complete header names `config.provider` and `config.model` and has no field outside the current header fields. A `request/header-delta` or a `fallback` snapshot that carries one becomes `request/header`. The first snapshot in the log uses reason `initial`; each later one uses `change`. A partial delta is not decoded. The read view repeats the header already in force at that sequence, or, when the log has no header yet, repeats the plan state already in force as `plan/mode` (inactive before the first `plan/mode`).

`mode/set` with a non-empty `mode` or `name` becomes `plan/mode`. Only the name `plan` is active. A record that names no mode rejects that session.

`Session` seed and `Session.append` still reject a newly written retired event. `sessionPersistence.append` rejects one too, so a stale producer cannot persist it. A higher format version, and an event type this build does not know unless the event is marked `ignorable`, still refuse the log.

## Alternatives considered

**Keep refusing the whole log.** That matched the original removal of the delta codec and the named-mode registry, and it left every session those builds wrote unreadable.

**Reimplement the delta codec.** Full snapshots are the replay representation. Applying a guessed patch would invent a header the stored record does not contain.

**Drop the retired event and renumber.** `seq` has to stay contiguous from 0 and equal to the stored position. Renumbering would make the next append disagree with the file.

**Rewrite the artifact on open.** A read would become a write. An older process that still understands the original records would lose them because a newer one opened the session.

## Consequences

Messages around a retired record load. A partial delta does not change the header in force; the next live request still records a current snapshot. Plan state follows the `mode/set` name. A SQLite database whose schema version is not the current `SCHEMA_VERSION` is unchanged and still does not open. The default composition stores sessions as JSONL.

## Related

- [Simplify session-log representation](../simplification/2026-07-12-simplify-session-log-representation.md) — removed the delta codec and the `fallback` reason.
- [Plan-specific collaboration state](../simplification/2026-07-22-plan-specific-collaboration-state.md) — replaced `mode/set` with `plan/mode`.
