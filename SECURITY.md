# Security Policy / 安全政策

## Supported version / 支持版本

Security fixes target the latest commit on `master`. Older commits and locally modified builds are not supported separately.

安全修复以 `master` 的最新提交为目标；更早的提交与自行修改的构建不单独提供支持。

## Private reporting / 私下报告

Do not open a public issue for a suspected vulnerability. Use [GitHub private vulnerability reporting](https://github.com/xinyuquan985-coder/deepseek-harness-neon/security/advisories/new) and include the affected version, reproduction steps, impact, and the smallest safe proof of concept.

发现疑似漏洞时请勿创建公开 Issue。请使用 [GitHub 私密漏洞报告](https://github.com/xinyuquan985-coder/deepseek-harness-neon/security/advisories/new)，并提供受影响版本、复现步骤、影响范围和最小化的安全验证样例。

Never include production API keys, access tokens, private session logs, personal paths, or third-party data. Redact logs before attaching them and rotate any credential that may have been exposed.

不要附带生产 API 密钥、访问 Token、私密会话日志、个人路径或第三方数据。上传日志前必须脱敏；任何可能已经泄露的凭据都应立即轮换。

## Scope / 范围

Security reports for behavior inherited unchanged from upstream may also need coordination with [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness). Ordinary bugs, feature requests, and setup questions belong in [Issues](https://github.com/xinyuquan985-coder/deepseek-harness-neon/issues) or [Discussions](https://github.com/xinyuquan985-coder/deepseek-harness-neon/discussions).

如果问题来自未修改的上游行为，可能还需要与 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 协同处理。普通缺陷、功能建议和安装问题请提交到 [Issues](https://github.com/xinyuquan985-coder/deepseek-harness-neon/issues) 或 [Discussions](https://github.com/xinyuquan985-coder/deepseek-harness-neon/discussions)。
