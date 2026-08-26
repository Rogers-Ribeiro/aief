/**
 * Composition: Foundation + Stack Profile(s) + Project Profile + Waivers
 * resolved into the applicable configuration, with provenance (AIEF-000 §9).
 *
 * This module resolves. It does not audit. Health checking, contamination
 * tests and baseline comparison are separate work items, and merging them
 * here would make both harder to test (AIEF-001 spec §4).
 */
import { modeRank, TOOL_BOUND } from '../model/schema.js';

/**
 * Rules this engine version actually enforces during composition.
 *
 * An explicit registry rather than a category allowlist, on purpose: claiming
 * that a whole category is engine-enforced would assert protection the code
 * does not provide, which is the defect §12.1 exists to catch. Adding a rule
 * here is a claim that must be backed by a code path and a test.
 */
const ENGINE_ENFORCED = new Map([
  ['AIEF-CORE-005', 'rule id format and cross-artifact duplicate detection'],
  ['AIEF-CORE-006', 'unwaived contradiction fails composition'],
  ['AIEF-CORE-007', 'enforced rule without a binding fails composition'],
  ['AIEF-CORE-009', 'waiver schema requires rule_id, scope, reason and owner'],
  ['AIEF-CORE-010', 'expired waiver fails composition'],
  ['AIEF-CORE-013', 'capability declared supported without a binding fails validation'],
  ['AIEF-CORE-015', 'declared conformance level is checked against engine capability'],
  ['AIEF-CORE-019', 'a Foundation rule with a tool-bound category may not default to enforced'],
]);

/** Categories that only a reader can judge. Enforcing these is a modelling error. */
const JUDGEMENT_ONLY = new Set(['review', 'documentation']);

/** Full-conformance requirements this engine version cannot yet satisfy. */
const UNIMPLEMENTED_FULL = {
  F5: 'configuration health check — AIEF-002',
  F6: 'layer-boundary tests — AIEF-002',
  F7: 'mechanical baseline monotonicity — AIEF-003',
};

const LAYER_ORDER = { foundation: 0, stack: 1, project: 2 };

function failure(code, message, extra = {}) {
  return { code, message, ...extra };
}

/**
 * @param {object} input
 * @param {object} input.foundation  from loadFoundation()
 * @param {object} input.project     from loadProjectProfile()
 * @param {Array}  input.stacks      from loadStackProfile()
 * @param {Array}  input.waivers     from loadWaivers()
 * @param {Date}   [input.now]       injected so expiry is testable
 */
