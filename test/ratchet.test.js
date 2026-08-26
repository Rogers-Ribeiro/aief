/**
 * AIEF-003 — the quality ratchet (§46) and the ADR-0006 execution constraints.
 *
 * Two things are under test and only one of them is arithmetic. The comparison
 * must be by identity, because §46 says a count comparison accepts the exact
 * trade it exists to prevent. And the safety constraints ADR-0006 traded for
 * this capability must be properties, not promises — a constraint nothing
 * tests is a sentence in a document.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  identity,
  measure,
  measureCapability,
  compare,
  guardWrite,
  toBaseline,
  writeBaseline,
  readBaseline,
} from '../src/ratchet/index.js';
import { stack, capability } from './helpers.js';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');

const id = (file, rule, message) => identity({ capability: 'lint', file, rule, message });

/** An eslint --format json payload, without running eslint. */
function eslintJson(entries) {
  return JSON.stringify(
    entries.map(([filePath, messages]) => ({
      filePath: join(REPO, filePath),
      messages: messages.map(([ruleId, message, line]) => ({ ruleId, message, line })),
    })),
  );
}

/** A spawnSync stand-in, so comparison logic is tested without a subprocess. */
const fakeRun = (stdout) => () => ({ stdout, status: 0 });

const lintCapability = (extra = {}) => ({
  ...capability('npm run lint'),
  identities: { argv: ['node', 'eslint.js'], format: 'eslint-json' },
  ...extra,
});

function measured(entries) {
  return [
    measureCapability('lint', lintCapability(), {
      cwd: REPO,
      run: fakeRun(eslintJson(entries)),
    }),
  ];
}

test('AC1 — swapping one baselined violation for one new one fails', () => {
  const baseline = toBaseline(measured([['src/a.js', [['no-unused-vars', 'old', 3]]]]));
  const current = measured([['src/a.js', [['no-console', 'new', 3]]]]);

  const result = compare(current, baseline);

  assert.equal(result.counts.added, 1, 'the count is flat; the identity is not');
  assert.equal(result.counts.resolved, 1);
  assert.equal(result.ok, false);
});

test('AC2 — resolving a violation without adding one passes and is reported', () => {
  const baseline = toBaseline(
    measured([
      [
        'src/a.js',
        [
          ['no-unused-vars', 'first', 3],
          ['no-console', 'second', 9],
        ],
      ],
    ]),
  );
  const current = measured([['src/a.js', [['no-console', 'second', 9]]]]);

  const result = compare(current, baseline);
  assert.deepEqual(result.counts, { remaining: 1, added: 0, resolved: 1 });
  assert.equal(result.ok, true);
});

test('AC3 — an identity survives the violation moving to another line', () => {
  const baseline = toBaseline(measured([['src/a.js', [['no-console', 'same message', 3]]]]));
  const moved = measured([['src/a.js', [['no-console', 'same message', 91]]]]);

  const result = compare(moved, baseline);
  assert.deepEqual(result.counts, { remaining: 1, added: 0, resolved: 0 });
});

test('a violation moving to a different file is new debt, and old debt resolved', () => {
  const baseline = toBaseline(measured([['src/a.js', [['no-console', 'msg', 3]]]]));
  const elsewhere = measured([['src/b.js', [['no-console', 'msg', 3]]]]);

  const result = compare(elsewhere, baseline);
  assert.equal(result.counts.added, 1);
  assert.equal(result.counts.resolved, 1);
  assert.equal(result.ok, false);
});

test('AC4 — a capability with no identities block is unmeasurable, not zero', () => {
  const results = measure({
    cwd: REPO,
    stacks: [stack('node', { format: capability('npm run format:check') })],
    run: fakeRun('[]'),
  });

  assert.equal(results.length, 1);
  assert.equal(results[0].measured, false);
  assert.match(results[0].reason, /declares no `identities`/);

  const comparison = compare(results, null);
  assert.equal(comparison.counts.added, 0);
  assert.equal(comparison.capabilities[0].measured, false);
});

test('an unknown identities format is declared unmeasurable rather than guessed at', () => {
  const result = measureCapability(
    'lint',
    lintCapability({ identities: { argv: ['node', 'x.js'], format: 'checkstyle-xml' } }),
    { cwd: REPO, run: fakeRun('<xml/>') },
  );
  assert.equal(result.measured, false);
  assert.match(result.reason, /unknown identities format "checkstyle-xml"/);
});

