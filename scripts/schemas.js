#!/usr/bin/env node
/**
 * ADR-0004 — publish and enforce the JSON Schema contracts.
 *
 *   node scripts/schemas.js --write   regenerate schemas/ from the model
 *   node scripts/schemas.js           verify no drift, then validate real artifacts
 *
 * Two failures are possible and both matter. Drift means the published contract
 * no longer describes what the engine enforces. A validation failure means this
 * repository does not satisfy the contract it publishes — which would be the
 * governance-that-lies defect, committed by the project that names it.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
// The schemas declare draft 2020-12; Ajv's default export is draft-07.
import Ajv from 'ajv/dist/2020.js';
import { parse } from 'yaml';
import { SCHEMAS } from '../src/model/jsonschema.js';
import { stableStringify } from '../src/emit/index.js';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(REPO, 'schemas');
const write = process.argv.includes('--write');

const problems = [];

// 1 — the published schemas must match what the model generates.
mkdirSync(OUT, { recursive: true });
for (const [file, schema] of Object.entries(SCHEMAS)) {
  const target = join(OUT, file);
  const expected = stableStringify(schema);
  if (write) {
    writeFileSync(target, expected, 'utf8');
    continue;
  }
  if (!existsSync(target)) {
    problems.push(`schemas/${file} is missing. Run: node scripts/schemas.js --write`);
    continue;
  }
  if (readFileSync(target, 'utf8') !== expected) {
    problems.push(
      `schemas/${file} has drifted from the model. The published contract no longer ` +
        `describes what the engine enforces. Run: node scripts/schemas.js --write`,
    );
  }
}

if (write) {
  process.stdout.write(`wrote ${Object.keys(SCHEMAS).length} schemas to schemas/\n`);
  process.exit(0);
}

// 2 — this repository's own artifacts must satisfy the published contracts.
const ajv = new Ajv({ allErrors: true, strict: false });
for (const schema of Object.values(SCHEMAS)) ajv.addSchema(schema);

const validate = (schemaFile, artifactPath, doc) => {
  const fn = ajv.getSchema(SCHEMAS[schemaFile].$id);
  if (!fn(doc)) {
    for (const e of fn.errors) {
      problems.push(`${artifactPath}${e.instancePath || ''}: ${e.message}`);
    }
  }
};

const yamlAt = (p) => parse(readFileSync(join(REPO, p), 'utf8'));

for (const f of readdirSync(join(REPO, 'foundation', 'rules')).filter((f) => f.endsWith('.yaml'))) {
  validate(
    'rule-file.schema.json',
    `foundation/rules/${f}`,
    yamlAt(join('foundation', 'rules', f)),
  );
}

for (const s of readdirSync(join(REPO, 'stacks'))) {
  const p = join('stacks', s, 'profile.yaml');
  if (existsSync(join(REPO, p))) validate('stack-profile.schema.json', p, yamlAt(p));
}

validate('project-profile.schema.json', '.ai/project.yaml', yamlAt(join('.ai', 'project.yaml')));

const waiverDir = join(REPO, '.ai', 'waivers');
if (existsSync(waiverDir)) {
  for (const f of readdirSync(waiverDir).filter((f) => f.endsWith('.yaml'))) {
    validate('waiver-file.schema.json', `.ai/waivers/${f}`, yamlAt(join('.ai', 'waivers', f)));
  }
}

if (problems.length > 0) {
  process.stderr.write(`schema check failed — ${problems.length} problem(s)\n\n`);
  for (const p of problems) process.stderr.write(`  ${p}\n`);
  process.exit(1);
}

process.stdout.write(
  `schemas ok — ${Object.keys(SCHEMAS).length} contracts published and satisfied by this repository\n`,
);
