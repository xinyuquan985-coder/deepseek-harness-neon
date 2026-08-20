# Agent Note: Night City session arrival

Status: implemented

English | [中文](2026-08-18-night-city-session-arrival.zh.md)

## Problem

The Cyber New Session page remained visually empty after the three real workbenches gained their cinematic treatment. The requested startup voice also needed to run at application arrival and every shell-owned New Session action without making Session creation depend on browser media policy.

## Decision

**Treat the blank state as an arrival phase, not a fourth workbench.** The Cyber-only conversation background uses a clean Night City plate derived from the approved concept. It contains city atmosphere, an access HUD, and the Blackwall operator, but no baked product text, sidebar, composer, or fake controls. The real localized headline and resident composer remain above it in the existing DOM.

**Keep motion decorative and accessible.** A slow image drift and scan beam run only when the browser does not request reduced motion. Light and dark continue to use their existing blank state.

**Keep audio subordinate to Session Intent.** The sidebar owns one bundled MP3 and one audio instance. Mount attempts the startup cue once; a browser-blocked attempt is retried on the first user gesture. Clicking either shell-owned New Session entry cancels that pending fallback, restarts the cue, and immediately calls the existing `startSession` path. A media error is contained and cannot cancel navigation or Session creation.

## Alternatives considered

**Bake the approved concept screenshot directly into the page.** Rejected because its duplicate sidebar, composer, and text would become non-interactive pixels and drift from live product state.

**Make audio success a prerequisite for starting a Session.** Rejected because autoplay policy, missing output devices, and decode failures are outside the Session domain and must not break the primary action.

**Create a fourth selectable lobby workbench.** Rejected because A, B, and C remain automatic projections of real Session state; the lobby exists only while no Session is selected.

## Consequences

Every Cyber application arrival now has a denser Night City staging surface while retaining the real Workspace picker and full composer behavior. Startup audio is best-effort before interaction and guaranteed to retry once when autoplay is blocked; explicit New Session clicks always make their own best-effort playback attempt. The media bundler now inlines PNG and MP3 resources into package output, so the host needs no separate static-file route.

## Testing

Unit coverage pins the clean decorative asset, localized title, startup attempt, autoplay fallback, both New Session entry points, playback-failure isolation, and MP3 bundling. Package typechecks and focused client suites cover the affected composition. Host-backed Playwright acceptance verifies the shipped Cyber blank state, decoded production image dimensions, real composer visibility, full-bleed geometry, reduced-motion fallback, page errors, ARIA output, and a 1920-pixel capture.
