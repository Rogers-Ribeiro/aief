/** Library entry point. The CLI is one consumer of this surface, not the only one. */
export { compose } from './resolve/index.js';
export {
  loadFoundation,
  loadProjectProfile,
  loadStackProfile,
  loadWaivers,
  hasProjectProfile,
  resolveFoundationDir,
  PROJECT_PROFILE_PATH,
} from './load/index.js';
export { readYaml, ArtifactError } from './load/yaml.js';
export {
  toEffectiveConfig,
  writeEffectiveConfig,
  stableStringify,
  renderReport,
  EFFECTIVE_CONFIG_PATH,
} from './emit/index.js';
export {
  MODES,
  CONFORMANCE_LEVELS,
  CAPABILITIES,
  modeRank,
  validateRule,
  validateRuleFile,
  validateStackProfile,
  validateProjectProfile,
  validateWaiver,
  validateWaiverFile,
} from './model/schema.js';
