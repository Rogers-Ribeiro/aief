/**
 * Quality ratchet (AIEF-000 §46).
 *
 * Existing debt may be baselined. New debt must not make the baseline worse —
 * compared by **violation identity**, never by count. §46 is explicit that a
 * count comparison is insufficient, because swapping one old violation for one
 * new one keeps the total flat while making the codebase worse.
 *
 * This is the only module permitted to execute a command, and it does so only
 * under `aief baseline` (ADR-0006). Commands are spawned as argv with no shell,
 * and only ever come from a Stack Profile.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, relative, sep, dirname } from 'node:path';
import { stableStringify } from '../emit/index.js';
import { IDENTITY_FORMATS } from '../model/schema.js';

export const BASELINE_PATH = join('.ai', 'baseline.json');

/**
 * A violation's identity.
 *
 * Line numbers are deliberately excluded. A violation that moves because an
 * import was added above it is the same violation, and a ratchet that reports
 * movement as new debt gets regenerated away — which is how a baseline stops
 * being a ratchet (§46).
 *
 * The accepted cost: two identical violations in one file collapse to one
 * identity, so the ratchet under-counts duplicates rather than misreporting
 * movement.
 */
export function identity({ capability, file, rule, message }) {
  return [capability, file, rule ?? 'unspecified', message].join(' :: ');
}

/** Repository-relative, forward-slashed, so a baseline is portable across platforms. */
function normalizePath(cwd, file) {
  return relative(cwd, file).split(sep).join('/');
}

const PARSERS = {
  'eslint-json': (stdout, { cwd, capability }) => {
    const report = JSON.parse(stdout || '[]');
    const out = [];
    for (const entry of report) {
      for (const m of entry.messages ?? []) {
        out.push(
          identity({
            capability,
            file: normalizePath(cwd, entry.filePath),
            rule: m.ruleId ?? 'parse-error',
            message: m.message,
          }),
        );
      }
    }
    return out;
  },
};

/**
 * Runs one capability's identity command and parses its violations.
 *
 * @returns {{capability: string, measured: boolean, identities: string[], reason?: string}}
 */
export function measureCapability(capability, spec, { cwd, run = spawnSync } = {}) {
  const decl = spec?.identities;
  if (!decl) {
    return {
      capability,
      measured: false,
      identities: [],
      reason:
        'the Stack Profile declares no `identities` for this capability, so its violations ' +
        'have no stable names. §46.5 requires the fallback to be declared, not assumed.',
    };
  }
  if (!PARSERS[decl.format]) {
    return {
      capability,
      measured: false,
      identities: [],
      reason: `unknown identities format "${decl.format}" — the engine implements ${IDENTITY_FORMATS.join(', ')}`,
    };
  }

  const [cmd, ...args] = decl.argv;
  // ADR-0006 constraint 4: argv, never a shell. A profile cannot chain,
  // redirect or substitute.
  const proc = run(cmd, args, { cwd, encoding: 'utf8', shell: false });

  if (proc.error) {
    return {
      capability,
      measured: false,
      identities: [],
      reason: `could not run ${decl.argv.join(' ')}: ${proc.error.message}`,
    };
  }
  try {
    return {
      capability,
      measured: true,
      identities: PARSERS[decl.format](proc.stdout, { cwd, capability }).sort(),
    };
  } catch (err) {
    return {
      capability,
      measured: false,
      identities: [],
      reason: `output of ${decl.argv.join(' ')} did not parse as ${decl.format}: ${err.message}`,
    };
  }
}

/** Measures every capability a selected Stack Profile can put a name to. */
export function measure({ cwd, stacks = [], run }) {
  const results = [];
  for (const stack of stacks) {
    for (const [capability, spec] of Object.entries(stack.doc?.capabilities ?? {})) {
      if (!spec?.supported) continue;
      results.push(measureCapability(capability, spec, { cwd, run }));
    }
  }
  return results.sort((a, b) => a.capability.localeCompare(b.capability));
}

export function readBaseline(cwd) {
  const file = join(cwd, BASELINE_PATH);
  if (!existsSync(file)) return null;
  return JSON.parse(readFileSync(file, 'utf8'));
}

/** Deterministic by construction: sorted identities, no timestamp (AC10). */
export function toBaseline(measurements) {
  return {
    version: 1,
    note: 'Accepted debt, by violation identity. Reviewable governance configuration (§46.1).',
    capabilities: Object.fromEntries(
      measurements
        .filter((m) => m.measured)
        .map((m) => [m.capability, { identities: [...m.identities].sort() }]),
    ),
  };
}

export function writeBaseline(cwd, baseline) {
  const file = join(cwd, BASELINE_PATH);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${stableStringify(baseline)}\n`, 'utf8');
  return file;
}

/**
 * Compares a measurement against the recorded baseline (§46).
 *
 * @returns {{ok, capabilities: Array, counts: {remaining, added, resolved}}}
 */
export function compare(measurements, baseline) {
  const recorded = baseline?.capabilities ?? {};
  const capabilities = measurements.map((m) => {
    if (!m.measured) {
      return { capability: m.capability, measured: false, reason: m.reason };
    }
    const accepted = new Set(recorded[m.capability]?.identities ?? []);
    const current = new Set(m.identities);
    const added = [...current].filter((id) => !accepted.has(id)).sort();
    const resolved = [...accepted].filter((id) => !current.has(id)).sort();
    const remaining = [...current].filter((id) => accepted.has(id)).sort();
    return {
      capability: m.capability,
      measured: true,
      tracked: baseline !== null && m.capability in recorded,
      added,
      resolved,
      remaining,
    };
  });

  const sum = (key) => capabilities.reduce((n, c) => n + (c.measured ? c[key].length : 0), 0);

  return {
    // No baseline recorded yet is not a failure: nothing has been accepted, so
    // nothing can be made worse. `--write` is how a repository opts in.
    ok: baseline === null || sum('added') === 0,
    hasBaseline: baseline !== null,
    capabilities,
    counts: { remaining: sum('remaining'), added: sum('added'), resolved: sum('resolved') },
  };
}

/**
 * §46.2 — growing a baseline requires a waiver naming each added identity.
 * §46.3 — shrinking it is always permitted.
 */
export function guardWrite(comparison, waivers = []) {
  if (!comparison.hasBaseline) return { allowed: true, unwaived: [] };

  const covered = new Set(
    waivers.flatMap((w) => (Array.isArray(w.identities) ? w.identities : [])),
  );
  const unwaived = comparison.capabilities
    .filter((c) => c.measured)
    .flatMap((c) => c.added)
    .filter((id) => !covered.has(id))
    .sort();

  return { allowed: unwaived.length === 0, unwaived };
}
