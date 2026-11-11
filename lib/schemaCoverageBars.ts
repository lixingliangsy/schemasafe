/**
 * Schema coverage gaps - deeper conversion bars derived from the real Scorecard hits.
 * Generated 2026-11-11 (U9/U10 closeout) - see scripts/_patch_bcd_conversion_bars.py.
 *
 * Rules of the house:
 *   - every count comes from lib/scorecard over the real hits array
 *   - a bucket fails only when a hit id is IN its ruleIds list (never by
 *     regex-matching a finding title)
 *   - no invented metrics, no model-authored numbers, no ML claims
 *   - source is only 'Rule-based' | 'N/A'
 */
import type { GuardHit } from './scorecard'
import { buildScorecard, normSeverity } from './scorecard'

export type BucketStatus = 'clear' | 'flagged' | 'na'

export type BarBucket = {
  id: string
  title: string
  ruleIds: string[]
  blurb: string
  status: BucketStatus
  hits: number
  high: number
}

export type SchemaCoverageBars = {
  buckets: BarBucket[]
  flagged: number
  clear: number
  na: number
  conclusion: string
}

export const BAR_BUCKETS: Array<{ id: string; title: string; ruleIds: string[]; blurb: string }> = [
  {
    id: 'material',
    title: 'Schema and instance present',
    ruleIds: ['SS-01', 'SS-02'],
    blurb: 'JSON Schema material or the JSON instance is missing.',
  },
  {
    id: 'validity',
    title: 'JSON validity',
    ruleIds: ['SS-03', 'SS-04', 'SS-05'],
    blurb: 'The schema or the instance is not valid JSON, or the schema root is not a JSON object.',
  },
  {
    id: 'coverage',
    title: 'Constraint coverage',
    ruleIds: ['SS-06', 'SS-07'],
    blurb: 'The additionalProperties stance is undocumented, or the JSON Schema draft / dialect is not named.',
  },
  {
    id: 'honesty',
    title: 'Method honesty',
    ruleIds: ['SS-08'],
    blurb: 'The output claims live request interception - this is a static schema check.',
  },
]

export function buildSchemaCoverageBars(hits?: GuardHit[] | null, rulesEvaluated?: number): SchemaCoverageBars {
  const list = Array.isArray(hits) ? hits : []
  const sc = buildScorecard(list, rulesEvaluated)

  const buckets: BarBucket[] = BAR_BUCKETS.map((b) => {
    const own = list.filter((h) => b.ruleIds.includes(String(h.id || '')))
    const high = own.filter((h) => normSeverity(h.severity) === 'high').length
    if (sc.rulesTotal === 0) {
      return { ...b, status: 'na' as BucketStatus, hits: 0, high: 0 }
    }
    return {
      ...b,
      status: own.length ? ('flagged' as BucketStatus) : ('clear' as BucketStatus),
      hits: own.length,
      high,
    }
  })

  const flagged = buckets.filter((b) => b.status === 'flagged')
  const clear = buckets.filter((b) => b.status === 'clear')
  const na = buckets.filter((b) => b.status === 'na')
  const highTotal = flagged.reduce((n, b) => n + b.high, 0)

  let conclusion: string
  if (sc.rulesTotal === 0) {
    conclusion = 'Schema coverage gaps - run the check to populate these bars.'
  } else if (flagged.length === 0) {
    conclusion = 'Schema coverage gaps - all ' + String(clear.length) + ' bars clear in this pass (' + String(sc.rulesTotal) + ' rules evaluated).'
  } else {
    conclusion =
      'Schema coverage gaps - ' + String(flagged.length) + ' of ' + String(buckets.length) + ' bars flagged' +
      (highTotal ? ' (' + String(highTotal) + ' high severity)' : '') +
      ' across ' + String(sc.rulesTotal) + ' rules evaluated.'
  }

  return { buckets, flagged: flagged.length, clear: clear.length, na: na.length, conclusion }
}

export function bucketChip(status: BucketStatus): { label: string; bg: string; fg: string } {
  if (status === 'clear') return { label: 'Clear', bg: '#ecfdf5', fg: '#047857' }
  if (status === 'flagged') return { label: 'Flagged', bg: '#fef2f2', fg: '#b91c1c' }
  return { label: 'N/A', bg: '#fffbeb', fg: '#b45309' }
}
