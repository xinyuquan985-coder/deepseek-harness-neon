# @deepseek-ai/dsh-offpeak-gate

English | [中文](README.zh.md)

Off-peak pause gate, host plugin: holds every `agent/pre-step` waterfall decision while the durable `ui-offpeak.enabled` setting (owned by [ui-offpeak](../../client/ui-offpeak/README.md)) is on and Beijing time is inside a configured peak interval. The validated Config exposes `peakWindows` (default 09:00–12:00 and 14:00–18:00, inclusive start and exclusive end) and `pollMs`. The gate caps polling at the next schedule boundary, so 11:59:59 remains paused and 12:00:00 resumes without waiting for another poll; the same applies at 18:00. Toggle-off is detected within `pollMs`. In-flight calls finish normally — nothing is cancelled — and a step abort releases the hold. The gate registers the `ui-offpeak` settings section host-side when the settings service is composed; without it the gate stays open.

## Model Experience

The gate delays turn progress, not content: it holds only before a new step, passes the original downstream decision unchanged, and never replaces the provider, model, messages, tools, or generation settings. In-flight calls are not interrupted. No session events are emitted by this plugin.
