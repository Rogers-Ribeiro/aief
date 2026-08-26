#!/usr/bin/env node
/**
 * AIEF command line. Deliberately thin — every decision it makes is one
 * function call into resolve/ or emit/, so the logic is tested without it.
 */
import { parseArgs } from 'node:util';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname, sep } from 'node:path';
import {
  loadFoundation,
  loadProjectProfile,
  loadStackProfile,
  loadWaivers,
  hasProjectProfile,
  PROJECT_PROFILE_PATH,
} from '../load/index.js';
import { ArtifactError } from '../load/yaml.js';
import { compose } from '../resolve/index.js';
import { audit } from '../audit/index.js';
import {
  measure,
  compare,
  guardWrite,
  readBaseline,
  writeBaseline,
  toBaseline,
} from '../ratchet/index.js';
import {
  renderProjection,
  checkProjection,
  writeProjection,
  PROJECTION_TARGET,
} from '../projection/index.js';
import {
  renderReport,
  renderHealthReport,
  renderRatchetReport,
  writeEffectiveConfig,
  EFFECTIVE_CONFIG_PATH,
} from '../emit/index.js';

const USAGE = `aief — AI Engineering Foundation

  aief compose [--write] [--verbose] [--foundation <path>]
      Resolve Foundation + Stack Profile(s) + Project Profile + Waivers.
      Exits non-zero on any governance failure.

  aief health [--verbose] [--foundation <path>]
      Audit the governance configuration: §48 health checks and §55
      layer-boundary tests. Read-only. Exits non-zero on any failed check.

  aief render [--write] [--check] [--foundation <path>]
      Project the composed configuration into AGENTS.md, inside the
      managed region. Content outside the markers is never touched.
      --check exits non-zero on drift; without --write nothing is written.

  aief baseline [--write] [--verbose] [--foundation <path>]
      Measure accepted debt by violation identity and fail on new debt (§46).
      The only command that executes Stack Profile tooling (ADR-0006).

  aief init --id <project-id> [--stack <name>]... [--conformance core|full] [--yes]
      Bootstrap a repository onto a referenced Foundation version.
      Shows every proposed write; --yes is required to apply them.
`;

function fatal(message, code = 1) {
  process.stderr.write(`${message}\n`);
  process.exit(code);
}

/** Shared front half of compose: load every layer, or fail naming the artifact. */
function loadAll(cwd, { foundationPath } = {}) {
  const project = loadProjectProfile(cwd);
  if (project.errors.length) {
    fatal(`invalid ${PROJECT_PROFILE_PATH}:\n${project.errors.map((e) => `  ${e}`).join('\n')}`);
  }

  const foundation = loadFoundation({
    cwd,
    version: project.doc.foundation?.version,
    explicitPath: foundationPath,
  });
  if (foundation.errors.length) {
    fatal(`invalid foundation:\n${foundation.errors.map((e) => `  ${e}`).join('\n')}`);
  }

  const stacks = [];
  for (const name of project.doc.stacks ?? []) {
    const stack = loadStackProfile(name, { cwd, foundationDir: foundation.dir });
    if (stack.errors.length) {
      fatal(`invalid stacks/${name}:\n${stack.errors.map((e) => `  ${e}`).join('\n')}`);
    }
    stacks.push(stack);
  }

  const location = project.doc.governance?.waivers;
  const { waivers, errors } = location ? loadWaivers(cwd, location) : loadWaivers(cwd);
  if (errors.length) fatal(`invalid waivers:\n${errors.map((e) => `  ${e}`).join('\n')}`);

  return { project, foundation, stacks, waivers };
}

function cmdCompose(argv, cwd) {
  const { values } = parseArgs({
    args: argv,
    options: {
      write: { type: 'boolean', default: false },
      verbose: { type: 'boolean', short: 'v', default: false },
      foundation: { type: 'string' },
    },
    allowPositionals: false,
  });

  const { project, foundation, stacks, waivers } = loadAll(cwd, {
    foundationPath: values.foundation,
  });
  const result = compose({ foundation, project, stacks, waivers });

  process.stdout.write(`${renderReport(result, { verbose: values.verbose })}\n`);

  // §4: core resolves and traces; full materializes. --write forces it either way.
  const mustMaterialize = project.conformance === 'full' || values.write;
  if (result.ok && mustMaterialize) {
    const file = writeEffectiveConfig(cwd, result);
    process.stdout.write(`\nwrote ${file.replace(`${cwd}\\`, '').replace(`${cwd}/`, '')}\n`);
  }

  process.exit(result.ok ? 0 : 1);
}

