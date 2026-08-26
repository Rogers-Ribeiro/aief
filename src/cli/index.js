#!/usr/bin/env node
/**
 * AIEF command line. Deliberately thin — every decision it makes is one
 * function call into resolve/ or emit/, so the logic is tested without it.
 */
import { parseArgs } from 'node:util';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
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
import { renderReport, writeEffectiveConfig, EFFECTIVE_CONFIG_PATH } from '../emit/index.js';

const USAGE = `aief — AI Engineering Foundation

  aief compose [--write] [--verbose] [--foundation <path>]
      Resolve Foundation + Stack Profile(s) + Project Profile + Waivers.
      Exits non-zero on any governance failure.

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
