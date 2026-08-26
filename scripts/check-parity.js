#!/usr/bin/env node
/**
 * ADR-0002 parity check.
 *
 * The prose specification is normative; the rule sidecar is its addressable
 * projection. They must agree, and drift between them must be a build failure
 * rather than something someone notices later.
 *
 * Two directions are checked:
 *   1. every sidecar rule cites a section that exists in the prose;
 *   2. every conformance requirement in §4 is covered by at least one rule.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');
const PROSE = join(REPO, 'foundation', 'AIEF-000-foundation.md');
const RULES_DIR = join(REPO, 'foundation', 'rules');

const prose = readFileSync(PROSE, 'utf8');

/** Top-level section numbers that exist as headings in the specification. */
const sections = new Set(
  [...prose.matchAll(/^#{1,3}\s+(\d+)(?:\.\d+)*\.?\s+\S/gm)].map((m) => m[1]),
);

/** "§12.1" -> "12" — a reference is valid when its top-level section exists. */
const topLevel = (ref) => String(ref).replace(/^§/, '').split('.')[0];

const rules = [];
for (const file of readdirSync(RULES_DIR).filter((f) => f.endsWith('.yaml'))) {
  const doc = parse(readFileSync(join(RULES_DIR, file), 'utf8')) ?? {};
  for (const rule of doc.rules ?? []) rules.push({ ...rule, file });
}

const problems = [];

// Direction 1 — no rule may cite a section that does not exist.
for (const rule of rules) {
  if (!rule.section) {
    problems.push(`${rule.file}: ${rule.id} has no section reference`);
    continue;
  }
  const top = topLevel(rule.section);
  if (!sections.has(top)) {
    problems.push(
      `${rule.file}: ${rule.id} cites ${rule.section}, but the specification has no section ${top}. ` +
        `Either the rule is stale or the specification was renumbered.`,
    );
  }
}

// Direction 2 — every conformance requirement must be covered by a rule.
const covered = new Set(rules.map((r) => topLevel(r.section)));
const conformanceBlock = prose.match(/#\s*4\.\s*Conformance levels([\s\S]*?)\n#\s/);
if (!conformanceBlock) {
  problems.push('specification: could not locate §4 Conformance levels');
} else {
  const requirements = [...conformanceBlock[1].matchAll(/^\s*([CF]\d+)\s+.*?\(§([\d.]+)/gm)];
  if (requirements.length === 0) {
    problems.push('specification: §4 lists no parsable conformance requirements');
  }
  for (const [, id, ref] of requirements) {
    if (!covered.has(topLevel(ref))) {
      problems.push(
        `conformance ${id} references §${ref}, which no sidecar rule covers. ` +
          `A requirement nothing addresses cannot be waived, bound, or audited.`,
      );
    }
  }
}

if (problems.length > 0) {
  process.stderr.write(`parity check failed — ${problems.length} problem(s)\n\n`);
  for (const p of problems) process.stderr.write(`  ${p}\n`);
  process.exit(1);
}

process.stdout.write(
  `parity ok — ${rules.length} rules across ${sections.size} specification sections\n`,
);
