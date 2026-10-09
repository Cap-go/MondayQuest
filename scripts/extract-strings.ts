// Collects static inline copy L('English') so a new language can be fetched in one go.
// Dynamic strings (template literals with ${}) are translated on demand at runtime.
// Usage: bun scripts/extract-strings.ts  (also runs before every build)
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory())
      walk(p, out)
    else if (/\.(?:ts|vue)$/.test(name))
      out.push(p)
  }
  return out
}

const found = new Set<string>()
const re = /(?<![\w$.])L\(\s*(['"])((?:\\.|(?!\1).)*)\1\s*\)/g
for (const file of walk('src')) {
  for (const m of readFileSync(file, 'utf8').matchAll(re))
    found.add(m[2]!.replace(/\\(['"\\])/g, '$1'))
}
const list = [...found].sort()
writeFileSync('src/i18n/static-strings.json', `${JSON.stringify(list)}\n`)
console.log(`${list.length} static strings`)
