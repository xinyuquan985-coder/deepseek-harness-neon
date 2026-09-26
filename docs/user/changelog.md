# Changelog

English | [中文](changelog.zh.md)

## Sessions after an update

A session stored by an earlier build at format version 0 opens in this build. The reader converts retired records in memory and leaves the file on disk unchanged.

A `request/header` whose reason is `fallback` becomes a current full snapshot when that header names a provider and a model. The first snapshot in the log uses reason `initial`. A later one uses `change`.

A `request/header-delta` that already carries a complete header becomes the same kind of snapshot. A partial delta is not reapplied. The read view repeats the header already in force. When the log has no header yet, it repeats the plan state already in force, so the surrounding messages still load.

A `mode/set` record becomes `plan/mode`. The name `plan` is active. Any other name is inactive.

A log written by a newer harness still does not open. The error names that direction and, for a JSONL log, the raw file path.

Appending a new event of a retired type still fails. A SQLite database whose schema version is not this build's schema version still does not open. The default composition stores sessions as JSONL.
