/**
 * The single point where YAML enters the engine.
 *
 * Isolated deliberately: the dependency budget for v0.x is one parser
 * (AIEF-001 spec §7), and keeping it behind one module means replacing it
 * is a one-file change rather than a survey of every loader.
 */
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';

export class ArtifactError extends Error {
  constructor(file, message) {
    super(`${file}: ${message}`);
    this.file = file;
  }
}

export function readYaml(file) {
  let text;
  try {
    text = readFileSync(file, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') throw new ArtifactError(file, 'not found');
    throw new ArtifactError(file, err.message);
  }
  try {
    return parse(text) ?? {};
  } catch (err) {
    throw new ArtifactError(file, `invalid YAML — ${err.message}`);
  }
}
