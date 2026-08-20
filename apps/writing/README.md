# 灵感写作（dsh-writing-app）

一个"激发式引导"的长文写作工具：你只填一个灵感，它像教练一样一步步引导你完成整篇文章，而不是一次性输出全文。面向公众号/自媒体长文。

## 特性

- **只填灵感**：一句话即可开始，可选目标读者、字数、语气。
- **选题角度 + 大纲**：先给出 3 个角度（各带大纲草案），选定后大纲可增删改。
- **逐段引导**：每一段先给 3 个写作角度，选一个，AI 只写这一小段；可采纳、重写、换角度或自己写。
- **连贯不跑题**：每段都带上已确认的前文；回头改写某段时，后续段落自动降级为"待写"，保证导出永远自洽。
- **收尾导出**：生成 3 个备选标题 + 结尾升华，一键复制/下载 Markdown 或纯文本。

## 技术栈

React 18 + Vite + TypeScript（前端），Hono + Node.js（后端），DeepSeek（OpenAI 兼容协议，可换 OpenAI 兼容模型）。

## 运行

```sh
# 1. 配置 API Key（二选一）
echo "DEEPSEEK_API_KEY=你的key" > apps/writing/.env
# 或使用 OPENAI_API_KEY / OPENAI_BASE_URL / OPENAI_MODEL

# 2. 安装依赖（仓库根目录）
pnpm install

# 3. 启动（开发模式，前后端一起）
pnpm --filter @deepseek-ai/dsh-writing-app dev
# 打开 http://localhost:5173
```

也可以分开启动：

```sh
pnpm --filter @deepseek-ai/dsh-writing-app dev:server   # Hono 后端，端口 8787
pnpm --filter @deepseek-ai/dsh-writing-app dev:client   # Vite 前端，端口 5173
```

生产模式（单服务）：

```sh
pnpm --filter @deepseek-ai/dsh-writing-app build
pnpm --filter @deepseek-ai/dsh-writing-app start   # 打开 http://localhost:8787
```

## 配置

| 环境变量 | 说明 | 默认 |
| --- | --- | --- |
| `DEEPSEEK_API_KEY` / `OPENAI_API_KEY` | 必填，API Key | — |
| `DEEPSEEK_BASE_URL` / `OPENAI_BASE_URL` | 兼容端点 | `https://api.deepseek.com` |
| `DEEPSEEK_MODEL` / `OPENAI_MODEL` | 模型名 | `deepseek-chat` |
| `PORT` | 后端端口 | `8787` |
| `WRITING_DATA_DIR` | 项目数据目录 | `apps/writing/data` |

## 数据

每个写作项目保存为 `apps/writing/data/<id>.json`（已 gitignore）。刷新页面后点击"继续上次写作"可恢复。

## 说明

- 本项目为 `private: true` 的独立子应用，不进入仓库的发布/打包流程。
- 未引入 Tailwind（其原生依赖 `@tailwindcss/oxide` 需联网安装）；样式为手写 CSS 设计系统，位于 `src/styles.css`。
