# Agent Note: Split licensing for Neon additions

Status: implemented

English | [中文](2026-08-20-neon-split-license.zh.md)

## Problem

A repository-wide MIT declaration grants commercial rights to every original Neon package and asset even though the fork contains upstream material that the maintainer cannot relicense and original Neon work that the maintainer intends to reserve for noncommercial learning and research. Replacing the upstream MIT notice with a noncommercial license would misstate the rights that DeepSeek already granted and break the required attribution chain.

## Decision

The root [license notice](../../../../LICENSE) separates material by copyright owner and origin. Unchanged upstream material and upstream portions retained inside modified files remain under the [DeepSeek MIT License](../../../../LICENSES/UPSTREAM-MIT.txt). Original Neon software additions authored by the maintainer use the unmodified [PolyForm Noncommercial License 1.0.0](../../../../LICENSES/PolyForm-Noncommercial-1.0.0.md). Character art, cyberpunk screenshots, the startup cue, and the social-preview image use the noncommercial asset terms in the root notice; repository availability grants no rights the maintainer does not own.

The private root workspace declares `SEE LICENSE IN LICENSE`. Neon-owned npm packages declare `PolyForm-Noncommercial-1.0.0`; upstream packages continue to declare `MIT`. [`verify-dsh-package-licenses.ts`](../../../../scripts/verify-dsh-package-licenses.ts) enforces the exact Neon package set so a new package does not silently inherit the wrong license during upstream synchronization.

Commercial users may still exercise the MIT rights granted for upstream material. Commercial use of original Neon additions or restricted assets requires separate written permission from the applicable rights holder.

## Alternatives considered

**Replace MIT for the entire repository with a noncommercial license.** Rejected because the fork cannot revoke rights already granted by the upstream copyright holder and must preserve the upstream notice.

**Keep every package and asset under MIT.** Rejected because it grants commercial reuse of the maintainer's original Neon packages and visual identity, contrary to the intended learning-and-research distribution.

**Write a custom noncommercial software license.** Rejected in favor of the standard PolyForm text, which defines permitted personal, educational, research, and nonprofit use without inventing a new software license. The asset terms remain separate because visual and audio material may carry rights that software-license metadata cannot represent.

## Consequences

The repository is source-available rather than an OSI open-source distribution as a whole. Forks and noncommercial modifications remain possible under the applicable Neon terms, while commercial adoption must either use only upstream MIT material or obtain permission for Neon-specific work. Mixed files require contributors to preserve both notices and identify which original portions they have authority to license. GitHub may classify the root as a multi-license or other-license repository instead of displaying a single MIT badge.
