/**
 * Materialization of the Effective Configuration (§9) and human-readable
 * reporting for the CLI.
 *
 * Determinism is a requirement, not a nicety (AIEF-001 AC12): a composition
 * that reorders between runs produces noise in review, and noise in review is
 * how a real change slips through.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';

export const EFFECTIVE_CONFIG_PATH = join('.ai', 'effective-config.json');

/** JSON with recursively sorted keys, so output depends on content alone. */
export function stableStringify(value, indent = 2) {
  const sort = (v) => {
    if (Array.isArray(v)) return v.map(sort);
    if (v && typeof v === 'object') {
      return Object.fromEntries(
        Object.keys(v)
          .sort()
          .map((k) => [k, sort(v[k])]),
      );
    }
    return v;
  };
  return `${JSON.stringify(sort(value), null, indent)}\n`;
}

export function toEffectiveConfig(result) {
  return {
    generated_by: 'aief compose',
    warning: 'Generated artifact. Do not edit by hand — edit the source layers instead.',
    meta: result.meta,
    rules: result.rules.map((r) => ({
      id: r.id,
      intent: r.intent,
      mode: r.mode,
      enforcement_category: r.enforcement_category,
      conformance: r.conformance,
      section: r.section,
      origin: r.origin,
      overrides: r.overrides ?? [],
      binding: r.binding ?? null,
      waiver: r.waiver ?? null,
      scope: r.scope ?? null,
      parameters: r.parameters ?? null,
    })),
  };
}

export function writeEffectiveConfig(cwd, result) {
  const file = join(cwd, EFFECTIVE_CONFIG_PATH);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, stableStringify(toEffectiveConfig(result)), 'utf8');
  return file;
}

const MODE_MARK = { enforced: '!', advisory: '~', off: '-' };

export function renderReport(result, { verbose = false } = {}) {
  const lines = [];
  const m = result.meta;

  lines.push(
    `foundation ${m.foundation_version ?? '(unversioned)'} via ${m.foundation_strategy}` +
      `  ·  conformance ${m.conformance}` +
      `  ·  stacks ${m.stacks.length ? m.stacks.join(', ') : '(none)'}`,
  );
  lines.push(
    `${m.counts.rules} rules  ·  ${m.counts.enforced} enforced  ·  ` +
      `${m.counts.advisory} advisory  ·  ${m.counts.off} off  ·  ${m.counts.waived} waived`,
  );

  if (verbose) {
    lines.push('');
    for (const r of result.rules) {
      const bind =
        r.binding?.kind === 'stack'
          ? `${r.binding.stack}:${r.binding.capability}`
          : r.binding?.kind === 'engine'
            ? 'engine'
            : '';
      const trail = r.overrides?.length
        ? `  <- ${r.overrides.map((o) => `${o.layer}:${o.to}`).join(' <- ')}`
        : '';
      const waived = r.waiver ? '  [waived]' : '';
      lines.push(
        `  ${MODE_MARK[r.mode] ?? '?'} ${r.id.padEnd(16)} ${(bind || '—').padEnd(22)}` +
          `${r.origin.layer}${trail}${waived}`,
      );
    }
  }

  if (result.warnings.length) {
    lines.push('');
    for (const w of result.warnings) lines.push(`  warning: ${w}`);
  }

  if (result.failures.length) {
    lines.push('');
    for (const f of result.failures) {
      lines.push(`  FAIL [${f.code}] ${f.message}`);
    }
    lines.push('');
    lines.push(`${result.failures.length} governance failure(s).`);
  }

  return lines.join('\n');
}

const STATUS_MARK = { pass: 'ok  ', fail: 'FAIL', warn: 'warn', not_implemented: '--  ' };

/**
 * Renders an audit() result. `not_implemented` prints as loudly as a pass so a
 * reader cannot mistake a declared gap for a satisfied check (§48, AIEF-002).
 */
export function renderHealthReport(report, { verbose = false } = {}) {
  const lines = [];
  const c = report.counts;
  lines.push(
    `${c.pass} pass  ·  ${c.fail} fail  ·  ${c.warn} warn  ·  ` +
      `${c.not_implemented} not implemented`,
  );
  lines.push('');

  for (const chk of report.checks) {
    lines.push(
      `  ${STATUS_MARK[chk.status]} ${chk.id.padEnd(4)} ${chk.title.padEnd(46)} ` +
        `${chk.section.padEnd(7)} ${chk.detail}`,
    );
    const show = chk.status === 'fail' || chk.status === 'warn' || verbose;
    if (show) for (const f of chk.findings) lines.push(`         ${f}`);
  }

  if (c.fail) {
    lines.push('');
    lines.push(`${c.fail} health check(s) failed.`);
  }
  return lines.join('\n');
}

/**
 * Renders a ratchet comparison (§46.4): remaining debt, new violations and
 * resolved violations, on every run. A capability with no violation identities
 * is reported as unmeasurable rather than as zero — a silent zero is how a
 * ratchet comes to guard nothing.
 */
export function renderRatchetReport(comparison, { verbose = false } = {}) {
  const lines = [];
  const c = comparison.counts;

  lines.push(
    comparison.hasBaseline
      ? `${c.remaining} remaining  ·  ${c.added} new  ·  ${c.resolved} resolved`
      : `no baseline recorded  ·  ${c.added} violation(s) measured  ·  ` +
          `run: aief baseline --write to accept them`,
  );

  for (const cap of comparison.capabilities) {
    if (!cap.measured) {
      lines.push(`  --   ${cap.capability.padEnd(20)} unmeasurable: ${cap.reason}`);
      continue;
    }
    const mark = cap.added.length ? 'FAIL' : 'ok  ';
    lines.push(
      `  ${mark} ${cap.capability.padEnd(20)} ` +
        `${cap.remaining.length} remaining, ${cap.added.length} new, ${cap.resolved.length} resolved`,
    );
    for (const id of cap.added) lines.push(`       + ${id}`);
    if (verbose) for (const id of cap.resolved) lines.push(`       - ${id}`);
  }

  if (!comparison.ok) {
    lines.push('');
    lines.push(
      `${c.added} new violation(s). Existing debt may be baselined; new debt must not ` +
        `make the baseline worse (§46).`,
    );
  }
  return lines.join('\n');
}
