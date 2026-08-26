/**
 * AC1–AC4 — `aief init` on a fresh repository, exercised end to end.
 *
 * The regression this file exists for: init used to produce a Project Profile
 * that failed `aief compose` on the first run, because the Foundation declared
 * tool-bound rules enforced without knowing whether any binding existed (§8.5).
 * A bootstrap that hands over a red gate on the first commit is a defect, not a
 * strict default — §43 step 11 and AIEF-001 spec §6.1.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');
const CLI = join(REPO, 'src', 'cli', 'index.js');
const FOUNDATION = join(REPO, 'foundation');

/** Runs the CLI in `cwd` and returns { status, stdout } without throwing. */
function cli(args, cwd) {
  try {
    const stdout = execFileSync(process.execPath, [CLI, ...args], {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { status: 0, stdout };
  } catch (err) {
    return { status: err.status ?? 1, stdout: `${err.stdout ?? ''}${err.stderr ?? ''}` };
  }
}

function withFreshRepo(fn) {
  const dir = mkdtempSync(join(tmpdir(), 'aief-init-'));
  try {
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('AC1 — a freshly initialised repository composes without governance failures', () => {
  withFreshRepo((dir) => {
    const init = cli(['init', '--id', 'probe', '--stack', 'node', '--yes'], dir);
    assert.equal(init.status, 0, init.stdout);
    assert.ok(existsSync(join(dir, '.ai', 'project.yaml')));

    const composed = cli(['compose', '--foundation', FOUNDATION], dir);
    assert.equal(
      composed.status,
      0,
      `init must leave the repository passing the gates it just installed:\n${composed.stdout}`,
    );
    assert.ok(
      !composed.stdout.includes('FAIL ['),
      `a clean bootstrap reports no governance failure:
${composed.stdout}`,
    );
    assert.match(composed.stdout, /conformance core .* stacks node/);
  });
});

test('AC1 — the bootstrapped repository enforces only what the node stack binds', () => {
  withFreshRepo((dir) => {
    cli(['init', '--id', 'probe', '--stack', 'node', '--yes'], dir);
    const composed = cli(['compose', '--foundation', FOUNDATION, '--write'], dir);
    assert.equal(composed.status, 0, composed.stdout);

    const effective = JSON.parse(readFileSync(join(dir, '.ai', 'effective-config.json'), 'utf8'));
    const enforced = effective.rules.filter((r) => r.mode === 'enforced');

    for (const rule of enforced) {
      assert.ok(rule.binding, `${rule.id} is enforced with no binding`);
    }
    const secrets = effective.rules.find((r) => r.id === 'AIEF-SEC-001');
    assert.equal(secrets.mode, 'advisory', 'no scanner is bound in a fresh repository');
  });
});

test('AC2 — init refuses to run over an existing Project Profile and names adoption', () => {
  withFreshRepo((dir) => {
    cli(['init', '--id', 'probe', '--stack', 'node', '--yes'], dir);
    const again = cli(['init', '--id', 'probe', '--stack', 'node', '--yes'], dir);
    assert.equal(again.status, 1);
    assert.match(again.stdout, /already exists/);
    assert.match(again.stdout, /AIEF-003/);
  });
});

test('AC4 — without --yes, init shows the proposed write and creates nothing', () => {
  withFreshRepo((dir) => {
    const dry = cli(['init', '--id', 'probe', '--stack', 'node'], dir);
    assert.equal(dry.status, 0, dry.stdout);
    assert.match(dry.stdout, /proposed writes/);
    assert.match(dry.stdout, /nothing written/);
    assert.equal(existsSync(join(dir, '.ai', 'project.yaml')), false);
  });
});
