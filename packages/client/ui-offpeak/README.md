# @deepseek-ai/dsh-client-ui-offpeak

English | [中文](README.zh.md)

Off-peak mode, browser half: a composer tool-row toggle (`conversation.input.right`) and a composer-dock status line, both driven by the durable `ui-offpeak.enabled` setting. The default service schedule uses Beijing time: new steps pause during 09:00–12:00 and 14:00–18:00, then resume exactly at 12:00 and 18:00; all other minutes are runnable. This package ships the controls, shared schedule helpers, and durable toggle; the host-side pause gate consumes the same setting namespace.

## Model Experience

No model-visible surface: the toggle and dock are presentation-only and emit no session events.
