#!/usr/bin/env node
/**
 * audit-run.mjs — T1 持续审计+不可变轨迹 通用运行器（由 scaffold-t1-audit.mjs 生成）
 * 调用 ./scan.mjs 的 scan() 幂等能力，落盘 snapshots / trail / dataset / evidence，并推送 webhook。
 */
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { fileURLToPath } from 'url'
import { scan } from './scan.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const DATA = path.join(ROOT, '.data')
const AUDIT = path.join(DATA, 'audit')
const cfg = JSON.parse(fs.readFileSync(path.join(DATA, 'config.json'), 'utf8'))
const SLUG = cfg.product
const STANDARDS = cfg.standards || ['SOC2']
const ACTOR = cfg.actor || 'AgentCPM'
const HUB = process.env.WEBHOOK_HUB || (cfg.notify && cfg.notify.hub) || ''

// 递归键排序紧凑序列化 —— Python/JS/TS 三处必须一致，否则 sha256 自检失败
function stable(o) {
  if (o === null) return 'null'
  if (Array.isArray(o)) return '[' + o.map(stable).join(',') + ']'
  if (typeof o === 'object') {
    const ks = Object.keys(o).sort()
    return '{' + ks.map(k => JSON.stringify(k) + ':' + stable(o[k])).join(',') + '}'
  }
  return JSON.stringify(o)
}
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex')
const chainSha = (prev, payload) => sha(prev + '||' + payload)

function loadTrail() {
  return fs.readFileSync(path.join(AUDIT, 'trail.jsonl'), 'utf8').split('\n').filter(Boolean).map(JSON.parse)
}
function lastSha() {
  const t = loadTrail()
  return t.length ? t[t.length - 1].payload_sha : '0'.repeat(64)
}
function diffSummary(prevItems, items) {
  const pid = (x, i) => (x && x.id) ? String(x.id) : 'idx:' + i
  const a = new Map(prevItems.map((x, i) => [pid(x, i), stable(x)]))
  const b = new Map(items.map((x, i) => [pid(x, i), stable(x)]))
  let added = 0, removed = 0, changed = 0, unchanged = 0
  for (const [k, v] of b) { if (!a.has(k)) added++; else if (a.get(k) !== v) changed++; else unchanged++ }
  for (const k of a.keys()) if (!b.has(k)) removed++
  return { added, removed, changed, unchanged }
}

async function main() {
  const runId = crypto.randomUUID()
  const ts = new Date().toISOString()
  const prev = lastSha()
  const inputHash = sha(stable({ slug: SLUG, ts }))

  const res = await scan({ slug: SLUG, ts })
  const items = Array.isArray(res) ? res : (res.items || [])
  const metrics = (res && res.metrics) || {}
  const outputHash = sha(stable(items) + stable(metrics))

  // 1) 版本化快照
  const snapFile = path.join(AUDIT, 'snapshots', 'v' + ts.replace(/[:.]/g, '-') + '.jsonl')
  fs.appendFileSync(snapFile, JSON.stringify({ run_id: runId, ts, input_hash: inputHash, output_hash: outputHash, items, schema_version: '1.0' }) + '\n')

  // 2) 差异比对
  const ds = JSON.parse(fs.readFileSync(path.join(AUDIT, 'dataset.json'), 'utf8'))
  const prevRun = ds.series[ds.series.length - 1]
  const diff = diffSummary(prevRun ? prevRun.items : [], items)

  // 3) 不可变审计链
  const entry = { run_id: runId, ts, prev_sha: prev, input_hash: inputHash, output_hash: outputHash, diff_summary: diff, status: 'ok', evidence_ref: '' }
  const canon = stable({ run_id: runId, ts, input_hash: inputHash, output_hash: outputHash, diff_summary: diff, status: 'ok', evidence_ref: '' })
  entry.payload_sha = chainSha(prev, canon)
  fs.appendFileSync(path.join(AUDIT, 'trail.jsonl'), JSON.stringify(entry) + '\n')

  // 4) 证据包
  const ev = {
    run_id: runId, ts, product: SLUG, input_hash: inputHash, output_hash: outputHash,
    trail_sha: entry.payload_sha,
    signature: { algo: 'sha256', value: chainSha(prev, canon), cert_ref: '', signed_at: ts },
    attestation: { actor: ACTOR, method: 'audit-run', tool_version: '1.0' },
    artifacts: [path.basename(snapFile)], standards: STANDARDS, schema_version: '1.0'
  }
  fs.writeFileSync(path.join(AUDIT, 'evidence', runId + '.json'), JSON.stringify(ev, null, 2))

  // 5) 更新 dataset（护城河②私有数据层）
  ds.series.push({ run_id: runId, ts, input_hash: inputHash, output_hash: outputHash, metrics, items, counts: diff })
  ds.updated_at = ts
  ds.meta.total_runs = ds.series.length
  ds.meta.last_run = ts
  ds.meta.first_run = ds.meta.first_run || ts
  ds.meta.sources = [...new Set([...ds.meta.sources, SLUG])]
  if (!ds.baseline) ds.baseline = ds.series[0]
  ds.regression.last_vs_prev = prevRun ? diff : null
  fs.writeFileSync(path.join(AUDIT, 'dataset.json'), JSON.stringify(ds, null, 2))

  // 6) 推送（占位 hub 或空则跳过）
  if (HUB && !HUB.includes('<hub>')) {
    try {
      await fetch(HUB, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ event: 'run_ok', product: SLUG, run_id: runId, status: 'ok' }) })
    } catch (e) { console.warn('[audit] notify failed:', e.message) }
  } else {
    console.log('[audit] webhook hub 未配置（占位/空），跳过推送')
  }
  console.log('[audit] ' + SLUG + ' run ' + runId + ' OK · chain=' + entry.payload_sha.slice(0, 12) + '… · items=' + items.length + ' · total_runs=' + ds.meta.total_runs)
}

main().catch(e => { console.error('[audit] FAIL', e); process.exit(1) })
