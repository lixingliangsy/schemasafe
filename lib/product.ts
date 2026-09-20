import { buildDemoValidation } from './jsonSchemaValidate'

export interface InputField {
  key: string
  label: string
  type: 'input' | 'textarea' | 'select'
  placeholder?: string
  options?: string[]
}

export const PRODUCT = {
  priceMonthly: 29,
  priceYearly: 290,
  name: 'SchemaSafe',
  slug: 'schemasafe',
  productId: 'PROD_0HYsbYzNLaEiWwdxg4joy5',
  yearlyProductId: 'PROD_3zsIHStad5voK5idd9xreT',

  checkoutUrl: "/api/checkout",
  tagline: 'Validate JSON against your schema — catch type, required, and format errors before they ship.',
  description:
    'SchemaSafe is a JSON Schema validator for API payloads, config files, and webhook bodies. Paste a schema and a JSON instance; get every validation error with a JSON-pointer path (type, required, enum, format, additionalProperties). A developer tool that checks the shape of your data — no account, no AI, no guessing.',
  toolTitle: 'Validate',
  resultLabel: 'Validation report',
  ctaLabel: 'Validate',
  definitionLead: "SchemaSafe validates JSON instances against a JSON Schema using a deterministic validator (no LLM required) and returns structured errors — decision-support for API and config authors.",
  geoFaq: [
    { q: "Does it need an AI key?", a: "No. Core validation is deterministic. Demo mode shows a labelled sample." },
    { q: "Which draft of JSON Schema?", a: "Behaviour follows the embedded validator; check the in-app notes for supported keywords." },
    { q: "Is invalid JSON handled?", a: "Parse errors are returned as validation failures with messages — not silent success." },
    { q: "Can I save runs?", a: "Yes — each validation can persist runId via the pipeline/runStore path." },
    { q: "Who is it for?", a: "API designers and platform engineers checking payloads against contracts." },
    { q: "Primary source?", a: "json-schema.org specification hub." },
  ],
  features: [
    'Schema + instance validation',
    'JSON-pointer error paths',
    'Type / required / format checks',
    'Runs locally — no AI key',
  ],
  inputs: [
    {
      key: 'schema',
      label: 'JSON Schema',
      type: 'textarea',
      placeholder:
        '{\n  "type": "object",\n  "required": ["name", "age"],\n  "properties": {\n    "name": { "type": "string" },\n    "age": { "type": "integer", "minimum": 0 }\n  }\n}',
    },
    {
      key: 'instance',
      label: 'JSON instance',
      type: 'textarea',
      placeholder: '{\n  "name": 42,\n  "age": -3\n}',
    },
  ] as InputField[],
  systemPrompt:
    'You are a JSON Schema validator. Given a JSON Schema and a JSON instance, report every validation error against JSON Schema (draft 2020-12): type, required, enum, const, format, minimum/maximum, minLength/maxLength, pattern, items, properties, additionalProperties, and combinators. For each error give the JSON-pointer path and the expected vs actual. Do not invent fixes or claim the data is "correct" — only report whether it conforms to the declared schema. When no real schema/instance is supplied, say so plainly rather than fabricating a result.',
  pricing: [
    {
      tier: 'Free',
      price: '$0',
      desc: 'Validations in the browser — unlimited, no card',
    },
    {
      tier: 'Pro',
      price: '$29/mo',
      desc: 'Saved schemas, API access, batch validation',
    },
    {
      tier: 'Team',
      price: '$79/mo',
      desc: 'Shared schema library, CI checks, white-label',
    },
  ],
  // Demo / labeled fallback — returns a REAL validation of built-in sample data,
  // clearly marked DEMO (never a fake AI result).
  mock: (inputs: Record<string, string>): string => {
    return buildDemoValidation()
  },
}
