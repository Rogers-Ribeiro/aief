import test from 'node:test';
import assert from 'node:assert/strict';
import { compose } from '../src/resolve/index.js';
import { stableStringify, toEffectiveConfig, renderReport } from '../src/emit/index.js';
import { rule, foundation, project, stack, capability } from './helpers.js';

const NOW = new Date('2026-06-01T00:00:00Z');

function build(ids) {
  return compose({
    foundation: foundation(ids.map((i) => rule(i))),
    project: project(),
    stacks: [stack('node', { test: capability('npm test') })],
    now: NOW,
  });
}

test('AC12 — key order in the source does not change the output', () => {
  const a = stableStringify({ b: 1, a: { d: 4, c: 3 } });
  const b = stableStringify({ a: { c: 3, d: 4 }, b: 1 });
  assert.equal(a, b);
});

test('AC12 — rule order in the source does not change the output', () => {
  const ids = ['AIEF-SEC-001', 'AIEF-CORE-002', 'AIEF-FLOW-003'];
  const forward = stableStringify(toEffectiveConfig(build(ids)));
  const reverse = stableStringify(toEffectiveConfig(build([...ids].reverse())));
  assert.equal(forward, reverse);
});

test('AC12 — repeated composition of identical input is byte-identical', () => {
  const ids = ['AIEF-CORE-001', 'AIEF-CORE-002'];
  assert.equal(
    stableStringify(toEffectiveConfig(build(ids))),
    stableStringify(toEffectiveConfig(build(ids))),
  );
});

test('the materialized config marks itself as generated', () => {
  const cfg = toEffectiveConfig(build(['AIEF-CORE-001']));
  assert.match(cfg.warning, /Do not edit by hand/);
  assert.equal(cfg.generated_by, 'aief compose');
});

test('every materialized rule carries provenance and an explicit binding field', () => {
  const cfg = toEffectiveConfig(build(['AIEF-CORE-001']));
  for (const r of cfg.rules) {
    assert.ok(r.origin.layer);
    assert.ok(Object.hasOwn(r, 'binding'));
    assert.ok(Object.hasOwn(r, 'waiver'));
  }
});

test('the report states the resolution strategy and the counts', () => {
  const out = renderReport(build(['AIEF-CORE-001']));
  assert.match(out, /via workspace/);
  assert.match(out, /1 rules/);
});

test('failures are rendered with their code', () => {
  const r = compose({
    foundation: foundation([rule('AIEF-CORE-001')]),
    project: project({}, 'full'),
    now: NOW,
  });
  assert.match(renderReport(r), /FAIL \[CONFORMANCE_UNMET\]/);
});
