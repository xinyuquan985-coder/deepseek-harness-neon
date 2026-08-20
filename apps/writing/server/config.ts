import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { appDir } from './paths.ts'

/** Resolved LLM settings, with the API key required. */
export interface LLMConfig {
  apiKey: string
  baseUrl: string
  model: string
}

function loadEnvFiles(): void {
  const candidates = [resolve(appDir, '.env'), resolve(process.cwd(), '.env')]
  for (const file of candidates) {
    if (existsSync(file)) {
      // Only fills variables that are not already set, matching `--env-file`.
      process.loadEnvFile(file)
      return
    }
  }
}

/**
 * Resolve LLM settings. Reads DEEPSEEK_* first, falling back to OPENAI_*
 * (both providers expose an OpenAI-compatible chat completions endpoint).
 * Throws when no API key is configured so callers fail loud instead of
 * sending an unauthenticated request.
 */
export function getLLMConfig(): LLMConfig {
  loadEnvFiles()
  const apiKey = process.env.DEEPSEEK_API_KEY ?? process.env.OPENAI_API_KEY ?? ''
  if (!apiKey) {
    throw new Error(
      '未配置 API Key。请在 apps/writing/.env 中写入 DEEPSEEK_API_KEY（或 OPENAI_API_KEY）后重启服务。',
    )
  }
  return {
    apiKey,
    baseUrl: process.env.DEEPSEEK_BASE_URL ?? process.env.OPENAI_BASE_URL ?? 'https://api.deepseek.com',
    model: process.env.DEEPSEEK_MODEL ?? process.env.OPENAI_MODEL ?? 'deepseek-chat',
  }
}

/** Non-throwing readiness probe for the UI's key-guidance screen. */
export function configStatus(): { configured: boolean; model: string } {
  loadEnvFiles()
  const apiKey = process.env.DEEPSEEK_API_KEY ?? process.env.OPENAI_API_KEY
  return {
    configured: Boolean(apiKey),
    model: process.env.DEEPSEEK_MODEL ?? process.env.OPENAI_MODEL ?? 'deepseek-chat',
  }
}