function cmdHealth(argv, cwd) {
  const { values } = parseArgs({
    args: argv,
    options: {
      verbose: { type: 'boolean', short: 'v', default: false },
      foundation: { type: 'string' },
    },
    allowPositionals: false,
  });

  const { project, foundation, stacks, waivers } = loadAll(cwd, {
    foundationPath: values.foundation,
  });
  const composition = compose({ foundation, project, stacks, waivers });
  const report = audit({ cwd, foundation, project, stacks, waivers, composition });

  process.stdout.write(`${renderHealthReport(report, { verbose: values.verbose })}\n`);
  process.exit(report.ok ? 0 : 1);
}

function cmdRender(argv, cwd) {
  const { values } = parseArgs({
    args: argv,
    options: {
      write: { type: 'boolean', default: false },
      check: { type: 'boolean', default: false },
      foundation: { type: 'string' },
    },
    allowPositionals: false,
  });

  const { project, foundation, stacks, waivers } = loadAll(cwd, {
    foundationPath: values.foundation,
  });
  const result = compose({ foundation, project, stacks, waivers });
  if (!result.ok) {
    fatal(
      `${renderReport(result)}\n\n` +
        `refusing to project a configuration that does not compose. ` +
        `A projection of a broken source is a confident lie.`,
    );
  }

  const block = renderProjection(result);
  const state = checkProjection(cwd, block);

  if (values.check) {
    if (state.status === 'ok') {
      process.stdout.write(`${PROJECTION_TARGET} is in sync with the composition\n`);
      return;
    }
    const why = {
      drift: 'the managed region no longer matches the composition',
      absent: 'the managed region is missing — run: aief render --write',
      'missing-file': `${PROJECTION_TARGET} does not exist — run: aief render --write`,
    }[state.status];
    fatal(`projection drift in ${PROJECTION_TARGET}: ${why} (§55.4)`);
  }

  if (!values.write) {
    // §38 — show before write, always.
    process.stdout.write(`${block}\n\n`);
    process.stdout.write(
      `target: ${PROJECTION_TARGET}, managed region only\n` +
        `state: ${state.status}\n` +
        `nothing written. Re-run with --write to apply.\n`,
    );
    return;
  }

  if (state.status === 'ok') {
    process.stdout.write(`${PROJECTION_TARGET} already in sync — nothing to write\n`);
    return;
  }
  writeProjection(cwd, block);
  process.stdout.write(`wrote the managed region in ${PROJECTION_TARGET}\n`);
}

function cmdBaseline(argv, cwd) {
  const { values } = parseArgs({
    args: argv,
    options: {
      write: { type: 'boolean', default: false },
      verbose: { type: 'boolean', short: 'v', default: false },
      foundation: { type: 'string' },
    },
    allowPositionals: false,
  });

  const { project, foundation, stacks, waivers } = loadAll(cwd, {
    foundationPath: values.foundation,
  });
  // ADR-0006: this is the only verb that executes anything, and only commands a
  // Stack Profile declared. Composition runs first so a broken configuration is
  // reported before any process is spawned.
  const composition = compose({ foundation, project, stacks, waivers });
  if (!composition.ok) {
    fatal(
      `${renderReport(composition)}\n\n` +
        `refusing to measure against a configuration that does not compose.`,
    );
  }

  const measurements = measure({ cwd, stacks });
  const baseline = readBaseline(cwd);
  const comparison = compare(measurements, baseline);

  process.stdout.write(`${renderRatchetReport(comparison, { verbose: values.verbose })}\n`);

  if (!values.write) {
    process.exit(comparison.ok ? 0 : 1);
  }

  const guard = guardWrite(comparison, waivers);
  if (!guard.allowed) {
    const listed = guard.unwaived.map((id) => `  ${id}`).join('\n');
    fatal(
      `refusing to grow the baseline. ${guard.unwaived.length} new violation(s) are not ` +
        `covered by a waiver (§46.2):\n${listed}\n\n` +
        `Fix them, or add a waiver listing the identities. ` +
        `A baseline anyone may silently regenerate is not a ratchet.`,
    );
  }

  const file = writeBaseline(cwd, toBaseline(measurements));
  const shown = file.replace(`${cwd}${sep}`, '');
  process.stdout.write(`\nwrote ${shown}\n`);
}

