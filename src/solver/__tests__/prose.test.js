/**
 * No em-dashes anywhere we write.
 *
 * They kept reappearing one at a time, in a manifest, a console banner, a
 * calendar event name, so this checks rather than trusting anyone to remember. A
 * comma, a colon or a full stop always says the same thing.
 *
 * The holiday data is exempt on purpose: those strings are holiday names as the
 * library supplies them, and rewriting somebody's punctuation would mean the data
 * no longer matches its source.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)), '../../..')

const SKIP_DIRS = new Set(['node_modules', 'dist', '.git', '.probe', '.claude'])
/** Generated from the holiday library, so its punctuation is not ours to change. */
const SKIP_PATHS = ['src/data/holidays', 'package-lock.json']
const TEXT = /\.(js|jsx|mjs|cjs|ts|tsx|css|html|json|md|txt|xml|svg|webmanifest|yml|yaml)$/

// Built rather than typed, so this file does not trip its own check.
const EM_DASH = String.fromCharCode(0x2014)

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) walk(full, out)
    else if (TEXT.test(entry)) out.push(full)
  }
  return out
}

describe('the writing in this repository', () => {
  const files = walk(ROOT).filter((f) => {
    const rel = relative(ROOT, f).split(sep).join('/')
    return !SKIP_PATHS.some((p) => rel === p || rel.startsWith(p + '/'))
  })

  it('has files to check, so a silent miss cannot pass for a pass', () => {
    // The last detector reported zero because it was broken, not because the
    // repository was clean. A count guards against that happening again.
    expect(files.length).toBeGreaterThan(30)
  })

  it('contains no em-dashes', () => {
    const offenders = []
    for (const file of files) {
      const text = readFileSync(file, 'utf8')
      if (!text.includes(EM_DASH)) continue
      const rel = relative(ROOT, file).split(sep).join('/')
      text.split('\n').forEach((line, i) => {
        if (line.includes(EM_DASH)) offenders.push(`${rel}:${i + 1}  ${line.trim().slice(0, 90)}`)
      })
    }
    expect(offenders, `Use a comma, a colon or a full stop instead:\n${offenders.join('\n')}`).toEqual([])
  })
})
