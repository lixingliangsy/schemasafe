import fs from 'fs'
import path from 'path'
import type { RunState } from './pipeline'

function runsDir() {
  const dir = path.join(process.cwd(), '.data', 'runs')
  try { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }) } catch (e) { /* read-only FS (serverless): best effort */ }
  return dir
}

export function saveRun(state: RunState) {
  const p = path.join(runsDir(), `${state.runId}.json`)
  try { fs.writeFileSync(p, JSON.stringify(state, null, 2), 'utf8') } catch (e) { /* read-only FS (serverless): best effort */ }
  return p
}

export function loadRun(runId: string): RunState | null {
  const p = path.join(runsDir(), `${runId}.json`)
  if (!fs.existsSync(p)) return null
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8')) as RunState
  } catch {
    return null
  }
}

export function listRuns(limit = 50): RunState[] {
  const dir = runsDir()
  let files: string[] = []
  try {
    if (!fs.existsSync(dir)) return []
    files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'))
  } catch {
    return []
  }
  const rows: RunState[] = []
  for (const f of files.slice(-limit).reverse()) {
    try {
      rows.push(JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')) as RunState)
    } catch {
      /* skip */
    }
  }
  return rows
}