export function compose({ foundation, project, stacks = [], waivers = [], now = new Date() }) {
  const failures = [];
  const warnings = [];

  // Step 5 — index Foundation rules by identity.
  const index = new Map();
  for (const rule of foundation.rules) {
    index.set(rule.id, { ...rule, overrides: [] });
  }

  // Step 6 — precedence (§11.3). Stack then Project may specialize a rule.
  const overlays = [
    ...stacks.flatMap((s) => s.rules ?? []),
    ...(project.doc?.rules ?? []).map((r) => ({
      ...r,
      origin: { layer: 'project', artifact: '.ai/project.yaml' },
    })),
  ].sort((a, b) => LAYER_ORDER[a.origin.layer] - LAYER_ORDER[b.origin.layer]);

  for (const overlay of overlays) {
    const base = index.get(overlay.id);
    if (!base) {
      failures.push(
        failure(
          'UNKNOWN_RULE_OVERRIDE',
          `${overlay.origin.artifact}: overrides rule "${overlay.id}", which no Foundation ` +
            `artifact defines. A layer may specialize a rule, not invent one at a higher layer.`,
          { ruleId: overlay.id, artifact: overlay.origin.artifact },
        ),
      );
      continue;
    }

    const previousMode = base.mode;
    const nextMode = overlay.mode ?? previousMode;

    base.overrides.push({
      layer: overlay.origin.layer,
      artifact: overlay.origin.artifact,
      from: previousMode,
      to: nextMode,
    });
    base.mode = nextMode;
    if (overlay.scope) base.scope = overlay.scope;
    if (overlay.parameters) base.parameters = { ...(base.parameters ?? {}), ...overlay.parameters };
    base.weakened = base.weakened || modeRank(nextMode) < modeRank(previousMode);
  }

  // Step 9 (early) — waivers must be resolved before contradictions are judged,
  // because a waiver is what makes a weakening legitimate.
  const waiverByRule = new Map();
  for (const w of waivers) {
    if (!index.has(w.rule_id)) {
      failures.push(
        failure(
          'WAIVER_UNKNOWN_RULE',
          `${w.artifact}: waiver references rule "${w.rule_id}", which does not exist.`,
          { ruleId: w.rule_id, artifact: w.artifact },
        ),
      );
      continue;
    }
    if (w.expires_at && Date.parse(w.expires_at) < now.getTime()) {
      failures.push(
        failure(
          'WAIVER_EXPIRED',
          `${w.artifact}: waiver for "${w.rule_id}" expired on ${w.expires_at}. ` +
            `An expired waiver is a governance failure, not a grace period (§31.5).`,
          { ruleId: w.rule_id, artifact: w.artifact },
        ),
      );
      continue;
    }
    waiverByRule.set(w.rule_id, w);
  }

  // Step 8 — contradiction: a lower layer weakening a rule with no waiver (§11.2).
  for (const rule of index.values()) {
    if (rule.weakened && !waiverByRule.has(rule.id)) {
      const last = rule.overrides[rule.overrides.length - 1];
      failures.push(
        failure(
          'UNWAIVED_CONTRADICTION',
          `${last.artifact}: weakens "${rule.id}" from ${last.from} to ${last.to} with no active ` +
            `waiver. Deviation is allowed, but it must be visible (§11.2, §31).`,
          { ruleId: rule.id, artifact: last.artifact },
        ),
      );
    }
  }

  // Step 7 — bind enforced intents to stack capabilities (§12.1).
  const capabilityOwners = new Map();
  for (const stack of stacks) {
    for (const [cap, spec] of Object.entries(stack.doc?.capabilities ?? {})) {
      if (spec?.supported) capabilityOwners.set(cap, { stack: stack.name, binding: spec.binding });
    }
  }

  const referencedCapabilities = new Set();

  for (const rule of index.values()) {
    if (rule.mode !== 'enforced') continue;
    const category = rule.enforcement_category;

    if (JUDGEMENT_ONLY.has(category)) {
      failures.push(
        failure(
          'UNENFORCEABLE_CATEGORY',
          `"${rule.id}" is enforced but its category "${category}" can only be judged by a reader. ` +
            `Agent review is advisory unless backed by deterministic enforcement (§23).`,
          { ruleId: rule.id, artifact: rule.origin.artifact },
        ),
      );
      continue;
    }

    if (ENGINE_ENFORCED.has(rule.id)) {
      rule.binding = { kind: 'engine', by: 'aief compose', how: ENGINE_ENFORCED.get(rule.id) };
      continue;
    }

    const capability = TOOL_BOUND[category];
    if (!capability) {
      const waived = waiverByRule.get(rule.id);
      if (waived) {
        rule.binding = null;
        continue;
      }
      failures.push(
        failure(
          'ORPHAN_RULE',
          `"${rule.id}" is enforced but nothing enforces it: category "${category}" maps to no ` +
            `stack capability, and the engine does not enforce this rule. Declare it advisory, ` +
            `implement the check, or waive it (§12.1).`,
          { ruleId: rule.id, artifact: rule.origin.artifact },
        ),
      );
      continue;
    }

    const owner = capabilityOwners.get(capability);
    if (!owner) {
      const waived = waiverByRule.get(rule.id);
      if (waived) {
        rule.binding = null;
        rule.mode = 'advisory';
        continue;
      }
      failures.push(
        failure(
          'ORPHAN_RULE',
          `"${rule.id}" is enforced but no selected Stack Profile supports "${capability}". ` +
            `Either bind it, declare the rule advisory, or waive it — an enforced rule with no ` +
            `binding claims protection it does not provide (§12.1).`,
          { ruleId: rule.id, capability },
        ),
      );
      continue;
    }

    rule.binding = { kind: 'stack', stack: owner.stack, capability, ...owner.binding };
    referencedCapabilities.add(capability);
  }

  // §12.2 — orphan enforcement is advisory, so it warns rather than fails.
  for (const [cap, owner] of capabilityOwners) {
    if (!referencedCapabilities.has(cap)) {
      warnings.push(
        `orphan enforcement: stack "${owner.stack}" supports "${cap}" but no enforced rule ` +
          `references it. Either a rule is missing, or the capability should be dropped (§12.2).`,
      );
    }
  }

  // §4.3 — a declared conformance level the engine cannot deliver is a defect.
  if (project.conformance === 'full') {
    const missing = Object.entries(UNIMPLEMENTED_FULL)
      .map(([id, what]) => `  ${id}: ${what}`)
      .join('\n');
    failures.push(
      failure(
        'CONFORMANCE_UNMET',
        `.ai/project.yaml declares conformance "full", which this engine cannot yet deliver:\n` +
          `${missing}\nDeclare "core" until those land (§4.3, AIEF-CORE-015).`,
      ),
    );
  }

  // Apply waivers to the resolved rules for reporting.
  for (const [ruleId, w] of waiverByRule) {
    const rule = index.get(ruleId);
    rule.waiver = {
      scope: w.scope,
      reason: w.reason,
      owner: w.owner,
      expires_at: w.expires_at ?? null,
      artifact: w.artifact,
    };
  }

  const rules = [...index.values()].sort((a, b) => a.id.localeCompare(b.id));

  return {
    ok: failures.length === 0,
    failures,
    warnings,
    rules,
    meta: {
      foundation_version: foundation.version ?? null,
      foundation_strategy: foundation.strategy,
      conformance: project.conformance,
      stacks: stacks.map((s) => s.name).sort(),
      counts: {
        rules: rules.length,
        enforced: rules.filter((r) => r.mode === 'enforced').length,
        advisory: rules.filter((r) => r.mode === 'advisory').length,
        off: rules.filter((r) => r.mode === 'off').length,
        waived: waiverByRule.size,
      },
    },
  };
}