test('output that does not parse is reported, never silently treated as clean', () => {
  const result = measureCapability('lint', lintCapability(), {
    cwd: REPO,
    run: fakeRun('not json at all'),
  });
  assert.equal(result.measured, false);
  assert.match(result.reason, /did not parse as eslint-json/);
});

test('AC5 — the guard refuses to grow a baseline without a waiver naming the identity', () => {
  const baseline = toBaseline(measured([['src/a.js', [['no-console', 'old', 3]]]]));
  const current = measured([
    [
      'src/a.js',
      [
        ['no-console', 'old', 3],
        ['no-unused-vars', 'brand new', 4],
      ],
    ],
  ]);
  const comparison = compare(current, baseline);

  const refused = guardWrite(comparison, []);
  assert.equal(refused.allowed, false);
  assert.deepEqual(refused.unwaived, [id('src/a.js', 'no-unused-vars', 'brand new')]);

  const waived = guardWrite(comparison, [
    { rule_id: 'AIEF-QUAL-014', identities: [id('src/a.js', 'no-unused-vars', 'brand new')] },
  ]);
  assert.equal(waived.allowed, true);
});

test('AC6 — shrinking a baseline is always allowed', () => {
  const baseline = toBaseline(
    measured([
      [
        'src/a.js',
        [
          ['no-console', 'one', 3],
          ['no-console', 'two', 4],
        ],
      ],
    ]),
  );
  const current = measured([['src/a.js', [['no-console', 'one', 3]]]]);
  assert.equal(guardWrite(compare(current, baseline), []).allowed, true);
});

test('AC7 — the identity command is spawned as argv with no shell', () => {
  let observed = null;
  measureCapability(
    'lint',
    lintCapability({
      identities: { argv: ['node', 'eslint.js', '--format', 'json'], format: 'eslint-json' },
    }),
    {
      cwd: REPO,
      run: (cmd, args, opts) => {
        observed = { cmd, args, opts };
        return { stdout: '[]', status: 0 };
      },
    },
  );

  assert.equal(observed.cmd, 'node');
  assert.deepEqual(observed.args, ['eslint.js', '--format', 'json']);
  assert.equal(observed.opts.shell, false, 'a shell would make a profile executable prose');
});

test('AC8 — only the ratchet module may reach for a subprocess', () => {
  const offenders = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.name.endsWith('.js')) {
        const source = readFileSync(full, 'utf8');
        if (/from ['"]node:child_process['"]/.test(source)) offenders.push(full);
      }
    }
  };
  walk(join(REPO, 'src'));

  assert.deepEqual(
    offenders.map((f) => f.replace(REPO, '').replace(/\\/g, '/')),
    ['/src/ratchet/index.js'],
    'ADR-0006 confines execution to one module; compose, health, render and init must stay inert',
  );
});

test('AC10 — a baseline is deterministic regardless of the order violations arrive in', () => {
  const dir = mkdtempSync(join(tmpdir(), 'aief-ratchet-'));
  try {
    const forward = toBaseline(
      measured([
        [
          'src/a.js',
          [
            ['no-console', 'one', 3],
            ['no-unused-vars', 'two', 9],
          ],
        ],
      ]),
    );
    const reversed = toBaseline(
      measured([
        [
          'src/a.js',
          [
            ['no-unused-vars', 'two', 9],
            ['no-console', 'one', 3],
          ],
        ],
      ]),
    );

    writeBaseline(dir, forward);
    const first = readFileSync(join(dir, '.ai', 'baseline.json'), 'utf8');
    writeBaseline(dir, reversed);
    const second = readFileSync(join(dir, '.ai', 'baseline.json'), 'utf8');

    assert.equal(first, second);
    assert.deepEqual(readBaseline(dir), forward);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a repository with no baseline yet is not failing — it has accepted nothing', () => {
  const result = compare(measured([['src/a.js', [['no-console', 'msg', 3]]]]), null);
  assert.equal(result.ok, true);
  assert.equal(result.hasBaseline, false);
  assert.equal(result.counts.added, 1);
});
