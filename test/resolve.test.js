import test from 'node:test';
import assert from 'node:assert/strict';
import { compose } from '../src/resolve/index.js';
import { rule, foundation, project, stack, capability, waiver, codes } from './helpers.js';

const NOW = new Date('2026-06-01T00:00:00Z');

test('AC5 — every resolved rule reports its origin layer and artifact', () => {
  const r = compose({
    foundation: foundation([rule('AIEF-CORE-001')]),
    project: project(),
    now: NOW,
  });
  assert.equal(r.rules.length, 1);
  assert.equal(r.rules[0].origin.layer, 'foundation');
  assert.equal(r.rules[0].origin.artifact, 'foundation/rules/test.yaml');
});

test('AC6 — a project rule overrides a stack rule and the trail stays visible', () => {
  const r = compose({
    foundation: foundation([rule('AIEF-CORE-001', { mode: 'off' })]),
    project: project({ rules: [{ id: 'AIEF-CORE-001', mode: 'enforced' }] }),
    stacks: [stack('node', {}, [{ id: 'AIEF-CORE-001', mode: 'advisory' }])],
    now: NOW,
  });

  const resolved = r.rules[0];
  assert.equal(resolved.mode, 'enforced');
  assert.deepEqual(
    resolved.overrides.map((o) => `${o.layer}:${o.from}->${o.to}`),
    ['stack:off->advisory', 'project:advisory->enforced'],
  );
});

test('a higher layer cannot invent a rule the Foundation never defined', () => {
  const r = compose({
    foundation: foundation([]),
    project: project({ rules: [{ id: 'AIEF-CORE-999', mode: 'enforced' }] }),
    now: NOW,
  });
  assert.deepEqual(codes(r), ['UNKNOWN_RULE_OVERRIDE']);
});

test('AC7 — an expired waiver fails, naming the waiver and its rule', () => {
  const r = compose({
    foundation: foundation([rule('AIEF-CORE-001')]),
    project: project(),
    waivers: [waiver('AIEF-CORE-001', { expires_at: '2026-01-01' })],
    now: NOW,
  });
  assert.deepEqual(codes(r), ['WAIVER_EXPIRED']);
  assert.match(r.failures[0].message, /AIEF-CORE-001/);
  assert.match(r.failures[0].message, /\.ai\/waivers\/test\.yaml/);
});

test('a waiver that has not expired is applied and recorded on the rule', () => {
  const r = compose({
    foundation: foundation([rule('AIEF-CORE-001')]),
    project: project(),
    waivers: [waiver('AIEF-CORE-001', { expires_at: '2027-01-01' })],
    now: NOW,
  });
  assert.ok(r.ok);
  assert.equal(r.rules[0].waiver.owner, 'test');
  assert.equal(r.meta.counts.waived, 1);
});

test('AC8 — a waiver referencing an unknown rule fails', () => {
  const r = compose({
    foundation: foundation([rule('AIEF-CORE-001')]),
    project: project(),
    waivers: [waiver('AIEF-CORE-404')],
    now: NOW,
  });
  assert.deepEqual(codes(r), ['WAIVER_UNKNOWN_RULE']);
});

test('AC9 — an enforced rule with no supporting capability is an orphan', () => {
  const r = compose({
    foundation: foundation([
      rule('AIEF-TEST-002', { mode: 'enforced', enforcement_category: 'tests' }),
    ]),
    project: project(),
    stacks: [stack('node', {})],
    now: NOW,
  });
  assert.deepEqual(codes(r), ['ORPHAN_RULE']);
  assert.match(r.failures[0].message, /test/);
});

test('an enforced rule binds when a stack supports the capability', () => {
  const r = compose({
    foundation: foundation([
      rule('AIEF-TEST-002', { mode: 'enforced', enforcement_category: 'tests' }),
    ]),
    project: project(),
    stacks: [stack('node', { test: capability('npm test') })],
    now: NOW,
  });
  assert.ok(r.ok, JSON.stringify(r.failures));
  assert.equal(r.rules[0].binding.command, 'npm test');
  assert.equal(r.rules[0].binding.stack, 'node');
});

