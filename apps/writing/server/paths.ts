import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

/** Directory of this server bundle (`apps/writing/server`). */
export const serverDir = fileURLToPath(new URL('.', import.meta.url))
/** Application root (`apps/writing`). */
export const appDir = resolve(serverDir, '..')
/** Where project JSON files live. Overridable via WRITING_DATA_DIR. */
export const dataDir = process.env.WRITING_DATA_DIR ?? resolve(appDir, 'data')
/** Built frontend output, served by the Hono server in production. */
export const distDir = resolve(appDir, 'dist')
