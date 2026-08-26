/**
 * ADR-0003 and ADR-0008 — offline, layered Foundation resolution.
 *
 * The order is the decision. Each strategy is tested both for winning when it
 * should and for losing to the one above it, because a precedence chain where
 * only the happy path is exercised is a chain whose order nobody has checked.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolveFoundationDir } from '../src/load/index.js';
import { ArtifactError } from '../src/load/yaml.js';

const VERSION = '0.3.1';

/** Creates a directory that looks like a Foundation: it has `rules/`. */
function plantFoundation(dir) {
  mkdirSync(join(dir, 'rules'), { recursive: true });
  writeFileSync(join(dir, 'rules', 'core.yaml'), 'namespace: X\nrules: []\n', 'utf8');
  return dir;
}

function withRepo(fn) {
  const dir = mkdtempSync(join(tmpdir(), 'aief-load-'));
  try {
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('ADR-0008 — an installed package resolves with no flag and no cache', () => {
  withRepo((cwd) => {
    plantFoundation(join(cwd, 'node_modules', 'aief', 'foundation'));
    const { strategy } = resolveFoundationDir({
      cwd,
      version: VERSION,
      cacheDir: join(cwd, 'nope'),
    });
    assert.equal(strategy, 'installed');
  });
});

test('the workspace outranks an installed package, so self-hosting still wins', () => {
  withRepo((cwd) => {
    plantFoundation(join(cwd, 'foundation'));
    plantFoundation(join(cwd, 'node_modules', 'aief', 'foundation'));
    assert.equal(resolveFoundationDir({ cwd, version: VERSION }).strategy, 'workspace');
  });
});

test('an installed package outranks the cache, because the manifest pins the version', () => {
  withRepo((cwd) => {
    plantFoundation(join(cwd, 'node_modules', 'aief', 'foundation'));
    const cacheDir = join(cwd, 'cache');
    plantFoundation(join(cacheDir, VERSION));
    assert.equal(resolveFoundationDir({ cwd, version: VERSION, cacheDir }).strategy, 'installed');
  });
});

test('the cache still resolves for a project with no installed package', () => {
  withRepo((cwd) => {
    const cacheDir = join(cwd, 'cache');
    plantFoundation(join(cacheDir, VERSION));
    assert.equal(resolveFoundationDir({ cwd, version: VERSION, cacheDir }).strategy, 'cache');
  });
});

test('an explicit path beats everything, so a reader can always override', () => {
  withRepo((cwd) => {
    plantFoundation(join(cwd, 'foundation'));
    plantFoundation(join(cwd, 'node_modules', 'aief', 'foundation'));
    const elsewhere = plantFoundation(join(cwd, 'elsewhere'));
    const { strategy, dir } = resolveFoundationDir({
      cwd,
      version: VERSION,
      explicitPath: elsewhere,
    });
    assert.equal(strategy, 'explicit');
    assert.equal(dir, elsewhere);
  });
});

test('failure names every path tried, so nobody has to guess where it looked', () => {
  withRepo((cwd) => {
    let err;
    try {
      resolveFoundationDir({ cwd, version: VERSION, cacheDir: join(cwd, 'cache') });
    } catch (caught) {
      err = caught;
    }
    assert.ok(err instanceof ArtifactError, 'resolution must fail with a named artifact error');
    for (const strategy of ['workspace', 'installed', 'cache']) {
      assert.match(err.message, new RegExp(strategy), `the error should name the ${strategy} path`);
    }
    assert.match(err.message, /never fetches/, 'offline-by-design must be stated, not implied');
  });
});
