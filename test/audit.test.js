/**
 * AIEF-002 — the health check and layer-boundary tests.
 *
 * Every failing path is exercised. A check that has never been observed to
 * fail is an untested claim (§33), and a governance checker that only ever
 * reports "pass" is indistinguishable from one that does nothing.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { audit } from '../src/audit/index.js';
import { compose } from '../src/resolve/index.js';
import { rule, foundation, project, stack, capability, waiver } from './helpers.js';
import { renderProjection, writeProjection, PROJECTION_TARGET } from '../src/projection/index.js';

/**
 * Builds a throwaway repository on disk, because L1 and L2 read files and H3
 * measures them. Everything else is pure and needs no filesystem.
 */
function scaffold({ foundationFiles = {}, alwaysLoaded = {} } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'aief-audit-'));
  const fdir = join(dir, 'foundation');
  mkdirSync(join(fdir, 'rules'), { recursive: true });
  writeFileSync(join(fdir, 'AIEF-000-foundation.md'), '# Foundation\n\nUniversal only.\n', 'utf8');
  for (const [rel, content] of Object.entries(foundationFiles)) {
    writeFileSync(join(fdir, rel), content, 'utf8');
  }
  for (const [rel, content] of Object.entries(alwaysLoaded)) {
    writeFileSync(join(dir, rel), content, 'utf8');
  }
  return { dir, foundationDir: fdir };
}

