import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

const appDir = resolve(fileURLToPath(new URL('..', import.meta.url)))
const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'

function start(name, args) {
  const child = spawn(pnpm, ['exec', ...args], {
    cwd: appDir,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  })
  child.on('exit', (code, signal) => {
    console.error(`[${name}] exited (code=${code}, signal=${signal})`)
  })
  return child
}

const server = start('server', ['tsx', 'watch', 'server/index.ts'])
const client = start('client', ['vite'])

function shutdown() {
  server.kill()
  client.kill()
  process.exit(0)
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
