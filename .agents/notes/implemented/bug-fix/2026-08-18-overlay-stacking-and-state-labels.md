# Agent Note: Interactive overlays escape feature stacking contexts

Status: implemented

English | [中文](2026-08-18-overlay-stacking-and-state-labels.zh.md)

## Problem

The settings panel and the session-header subagent catalog were visually declared as high layers but remained descendants of the sidebar and header respectively. Those ancestors create stacking and clipping contexts below the conversation transcript and sticky composer, so ordinary content could paint over both interactive overlays. Increasing each descendant's local `z-index` did not let it leave its ancestor's stacking context.

The Cyber conversation header also appended `PTC 模式` and `当前代理预设 · DSH_BOOT` through CSS pseudo-element `content`. Those labels appeared regardless of the selected preset and duplicated the real preset projection, making decorative text look like application state.

## Decision

`ui-primitives` exports `BodyPortal`, a zero-chrome React owner that renders its children directly under `document.body`. The settings shell uses it for the existing full-viewport overlay. The subagent header action uses it for the existing tree, switches that tree to fixed positioning, measures the real trigger, clamps the menu to the viewport, selects the side with usable vertical space, and remeasures on viewport resize or captured scroll. Outside-click detection checks both the trigger subtree and the portaled menu, while keyboard traversal queries the portaled tree itself.

The Cyber header no longer creates preset or agent labels in CSS. Preset names remain owned by the existing state-backed React contribution; no replacement static copy is introduced.

## Alternatives considered

**Raise the local `z-index` values.** A descendant cannot out-rank content in a higher ancestor stacking context. This changes a number without correcting the ownership plane and would reproduce the reported overlap.

**Convert the settings panel and catalog to native `dialog` and Popover API elements.** The browser top layer would solve stacking, but it would also replace established focus, dismissal, tree navigation, viewport placement, and test behavior. The body portal fixes the defect while preserving those contracts.

**Keep the CSS labels but derive variants with more selectors.** CSS cannot read the complete preset projection and would create another partial source of truth. Removing the fabricated labels leaves one authoritative state path.

## Consequences

- Settings and subagent overlays render above transcript, avatar, mission rail, and sticky composer content without moving those features or changing their actions.
- The subagent menu keeps the same catalog rows, continuation addresses, interruption authorization, outside dismissal, and keyboard navigation, but its DOM parent is now `body` and its coordinates are viewport-fixed.
- The shared primitive deliberately supplies no visual layer or focus policy; consumers remain responsible for their own mask, `z-index`, placement, and accessibility.
- Static CSS can no longer claim a preset or current agent. Any future header label must come from a real state-backed slot.

## Testing

Component tests assert that the settings overlay and subagent tree are body-portaled while existing close, focus, outside-click, and keyboard tests continue to pass. The Cyber shell style test rejects both pseudo-element labels. The host-backed Cyber A scenario checks the overlap point near the settings dialog's lower edge and the center of the subagent menu with `document.elementFromPoint`, proving that the interactive overlay—not the composer or transcript—owns the top hit target.
