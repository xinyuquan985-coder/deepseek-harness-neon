// creator-trial 验证脚本：YAML 可解析性 + 技能 frontmatter 检查。
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const repo = resolve(root, '..')
let failed = 0

function findYamlDir() {
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
    console.log('SKIP: 未找到 yaml 包，跳过 YAML 解析检查（diff 检查仍有效）')
  } else {
    const { parse } = await import(pathToFileURL(resolve(yamlDir, 'dist', 'index.js')).href)
    const jsTag = {
      tag: '!!js',
      resolve: () => 'str',
      construct: (options) => String(options.str ?? ''),
    }
    const files = [
      ['creator 预设组合', resolve(root, 'preset', 'creator', 'agent.cordis.yml')],
      ['标准预设组合（对照）', resolve(repo, 'apps', 'cli', 'config', 'agent-presets', 'standard', 'agent.cordis.yml')],
      ['preset.yml', resolve(root, 'preset', 'creator', 'preset.yml')],
    ]
    for (const [label, file] of files) {
      try {
        const doc = parse(readFileSync(file, 'utf8'), { customTags: [jsTag] })
        const rows = Array.isArray(doc) ? `${doc.length} 行` : '非列表'
        console.log(`OK   ${label}: 解析成功（${rows}）`)
      } catch (error) {
        failed++
        console.log(`FAIL ${label}: ${error.message}`)
      }
    }
  }

  for (const name of ['topic-research', 'review-draft', 'video-script']) {
    const file = resolve(root, 'skills', name, 'SKILL.md')
    const text = readFileSync(file, 'utf8')
    const match = text.match(/^---\n([\s\S]*?)\n---/)
    if (!match) {
      failed++
      console.log(`FAIL ${name}: 无 frontmatter`)
      continue
    }
    const fm = match[1]
    const nameMatch = fm.match(/^name:\s*([a-z0-9][a-z0-9-]*)\s*$/m)
    const descMatch = fm.match(/^description:\s*\S/m)
    if (!nameMatch) {
      failed++
      console.log(`FAIL ${name}: name 缺失或非 kebab-case`)
    }
    if (!descMatch) {
      failed++
      console.log(`FAIL ${name}: description 缺失`)
    }
    if (nameMatch && descMatch) console.log(`OK   ${name}: frontmatter 合法（name=${nameMatch[1]}）`)
  }

  process.exit(failed ? 1 : 0)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
