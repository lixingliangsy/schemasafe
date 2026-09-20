import type { GovEntry } from './governance-data/index'

/**
 * Honest guardrails for the vertical JSON-schema-validation agent (schemasafe deep-data moat).
 * Aligned to OPC asset guardrails G1–G5 (see docs/r11-agent-upgrade-plan.md §7.3).
 *
 * These validators run AFTER the grounded model call returns, BEFORE the
 * report is assembled and emitted. A failing validator refuses emission —
 * matching the existing "no citation → refuse" red line.
 *
 *   G1 — analysis is decision-support, not a schema-correctness certificate
 *   G2 — no "replace your validation engineer" / "guarantee valid" / "guarantee no breaking change"
 *   G3 — contract/data-exposure risk is a public reference point, never a promise the
 *        tool will keep the user free of incidents
 *   G4 — English B2B positioning (enforced at content/design layer, not runtime)
 *   G5 — schema assessment is analysis aid; must not claim a schema is "certified valid"
 */

export interface GuardrailResult {
  ok: boolean
  violations: string[]
  note: string
  needsHumanReview: boolean
}

const DECISION_SUPPORT_FOOTER =
  '\n\n— Decision-support only. Not a correctness certificate. Verify against primary specs (JSON Schema 2020-12 / OpenAPI 3.1 / RFC 8259) before action. ' +
  'This is a good-faith analysis record you can stand behind, not a formal validation certification.'

const UNCERTAINTY_FOOTER =
  '\n\n⚠️ Open uncertainties detected — confirm with a qualified schema/API engineer before action.' + DECISION_SUPPORT_FOOTER

// G2 / G5 — prohibited absolute-assurance phrases. Anchored to avoid false
// positives on mentions of standards (e.g. "the schema validates" as a topic).
const PROHIBITED_PHRASES: Array<{ re: RegExp; code: string }> = [
  { re: /\bguarantee[ds]?\b[^.]{0,40}\b(valid|validation|no breaking|schema|compliant|conformity)\b/i, code: 'G2_GUARANTEE_VALID' },
  { re: /\byour schema (is|will be|has been) (valid|compliant|100%|fully validated)\b/i, code: 'G5_SCHEMA_IS_VALID' },
  { re: /\b(this|we|it) (certifies?|certify) (your|the) (schema|document|api|contract|validity)\b/i, code: 'G5_CERTIFIED' },
  { re: /\breplace (your )?(schema|validation|api|data) (engineer|expert|team|consultant)\b/i, code: 'G2_REPLACE_TEAM' },
  { re: /\bguarantee[ds]? (no (breaking change|incident|regression)|100%|eliminate all risk|zero risk)\b/i, code: 'G2_GUARANTEE_NO_BREACH' },
  { re: /\b(ensures?|guarantees?) (your )?(schema is |full |json schema )?(valid|validation|compliance|conformity)\b/i, code: 'G5_ENSURE_VALID' },
]

// G3 — exposure ceilings must be framed as public reference points, never as a
// promise that the tool will keep the user free of incidents.
const EXPOSURE_PROMISE: RegExp =
  /\b(we |this (tool|report) |the agent )(will|can|guarantees?) (keep|ensure|get) (you|your (system|api|contract|data)) (under|below|within|free of).*(incident|breach|downtime|regression|breaking)/i

// G1 — the report must be grounded in at least one cited provision from the dataset.
const CITATION_MARKER =
  /JSON Schema|OpenAPI|OAS|RFC 8259|RFC3339|Ajv|2020-12|Draft 2020|3\.1|draft-04|\$ref|\$dynamicRef|unevaluated|additionalProperties|exclusiveMinimum|discriminator|§|Cl\.|Annex/i

const UNCERTAINTY_MARKER =
  /\b(uncertain|not certain|may not (be|apply|validate)|verify with|consult (a|your|qualified)|should confirm|depends on|open (question|issue)|needs? (human|expert) review|cannot (determine|confirm)|out of scope)\b/i

/** G1 — report is grounded in at least one cited provision from the dataset. */
export function checkCitationGrounded(report: string, citations: GovEntry[]): boolean {
  return citations.length > 0 && CITATION_MARKER.test(report)
}

/** G2 / G5 — scan for prohibited absolute-assurance phrasing. */
export function checkNoGuarantee(text: string): string[] {
  const hits: string[] = []
  for (const p of PROHIBITED_PHRASES) {
    if (p.re.test(text)) hits.push(p.code)
  }
  if (EXPOSURE_PROMISE.test(text)) hits.push('G3_EXPOSURE_PROMISE')
  return hits
}

/** Uncertainty detector — drives the "confirm with engineer" flag (G1/G5). */
export function detectUncertainty(text: string): boolean {
  return UNCERTAINTY_MARKER.test(text)
}

/** Main entry — returns whether the report may be emitted, plus the redline note. */
export function applyGuardrails(report: string, citations: GovEntry[]): GuardrailResult {
  const violations: string[] = []

  if (!checkCitationGrounded(report, citations)) {
    violations.push('G1_NO_CITATION')
  }
  violations.push(...checkNoGuarantee(report))

  const needsHumanReview = detectUncertainty(report)
  const ok = violations.length === 0

  let note = DECISION_SUPPORT_FOOTER
  if (needsHumanReview) {
    note = UNCERTAINTY_FOOTER
  }

  return { ok, violations, note, needsHumanReview }
}
