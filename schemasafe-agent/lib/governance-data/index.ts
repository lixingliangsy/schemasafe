import fs from 'fs'
import path from 'path'
import { getAcceptedContributed } from '../data-flywheel'

export interface GovEntry {
  id: string
  ref: string
  title: string
  text: string
  source: string
  scope: GovScope
  verify?: boolean
}

export type GovScope = 'jsonschema' | 'openapi' | 'rfc8259' | 'ajv' | 'edgecases'

interface FlatEntry {
  id: string
  ref: string
  title: string
  text: string
  source: string
  scope: GovScope
  verify?: boolean
}

const DATA_DIR = __dirname
const STOP = new Set([
  'the', 'a', 'an', 'of', 'to', 'and', 'or', 'for', 'in', 'on', 'is', 'are', 'be', 'your', 'you', 'with',
  'that', 'this', 'from', 'as', 'by', 'at', 'it', 'its', 'their', 'they', 'json', 'schema', 'api', 'open',
  'use', 'using', 'used', 'not', 'no', 'has', 'have', 'per', 'new', 'are', 'can', 'will', 'when', 'which',
  'value', 'values', 'type', 'types', 'object', 'objects', 'array', 'arrays', 'string', 'number',
])

interface DatasetFile {
  file: string
  scope: GovScope
  source: string
}

const DATASETS: DatasetFile[] = [
  { file: 'json-schema-spec.json', scope: 'jsonschema', source: 'JSON Schema 2020-12 (json-schema.org)' },
  { file: 'openapi.json', scope: 'openapi', source: 'OpenAPI 3.1 (OAS)' },
  { file: 'rfc8259.json', scope: 'rfc8259', source: 'RFC 8259 (IETF)' },
  { file: 'ajv.json', scope: 'ajv', source: 'Ajv (ajv.js.org)' },
  { file: 'validation-edge-cases.json', scope: 'edgecases', source: 'Schemasafe curated edge cases' },
]

function readJson(name: string): any {
  const p = path.join(DATA_DIR, name)
  return JSON.parse(fs.readFileSync(p, 'utf8'))
}

let _index: FlatEntry[] | null = null

export function loadGovernanceIndex(): FlatEntry[] {
  if (_index) return _index
  const out: FlatEntry[] = []

  for (const d of DATASETS) {
    const data = readJson(d.file)
    const entries: any[] = data.entries || []
    for (const e of entries) {
      out.push({
        id: e.id,
        ref: e.ref,
        title: e.title,
        text: e.body || '',
        source: d.source,
        scope: d.scope,
        verify: e.verify,
      })
    }
  }

  // DATA FLYWHEEL — merge human-accepted contributed signals into the
  // retrievable index. Contributed entries always carry verify:true and are
  // never treated as vetted law (see data-flywheel.ts / guardrails G1–G5).
  for (const c of getAcceptedContributed()) {
    out.push({
      id: c.id,
      ref: c.ref,
      title: c.title,
      text: c.text,
      source: c.source,
      scope: c.scope,
      verify: c.verify,
    })
  }

  _index = out
  return out
}

/** Force the next retrieve to rebuild from disk (re-ingest newly accepted signals). */
export function invalidateGovernanceCache(): void {
  _index = null
}

export function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9.\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOP.has(t))
}

export interface RetrieveOpts {
  scope?: GovScope | 'all'
  topK?: number
  threshold?: number
}

export function retrieve(query: string, opts: RetrieveOpts = {}): GovEntry[] {
  const idx = loadGovernanceIndex()
  const scope = opts.scope || 'all'
  const topK = opts.topK || 6
  const qTokens = new Set(tokenize(query))
  const scopeFilter = scope === 'all' ? idx : idx.filter((e) => e.scope === scope)

  const scored = scopeFilter.map((e) => {
    const hay = tokenize(`${e.title} ${e.text} ${e.ref}`)
    let score = 0
    for (const t of hay) if (qTokens.has(t)) score += 1
    // ref-match boost (e.g. "rfc 8259", "openapi 3.1", "$ref", "2020-12")
    for (const qt of qTokens) {
      if (e.ref.toLowerCase().includes(qt)) score += 2
    }
    return { e, score }
  })

  return scored
    .filter((s) => s.score > (opts.threshold ?? 0))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map((s) => ({ id: s.e.id, ref: s.e.ref, title: s.e.title, text: s.e.text, source: s.e.source, scope: s.e.scope, verify: s.e.verify }))
}

export const GOVERNANCE_SOURCES = [
  'JSON Schema Draft 2020-12 (json-schema.org)',
  'OpenAPI Specification 3.1.0 (OAS)',
  'RFC 8259 — JSON Data Interchange Format (IETF)',
  'Ajv JSON Schema validator (ajv.js.org)',
  'Schemasafe curated validation edge cases',
]
