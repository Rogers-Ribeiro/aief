/**
 * Configuration health and layer-boundary audit (AIEF-000 §48, §55).
 *
 * This module reads. It never writes and never repairs: a checker that fixes
 * what it finds cannot be trusted to report honestly (AIEF-002 spec §4).
 *
 * Every detection §48 and §55 require appears in the result, including the ones
 * this version cannot perform. A health check that silently skips what it
 * cannot do is the orphan-enforcement defect (§12.2) applied to itself.
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';

import { join, relative } from 'node:path';
import { CAPABILITIES } from '../model/schema.js';
import { renderProjection, checkProjection, PROJECTION_TARGET } from '../projection/index.js';
import { readBaseline } from '../ratchet/index.js';

/** §13. A starting point, not a universal truth — override per project. */
export const DEFAULT_ALWAYS_LOADED_BYTES = 20000;

/** Files a provider loads on every turn, regardless of the task (§13, §14). */
const ALWAYS_LOADED = ['AGENTS.md', 'CLAUDE.md', join('.claude', 'CLAUDE.md')];

const DAY = 24 * 60 * 60 * 1000;
/** How far ahead a waiver expiry is worth surfacing before it fails a build. */
export const EXPIRY_WARNING_DAYS = 30;

const check = (id, title, section, status, detail, findings = []) => ({
  id,
  title,
  section,
  status,
  detail,
  findings,
});

const pending = (id, title, section, reason) =>
  check(id, title, section, 'not_implemented', reason);

