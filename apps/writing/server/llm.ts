import { getLLMConfig } from './config.ts'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatOptions {
  json?: boolean
  temperature?: number
  maxTokens?: number
}

/**
 * Call the configured OpenAI-compatible chat completions endpoint and return
 * the assistant's text. Throws with the upstream status and a trimmed body
 * snippet on non-2xx or empty responses.
 */
export async function chat(messages: ChatMessage[], options: ChatOptions = {}): Promise<string> {
  const { apiKey, baseUrl, model } = getLLMConfig()
  const url = `${baseUrl.replace(/\/+$/, '')}/chat/completions`
  const body: Record<string, unknown> = {
    model,
    messages,
    temperature: options.temperature ?? 0.7,
  }
  if (options.maxTokens) body.max_tokens = options.maxTokens
  if (options.json) body.response_format = { type: 'json_object' }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`LLM 请求失败（${response.status}）：${text.slice(0, 300)}`)
  }

  const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> }
  const content = data.choices?.[0]?.message?.content
  if (typeof content !== 'string' || content.trim() === '') {
    throw new Error('LLM 返回了空内容')
  }
  return content
}

/** Parse JSON out of an LLM reply, tolerating markdown fences and stray prose. */
export function parseJson<T>(raw: string): T {
  let text = raw.trim()
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fenced) text = fenced[1].trim()
  const first = text.indexOf('{')
  const last = text.lastIndexOf('}')
  if (first >= 0 && last > first) text = text.slice(first, last + 1)
  return JSON.parse(text) as T
}

/**
 * Ask for a JSON answer and parse it; on a parse failure, feed the bad output
 * back once with a correction instruction and parse the retry.
 */
export async function chatJson<T>(messages: ChatMessage[]): Promise<T> {
  const first = await chat(messages, { json: true })
  try {
    return parseJson<T>(first)
  } catch {
    const retry: ChatMessage[] = [
      ...messages,
      { role: 'assistant', content: first },
      {
        role: 'user',
        content: '你上一次的输出不是合法 JSON。请只输出一个合法 JSON 对象，不要包含解释、说明或代码围栏。',
      },
    ]
    const second = await chat(retry, { json: true })
    return parseJson<T>(second)
  }
}
