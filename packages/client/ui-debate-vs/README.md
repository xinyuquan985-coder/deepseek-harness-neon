# @deepseek-ai/dsh-client-ui-debate-vs

English | [中文](README.zh.md)

Browser-only plugin contributing the VS 对决 tab to the conversation view ring: a live debate board over the `conversation.view` slot. Sessions composed from the `debate` agent preset open on this view by default (the `viewDefaultFor` provide-channel contribution; the persisted tab selection always wins).

The board derives everything from the current session's snapshot plus the subagent catalog, so it is live while the debate runs and replays after a refresh:

- **Masthead**: the topic (first user message line) and the current round, parsed from the host's 战报 headings (`# ⚔️ 第 <n> 回合`); shows 已裁决 once the verdict lands.
- **Side cards**: 正方 / 反方 live state (未派出 / 进行中 / 已结束) from the child catalog; assistant speeches from each child session stream into the matching card in log order, while host instructions and tool events stay hidden.
- **Host desk**: the host's per-round VS 战报 stream (latest first, streaming partials render live) plus the host reply lane for non-scoreboard host output.
- **Judge seat**: the 裁判 child state and the 终局 verdict (判决牌) once published; 待裁决 before.

## Model Experience

None. The board is pure presentation over client-side session data; nothing reaches a model request.

#### KV Cache effect

None; this package neither assembles nor sends a provider request.

## Known Limitations and Deferred Work

- **Recognition rides the debate-arena vocabulary** — scoreboards are assistant messages carrying the `# ⚔️ 第 <n> 回合` heading, the verdict is the message containing 判决牌/获胜方, and sides match the preset task labels 派出正方辩手 / 派出反方辩手 / 派出裁判, role-prefixed labels, or persona labels declaring the role in `「」`. A debate run by another protocol still shows its host output in the host lane but contributes no side speeches or scoreboard cards.
- **No deep links** — view selection stays local to the conversation view ring.
- **Per-side transcripts are polled** — each card refreshes its child history every 1.2 seconds and currently requests at most the latest 80 events per side.
