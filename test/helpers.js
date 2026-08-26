/** Fixture builders. The resolver is pure, so tests need no filesystem. */

export function rule(id, over = {}) {
  return {
    id,
    intent: `intent for ${id}`,
    default_mode: 'advisory',
    mode: over.mode ?? over.default_mode ?? 'advisory',
    enforcement_category: 'review',
    conformance: 'core',
    section: '§0',
    origin: { layer: 'foundation', artifact: 'foundation/rules/test.yaml' },
    ...over,
  };
}

export function foundation(rules, over = {}) {
  return { dir: '/fake', strategy: 'workspace', version: '0.3.1', rules, errors: [], ...over };
}

export function project(doc = {}, conformance = 'core') {
  return {
    file: '.ai/project.yaml',
    doc: { project: { id: 'test' }, foundation: { version: '0.3.1', conformance }, ...doc },
    conformance,
    errors: [],
  };
}

export function stack(name, capabilities = {}, rules = []) {
  return {
    name,
    file: `stacks/${name}/profile.yaml`,
    doc: { name, version: '0.1.0', capabilities },
    rules: rules.map((r) => ({
      ...r,
      origin: { layer: 'stack', artifact: `stacks/${name}/profile.yaml` },
    })),
    errors: [],
  };
}

export function capability(command) {
  return { supported: true, binding: { command } };
}

export function waiver(ruleId, over = {}) {
  return {
    rule_id: ruleId,
    scope: 'repository',
    reason: 'test',
    owner: 'test',
    created_at: '2026-01-01',
    artifact: '.ai/waivers/test.yaml',
    ...over,
  };
}

export function codes(result) {
  return result.failures.map((f) => f.code).sort();
}
