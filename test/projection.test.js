/**
 * AIEF-001 task 17 — provider projection and drift detection (§6, §39, §55.4).
 *
 * The property under test is narrow and load-bearing: what is committed in the
 * managed region must be reproducible from the composed source, and everything
 * outside it must survive untouched. A generator that quietly rewrites an
 * author's prose is worse than no generator.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  renderProjection,
  checkProjection,
  writeProjection,
  BEGIN,
  END,
  PROJECTION_TARGET,
} from '../src/projection/index.js';
import { compose } from '../src/resolve/index.js';
import { rule, foundation, project, stack, capability } from './helpers.js';

function composed({ rules, stacks = [], projectDoc = {} } = {}) {
  return compose({
    foundation: foundation(rules ?? [rule('AIEF-CORE-001')]),
    project: project(projectDoc),
    stacks,
    now: new Date('2026-09-01T00:00:00Z'),
  });
}

function withRepo(fn) {
  const dir = mkdtempSync(join(tmpdir(), 'aief-projection-'));
  try {
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('the projection lists enforced rules in full and counts advisory ones', () => {
  const block = renderProjection(
    composed({
      rules: [
        rule('AIEF-QUAL-013', { mode: 'enforced', enforcement_category: 'formatting' }),
        rule('AIEF-QUAL-001'),
        rule('AIEF-SEC-002'),
      ],
      stacks: [stack('node', { format: capability('npm run format:check') })],
    }),
  );

  assert.match(block, /Enforced — 1 rule\(s\)/);
  assert.match(block, /AIEF-QUAL-013.*npm run format:check/s);
  assert.match(block, /Advisory — 2 rule\(s\)/);
  // §13 — advisory intents are summarized, never enumerated, in a loaded file.
  assert.ok(!block.includes('intent for AIEF-QUAL-001'));
  assert.match(block, /`AIEF-QUAL` — 1/);
});

test('the projection is deterministic for an unchanged composition', () => {
  const a = renderProjection(composed());
  const b = renderProjection(composed());
  assert.equal(a, b);
});

test('writing preserves every byte outside the managed region', () => {
  withRepo((dir) => {
    const file = join(dir, PROJECTION_TARGET);
    const authored = '# AGENTS.md\n\n## Traps\n\nThe cache layout bit us once.\n';
    writeFileSync(file, authored, 'utf8');

    writeProjection(dir, renderProjection(composed()));
    const after = readFileSync(file, 'utf8');

    assert.ok(after.startsWith(authored.replace(/\s*$/, '')));
    assert.match(after, /The cache layout bit us once\./);
    assert.match(after, /aief:begin/);
  });
});

test('a second write replaces only the region, leaving the prose alone', () => {
  withRepo((dir) => {
    const file = join(dir, PROJECTION_TARGET);
    writeFileSync(file, '# Entry\n\nAuthored prose.\n', 'utf8');

    writeProjection(dir, renderProjection(composed()));
    const enriched = renderProjection(
      composed({
        rules: [rule('AIEF-QUAL-013', { mode: 'enforced', enforcement_category: 'formatting' })],
        stacks: [stack('node', { format: capability('npm run format:check') })],
      }),
    );
    writeProjection(dir, enriched);

    const after = readFileSync(file, 'utf8');
    assert.match(after, /Authored prose\./);
    assert.equal(after.split(BEGIN).length - 1, 1, 'exactly one managed region');
    assert.equal(after.split(END).length - 1, 1);
    assert.match(after, /npm run format:check/);
  });
});

test('§55.4 — drift is detected when the region no longer matches the source', () => {
  withRepo((dir) => {
    const block = renderProjection(composed());
    writeProjection(dir, block);
    assert.equal(checkProjection(dir, block).status, 'ok');

    const file = join(dir, PROJECTION_TARGET);
    writeFileSync(
      file,
      readFileSync(file, 'utf8').replace('Enforced', 'Definitely not enforced'),
      'utf8',
    );
    assert.equal(checkProjection(dir, block).status, 'drift');
  });
});

test('drift is also reported when the region or the file is missing', () => {
  withRepo((dir) => {
    const block = renderProjection(composed());
    assert.equal(checkProjection(dir, block).status, 'missing-file');

    writeFileSync(join(dir, PROJECTION_TARGET), '# no markers here\n', 'utf8');
    assert.equal(checkProjection(dir, block).status, 'absent');
  });
});

test('a projection into a repository with no entry point creates one', () => {
  withRepo((dir) => {
    assert.equal(existsSync(join(dir, PROJECTION_TARGET)), false);
    writeProjection(dir, renderProjection(composed()));
    assert.equal(checkProjection(dir, renderProjection(composed())).status, 'ok');
  });
});
