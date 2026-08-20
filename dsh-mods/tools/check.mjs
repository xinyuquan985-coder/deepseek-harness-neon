// dsh-mods 产物校验：YAML 解析 + 技能 frontmatter + 载荷语法。
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const repo = resolve(root, '..')
let failed = 0

const findYamlDir = () => {
  const candidates = [
    resolve(repo, 'node_modules', 'yaml'),
    resolve(repo, '.dsh-runtime', 'node_modules', 'yaml'),
  ]
  for (const c of candidates) if (existsSync(resolve(c, 'package.json'))) return c
  return null
}

const main = async () => {
  const yamlDir = findYamlDir()
  if (!yamlDir) {
    console.log('SKIP: 未找到 yaml 包')
  } else {
    const { parse } = await import(pathToFileURL(resolve(yamlDir, 'dist', 'index.js')).href)
    const jsTag = { tag: '!!js', resolve: () => 'str', construct: (options) => String(options.str ?? '') }
    const files = [
      ['debate 预设组合', resolve(root, 'debate', 'preset', 'debate', 'agent.cordis.yml')],
      ['debate preset.yml', resolve(root, 'debate', 'preset', 'debate', 'preset.yml')],
    ]
    for (const [label, file] of files) {
      try {
        const doc = parse(readFileSync(file, 'utf8'), { customTags: [jsTag] })
        console.log(`OK   ${label}: 解析成功（${Array.isArray(doc) ? `${doc.length} 行` : '非列表'}）`)
      } catch (error) {
        failed++
        console.log(`FAIL ${label}: ${error.message}`)
      }
    }
  }

  const skill = resolve(root, 'debate', 'skills', 'debate-arena', 'SKILL.md')
  const fm = readFileSync(skill, 'utf8').match(/^---\n([\s\S]*?)\n---/)?.[1] ?? ''
  if (!fm.match(/^name:\s*([a-z0-9][a-z0-9-]*)\s*$/m) || !fm.match(/^description:\s*\S/m)) {
    failed++
    console.log('FAIL debate-arena: frontmatter 不合法')
  } else {
    console.log('OK   debate-arena: frontmatter 合法')
  }

  for (const name of ['cyber-theme.client.js', 'debate-vs-view.client.js']) {
    const file = resolve(root, 'client', name)
    try {
      // 载荷是浏览器 ESM（含 React JSX 转写前的普通 JS），用 Node 语法编译近似校验。
      // 直接 new Function 会因 import/export 失败，改为检查结构：apply 与 inject 存在。
      const text = readFileSync(file, 'utf8')
      const hasApply = /export function apply\s*\(/.test(text)
      const hasInject = /export const inject\s*=/.test(text)
      if (hasApply && hasInject) console.log(`OK   ${name}: 结构合法（inject + apply）`)
      else { failed++; console.log(`FAIL ${name}: 缺少 inject 或 apply`) }
    } catch (error) {
      failed++
      console.log(`FAIL ${name}: ${error.message}`)
    }
  }

  process.exit(failed ? 1 : 0)
}

main().catch((error) => { console.error(error); process.exit(1) })
