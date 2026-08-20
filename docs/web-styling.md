# Web UI style reference

English | [中文](web-styling.zh.md)

This reference defines styling ownership and component rules for browser client packages. The current token values live in [`packages/client/ui-theme/src/styles/`](../packages/client/ui-theme/src/styles/); this document does not duplicate that generated-by-source inventory.

## Ownership

[`ui-theme`](../packages/client/ui-theme/README.md) owns the `--dsw-*` static scale, semantic aliases, typography, motion, gradients, shadows, scrollbar styles, and the `light`/`dark`/`system`/`cyber` preference. [`ui-layout`](../packages/client/ui-layout/README.md) applies the resolved theme snapshot to the document. Feature packages consume semantic aliases and do not define another global theme.

Global style sheets belong in `ui-theme/src/styles/`. Component styles live beside their component as CSS Modules. A component may define a local custom property when its value is part of that component's layout or presentation contract; shared colors, typography, elevation, and motion belong to the theme package.

## Component rules

- Use CSS Modules and `clsx`; do not add a component library or Tailwind.
- Use `--dsw-alias-*` and shared `--dsw-specific-*` semantic tokens in feature components. Do not copy static palette values or write literal colors there.
- Light/dark overrides belong to the theme owner. A feature may gate Cyber-only composition with `body[data-theme-id='cyber']` when the default declaration remains theme-neutral and the gated rule consumes shared semantic tokens rather than defining a second palette.
- Pair font sizes with line heights and use the theme typography variables when an existing role matches.
- Keep source text, terminal output, and diff lines unwrapped when their component contract requires column preservation; use the shared scrollbar styles rather than component-specific scrollbar selectors.
- Put presentation in CSS. Inline React styles may pass component-local custom-property values but must not encode theme branches.
- Preserve keyboard focus visibility and reduced-motion behavior when adding transitions or hover-only controls.

## State-derived Cyber workbenches

Cyber presents three workbenches from real session state; they are not themes, presets, or manual modes. The active Trajectory view always selects the Trajectory workbench. Otherwise, current-Turn mutation/code activity selects Code Execution. Search/read-only activity remains the Conversation workbench. This precedence keeps one session authoritative when several kinds of evidence coexist.

The no-session phase is the Cyber arrival surface, not a fourth workbench. It may use a full-bleed Night City bitmap behind the existing shell, but every label and interactive control stays in live component markup; production background art must not bake sidebar, composer, or product copy into its pixels. Theme-neutral declarations hide this art outside Cyber, and every ambient transform or scan effect must have a reduced-motion static fallback.

- **A — Conversation:** chat flow plus the persistent mission-control overview.
- **B — Code Execution:** the same shell with dense terminal/diff/read/search Tool rows and the current-Turn change ledger.
- **C — Collaboration Trajectory:** an execution-ledger title band, readable selectable event ledger/detail split, and real selected-request, subagent, job, pending-interaction, and current-Turn deliverable summaries. Subagents precede jobs in the collaboration rail and use role artwork from the approved C reference inside A's 82×80 flat-chamfered single-line frame; labels, state and actions remain real projections.

Conversation role geometry does not change between A and B. The assistant identity stays outside the message surface on the left, the user identity stays outside it on the right, and both use the same avatar dimensions and flat-chamfered single-line frame. A role or feature may replace the portrait artwork, but it must not change the identity rail size, border geometry, or side; inward-facing artwork may be mirrored without mirroring its frame or labels. Code Tool rows remain full-width ledger rows between these mirrored conversation turns.

The debate inspector applies the same avatar contract to its real affirmative, negative and judge subagents. Role-specific CG artwork and yellow/red/cyan accents may change, but the 82×80 single flat-chamfer frame, real child name, state and available actions do not.

The shared shell semantics are `--dsw-specific-workbench-chamfer`, `-rail-fill`, `-rail-border`, `-role-accent`, `-ledger-selected`, and `-danger-outline`. They have safe light/dark defaults; `cyber-effects.css` supplies the Night City values. Yellow marks the active action or selection, cyan marks operational state, and red remains reserved for risk/error. The only approval responder remains the conversation composer takeover; an overview may summarize a pending approval but must never add a second Allow/Reject path.

Host-backed acceptance uses the shipped web composition, not a bare Vite page. It covers 1920, 1366, 1024, 1023 and 720 widths, automatic sidebar/details concession, page overflow, reduced motion, keyboard return from an inspected request, console errors, and replayed ARIA goldens for A/B/C.

## Changing the system

Add or change a shared token in the owning `ui-theme` sheet, then consume its semantic alias from feature packages. Update the owning package reference when a public styling contract changes. Visual behavior follows the [testing policy](testing.md); the [styling-system Agent Note](../.agents/notes/implemented/process/2026-07-19-web-styling-system.md) records framework rationale.