test('§11.2 — weakening a rule without a waiver fails', () => {
  const r = compose({
    foundation: foundation([rule('AIEF-CORE-001', { mode: 'enforced' })]),
    project: project({ rules: [{ id: 'AIEF-CORE-001', mode: 'advisory' }] }),
    now: NOW,
  });
  assert.ok(codes(r).includes('UNWAIVED_CONTRADICTION'));
});

test('§11.2 — the same weakening passes when a waiver covers it', () => {
  const r = compose({
    foundation: foundation([rule('AIEF-CORE-001', { mode: 'enforced' })]),
    project: project({ rules: [{ id: 'AIEF-CORE-001', mode: 'advisory' }] }),
    waivers: [waiver('AIEF-CORE-001')],
    now: NOW,
  });
  assert.ok(r.ok, JSON.stringify(r.failures));
});

test('strengthening a rule is not a contradiction', () => {
  const r = compose({
    foundation: foundation([rule('AIEF-CORE-001', { mode: 'advisory' })]),
    project: project({ rules: [{ id: 'AIEF-CORE-001', mode: 'enforced' }] }),
    now: NOW,
  });
  assert.ok(!codes(r).includes('UNWAIVED_CONTRADICTION'));
});

test('§23 — a judgement-only category cannot be enforced', () => {
  const r = compose({
    foundation: foundation([
      rule('AIEF-QUAL-001', { mode: 'enforced', enforcement_category: 'review' }),
    ]),
    project: project(),
    now: NOW,
  });
  assert.deepEqual(codes(r), ['UNENFORCEABLE_CATEGORY']);
});

test('§12.2 — a supported capability no rule references warns, never fails', () => {
  const r = compose({
    foundation: foundation([rule('AIEF-CORE-001')]),
    project: project(),
    stacks: [stack('node', { lint: capability('npm run lint') })],
    now: NOW,
  });
  assert.ok(r.ok);
  assert.equal(r.warnings.length, 1);
  assert.match(r.warnings[0], /orphan enforcement/);
});

test('AC11 — declaring full conformance fails while the engine cannot deliver it', () => {
  const r = compose({
    foundation: foundation([rule('AIEF-CORE-001')]),
    project: project({}, 'full'),
    now: NOW,
  });
  assert.ok(codes(r).includes('CONFORMANCE_UNMET'));
  assert.match(r.failures[0].message, /F5|F6|F7/);
});

test('rules are returned in stable identity order regardless of input order', () => {
  const ids = ['AIEF-SEC-001', 'AIEF-CORE-002', 'AIEF-FLOW-003'];
  const forward = compose({
    foundation: foundation(ids.map((i) => rule(i))),
    project: project(),
    now: NOW,
  });
  const reverse = compose({
    foundation: foundation([...ids].reverse().map((i) => rule(i))),
    project: project(),
    now: NOW,
  });
  assert.deepEqual(
    forward.rules.map((r) => r.id),
    reverse.rules.map((r) => r.id),
  );
});

test('meta reports counts that match the resolved rules', () => {
  const r = compose({
    foundation: foundation([
      rule('AIEF-CORE-001', { mode: 'advisory' }),
      rule('AIEF-CORE-002', { mode: 'off' }),
      rule('AIEF-TEST-002', { mode: 'enforced', enforcement_category: 'tests' }),
    ]),
    project: project(),
    stacks: [stack('node', { test: capability('npm test') })],
    now: NOW,
  });
  assert.deepEqual(r.meta.counts, { rules: 3, enforced: 1, advisory: 1, off: 1, waived: 0 });
  assert.deepEqual(r.meta.stacks, ['node']);
});
