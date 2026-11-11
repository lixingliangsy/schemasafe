/**
 * ScorecardPanel — the illustrated "JSON Schema Validation Scorecard" shown above every
 * report. Self-contained (inline styles only) so it drops into any product in
 * the fleet without depending on Tailwind utility classes or a shared CSS file.
 *
 * Every number is derived from the real hits array via lib/scorecard — nothing
 * is hardcoded or synthesised. No charting library is installed; the donut is
 * pure inline SVG with exact arc lengths via stroke-dasharray.
 */
import React from 'react'
import {
  buildScorecard,
  scorecardVerdict,
  beforeAfterProjection,
  SEVERITY_COLOR,
  SEVERITY_LABEL,
  LAYER_LABEL,
  normSeverity,
  type GuardHit,
  type Scorecard,
  type SeverityKey,
} from '../lib/scorecard'
import { buildSchemaCoverageBars, bucketChip } from '../lib/schemaCoverageBars'

const SEV_RANK: Record<SeverityKey, number> = { high: 0, medium: 1, low: 2 }

type SevRow = { key: SeverityKey; label: string; value: number; color: string }

/** Severity distribution donut. */
function SeverityDonut({ rows }: { rows: SevRow[] }) {
  const R = 52
  const CIRC = 2 * Math.PI * R
  const total = rows.reduce((n, r) => n + r.value, 0)
  if (!total) {
    return (
      <svg width="140" height="140" viewBox="0 0 140 140" role="img" aria-label="Severity distribution: no findings">
        <circle cx="70" cy="70" r={R} fill="none" stroke="#e2e8f0" strokeWidth="18" />
      </svg>
    )
  }
  let offset = 0
  return (
    <svg width="140" height="140" viewBox="0 0 140 140" role="img" aria-label="Severity distribution">
      {rows
        .filter((r) => r.value > 0)
        .map((r) => {
          const len = (r.value / total) * CIRC
          const dash = `${len} ${CIRC - len}`
          const dashOffset = -offset
          offset += len
          return (
            <circle
              key={r.key}
              cx="70"
              cy="70"
              r={R}
              fill="none"
              stroke={r.color}
              strokeWidth="18"
              strokeDasharray={dash}
              strokeDashoffset={dashOffset}
              transform="rotate(-90 70 70)"
            />
          )
        })}
      <text x="70" y="68" textAnchor="middle" fontSize="26" fontWeight="800" fill="#0f172a">
        {total}
      </text>
      <text x="70" y="88" textAnchor="middle" fontSize="10" fontWeight="600" fill="#64748b">
        findings
      </text>
    </svg>
  )
}

/** Findings-by-layer bars. */
function LayerBars({ rows }: { rows: Array<{ layer: string; count: number }> }) {
  const max = rows.reduce((m, r) => Math.max(m, r.count), 1)
  if (!rows.length) return <div style={{ fontSize: 12, color: '#64748b' }}>No layer findings.</div>
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {rows.map((r) => (
        <div key={r.layer} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ width: 96, flexShrink: 0, fontSize: 12, fontWeight: 600, color: '#475569' }}>
            {LAYER_LABEL[r.layer] || r.layer}
          </span>
          <span style={{ height: 12, flex: 1, borderRadius: 6, background: '#f1f5f9', overflow: 'hidden' }}>
            <span
              style={{
                display: 'block',
                height: 12,
                borderRadius: 6,
                background: '#334155',
                width: `${Math.max(6, Math.round((r.count / max) * 100))}%`,
              }}
            />
          </span>
          <span style={{ width: 24, flexShrink: 0, textAlign: 'right', fontSize: 12, fontWeight: 700, color: '#1e293b' }}>
            {r.count}
          </span>
        </div>
      ))}
    </div>
  )
}

