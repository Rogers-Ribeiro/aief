/**
 * JSON Schema generation (ADR-0004).
 *
 * The published contracts are generated from the same constants the engine
 * enforces. A second hand-authored definition would drift from the first, and
 * the whole point of publishing a contract is that two implementations agree.
 *
 * JSON Schema covers shape. Semantics that a schema cannot express — a declared
 * capability needing a real binding command, an enforced rule needing something
 * that enforces it — stay in `schema.js` and in the resolver. Schema-valid is
 * necessary, never sufficient.
 */
import { MODES, CONFORMANCE_LEVELS, CAPABILITIES, IDENTITY_FORMATS } from './schema.js';

const BASE = 'https://aief.dev/schemas';
const DRAFT = 'https://json-schema.org/draft/2020-12/schema';
const RULE_ID = '^[A-Z][A-Z0-9]*(-[A-Z0-9]+)*-\\d{3,}$';

const str = (extra = {}) => ({ type: 'string', minLength: 1, ...extra });

const scope = {
  description: 'Where the rule applies. Absent means repository-wide.',
  oneOf: [
    { const: 'global' },
    {
      type: 'object',
      required: ['type'],
      properties: {
        type: {
          enum: [
            'paths',
            'module',
            'component',
            'directory',
            'language',
            'file-type',
            'repository-area',
          ],
        },
        include: { type: 'array', items: { type: 'string' } },
        exclude: { type: 'array', items: { type: 'string' } },
      },
      additionalProperties: false,
    },
  ],
};

export const ruleSchema = {
  $schema: DRAFT,
  $id: `${BASE}/rule.schema.json`,
  title: 'AIEF Rule',
  description:
    'An addressable rule intent from a Foundation sidecar file (ADR-0002). ' +
    'The normative explanation lives in the specification section this entry cites.',
  type: 'object',
  required: ['id', 'intent', 'default_mode', 'enforcement_category', 'conformance', 'section'],
  properties: {
    id: str({ pattern: RULE_ID, description: 'Stable identity. Waivers and audits address this.' }),
    intent: str({ description: 'What must remain true. Provider-neutral and stack-neutral.' }),
    default_mode: {
      enum: MODES,
      description: 'Enforced means something actually enforces it. Otherwise say advisory.',
    },
    enforcement_category: str({
      description: 'Maps the rule to a stack capability, the engine, or human judgement.',
    }),
    conformance: { enum: CONFORMANCE_LEVELS },
    section: str({ description: 'The specification section this rule projects, e.g. "§12.1".' }),
    scope,
    rationale: { type: ['string', 'null'] },
  },
  additionalProperties: false,
};

export const ruleFileSchema = {
  $schema: DRAFT,
  $id: `${BASE}/rule-file.schema.json`,
  title: 'AIEF Rule File',
  type: 'object',
  required: ['namespace', 'foundation_version', 'rules'],
  properties: {
    namespace: str(),
    foundation_version: str(),
    rules: { type: 'array', items: { $ref: `${BASE}/rule.schema.json` } },
  },
  additionalProperties: false,
};

const capabilitySpec = {
  type: 'object',
  required: ['supported'],
  properties: {
    supported: { type: 'boolean' },
    binding: {
      type: 'object',
      required: ['command'],
      properties: {
        command: str(),
        failure: { type: 'string' },
      },
      additionalProperties: false,
    },
    identities: {
      description:
        'How this capability names its violations, for the quality ratchet (§46). ' +
        'argv rather than a command string so the engine never needs a shell (ADR-0006).',
      type: 'object',
      required: ['argv', 'format'],
      properties: {
        argv: { type: 'array', minItems: 1, items: str() },
        format: { enum: IDENTITY_FORMATS },
      },
      additionalProperties: false,
    },
  },
  additionalProperties: false,
  // AIEF-CORE-013 in the shape it can be expressed: supported implies a binding.
  // The engine also rejects the inverse, which a schema cannot state as clearly.
  if: { properties: { supported: { const: true } }, required: ['supported'] },
  then: { required: ['binding'] },
};