/** Collapses wording differences so two rules saying the same thing collide. */
function normalizeIntent(text) {
  return String(text ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Files that belong to the Foundation itself.
 *
 * A cached Foundation is distributed as a self-contained bundle, so `stacks/`
 * can sit inside the same directory. Those are Stack Profiles, not Foundation
 * artifacts: scanning them for stack vocabulary would report every binding
 * command in them as contamination of the layer they legitimately belong to.
 */
function listFoundationFiles(dir, out = [], top = true) {
  for (const entry of readdirSync(dir)) {
    if (top && entry === 'stacks') continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) listFoundationFiles(full, out, false);
    else out.push(full);
  }
  return out;
}

/** Whole-word, case-insensitive. Escaped so a command with dots stays literal. */
function mentions(haystack, term) {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const boundary = /^[a-z0-9]/i.test(term) ? '\\b' : '';
  return new RegExp(`${boundary}${escaped}`, 'i').test(haystack);
}

function scanForTerms(files, terms, cwd) {
  const findings = [];
  for (const file of files) {
    // A profile that cannot be read is a load-time error, not a contamination
    // finding. Reporting it here would attribute the wrong defect.
    if (!existsSync(file)) continue;
    const text = readFileSync(file, 'utf8');
    for (const { term, kind } of terms) {
      if (!mentions(text, term)) continue;
      const line = text.split('\n').findIndex((l) => mentions(l, term)) + 1;
      findings.push(`${relative(cwd, file)}:${line} contains ${kind} "${term}"`);
    }
  }
  return findings;
}

function failuresOfCode(composition, code) {
  return composition.failures.filter((f) => f.code === code).map((f) => f.message);
}

/**
 * @param {object} input
 * @param {string} input.cwd
 * @param {object} input.foundation   from loadFoundation()
 * @param {object} input.project      from loadProjectProfile()
 * @param {Array}  input.stacks       from loadStackProfile()
 * @param {Array}  input.waivers      from loadWaivers()
 * @param {object} input.composition  from compose()
 * @param {Date}   [input.now]        injected so expiry windows are testable
 */
export function audit({ cwd, foundation, project, stacks = [], waivers = [], composition, now }) {
  const at = now ?? new Date();
  const checks = [];

  // ---- §48 configuration health -----------------------------------------

  // H1 — duplicate instructions.
  const byIntent = new Map();
  for (const rule of foundation.rules) {
    const key = normalizeIntent(rule.intent);
    if (!key) continue;
    if (!byIntent.has(key)) byIntent.set(key, []);
    byIntent.get(key).push(rule.id);
  }
  const duplicates = [...byIntent.values()].filter((ids) => ids.length > 1);
  checks.push(
    check(
      'H1',
      'duplicate instructions',
      '§48',
      duplicates.length ? 'fail' : 'pass',
      duplicates.length
        ? 'two rules state the same intent under different identities'
        : `${byIntent.size} distinct intents`,
      duplicates.map((ids) => `${ids.join(' and ')} share one intent`),
    ),
  );

  // H2 — contradictory rules without an active waiver.
  const contradictions = failuresOfCode(composition, 'UNWAIVED_CONTRADICTION');
  checks.push(
    check(
      'H2',
      'contradictory rules without a waiver',
      '§11.2',
      contradictions.length ? 'fail' : 'pass',
      contradictions.length ? 'a lower layer weakens a rule with no waiver' : 'no contradiction',
      contradictions,
    ),
  );

  // H3 — oversized always-loaded context. A signal, so it warns (AIEF-QUAL-012).
  const budget =
    project.doc?.quality?.signals?.always_loaded_context_bytes ?? DEFAULT_ALWAYS_LOADED_BYTES;
  const loaded = ALWAYS_LOADED.map((rel) => ({ rel, full: join(cwd, rel) }))
    .filter(({ full }) => existsSync(full))
    .map(({ rel, full }) => ({ rel, bytes: statSync(full).size }));
  const totalBytes = loaded.reduce((sum, f) => sum + f.bytes, 0);
  checks.push(
    check(
      'H3',
      'oversized always-loaded context',
      '§13',
      totalBytes > budget ? 'warn' : 'pass',
      `${totalBytes} of ${budget} bytes across ${loaded.length} always-loaded file(s)`,
      loaded.map((f) => `${f.rel} — ${f.bytes} bytes`),
    ),
  );

  // H4 — stale rules.
  checks.push(
    pending(
      'H4',
      'stale rules',
      '§30.4',
      'requires the rule-measurement data described in §30.4, which nothing collects yet. ' +
        'Detecting staleness from the artifacts alone would report age, not staleness.',
    ),
  );

  // H5 — expired waivers, and the ones about to expire.
  const expired = failuresOfCode(composition, 'WAIVER_EXPIRED');
  const soon = waivers
    .filter((w) => w.expires_at)
    .map((w) => ({ w, days: Math.ceil((Date.parse(w.expires_at) - at.getTime()) / DAY) }))
    .filter(({ days }) => days >= 0 && days <= EXPIRY_WARNING_DAYS);
  checks.push(
    check(
      'H5',
      'expired waivers',
      '§31.5',
      expired.length ? 'fail' : soon.length ? 'warn' : 'pass',
      expired.length
        ? 'an expired waiver is a governance failure, not a grace period'
        : soon.length
          ? `${soon.length} waiver(s) expire within ${EXPIRY_WARNING_DAYS} days`
          : `${waivers.length} active waiver(s)`,
      [...expired, ...soon.map(({ w, days }) => `${w.rule_id} expires in ${days} day(s)`)],
    ),
  );

  // H6 — orphan rules.
  const orphanRules = failuresOfCode(composition, 'ORPHAN_RULE');
  checks.push(
    check(
      'H6',
      'orphan rules',
      '§12.1',
      orphanRules.length ? 'fail' : 'pass',
      orphanRules.length
        ? 'a rule claims enforcement nothing provides'
        : `${composition.meta.counts.enforced} enforced rule(s), all bound`,
      orphanRules,
    ),
  );

  // H7 — orphan enforcement. Advisory by §12.2, so it warns.
  checks.push(
    check(
      'H7',
      'orphan enforcement',
      '§12.2',
      composition.warnings.length ? 'warn' : 'pass',
      composition.warnings.length
        ? 'a binding exists that no enforced rule references'
        : 'every supported capability is referenced',
      composition.warnings,
    ),
  );

  // H8 — unused roles and skills.
  checks.push(
    pending(
      'H8',
      'unused roles and skills',
      '§48',
      'the Claude Code plugin ships four skills and templates/roles/ holds three role ' +
        'descriptions, but nothing links a role or a skill to a rule or a workflow step. ' +
        'Detection needs that link, not the file: without it, "unused" can only mean "not ' +
        'referenced anywhere", which is true of every artifact meant to be invoked by a human.',
    ),
  );

  // H9 / L4 — provider projection drift. One computation, reported under both
  // §48 and §55.4, because it is one property: the committed projection must be
  // reproducible from the composed source.
  //
  // Only a projection that exists can drift. A repository with no managed
  // region has made no claim to keep true, so the audit reports that and moves
  // on; `aief render --check` is where an absent projection is an error,
  // because there the reader asked for one explicitly.
  const block = renderProjection(composition);
  const projection = checkProjection(cwd, block);
  const driftDetail = {
    ok: `${PROJECTION_TARGET} matches the composition`,
    drift: `the managed region in ${PROJECTION_TARGET} no longer matches — run: aief render --write`,
    absent: `${PROJECTION_TARGET} carries no managed region — nothing projected, nothing to drift`,
    'missing-file': `no ${PROJECTION_TARGET} — nothing projected, nothing to drift`,
  }[projection.status];
  const driftStatus = projection.status === 'drift' ? 'fail' : 'pass';
  checks.push(check('H9', 'provider projection drift', '§55.4', driftStatus, driftDetail));

  // H10 — Stack Profile binding drift.
  checks.push(
    pending(
      'H10',
      'Stack Profile binding drift',
      '§48',
      'confirming a binding command still runs means executing it, which a read-only audit ' +
        'must not do, or parsing an ecosystem runner manifest, which puts stack knowledge in ' +
        'the engine. A Stack Profile self-check is the right home — AIEF-002 spec §5.3.',
    ),
  );

  // H11 — Project Profile references to unsupported capabilities.
  const supported = new Set();
  for (const stack of stacks) {
    for (const [cap, spec] of Object.entries(stack.doc?.capabilities ?? {})) {
      if (spec?.supported) supported.add(cap);
    }
  }
  const requested = Object.keys(project.doc?.quality?.capabilities ?? {});
  const unsupported = requested.filter((cap) => !supported.has(cap));
  checks.push(
    check(
      'H11',
      'Project Profile references to unsupported capabilities',
      '§41',
      unsupported.length ? 'fail' : 'pass',
      unsupported.length
        ? 'the Project Profile asks for a capability no selected Stack Profile provides'
        : `${requested.length} requested capability(ies), all supported`,
      unsupported.map((cap) => {
        const known = CAPABILITIES.includes(cap) ? '' : ' (not a known capability name)';
        return `quality.capabilities.${cap} is not supported by any selected stack${known}`;
      }),
    ),
  );

  // H12 — conformance claims not satisfied by the implementation.
  const conformance = failuresOfCode(composition, 'CONFORMANCE_UNMET');
  checks.push(
    check(
      'H12',
      'conformance claims not satisfied',
      '§4.3',
      conformance.length ? 'fail' : 'pass',
      conformance.length
        ? 'the declared level exceeds what this engine delivers'
        : `declared "${composition.meta.conformance}"`,
      conformance,
    ),
  );

  // H13 — §46.4: the ratchet reports remaining debt, new and resolved violations
  // on every run. Read from the recorded baseline, never re-measured: measuring
  // means executing, and `health` executes nothing (ADR-0006).
  const baseline = readBaseline(cwd);
  const tracked = Object.entries(baseline?.capabilities ?? {});
  const debt = tracked.reduce((n, [, c]) => n + (c.identities?.length ?? 0), 0);
  checks.push(
    check(
      'H13',
      'quality ratchet baseline',
      '§46.4',
      'pass',
      baseline
        ? `${debt} accepted violation(s) across ${tracked.length} capability(ies) — ` +
            `run aief baseline to compare against current`
        : 'no baseline recorded — nothing accepted, so nothing can be made worse',
      tracked.map(([cap, c]) => `${cap}: ${c.identities?.length ?? 0} accepted`),
    ),
  );

  // ---- §55 layer-boundary tests ------------------------------------------

  const projectId = project.doc?.project?.id;
  const projectName = project.doc?.project?.name;
  const namespacePrefixes = new Set(
    foundation.rules.map((r) => String(r.id).split('-')[0].toLowerCase()),
  );

  // L1 — Foundation contamination. The banned vocabulary is derived from the
  // artifacts present, never hardcoded: a fixed list would go stale the moment
  // a stack is added, and would itself be project knowledge inside the engine.
  const banned = [];
  for (const stack of stacks) {
    banned.push({ term: stack.name, kind: 'stack name' });
    for (const spec of Object.values(stack.doc?.capabilities ?? {})) {
      if (spec?.binding?.command) {
        banned.push({ term: spec.binding.command, kind: 'stack binding command' });
      }
    }
  }
  // A project whose id matches a Foundation namespace is the Foundation's own
  // repository. No lexical test can separate those two uses of the same word,
  // so the check declines to guess rather than reporting a false positive.
  const idIsFoundationOwn = projectId && namespacePrefixes.has(String(projectId).toLowerCase());
  if (projectId && !idIsFoundationOwn) banned.push({ term: projectId, kind: 'project id' });

  const foundationFiles = listFoundationFiles(foundation.dir);
  const l1 = scanForTerms(foundationFiles, banned, cwd);
  checks.push(
    check(
      'L1',
      'Foundation contamination',
      '§55.1',
      l1.length ? 'fail' : 'pass',
      `${foundationFiles.length} file(s) scanned for ${banned.length} derived term(s)` +
        (idIsFoundationOwn ? '; project id excluded — it names the Foundation itself' : ''),
      l1,
    ),
  );

  // L2 — Stack contamination.
  const projectTerms = [
    projectId && !idIsFoundationOwn ? { term: projectId, kind: 'project id' } : null,
    projectName ? { term: projectName, kind: 'project name' } : null,
  ].filter(Boolean);
  const stackFiles = stacks.map((s) => s.file);
  const l2 = scanForTerms(stackFiles, projectTerms, cwd);
  checks.push(
    check(
      'L2',
      'Stack contamination',
      '§55.2',
      l2.length ? 'fail' : 'pass',
      `${stackFiles.length} Stack Profile(s) scanned for ${projectTerms.length} project term(s)`,
      l2,
    ),
  );

  // L3 — Project leakage upward. A Project Profile that has to invent a rule is
  // a Project Profile that requires a Foundation edit.
  const leakage = failuresOfCode(composition, 'UNKNOWN_RULE_OVERRIDE');
  checks.push(
    check(
      'L3',
      'Project leakage upward',
      '§55.3',
      leakage.length ? 'fail' : 'pass',
      leakage.length
        ? 'a higher layer addresses a rule the Foundation does not define'
        : 'every override addresses an existing Foundation rule',
      leakage,
    ),
  );

  // L4 — Provider truth drift. Same property as H9, stated by §55.4 as a layer
  // boundary rather than as configuration hygiene.
  checks.push(
    check(
      'L4',
      'Provider truth drift',
      '§55.4',
      driftStatus,
      projection.status === 'ok'
        ? 'the projection is reproducible from the composed source'
        : driftDetail,
    ),
  );

  return {
    ok: !checks.some((c) => c.status === 'fail'),
    checks,
    counts: {
      pass: checks.filter((c) => c.status === 'pass').length,
      fail: checks.filter((c) => c.status === 'fail').length,
      warn: checks.filter((c) => c.status === 'warn').length,
      not_implemented: checks.filter((c) => c.status === 'not_implemented').length,
    },
  };
}
