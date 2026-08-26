/**
 * Schemas and validators for every AIEF governance artifact.
 *
 * Validation returns collected errors rather than throwing on the first one:
 * a governance file with four mistakes should report four mistakes, not make
 * the author discover them one run at a time.
 */

export const MODES = ['enforced', 'advisory', 'off'];
export const CONFORMANCE_LEVELS = ['core', 'full'];
export const CAPABILITIES = [
  'format',
  'lint',
  'typecheck',
  'test',
  'architecture_check',
  'contract_check',
  'secret_scan',
  'dependency_audit',
];

/**
 * Enforcement categories that a stack tool verifies, and the capability that
 * does it.
 *
 * This map lives in the model, not in the resolver, because two callers need
 * it: the resolver binds enforced rules to capabilities, and rule validation
 * refuses a Foundation rule that claims enforcement the Foundation has no way
 * of knowing exists (§8.5).
 */
export const TOOL_BOUND = {
  formatting: 'format',
  lint: 'lint',
  types: 'typecheck',
  tests: 'test',
  boundary: 'architecture_check',
  contracts: 'contract_check',
  secrets: 'secret_scan',
  dependency: 'dependency_audit',
};

const MODE_RANK = { off: 0, advisory: 1, enforced: 2 };

/** Ordering used to decide whether an override weakens a rule (§11.2). */
export function modeRank(mode) {
  return MODE_RANK[mode] ?? -1;
}

const ID_PATTERN = /^[A-Z][A-Z0-9]*(-[A-Z0-9]+)*-\d{3,}$/;

function req(obj, key, path, errors, type = 'string') {
  const v = obj?.[key];
  if (v === undefined || v === null || v === '') {
    errors.push(`${path}: missing required field "${key}"`);
    return undefined;
  }
  if (type === 'string' && typeof v !== 'string') {
    errors.push(`${path}: "${key}" must be a string, got ${typeof v}`);
    return undefined;
  }
  if (type === 'array' && !Array.isArray(v)) {
    errors.push(`${path}: "${key}" must be a list`);
    return undefined;
  }
  if (type === 'object' && (typeof v !== 'object' || Array.isArray(v))) {
    errors.push(`${path}: "${key}" must be a mapping`);
    return undefined;
  }
  return v;
}

function oneOf(value, allowed, key, path, errors) {
  if (value !== undefined && !allowed.includes(value)) {
    errors.push(`${path}: "${key}" must be one of ${allowed.join(', ')} — got "${value}"`);
  }
}

/** A rule intent from the Foundation sidecar (ADR-0002). */
export function validateRule(rule, path, errors) {
  const id = req(rule, 'id', path, errors);
  if (id && !ID_PATTERN.test(id)) {
    errors.push(`${path}: rule id "${id}" does not match NAMESPACE-NNN`);
  }
  req(rule, 'intent', path, errors);
  const mode = req(rule, 'default_mode', path, errors);
  oneOf(mode, MODES, 'default_mode', path, errors);
  const category = req(rule, 'enforcement_category', path, errors);
  // §8.5 / AIEF-CORE-017. A tool-bound intent has no binding until a Stack
  // Profile supplies one, and the Foundation cannot know which stack will be
  // selected. Defaulting such a rule to enforced makes every project without
  // that capability start with an orphan rule it did not author.
  if (mode === 'enforced' && TOOL_BOUND[category]) {
    errors.push(
      `${path}: "${id ?? 'rule'}" declares default_mode: enforced with the tool-bound category ` +
        `"${category}". The Foundation cannot know whether "${TOOL_BOUND[category]}" is bound. ` +
        `Declare advisory and let a Stack Profile that binds it raise the mode (§8.5).`,
    );
  }
  const conf = req(rule, 'conformance', path, errors);
  oneOf(conf, CONFORMANCE_LEVELS, 'conformance', path, errors);
  req(rule, 'section', path, errors);
  return rule;
}

export function validateRuleFile(doc, path) {
  const errors = [];
  req(doc, 'namespace', path, errors);
  req(doc, 'foundation_version', path, errors);
  const rules = req(doc, 'rules', path, errors, 'array') ?? [];
  const seen = new Set();
  rules.forEach((r, i) => {
    validateRule(r, `${path}[${i}]`, errors);
    if (r?.id) {
      if (seen.has(r.id))
        errors.push(`${path}: duplicate rule id "${r.id}" within the same artifact`);
      seen.add(r.id);
    }
  });
  return { ok: errors.length === 0, errors, rules };
}

