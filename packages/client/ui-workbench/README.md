# @deepseek-ai/dsh-client-ui-workbench

English | [中文](README.zh.md)

Browser-only details-rail overview for the three real Harness workbenches. The package fills the `conversation.details.overview` seat declared by [ui-conversation](../ui-conversation/README.md), derives Conversation / Code Execution / Trajectory from the active view and current Turn's Tool presentation data, and reads queue, job, subagent, and pending-interaction counts through the standard session and list hooks. It creates no user-selectable mode and no presentation-only business data. Selecting a Tool call temporarily replaces the overview with the existing Tool Details body; returning from Tool Details restores the derived overview.

Conversation shows real goal, todo, queue, job, subagent, pending and deliverable projections when they exist. Code Execution adds a current-Turn change ledger with All/Modified/Produced filters, unique file paths, lifecycle and structured diff counts. Trajectory wins routing even when code mutations exist and adds the selected request plus real collaboration/job/deliverable projections. Its collaboration rail orders subagents before jobs and presents each real child in one 82×80 flat-chamfered portrait frame using the approved C artwork; labels, activity, navigation and Stop remain projection/action backed. The `debate-vs` view reuses that exact frame for the real affirmative, negative and judge children, with role-specific artwork and accents while retaining the child catalog's authoritative names and state. An overview may summarize a pending approval but never renders Allow/Reject controls; the conversation composer remains authoritative.

## Model Experience

No model-visible surface: this package projects existing browser runtime state and emits no session events, prompts, Tool schemas, or model input.

## Known Limitations and Deferred Work

- **Projection-limited by design** — absent goals, todos, jobs, subagents, approvals, or files produce no placeholder business data.
