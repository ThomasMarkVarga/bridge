/**
 * Words typed straight into a component.
 *
 * A label written in the JSX instead of taken from the dictionary is invisible
 * until somebody switches language and finds an English word sitting in the
 * middle of a Romanian page. Nothing throws, and the parity test cannot see it,
 * because the string never became a key. So the attributes that carry words are
 * checked here: they have to be built from `t(...)`.
 */
import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const src = join(dirname(fileURLToPath(import.meta.url)), '../..')
const files = [
  ...readdirSync(join(src, 'components'))
    .filter((f) => f.endsWith('.jsx'))
    .map((f) => join('components', f)),
  'App.jsx'
]

/** placeholder="..." and aria-label="..." with real words in them. */
const WORDS = /\b(?:placeholder|aria-label|title)="([^"]*[A-Za-z]{3}[^"]*)"/

describe('the components', () => {
  it('take every word they show from the dictionary', () => {
    const typedIn = []
    for (const file of files) {
      readFileSync(join(src, file), 'utf8')
        .split('\n')
        .forEach((line, i) => {
          const found = line.match(WORDS)
          if (found && !line.includes('t(')) typedIn.push(`${file}:${i + 1}  ${found[1]}`)
        })
    }
    expect(typedIn, 'typed in rather than translated').toEqual([])
  })
})
