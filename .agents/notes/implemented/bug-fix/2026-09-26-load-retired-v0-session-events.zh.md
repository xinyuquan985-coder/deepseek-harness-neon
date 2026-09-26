# Agent Note: 加载带有已退役 v0 请求与模式事件的会话

Status: implemented

[English](2026-09-26-load-retired-v0-session-events.md) | 中文

## 问题

较早构建写出的会话仍停留在 `SESSION_FORMAT_VERSION` 0，更新之后却无法打开。Seed、追加和加载会拒绝三种已退役记录：`request/header-delta`、reason 为 `fallback` 的 `request/header`，以及 `mode/set`。这次拒绝覆盖整份日志，包括这些记录周围的消息。[会话日志版本机制](../architecture/2026-08-10-session-log-version-mechanism.md)已经要求在内存中转换较旧的日志。另外两项同一版本的变更已经对[标识机制引入前的消息](2026-07-28-load-pre-identity-session-messages.md)和 [react-loop 引入前的会话](2026-08-04-load-pre-react-loop-sessions.md)这样做。

## 决策

`PersistenceCoordinator` 在 `load`、`inspect`、`readFrom`、HMR 前缀比较和无所有者状态认领所使用的读取视图中升级这三种已存形状。磁盘上的文件仍只追加。序号保持与已存位置相同，因此下一次追加会接上这份日志。

完整请求头必须带有 `config.provider` 和 `config.model`，并且没有当前请求头字段以外的字段。携带这样一份请求头的 `request/header-delta` 或 `fallback` 快照会变成 `request/header`。日志中的第一份快照使用 reason `initial`；此后每一份使用 `change`。不完整的 delta 不会被解码。读取视图会重复该序号上已经生效的请求头；如果日志里还没有请求头，则把已经生效的 plan 状态重复为 `plan/mode`（第一条 `plan/mode` 之前为未激活）。

带有非空 `mode` 或 `name` 的 `mode/set` 会变成 `plan/mode`。只有名称 `plan` 为激活。没有给出名称的记录会拒绝该会话。

`Session` 的 seed 和 `Session.append` 仍会拒绝新写入的退役事件。`sessionPersistence.append` 也会拒绝，因此过期的生产方不能把它持久化。更高的格式版本，以及本构建不认识且未标记 `ignorable` 的事件类型，仍会拒绝整份日志。

## 考虑过的替代方案

**继续拒绝整份日志。** 这与当初删除 delta codec 和具名模式注册表的决定一致，但那些构建写出的每个会话都会变得无法阅读。

**重新实现 delta codec。** 完整快照才是回放表示。按猜测去打补丁，会编造出已存记录里没有的请求头。

**删掉退役事件并重新编号。** `seq` 必须从 0 连续，并且等于已存位置。重新编号会使下一次追加与文件不一致。

**打开时重写产物。** 一次读取会变成一次写入。仍能理解原始记录的较旧进程会因为较新进程打开了会话而失去这些记录。

## 后果

退役记录周围的消息可以加载。不完整的 delta 不会改变已经生效的请求头；下一次实时请求仍会记录一份当前快照。Plan 状态跟随 `mode/set` 的名称。schema 版本不是当前 `SCHEMA_VERSION` 的 SQLite 数据库保持原样，仍然无法打开。默认组合把会话存成 JSONL。

## 相关资料

- [简化会话日志表示](../simplification/2026-07-12-simplify-session-log-representation.md) — 删除了 delta codec 和 `fallback` reason。
- [Plan 专属协作状态](../simplification/2026-07-22-plan-specific-collaboration-state.md) — 用 `plan/mode` 替换了 `mode/set`。