const card: React.CSSProperties = {
  flex: '1 1 120px',
  minWidth: 120,
  background: '#fff',
  border: '1px solid #e2e8f0',
  borderRadius: 12,
  padding: '12px 14px',
}
const cardLabel: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: 0.4,
  textTransform: 'uppercase',
  color: '#94a3b8',
}
const cardValue: React.CSSProperties = { fontSize: 24, fontWeight: 800, color: '#0f172a', marginTop: 2 }

export default function ScorecardPanel({
  hits,
  rulesEvaluated,
  plan,
}: {
  hits: GuardHit[]
  rulesEvaluated?: number
  plan?: string
}) {
  const sc: Scorecard = buildScorecard(hits, rulesEvaluated)
  const verdict = scorecardVerdict(sc)
  const ba = beforeAfterProjection(sc)
  const sevRows: SevRow[] = (['high', 'medium', 'low'] as SeverityKey[]).map((k) => ({
    key: k,
    label: SEVERITY_LABEL[k],
    value: sc.bySeverity[k],
    color: SEVERITY_COLOR[k],
  }))
  const sortedHits = [...hits].sort(
    (a, b) => SEV_RANK[normSeverity(a.severity)] - SEV_RANK[normSeverity(b.severity)],
  )
  const isFree = !plan || plan === 'free'
  const bandColor = sc.highRisk > 0 ? '#dc2626' : sc.actionItems > 0 ? '#f59e0b' : '#10b981'
  const deep = buildSchemaCoverageBars(hits, rulesEvaluated)

  return (
    <div
      style={{
        border: '1px solid #e2e8f0',
        borderRadius: 16,
        background: '#f8fafc',
        padding: 16,
        marginBottom: 12,
      }}
    >
      {/* Verdict band */}
      <div
        style={{
          background: sc.highRisk > 0 ? '#fef2f2' : sc.actionItems > 0 ? '#fffbeb' : '#ecfdf5',
          border: `1px solid ${sc.highRisk > 0 ? '#fecaca' : sc.actionItems > 0 ? '#fde68a' : '#bbf7d0'}`,
          borderRadius: 12,
          padding: '10px 14px',
          marginBottom: 14,
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', color: '#64748b' }}>
          JSON Schema Validation Scorecard
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, color: bandColor, marginTop: 2 }}>{verdict}</div>
      </div>

      
      {/* Deeper conversion bars */}
      <div
        style={{
          marginBottom: 14,
          padding: '12px 14px',
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: 12,
        }}
      >
        <div style={cardLabel}>Schema coverage gaps</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-end', marginTop: 6, marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700 }}>Flagged</div>
            <div style={{ fontSize: 40, fontWeight: 800, lineHeight: 1, color: deep.flagged ? '#dc2626' : '#0f172a' }}>{deep.flagged}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700 }}>Clear</div>
            <div style={{ fontSize: 40, fontWeight: 800, lineHeight: 1, color: '#10b981' }}>{deep.clear}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700 }}>N/A</div>
            <div style={{ fontSize: 40, fontWeight: 800, lineHeight: 1, color: '#d97706' }}>{deep.na}</div>
          </div>
          <div style={{ flex: '1 1 240px', fontSize: 13, color: '#475569', paddingBottom: 4 }}>{deep.conclusion}</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(230px,1fr))', gap: 10 }}>
          {deep.buckets.map((b) => {
            const chip = bucketChip(b.status)
            return (
              <div key={b.id} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 10, fontWeight: 800, color: '#64748b' }}>{b.hits} hit{b.hits === 1 ? '' : 's'}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, background: chip.bg, color: chip.fg, borderRadius: 999, padding: '2px 8px' }}>
                    {chip.label}
                  </span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>{b.title}</div>
                <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.4 }}>{b.blurb}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Metric cards */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
        <div style={card}>
          <div style={cardLabel}>Total findings</div>
          <div style={cardValue}>{sc.total}</div>
        </div>
        <div style={{ ...card, borderColor: sc.highRisk > 0 ? '#fecaca' : '#e2e8f0' }}>
          <div style={cardLabel}>High-risk gate</div>
          <div style={{ ...cardValue, color: sc.highRisk > 0 ? '#dc2626' : '#0f172a' }}>{sc.highRisk}</div>
        </div>
        <div style={card}>
          <div style={cardLabel}>Action items</div>
          <div style={cardValue}>{sc.actionItems}</div>
        </div>
        <div style={card}>
          <div style={cardLabel}>Rules evaluated</div>
          <div style={cardValue}>{sc.rulesTotal}</div>
        </div>
        <div style={card}>
          <div style={cardLabel}>Coverage</div>
          <div style={cardValue}>{sc.coveragePct}%</div>
        </div>
      </div>

      {/* Charts row */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'center', marginBottom: 14 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <SeverityDonut rows={sevRows} />
          <div style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginTop: 6 }}>Severity</div>
        </div>
        <div style={{ flex: '1 1 240px', minWidth: 220 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 8 }}>Findings by layer</div>
          <LayerBars rows={sc.byLayer} />
        </div>
      </div>

      {/* Before / After strip */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'stretch', gap: 10, marginBottom: 14 }}>
        <div style={{ flex: '1 1 200px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8' }}>Current exposure</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', marginTop: 4 }}>{ba.beforeLabel}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', fontSize: 20, color: '#94a3b8' }} aria-hidden="true">
          →
        </div>
        <div style={{ flex: '1 1 200px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8' }}>Expected after fixes</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', marginTop: 4 }}>{ba.afterLabel}</div>
        </div>
      </div>

      {/* Findings chips */}
      {sortedHits.length ? (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 8 }}>Findings</div>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {sortedHits.map((h, i) => {
              const sev = normSeverity(h.severity)
              const title = String(h.title || h.id || 'Finding').trim()
              const layer = h.layer ? LAYER_LABEL[String(h.layer).toLowerCase()] || h.layer : ''
              return (
                <li key={`${h.id || title}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span
                    style={{
                      background: SEVERITY_COLOR[sev],
                      color: '#fff',
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 999,
                      textTransform: 'uppercase',
                    }}
                  >
                    {SEVERITY_LABEL[sev]}
                  </span>
                  <span style={{ fontSize: 13, color: '#1e293b' }}>{title}</span>
                  {layer ? (
                    <span style={{ fontSize: 11, color: '#64748b', background: '#f1f5f9', padding: '1px 8px', borderRadius: 999 }}>
                      {layer}
                    </span>
                  ) : null}
                  {h.id ? (
                    <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 'auto', fontFamily: 'monospace' }}>{h.id}</span>
                  ) : null}
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}

      {/* Entitlement callout */}
      {isFree ? (
        <div style={{ background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: 12, padding: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#3730a3' }}>Preview vs client-ready</div>
          <p style={{ fontSize: 12, color: '#4338ca', margin: '6px 0 0' }}>
            Free shows the full Scorecard and charts. Upgrade to Pro for watermark-free PDF and Word exports for clients and change boards.
          </p>
          <a
            href="/#pricing"
            style={{
              display: 'inline-block',
              marginTop: 8,
              background: '#4f46e5',
              color: '#fff',
              fontSize: 12,
              fontWeight: 700,
              padding: '8px 14px',
              borderRadius: 999,
              textDecoration: 'none',
            }}
          >
            Upgrade to Pro
          </a>
        </div>
      ) : (
        <div style={{ background: '#ecfdf5', border: '1px solid #bbf7d0', borderRadius: 12, padding: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#065f46' }}>Client-ready exports unlocked</div>
          <p style={{ fontSize: 12, color: '#047857', margin: '6px 0 0' }}>
            Watermark-free PDF and Word for stakeholders. Scorecard numbers stay identical — only the delivery pack is clean.
          </p>
        </div>
      )}
    </div>
  )
}
