import { randomUUID } from 'crypto'

/** L1 workflow for schemasafe (JSON-schema validation, Playbook minimum DoD). */
export type StepId = 'intake' | 'validate' | 'report' | 'export'
export type RunStatus = 'running' | 'awaiting_confirm' | 'done' | 'failed'

export type RunState = {
  runId: string
  step: StepId
  inputs: Record<string, string>
  artifacts: Record<string, unknown>
  status: RunStatus
  pipelineId: string
  rulesetVersion?: string
  createdAt: string
  updatedAt: string
  error?: string
}

export const PIPELINE_ID = 'schemasafe-doc-v1'

export const STEP_ORDER: StepId[] = ['intake', 'validate', 'report', 'export']

export const STEP_LABELS: Record<StepId, string> = {
  intake: "Step 1/4 · Ingest schema & instance",
  validate: "Step 2/4 · Deterministic validate",
  report: "Step 3/4 · Errors & remediation",
  export: "Step 4/4 · Validated schema export",
}

export function createRun(inputs: Record<string, string>, pipelineId: string = PIPELINE_ID): RunState {
  const now = new Date().toISOString()
  return {
    runId: randomUUID(),
    step: STEP_ORDER[0],
    inputs,
    artifacts: {},
    status: 'running',
    pipelineId,
    createdAt: now,
    updatedAt: now,
  }
}

export function assertTransition(from: StepId, to: StepId) {
  const i = STEP_ORDER.indexOf(from)
  const j = STEP_ORDER.indexOf(to)
  if (j !== i + 1) throw new Error(`Invalid step transition: ${from} → ${to}`)
}

export function advance(state: RunState, to: StepId): RunState {
  assertTransition(state.step, to)
  return { ...state, step: to, updatedAt: new Date().toISOString() }
}

/** Collapse multi-step to final for single-shot tool handlers. */
export function completeRun(state: RunState, artifacts: Record<string, unknown>): RunState {
  return {
    ...state,
    step: STEP_ORDER[STEP_ORDER.length - 1],
    status: 'done',
    artifacts: { ...state.artifacts, ...artifacts },
    updatedAt: new Date().toISOString(),
  }
}