export function validateStackProfile(doc, path) {
  const errors = [];
  const name = req(doc, 'name', path, errors);
  req(doc, 'version', path, errors);
  const caps = req(doc, 'capabilities', path, errors, 'object') ?? {};

  for (const [cap, spec] of Object.entries(caps)) {
    const cp = `${path}.capabilities.${cap}`;
    if (!CAPABILITIES.includes(cap)) {
      errors.push(`${cp}: unknown capability`);
      continue;
    }
    if (typeof spec?.supported !== 'boolean') {
      errors.push(`${cp}: "supported" must be true or false`);
      continue;
    }
    // AIEF-CORE-013: a declared capability must be backed by a binding.
    if (spec.supported && !spec.binding?.command) {
      errors.push(
        `${cp}: declared supported:true with no binding.command — ` +
          `declare supported:false instead of leaving the gap silent (AIEF-CORE-013)`,
      );
    }
    if (!spec.supported && spec.binding?.command) {
      errors.push(`${cp}: declared supported:false but provides a binding.command`);
    }
  }

  const signals = doc?.signals ?? {};
  if (typeof signals !== 'object' || Array.isArray(signals)) {
    errors.push(`${path}.signals: must be a mapping`);
  } else {
    for (const [sig, val] of Object.entries(signals)) {
      if (typeof val !== 'number') errors.push(`${path}.signals.${sig}: must be a number`);
    }
  }

  const rules = doc?.rules ?? [];
  if (!Array.isArray(rules)) errors.push(`${path}.rules: must be a list`);
  else rules.forEach((r, i) => validateStackRule(r, `${path}.rules[${i}]`, errors));

  return { ok: errors.length === 0, errors, name };
}

/** A Stack Profile may restate a Foundation rule to bind or re-scope it. */
function validateStackRule(rule, path, errors) {
  const id = req(rule, 'id', path, errors);
  if (id && !ID_PATTERN.test(id))
    errors.push(`${path}: rule id "${id}" does not match NAMESPACE-NNN`);
  oneOf(rule?.mode, MODES, 'mode', path, errors);
}

export function validateProjectProfile(doc, path) {
  const errors = [];
  const project = req(doc, 'project', path, errors, 'object') ?? {};
  req(project, 'id', `${path}.project`, errors);

  const foundation = req(doc, 'foundation', path, errors, 'object') ?? {};
  req(foundation, 'version', `${path}.foundation`, errors);
  const conformance = req(foundation, 'conformance', `${path}.foundation`, errors);
  oneOf(conformance, CONFORMANCE_LEVELS, 'conformance', `${path}.foundation`, errors);

  const stacks = doc?.stacks ?? [];
  if (!Array.isArray(stacks)) errors.push(`${path}.stacks: must be a list`);

  const rules = doc?.rules ?? [];
  if (!Array.isArray(rules)) errors.push(`${path}.rules: must be a list`);
  else rules.forEach((r, i) => validateStackRule(r, `${path}.rules[${i}]`, errors));

  if (doc?.quality?.signals) {
    for (const [sig, val] of Object.entries(doc.quality.signals)) {
      if (typeof val !== 'number') errors.push(`${path}.quality.signals.${sig}: must be a number`);
    }
  }

  return { ok: errors.length === 0, errors, conformance };
}

export function validateWaiver(w, path, errors) {
  req(w, 'rule_id', path, errors);
  req(w, 'scope', path, errors);
  req(w, 'reason', path, errors);
  req(w, 'owner', path, errors);
  req(w, 'created_at', path, errors);
  if (w?.expires_at !== undefined && w.expires_at !== null) {
    if (Number.isNaN(Date.parse(w.expires_at))) {
      errors.push(`${path}: "expires_at" is not a parsable date — got "${w.expires_at}"`);
    }
  }
  return w;
}

export function validateWaiverFile(doc, path) {
  const errors = [];
  const waivers = doc?.waivers ?? [];
  if (!Array.isArray(waivers)) {
    errors.push(`${path}.waivers: must be a list`);
    return { ok: false, errors, waivers: [] };
  }
  waivers.forEach((w, i) => validateWaiver(w, `${path}.waivers[${i}]`, errors));
  return { ok: errors.length === 0, errors, waivers };
}