/** Composes and audits one scenario, cleaning up the scaffolded repository. */
function run({
  rules = [rule('AIEF-CORE-001')],
  projectDoc = {},
  conformance = 'core',
  stacks = [],
  waivers = [],
  files = {},
  now = new Date('2026-09-01T00:00:00Z'),
} = {}) {
  const { dir, foundationDir } = scaffold(files);
  try {
    // Stack Profiles are materialized inside the scaffold so that L2 reads a
    // real file instead of resolving a relative path against this repository.
    const placed = stacks.map((s) => {
      const file = join(dir, 'stacks', s.name, 'profile.yaml');
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(
        file,
        s.contamination ??
          `name: ${s.name}
`,
        'utf8',
      );
      return { ...s, file };
    });
    const f = foundation(rules, { dir: foundationDir });
    const p = project(projectDoc, conformance);
    const composition = compose({ foundation: f, project: p, stacks: placed, waivers, now });
    return audit({
      cwd: dir,
      foundation: f,
      project: p,
      stacks: placed,
      waivers,
      composition,
      now,
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const find = (report, id) => report.checks.find((c) => c.id === id);

test('AC2 — every §48 and §55 item appears with an explicit state', () => {
  const report = run();
  const expected = [
    'H1',
    'H2',
    'H3',
    'H4',
    'H5',
    'H6',
    'H7',
    'H8',
    'H9',
    'H10',
    'H11',
    'H12',
    'H13',
    'L1',
    'L2',
    'L3',
    'L4',
  ];
  assert.deepEqual(
    report.checks.map((c) => c.id),
    expected,
  );
  for (const chk of report.checks) {
    assert.ok(
      ['pass', 'fail', 'warn', 'not_implemented'].includes(chk.status),
      `${chk.id} has no explicit state`,
    );
    assert.ok(chk.detail, `${chk.id} reports no detail`);
  }
});

test('a declared gap carries its reason, so it cannot read as a satisfied check', () => {
  const report = run();
  const declared = report.checks.filter((c) => c.status === 'not_implemented');
  assert.deepEqual(
    declared.map((c) => c.id),
    ['H4', 'H8', 'H10'],
  );
  for (const chk of declared) assert.ok(chk.detail.length > 40, `${chk.id} gives no reason`);
});

test('AC6 — H1 fails when two rules share a normalized intent', () => {
  const report = run({
    rules: [
      rule('AIEF-CORE-001', { intent: 'Secrets are never committed.' }),
      rule('AIEF-SEC-001', { intent: 'secrets   are never committed' }),
    ],
  });
  const h1 = find(report, 'H1');
  assert.equal(h1.status, 'fail');
  assert.match(h1.findings[0], /AIEF-CORE-001 and AIEF-SEC-001/);
  assert.equal(report.ok, false);
});

test('H3 warns rather than blocking, because a signal is not a gate (AIEF-QUAL-012)', () => {
  const report = run({
    projectDoc: { quality: { signals: { always_loaded_context_bytes: 10 } } },
    files: { alwaysLoaded: { 'AGENTS.md': 'x'.repeat(500) } },
  });
  const h3 = find(report, 'H3');
  assert.equal(h3.status, 'warn');
  assert.match(h3.detail, /500 of 10 bytes/);
  assert.equal(report.ok, true, 'a signal must never fail the run');
});

test('AC7 — H5 warns inside the expiry window and fails once the waiver expires', () => {
  const soon = run({
    waivers: [waiver('AIEF-CORE-001', { expires_at: '2026-09-20' })],
  });
  assert.equal(find(soon, 'H5').status, 'warn');
  assert.match(find(soon, 'H5').findings[0], /expires in 19 day\(s\)/);
  assert.equal(soon.ok, true);

  const gone = run({
    waivers: [waiver('AIEF-CORE-001', { expires_at: '2026-08-01' })],
  });
  assert.equal(find(gone, 'H5').status, 'fail');
  assert.equal(gone.ok, false);
});

test('H5 stays quiet for a waiver that expires well beyond the window', () => {
  const report = run({ waivers: [waiver('AIEF-CORE-001', { expires_at: '2027-06-01' })] });
  assert.equal(find(report, 'H5').status, 'pass');
});

test('H6 fails on an orphan rule, and H7 warns on orphan enforcement', () => {
  const orphan = run({
    rules: [rule('AIEF-QUAL-013', { mode: 'enforced', enforcement_category: 'formatting' })],
  });
  assert.equal(find(orphan, 'H6').status, 'fail');

  const unused = run({
    stacks: [stack('node', { lint: capability('npm run lint') })],
  });
  assert.equal(find(unused, 'H7').status, 'warn');
  assert.equal(unused.ok, true, 'orphan enforcement is advisory by §12.2');
});

test('AC8 — H11 fails when the Project Profile names an unsupported capability', () => {
  const report = run({
    projectDoc: { quality: { capabilities: { format: 'required', secret_scan: 'required' } } },
    stacks: [stack('node', { format: capability('npm run format:check') })],
  });
  const h11 = find(report, 'H11');
  assert.equal(h11.status, 'fail');
  assert.equal(h11.findings.length, 1);
  assert.match(h11.findings[0], /secret_scan is not supported/);
});

test('H11 marks a capability name that does not exist at all', () => {
  const report = run({
    projectDoc: { quality: { capabilities: { spellcheck: 'required' } } },
  });
  assert.match(find(report, 'H11').findings[0], /not a known capability name/);
});

test('AC9 / H12 — the unmet conformance message names the specific missing checks', () => {
  const report = run({ conformance: 'full' });
  const h12 = find(report, 'H12');
  assert.equal(h12.status, 'fail');
  const text = h12.findings.join('\n');
  for (const id of ['H4', 'H8', 'H10']) {
    assert.ok(text.includes(id), `the refusal should name ${id}`);
  }
});

test('AC4 — L1 fails when a stack binding command is planted in the Foundation', () => {
  const report = run({
    stacks: [stack('node', { lint: capability('npm run lint') })],
    files: {
      foundationFiles: {
        'rules/quality.yaml': "rules:\n  - intent: 'run npm run lint before review'\n",
      },
    },
  });
  const l1 = find(report, 'L1');
  assert.equal(l1.status, 'fail');
  assert.match(l1.findings.join('\n'), /stack binding command "npm run lint"/);
});

test('AC4 — L1 fails on a bare stack name in the Foundation', () => {
  const report = run({
    stacks: [stack('salesforce', {})],
    files: { foundationFiles: { 'rules/x.yaml': 'note: salesforce deployments differ\n' } },
  });
  assert.match(find(report, 'L1').findings.join('\n'), /stack name "salesforce"/);
});

test('L1 does not report the project id when it names the Foundation itself', () => {
  const report = run({
    rules: [rule('AIEF-CORE-001')],
    projectDoc: { project: { id: 'aief' } },
  });
  const l1 = find(report, 'L1');
  assert.equal(l1.status, 'pass');
  assert.match(l1.detail, /project id excluded/);
});

test('L1 does report a project id that is genuinely foreign to the Foundation', () => {
  const report = run({
    projectDoc: { project: { id: 'faro' } },
    files: { foundationFiles: { 'rules/x.yaml': 'note: faro needs this\n' } },
  });
  assert.match(find(report, 'L1').findings.join('\n'), /project id "faro"/);
});

test('AC5 — L2 fails when the project id is planted in a Stack Profile', () => {
  const { dir, foundationDir } = scaffold();
  try {
    const stackFile = join(dir, 'profile.yaml');
    writeFileSync(stackFile, 'name: node\nnote: tuned for faro\n', 'utf8');

    const f = foundation([rule('AIEF-CORE-001')], { dir: foundationDir });
    const p = project({ project: { id: 'faro', name: 'Faro' } });
    const s = { ...stack('node', {}), file: stackFile };
    const composition = compose({ foundation: f, project: p, stacks: [s] });
    const report = audit({
      cwd: dir,
      foundation: f,
      project: p,
      stacks: [s],
      composition,
      now: new Date('2026-09-01T00:00:00Z'),
    });

    const l2 = find(report, 'L2');
    assert.equal(l2.status, 'fail');
    assert.match(l2.findings.join('\n'), /project id "faro"/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('L3 fails when a higher layer addresses a rule the Foundation does not define', () => {
  const report = run({
    projectDoc: { rules: [{ id: 'AIEF-INVENTED-001', mode: 'enforced' }] },
  });
  assert.equal(find(report, 'L3').status, 'fail');
});

test('AC3 — the audit reads only; the scaffolded repository is unchanged', () => {
  const { dir, foundationDir } = scaffold({ alwaysLoaded: { 'AGENTS.md': 'x' } });
  try {
    const f = foundation([rule('AIEF-CORE-001')], { dir: foundationDir });
    const p = project();
    const composition = compose({ foundation: f, project: p });
    audit({ cwd: dir, foundation: f, project: p, composition });

    // The only artifacts present must be the ones scaffold() created.
    assert.deepEqual(readdirSync(dir).sort(), ['AGENTS.md', 'foundation']);
    assert.deepEqual(readdirSync(foundationDir).sort(), ['AIEF-000-foundation.md', 'rules']);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('L1 ignores Stack Profiles bundled inside a cached Foundation directory', () => {
  const { dir, foundationDir } = scaffold();
  try {
    // Reproduces the cache layout: rules/ and stacks/ side by side under the
    // version directory. Without the exclusion, the node profile's own binding
    // commands would be reported as Foundation contamination.
    mkdirSync(join(foundationDir, 'stacks', 'node'), { recursive: true });
    const bundled = join(foundationDir, 'stacks', 'node', 'profile.yaml');
    writeFileSync(bundled, 'name: node\ncapabilities:\n  lint:\n    command: npm run lint\n');

    const f = foundation([rule('AIEF-CORE-001')], { dir: foundationDir });
    const p = project();
    const s = { ...stack('node', { lint: capability('npm run lint') }), file: bundled };
    const composition = compose({ foundation: f, project: p, stacks: [s] });
    const report = audit({ cwd: dir, foundation: f, project: p, stacks: [s], composition });

    assert.equal(find(report, 'L1').status, 'pass', find(report, 'L1').findings.join('\n'));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('H9 and L4 pass when the repository projects nothing at all', () => {
  const report = run();
  assert.equal(find(report, 'H9').status, 'pass');
  assert.match(find(report, 'H9').detail, /nothing projected, nothing to drift/);
  assert.equal(find(report, 'L4').status, 'pass');
});

test('H9 and L4 fail once a managed region exists and no longer matches', () => {
  const { dir, foundationDir } = scaffold();
  try {
    const f = foundation([rule('AIEF-CORE-001')], { dir: foundationDir });
    const p = project();
    const composition = compose({ foundation: f, project: p });
    writeProjection(dir, renderProjection(composition));

    const target = join(dir, PROJECTION_TARGET);
    writeFileSync(target, readFileSync(target, 'utf8').replace('Enforced', 'Unenforced'), 'utf8');

    const report = audit({ cwd: dir, foundation: f, project: p, composition });
    assert.equal(find(report, 'H9').status, 'fail');
    assert.equal(find(report, 'L4').status, 'fail');
    assert.equal(report.ok, false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('§46.4 — H13 reports accepted debt without re-measuring it', () => {
  const report = run();
  const h13 = find(report, 'H13');
  assert.equal(h13.status, 'pass');
  assert.match(h13.detail, /no baseline recorded/);
});