function renderProjectProfile({ id, stacks, conformance, foundationVersion }) {
  const stackLines = stacks.length ? stacks.map((s) => `  - ${s}`).join('\n') : '  []';
  return `# Project Profile — the narrowest knowledge layer (AIEF-000 §5.3).
# Authored by hand. Never overwritten by the engine.
project:
  id: ${id}

foundation:
  version: "${foundationVersion}"
  conformance: ${conformance}

stacks:
${stackLines}

# Rules appear here when this project needs to specialize a Foundation rule.
# Empty until friction produces one (§29, §30.2).
rules: []

governance:
  waivers: .ai/waivers
`;
}

function cmdInit(argv, cwd) {
  const { values } = parseArgs({
    args: argv,
    options: {
      id: { type: 'string' },
      stack: { type: 'string', multiple: true, default: [] },
      conformance: { type: 'string', default: 'core' },
      'foundation-version': { type: 'string', default: '0.3.1' },
      yes: { type: 'boolean', default: false },
    },
    allowPositionals: false,
  });

  if (!values.id) fatal('aief init requires --id <project-id>');
  if (!['core', 'full'].includes(values.conformance)) {
    fatal(`--conformance must be core or full, got "${values.conformance}"`);
  }

  // AC2 — never adopt over an existing profile; adoption is a different job.
  if (hasProjectProfile(cwd)) {
    fatal(
      `${PROJECT_PROFILE_PATH} already exists.\n` +
        `init bootstraps a new repository. To bring an existing repository onto AIEF, ` +
        `use adoption (AIEF-003): it inventories what is already there before adding anything.`,
    );
  }

  const content = renderProjectProfile({
    id: values.id,
    stacks: values.stack,
    conformance: values.conformance,
    foundationVersion: values['foundation-version'],
  });

  // AC3 — only artifacts with content. No empty rule directories, no unused
  // provider directories, no placeholder roles (§29).
  const writes = [{ path: PROJECT_PROFILE_PATH, content }];

  // §38 — show before write, always.
  process.stdout.write('proposed writes\n\n');
  for (const w of writes) {
    process.stdout.write(`--- ${w.path} ---\n${w.content}\n`);
  }
  process.stdout.write(
    `layer: Project Profile\n` +
      `affected: this repository only\n` +
      `nothing else is created — artifacts appear when they have content (§29)\n\n`,
  );

  if (!values.yes) {
    process.stdout.write('nothing written. Re-run with --yes to apply.\n');
    process.exit(0);
  }

  for (const w of writes) {
    const file = join(cwd, w.path);
    if (existsSync(file)) fatal(`refusing to overwrite ${w.path}`);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, w.content, 'utf8');
    process.stdout.write(`wrote ${w.path}\n`);
  }

  process.stdout.write('\nnext: aief compose\n');
}

function main() {
  const [, , command, ...rest] = process.argv;
  const cwd = process.cwd();

  try {
    switch (command) {
      case 'compose':
        return cmdCompose(rest, cwd);
      case 'health':
        return cmdHealth(rest, cwd);
      case 'render':
        return cmdRender(rest, cwd);
      case 'baseline':
        return cmdBaseline(rest, cwd);
      case 'init':
        return cmdInit(rest, cwd);
      case undefined:
      case '--help':
      case '-h':
      case 'help':
        process.stdout.write(USAGE);
        return;
      default:
        fatal(`unknown command "${command}"\n\n${USAGE}`);
    }
  } catch (err) {
    if (err instanceof ArtifactError) fatal(err.message);
    throw err;
  }
}

main();

export { EFFECTIVE_CONFIG_PATH };
