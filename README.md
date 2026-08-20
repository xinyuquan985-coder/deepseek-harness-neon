# Neon Harness

English | [中文](README.zh.md)

> **Important:** Neon Harness is an unofficial community fork of [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness). It is not affiliated with or endorsed by DeepSeek.

<p align="center">
  <img src="assets/neon-harness-social-preview.jpg" alt="Neon Harness cyberpunk multi-agent command center" width="100%">
</p>

Neon Harness is a cyberpunk multi-agent command center for DeepSeek Harness. It keeps the upstream plugin architecture and real agent workflows while adding a Chinese-first neon interface for conversation, code execution, debate, and trajectory inspection.

## Highlights

- Three workbenches derived automatically from real session state: conversation, code execution, and multi-agent trajectory.
- A VS debate arena with real participant, round, judge, and child-agent state.
- Consistent left/right dialogue staging, role-specific CG portraits, and a task-control rail backed by live goals, jobs, subagents, approvals, and deliverables.
- Voice input, off-peak execution controls, appearance settings, startup audio, responsive layout, reduced-motion handling, and host-backed browser coverage.
- A neon-city arrival screen built around the real composer instead of a static mockup.

## Status

This fork is a developer preview. Interfaces and configuration may change while the upstream project and the Neon workbenches evolve.

<a id="run"></a>

## Run from source

### Requirements

- Node.js `^22.19` or `>=24`
- pnpm

### Start

```sh
git clone https://github.com/xinyuquan985-coder/deepseek-harness-neon.git
cd deepseek-harness-neon
pnpm install
pnpm run build
pnpm dsh web
```

Open `http://127.0.0.1:3080` after the host starts. The Web UI must run through the Harness host because bare Vite does not provide `window.__DSH_BOOT__`.

On Windows, the repository also includes the local launcher:

```powershell
.\start-deepseek-harness.cmd
```

## Workbench routing

- **Conversation** is the default dialogue and mission-control workspace.
- **Code execution** appears when the active turn contains real code-changing or terminal activity.
- **Trajectory** exposes the multi-agent execution ledger, selected request details, approvals, jobs, subagents, and produced files.

These are product states, not themes or manually selected A/B/C modes. The `对话`, `VS 对决`, and `轨迹` tabs keep their existing behavior and switch only the central work surface.

## Community

- Ask questions and share screenshots in [GitHub Discussions](https://github.com/xinyuquan985-coder/deepseek-harness-neon/discussions).
- Report reproducible problems through [GitHub Issues](https://github.com/xinyuquan985-coder/deepseek-harness-neon/issues).
- Follow the original project at [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness).

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request. Start with the [development guide](docs/development.md) and [architecture documentation](docs/architecture.md); agents must also follow [AGENTS.md](AGENTS.md).

## Privacy before committing

- Never commit `.env` files, API keys, tokens, credentials, session logs, or local runtime homes.
- Keep `.dsh-home/`, `.dsh-runtime/`, `logs/`, and machine-specific captures outside commits.
- Review staged files and commit metadata before every push.

See [SECURITY.md](SECURITY.md) for private vulnerability reporting guidance.

## Upstream and credits

Neon Harness is built on [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) and its “everything is a plugin” architecture. The runtime is powered by [Cordis](https://github.com/cordiverse/cordis), whose design is described in [_A Programming Paradigm for Spatiotemporal Composability_](https://github.com/cordiverse/paper).

## License

[MIT](LICENSE). Third-party dependencies and their licenses are listed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
