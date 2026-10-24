/**
 * Anchor regression tests.
 *
 * The rule that decides where a stored range lands is pure, so it is tested
 * here without a browser: `resolveRange` is bundled out of the TypeScript
 * source with the same esbuild already in the toolchain, then exercised
 * against the cases that used to break — a rebuilt DOM, text inserted ahead of
 * the range, a repeated quote, and a quote that no longer exists.
 */
import { build } from 'esbuild'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const dir = mkdtempSync(join(tmpdir(), 'dsh-notes-test-'))
try {
  await build({
    entryPoints: ['src/client/anchor.ts'],
    outfile: join(dir, 'anchor.mjs'),
    bundle: true,
    format: 'esm',
    platform: 'node',
    logLevel: 'silent',
  })
  const { resolveRange } = await import(pathToFileURL(join(dir, 'anchor.mjs')).href)

  let failures = 0
  const cases = []
  /**
   * Record one assertion.
   * @param name - what is being checked.
   * @param actual - computed value.
   * @param expected - expected value.
   */
  const check = (name, actual, expected) => {
    const pass = JSON.stringify(actual) === JSON.stringify(expected)
    if (!pass) failures += 1
    cases.push(`${pass ? 'ok  ' : 'FAIL'} ${name}${pass ? '' : `\n     expected ${JSON.stringify(expected)}\n     actual   ${JSON.stringify(actual)}`}`)
  }

  const text = 'The quick brown fox jumps over the lazy dog.'
  check('exact hit uses the stored offset',
    resolveRange(text, 'brown fox', 'The quick ', ' jumps', 10),
    { offset: 10, status: 'exact' })

  check('shifted text re-finds the quote through its context',
    resolveRange(`PREFIX ADDED. ${text}`, 'brown fox', 'The quick ', ' jumps', 10),
    { offset: 24, status: 'fuzzy' })

  check('a single occurrence wins even with no context',
    resolveRange(text, 'lazy', '', '', 0),
    { offset: 35, status: 'fuzzy' })

  check('a repeated quote is disambiguated by its suffix',
    resolveRange('aa foo bb foo cc', 'foo', 'aa ', ' bb', 0),
    { offset: 3, status: 'fuzzy' })
  check('a repeated quote is disambiguated by its prefix',
    resolveRange('aa foo bb foo cc', 'foo', 'bb ', ' cc', 0),
    { offset: 10, status: 'fuzzy' })

  check('an ambiguous repeat is lost rather than guessed',
    resolveRange('x foo y foo z', 'foo', 'q ', ' q', 0),
    null)

  check('no context at all plus a single occurrence still resolves',
    resolveRange('only one foo here', 'foo', '', '', 0),
    { offset: 9, status: 'fuzzy' })

  check('a quote that disappeared is lost',
    resolveRange('completely different text', 'brown fox', 'The quick ', ' jumps', 0),
    null)

  check('an empty quote never resolves',
    resolveRange(text, '', '', '', 0),
    null)

  for (const line of cases) console.log(line)
  if (failures > 0) {
    console.error(`\n${failures} assertion(s) failed`)
    process.exitCode = 1
  } else {
    console.log(`\nok ${cases.length} anchor cases`)
  }
} finally {
  rmSync(dir, { recursive: true, force: true })
}
