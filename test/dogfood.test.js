/**
 * AC14 — AIEF composes its own repository.
 *
 * This is the acceptance test for the whole work item. A governance engine
 * that does not govern its own repository is an untested claim (§44).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  loadFoundation,
  loadProjectProfile,
  loadStackProfile,
  loadWaivers,
} from '../src/load/index.js';
import { compose } from '../src/resolve/index.js';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');

function composeSelf(now = new Date()) {
  const project = loadProjectProfile(REPO);
  assert.deepEqual(project.errors, [], 'project profile must be valid');

  const foundation = loadFoundation({ cwd: REPO, version: project.doc.foundation.version });
  assert.deepEqual(foundation.errors, [], 'foundation sidecar must be valid');

  const stacks = (project.doc.stacks ?? []).map((name) => {
    const s = loadStackProfile(name, { cwd: REPO, foundationDir: foundation.dir });
    assert.deepEqual(s.errors, [], `stack ${name} must be valid`);
    return s;
  });

  const { waivers, errors } = loadWaivers(REPO, project.doc.governance.waivers);
  assert.deepEqual(errors, [], 'waivers must be valid');

  return compose({ foundation, project, stacks, waivers, now });
}

test('AC14 — the AIEF repository composes without governance failures', () => {
  const result = composeSelf(new Date('2026-09-01T00:00:00Z'));
  assert.deepEqual(
    result.failures.map((f) => `${f.code}: ${f.message}`),
    [],
  );
  assert.ok(result.ok);
});

test('ADR-0003 — the Foundation resolves from the workspace, with no network', () => {
  const result = composeSelf(new Date('2026-09-01T00:00:00Z'));
  assert.equal(result.meta.foundation_strategy, 'workspace');
  assert.equal(result.meta.foundation_version, '0.3.1');
});

test('the repository declares core conformance and every enforced rule is bound', () => {
  const result = composeSelf(new Date('2026-09-01T00:00:00Z'));
  assert.equal(result.meta.conformance, 'core');

  for (const rule of result.rules.filter((r) => r.mode === 'enforced')) {
    assert.ok(
      rule.binding || rule.waiver,
      `${rule.id} is enforced with neither a binding nor a waiver`,
    );
  }
});

test('§8.5 — the secret-scanning gap is advisory because nothing binds it', () => {
  const result = composeSelf(new Date('2026-09-01T00:00:00Z'));
  const sec = result.rules.find((r) => r.id === 'AIEF-SEC-001');
  assert.equal(sec.mode, 'advisory', 'no scanner is bound, so the rule must not claim enforcement');
  assert.equal(sec.binding, undefined);
  assert.equal(
    sec.waiver,
    undefined,
    'an advisory rule needs no waiver — waiving it would be decorative',
  );
});

test('§8.5 — the node profile raises exactly the rules it binds', () => {
  const result = composeSelf(new Date('2026-09-01T00:00:00Z'));
  const raised = result.rules
    .filter((r) => r.overrides.some((o) => o.layer === 'stack' && o.to === 'enforced'))
    .map((r) => r.id);

  assert.deepEqual(raised, ['AIEF-QUAL-013', 'AIEF-QUAL-014', 'AIEF-SEC-006', 'AIEF-TEST-002']);
  for (const id of raised) {
    assert.equal(result.rules.find((r) => r.id === id).binding.kind, 'stack');
  }
});