export const stackProfileSchema = {
  $schema: DRAFT,
  $id: `${BASE}/stack-profile.schema.json`,
  title: 'AIEF Stack Profile',
  description: 'Binds universal Foundation intents to commands an ecosystem can run.',
  type: 'object',
  required: ['name', 'version', 'capabilities'],
  properties: {
    name: str(),
    version: str(),
    capabilities: {
      type: 'object',
      propertyNames: { enum: CAPABILITIES },
      additionalProperties: capabilitySpec,
    },
    signals: { type: 'object', additionalProperties: { type: 'number' } },
    rules: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id'],
        properties: { id: str({ pattern: RULE_ID }), mode: { enum: MODES }, scope },
        additionalProperties: false,
      },
    },
  },
  additionalProperties: false,
};

export const projectProfileSchema = {
  $schema: DRAFT,
  $id: `${BASE}/project-profile.schema.json`,
  title: 'AIEF Project Profile',
  description: "The narrowest knowledge layer: this repository's parameters.",
  type: 'object',
  required: ['project', 'foundation'],
  properties: {
    project: {
      type: 'object',
      required: ['id'],
      properties: { id: str(), name: { type: 'string' } },
      additionalProperties: false,
    },
    foundation: {
      type: 'object',
      required: ['version', 'conformance'],
      properties: { version: str(), conformance: { enum: CONFORMANCE_LEVELS } },
      additionalProperties: false,
    },
    stacks: { type: 'array', items: str() },
    rules: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id'],
        properties: { id: str({ pattern: RULE_ID }), mode: { enum: MODES }, scope },
        additionalProperties: false,
      },
    },
    risk_flags: {
      type: 'object',
      properties: {
        enabled: { type: 'array', items: str() },
        project_specific: { type: 'array', items: str() },
      },
      additionalProperties: false,
    },
    quality: {
      type: 'object',
      properties: {
        capabilities: { type: 'object', propertyNames: { enum: CAPABILITIES } },
        signals: { type: 'object', additionalProperties: { type: 'number' } },
      },
      additionalProperties: false,
    },
    governance: {
      type: 'object',
      properties: {
        waivers: { type: ['string', 'null'] },
        baseline: { type: ['string', 'null'] },
      },
      additionalProperties: false,
    },
  },
  additionalProperties: false,
};

export const waiverSchema = {
  $schema: DRAFT,
  $id: `${BASE}/waiver.schema.json`,
  title: 'AIEF Waiver',
  description:
    'A deviation made visible. Scope and reason are required; expiry is strongly advised.',
  type: 'object',
  required: ['rule_id', 'scope', 'reason', 'owner', 'created_at'],
  properties: {
    rule_id: str({ pattern: RULE_ID }),
    // §31.2 requires a scope. An empty schema here would accept null and defeat the rule.
    scope: str(),
    reason: str(),
    owner: str(),
    // No `format: date` here on purpose. Ajv ignores unknown formats unless a
    // plugin is installed, so declaring it would be a constraint that silently
    // does nothing — the orphan-enforcement pattern (§12.2) in a schema. Date
    // validity is a semantic check in the engine, where it is tested.
    created_at: str(),
    expires_at: { type: ['string', 'null'] },
    tracking_ref: { type: ['string', 'null'] },
    identities: {
      description: 'Violation identities this waiver accepts into the baseline (§46.2).',
      type: 'array',
      items: str(),
    },
    risk: { type: ['string', 'null'] },
  },
  additionalProperties: false,
};

export const waiverFileSchema = {
  $schema: DRAFT,
  $id: `${BASE}/waiver-file.schema.json`,
  title: 'AIEF Waiver File',
  type: 'object',
  required: ['waivers'],
  properties: { waivers: { type: 'array', items: { $ref: `${BASE}/waiver.schema.json` } } },
  additionalProperties: false,
};

/** Filename -> schema. The single source for what `schemas/` contains. */
export const SCHEMAS = {
  'rule.schema.json': ruleSchema,
  'rule-file.schema.json': ruleFileSchema,
  'stack-profile.schema.json': stackProfileSchema,
  'project-profile.schema.json': projectProfileSchema,
  'waiver.schema.json': waiverSchema,
  'waiver-file.schema.json': waiverFileSchema,
};
