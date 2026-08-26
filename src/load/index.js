/**
 * Reads governance artifacts from disk and validates them.
 *
 * Loading never resolves precedence, applies waivers, or judges conformance.
 * It answers only "is this artifact well formed, and what does it say?".
 */
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, resolve as resolvePath } from 'node:path';
import { homedir } from 'node:os';
import { readYaml, ArtifactError } from './yaml.js';
import {
  validateRuleFile,
  validateStackProfile,
  validateProjectProfile,
  validateWaiverFile,
} from '../model/schema.js';

export const PROJECT_PROFILE_PATH = join('.ai', 'project.yaml');

/**
 * Foundation resolution, offline and layered (ADR-0003). First match wins.
 * The workspace step is what lets the AIEF repository govern itself without
 * a bootstrap special case.
 */
export function resolveFoundationDir({ cwd, version, explicitPath, cacheDir } = {}) {
  const attempts = [];

  if (explicitPath) {
    const dir = resolvePath(explicitPath);
    attempts.push({ strategy: 'explicit', dir });
    if (existsSync(join(dir, 'rules'))) return { dir, strategy: 'explicit', attempts };
  }

  if (cwd) {
    const dir = join(cwd, 'foundation');
    attempts.push({ strategy: 'workspace', dir });
    if (existsSync(join(dir, 'rules'))) return { dir, strategy: 'workspace', attempts };
  }

  // ADR-0008. An installed package is pinned by the consumer's manifest, which
  // is a stronger claim about which version applies than a shared user-level
  // cache that may hold anything. It therefore outranks the cache and loses to
  // the workspace, so self-hosting still wins.
  if (cwd) {
    const dir = join(cwd, 'node_modules', 'aief', 'foundation');
    attempts.push({ strategy: 'installed', dir });
    if (existsSync(join(dir, 'rules'))) return { dir, strategy: 'installed', attempts };
  }

  if (version) {
    const base = cacheDir ?? join(homedir(), '.aief', 'foundation');
    const dir = join(base, version);
    attempts.push({ strategy: 'cache', dir });
    if (existsSync(join(dir, 'rules'))) return { dir, strategy: 'cache', attempts };
  }

  const tried = attempts.map((a) => `  ${a.strategy}: ${a.dir}`).join('\n');
  throw new ArtifactError(
    'foundation',
    `version "${version ?? 'unspecified'}" could not be resolved offline. Tried:\n${tried}\n` +
      `Install aief, populate the cache, or pass --foundation <path>. ` +
      `Composition never fetches (ADR-0003).`,
  );
}

export function loadFoundation({ cwd, version, explicitPath, cacheDir } = {}) {
  const { dir, strategy } = resolveFoundationDir({ cwd, version, explicitPath, cacheDir });
  const rulesDir = join(dir, 'rules');
  const files = readdirSync(rulesDir)
    .filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'))
    .sort();

  if (files.length === 0) throw new ArtifactError(rulesDir, 'contains no rule files');

  const errors = [];
  const rules = [];
  const seen = new Map();

  for (const file of files) {
    const full = join(rulesDir, file);
    const doc = readYaml(full);
    const res = validateRuleFile(doc, file);
    errors.push(...res.errors);
    for (const rule of res.rules) {
      if (!rule?.id) continue;
      if (seen.has(rule.id)) {
        errors.push(
          `${file}: duplicate rule id "${rule.id}" — already defined in ${seen.get(rule.id)}`,
        );
        continue;
      }
      seen.set(rule.id, file);
      rules.push({
        ...rule,
        mode: rule.default_mode,
        origin: { layer: 'foundation', artifact: `foundation/rules/${file}` },
      });
    }
  }

  const declared = new Set(
    files.map((f) => readYaml(join(rulesDir, f)).foundation_version).filter(Boolean),
  );
  if (version && declared.size && !declared.has(version)) {
    errors.push(
      `foundation: requested version "${version}" but sidecar declares ${[...declared].join(', ')}`,
    );
  }

  return { dir, strategy, version, rules, errors };
}

export function loadProjectProfile(cwd) {
  const file = join(cwd, PROJECT_PROFILE_PATH);
  const doc = readYaml(file);
  const res = validateProjectProfile(doc, PROJECT_PROFILE_PATH);
  return { file, doc, errors: res.errors, conformance: res.conformance };
}

export function hasProjectProfile(cwd) {
  return existsSync(join(cwd, PROJECT_PROFILE_PATH));
}

/**
 * Stack Profiles resolve from the workspace first, then from the Foundation
 * distribution, mirroring the Foundation ordering so self-hosting works.
 */
export function loadStackProfile(name, { cwd, foundationDir }) {
  const candidates = [
    cwd && join(cwd, 'stacks', name, 'profile.yaml'),
    // A cached Foundation is a self-contained bundle: rules/ and stacks/ sit
    // side by side under the version directory.
    foundationDir && join(foundationDir, 'stacks', name, 'profile.yaml'),
    // In a workspace checkout the Foundation is one directory inside the repo,
    // and stacks/ is its sibling.
    foundationDir && join(foundationDir, '..', 'stacks', name, 'profile.yaml'),
  ].filter(Boolean);

  const found = candidates.find((c) => existsSync(c));
  if (!found) {
    throw new ArtifactError(
      `stacks/${name}`,
      `profile not found. Tried:\n${candidates.map((c) => `  ${c}`).join('\n')}`,
    );
  }

  const doc = readYaml(found);
  const res = validateStackProfile(doc, `stacks/${name}/profile.yaml`);
  const rules = (doc.rules ?? []).map((r) => ({
    ...r,
    origin: { layer: 'stack', artifact: `stacks/${name}/profile.yaml` },
  }));

  return { name, file: found, doc, rules, errors: res.errors };
}

export function loadWaivers(cwd, location = join('.ai', 'waivers')) {
  const dir = join(cwd, location);
  if (!existsSync(dir)) return { waivers: [], errors: [] };

  const stat = statSync(dir);
  const files = stat.isDirectory()
    ? readdirSync(dir)
        .filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'))
        .sort()
        .map((f) => join(dir, f))
    : [dir];

  const errors = [];
  const waivers = [];
  for (const file of files) {
    const doc = readYaml(file);
    const res = validateWaiverFile(doc, file);
    errors.push(...res.errors);
    for (const w of res.waivers) waivers.push({ ...w, artifact: file });
  }
  return { waivers, errors };
}
