# Agent Note: Neon source checkouts launch their own product surface

Status: implemented

English | [中文](2026-08-20-neon-clean-clone-launch.zh.md)

## Problem

The public Neon source tree contains the Night City styles, portraits, workbenches, and feature plugins, but its Windows launcher selected an ignored `.dsh-runtime` directory that is absent from a clone. A clean source build also let the Host off-peak gate pull the Client project graph before Host-generated remote modules existed. Even after a successful build, a settings document without a theme preference resolved to the upstream system theme, so a new user could see the standard light product instead of the repository's defining interface.

## Decision

The Windows launcher installs the frozen workspace lockfile, runs `build:runtime`, and starts `pnpm dsh web` from the checked-out repository with a repository-local `DSH_HOME`. `build:runtime` emits the Host project references first, generates Host remote modules, emits the Client project references without the Vite-owned `apps/web` project, bundles both faces, and builds the Web application through its package script.

The off-peak Host gate references `packages/client/ui-offpeak/tsconfig.host.json`, which contains only the shared settings and schedule entry points and therefore does not import the Client runtime graph during Host emission.

`DEFAULT_PREFERENCE` is `cyber`. The default applies only when the settings document has no preference; persisted light, dark, system, and cyber selections remain authoritative and the Appearance row can still switch among all four choices.

## Alternatives considered

**Commit generated `lib` and `apps/web/dist` outputs.** This would shorten the first launch but would duplicate source and generated artifacts, enlarge every review, and let stale bundles diverge from the checked-out portraits and styles.

**Keep the ignored `.dsh-runtime` launcher target.** A private packaged runtime may be convenient for one workstation, but it is not reproducible from GitHub and can carry a frontend unrelated to the current source checkout.

**Seed a cyber preference file from the launcher.** Writing settings during startup would overwrite the user's ownership of appearance and require launcher-specific migration behavior. A product default preserves explicit user selections without manufacturing durable state.

## Consequences

- A clean clone needs Node.js and pnpm and performs a workspace install and production build on its first launch; this takes longer than starting prebuilt artifacts.
- The running Host and Web assets come from the same checkout, so Night City assets and the conversation, code, debate, trajectory, voice, off-peak, settings, and subagent features cannot silently fall back to an unrelated packaged frontend.
- New settings documents open in the cyber theme, while existing settings retain their selected appearance.

## Testing

Launcher and build-plan tests reject `.dsh-runtime`, pin the frozen install and source-backed command, keep Vite ownership of the application shell, and enforce the Host-only off-peak project reference. Theme unit tests cover the cyber default, boot palette, settings row, Host injection, persisted overrides, and explicit system behavior. A clean clone installs with the frozen lockfile, builds every runtime artifact, serves through `dsh web` on an isolated port, and opens in a real browser with the Night City background and Blackwall portrait.
