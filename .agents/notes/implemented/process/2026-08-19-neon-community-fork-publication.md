# Agent Note: Neon community fork publication

Status: implemented

English | [中文](2026-08-19-neon-community-fork-publication.zh.md)

## Problem

Publishing the local Neon workbench development as an ordinary copy of DeepSeek Harness would misrepresent the fork as an official DeepSeek release and would expose local commit email metadata, machine-specific snapshot paths, runtime homes, or logs if the working directory were pushed unchanged. The upstream issue-lifecycle automation also requires organization-owned credentials that are unavailable and inappropriate in a community fork.

## Decision

The public repository identifies itself as Neon Harness, an unofficial community fork of [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness), while retaining upstream provenance, the MIT notice for upstream portions, third-party notices, package names, architecture documentation, and source attribution. The [split-license decision](2026-08-20-neon-split-license.md) governs original Neon additions without reducing upstream MIT rights. The fork does not claim DeepSeek affiliation or endorsement.

The initial Neon changes publish as one sanitized commit on top of the upstream default branch. The publication commit uses a GitHub `noreply` address, excludes machine-specific screenshots that contain local paths, replaces local paths in reviewable text snapshots, and ignores root runtime homes and logs. The original local worktree and its uncommitted files remain outside the publication branch.

Fork-facing README and security guidance point to the fork's own Issues, Discussions, private vulnerability reporting, and source checkout. Upstream organization issue-policy jobs run only in the upstream repository; ordinary build and test workflows remain available to the fork.

## Alternatives considered

**Push the seven local commits unchanged.** Rejected because their author metadata and two committed artifacts retained machine-specific information, even if a later commit deleted the visible text.

**Remove the upstream history and attribution.** Rejected because the fork depends on the upstream architecture, packages, documentation, and license chain; preserving provenance is both accurate and maintainable.

**Rename every `@deepseek-ai/*` package immediately.** Rejected because the publication changes the community product identity, not the internal package compatibility surface. A package namespace migration requires a separate repository-wide decision.

**Keep upstream issue automation active in the fork.** Rejected because it targets organization-owned projects and GitHub App credentials; skipped jobs avoid false failures without weakening the fork's ordinary CI.

## Consequences

The public repository presents a distinct community identity without losing upstream provenance, and its first Neon commit contains no known secret, personal path, runtime state, or public author email. Squashing intentionally gives up the seven-commit local development sequence on the public branch; the source result and the implemented Agent Notes remain reviewable. Future upstream synchronization uses an `upstream` remote, while community releases, Issues, and Discussions belong to the Neon repository.
