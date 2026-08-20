# Agent Note: Night-city cinematic workbenches

Status: implemented

English | [中文](2026-08-18-night-city-cinematic-workbenches.zh.md)

## Problem

The three Cyber workbenches had reached their functional shape, but their presentation still read as a thin technical skin. Persona tiles were generic, large surfaces lacked material depth, and the trajectory ledger could leave an unexplained empty right half when no request details were selected. The upgrade needed to increase visual fidelity without replacing the real conversation, code, trajectory, debate, approval, voice, off-peak, and settings behavior.

## Decision

**Keep one state-derived product surface.** Conversation, code execution, and multi-agent trajectory remain automatic projections of real session state. They do not become themes or manual modes, and their existing actions, navigation, and authority boundaries stay intact.

**Use a shared cinematic material system.** The Cyber theme provides layered glass, carbon, grid, cyan/yellow bloom, scanlines, and state-driven animation. The background carries slow city-data parallax and a travelling scan beam; the composer and mission rail use moving energy lines; portraits keep their single outline while their pixels receive internal holographic scans and brief signal jitter. Stronger feedback remains tied to focus, running, selected, or approval state, and every nonessential animation is disabled by reduced-motion preferences. Conversation, composer, sidebar, Tool rows, debate arena, trajectory, and inspectors reuse those materials rather than introducing parallel components.

**Use original role portraits with one geometry contract.** Blackwall_AI is represented by a youthful adult blonde operator with a soft oval face and integrated neural circuitry; the netrunner and the four workbench roles use distinct original CG portraits. Every conversation identity keeps the approved 82 by 80 pixel, single flat-chamfer outline. User messages remain on the right with the netrunner facing inward; AI messages remain on the left with portraits outside their content boxes.

**Let trajectory width follow real details state.** The ledger occupies the full workbench whenever no request is selected. Only a real selected request opens the adjacent details pane, so the former blank half no longer suggests unavailable functionality.

## Alternatives considered

**Rebuild the UI as a separate Night City application.** Rejected because it would duplicate stable behavior and risk losing existing modes and workflow controls.

**Use decorative fake state or manually selectable workbenches.** Rejected because the approved A/B/C contract is driven by real session state, not by theme selection or fixture-only controls.

**Animate every panel continuously.** Rejected because constant flicker reduces readability and ignores accessibility preferences. Atmosphere remains persistent while stronger motion is reserved for meaningful state.

## Consequences

The Cyber experience gains recognizable characters, denser material depth, visible ambient motion, clearer active-state feedback, and a filled trajectory workspace without changing its functional model. The affected package regression passes 917 tests, the production Web build passes, and the host-backed A/B/search/C suite passes all five scenarios with refreshed 1920-pixel captures. In-app browser verification observes both `cyber-city-parallax` and `cyber-scan-surge` changing position over a 2.3-second interval while reduced-motion coverage keeps the static fallback. Existing local service ownership and user files are unchanged.
