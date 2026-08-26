import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateRuleFile,
  validateStackProfile,
  validateProjectProfile,
  validateWaiverFile,
} from '../src/model/schema.js';

const goodRule = {
  id: 'AIEF-CORE-001',
  intent: 'something must remain true',
  default_mode: 'enforced',
  enforcement_category: 'governance',
  conformance: 'core',
  section: '§5',
};

test('a well-formed rule file validates', () => {
  const r = validateRuleFile(
    { namespace: 'AIEF-CORE', foundation_version: '0.3.1', rules: [goodRule] },
    'core.yaml',
  );
  assert.ok(r.ok, r.errors.join('; '));
});

test('every invalid field is reported, not just the first', () => {
  const r = validateRuleFile(
    {
      namespace: 'AIEF-CORE',
      foundation_version: '0.3.1',
      rules: [{ id: 'bad id', default_mode: 'sometimes' }],
    },
    'core.yaml',
  );
  assert.ok(!r.ok);
  assert.ok(r.errors.length >= 4, `expected several errors, got ${r.errors.length}`);
  assert.ok(r.errors.some((e) => /does not match NAMESPACE-NNN/.test(e)));
  assert.ok(r.errors.some((e) => /default_mode/.test(e)));
});

test('a duplicate rule id inside one artifact is rejected', () => {
  const r = validateRuleFile(
    { namespace: 'AIEF-CORE', foundation_version: '0.3.1', rules: [goodRule, { ...goodRule }] },
    'core.yaml',
  );
  assert.ok(r.errors.some((e) => /duplicate rule id/.test(e)));
});

test('AC10 / AIEF-CORE-013 — a capability declared supported with no binding is rejected', () => {
  const r = validateStackProfile(
    { name: 'x', version: '1', capabilities: { lint: { supported: true } } },
    'stacks/x/profile.yaml',
  );
  assert.ok(!r.ok);
  assert.ok(r.errors.some((e) => /AIEF-CORE-013/.test(e)));
});

test('a capability declared unsupported while providing a command is rejected', () => {
  const r = validateStackProfile(
    {
      name: 'x',
      version: '1',
      capabilities: { lint: { supported: false, binding: { command: 'x' } } },
    },
    'stacks/x/profile.yaml',
  );
  assert.ok(!r.ok);
});

test('declaring a capability unsupported is valid — a declared gap is information', () => {
  const r = validateStackProfile(
    { name: 'x', version: '1', capabilities: { typecheck: { supported: false } } },
    'stacks/x/profile.yaml',
  );
  assert.ok(r.ok, r.errors.join('; '));
});

test('an unknown capability name is rejected', () => {
  const r = validateStackProfile(
    { name: 'x', version: '1', capabilities: { vibes: { supported: false } } },
    'stacks/x/profile.yaml',
  );
  assert.ok(r.errors.some((e) => /unknown capability/.test(e)));
});

test('a non-numeric signal threshold is rejected', () => {
  const r = validateStackProfile(
    { name: 'x', version: '1', capabilities: {}, signals: { large_file_loc: 'big' } },
    'stacks/x/profile.yaml',
  );
  assert.ok(r.errors.some((e) => /must be a number/.test(e)));
});

test('a project profile requires an id, a foundation version and a valid conformance level', () => {
  const bad = validateProjectProfile(
    { project: {}, foundation: { conformance: 'total' } },
    '.ai/project.yaml',
  );
  assert.ok(!bad.ok);
  assert.ok(bad.errors.some((e) => /project\.id|"id"/.test(e)));
  assert.ok(bad.errors.some((e) => /conformance/.test(e)));

  const good = validateProjectProfile(
    { project: { id: 'p' }, foundation: { version: '0.3.1', conformance: 'core' } },
    '.ai/project.yaml',
  );
  assert.ok(good.ok, good.errors.join('; '));
  assert.equal(good.conformance, 'core');
});

test('a waiver without a reason or owner is rejected', () => {
  const r = validateWaiverFile(
    { waivers: [{ rule_id: 'AIEF-CORE-001', scope: 'repo', created_at: '2026-01-01' }] },
    'w.yaml',
  );
  assert.ok(!r.ok);
  assert.ok(r.errors.some((e) => /reason/.test(e)));
  assert.ok(r.errors.some((e) => /owner/.test(e)));
});

test('an unparsable expiry date is rejected', () => {
  const r = validateWaiverFile(
    {
      waivers: [
        {
          rule_id: 'AIEF-CORE-001',
          scope: 'repo',
          reason: 'r',
          owner: 'o',
          created_at: '2026-01-01',
          expires_at: 'someday',
        },
      ],
    },
    'w.yaml',
  );
  assert.ok(r.errors.some((e) => /not a parsable date/.test(e)));
});

test('§8.5 — a Foundation rule with a tool-bound category may not default to enforced', () => {
  const r = validateRuleFile(
    {
      namespace: 'AIEF-SEC',
      foundation_version: '0.3.1',
      rules: [
        {
          id: 'AIEF-SEC-001',
          intent: 'Secrets are never committed.',
          default_mode: 'enforced',
          enforcement_category: 'secrets',
          conformance: 'core',
          section: '§36',
        },
      ],
    },
    'security.yaml',
  );
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => /tool-bound category/.test(e) && /secret_scan/.test(e)));
});

test('§8.5 — the same rule is valid as advisory, and governance categories are unaffected', () => {
  const r = validateRuleFile(
    {
      namespace: 'AIEF-MIX',
      foundation_version: '0.3.1',
      rules: [
        {
          id: 'AIEF-MIX-001',
          intent: 'Secrets are never committed.',
          default_mode: 'advisory',
          enforcement_category: 'secrets',
          conformance: 'core',
          section: '§36',
        },
        {
          id: 'AIEF-MIX-002',
          intent: 'An expired waiver fails composition.',
          default_mode: 'enforced',
          enforcement_category: 'governance',
          conformance: 'core',
          section: '§31',
        },
      ],
    },
    'mixed.yaml',
  );
  assert.deepEqual(r.errors, []);
});
