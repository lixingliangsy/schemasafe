import type { NextApiRequest, NextApiResponse } from 'next'
import { PRODUCT } from '../../lib/product'
import { createRun, completeRun, STEP_LABELS } from '../../lib/pipeline'
import type { RunState } from '../../lib/pipeline'
import { saveRun } from '../../lib/runStore'
import { validateJsonSchema, buildDemoValidation } from '../../lib/jsonSchemaValidate'

const RULESET_VERSION = 'schemasafe-validator@2026-09-16'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  let inputs: Record<string, string> = {}
  let runId = ''
  let run: RunState | null = null
  try {
    const body = (req.body || {}) as {
      inputs?: Record<string, string>
      useMock?: boolean
      plan?: 'free' | 'pro' | 'enterprise'
    }
    inputs = body.inputs || {}
    const useMock = !!body.useMock
    const schemaStr = (inputs['schema'] || inputs['text'] || inputs['topic'] || '').trim()
    const instanceStr = (inputs['instance'] || inputs['json'] || '').trim()

    run = createRun(inputs)
    run.rulesetVersion = RULESET_VERSION
    saveRun(run)
    runId = run.runId

    if (useMock || (!schemaStr && !instanceStr)) {
      const demo = buildDemoValidation()
      const done = completeRun(run, { demo: true, result: demo })
      saveRun(done)
      return res.status(200).json({
        result: demo,
        demo: true,
        mock: true,
        source: 'Demo',
        runId,
        step: done.step,
        stepLabel: STEP_LABELS[done.step],
        status: done.status,
        rulesetVersion: RULESET_VERSION,
      })
    }

    const validation = validateJsonSchema(schemaStr, instanceStr)
    const done = completeRun(run, {
      valid: validation.valid,
      errorCount: validation.errors.length,
      result: validation.text,
    })
    saveRun(done)
    return res.status(200).json({
      result: validation.text,
      demo: false,
      mock: false,
      source: 'Validator',
      valid: validation.valid,
      errorCount: validation.errors.length,
      runId,
      step: done.step,
      stepLabel: STEP_LABELS[done.step],
      status: done.status,
      rulesetVersion: RULESET_VERSION,
      product: (PRODUCT as any).name,
    })
  } catch (e: any) {
    try {
      if (run) {
        run.status = 'failed'
        run.error = e?.message || 'unknown error'
        saveRun(run)
      }
    } catch { /* ignore */ }
    return res.status(502).json({
      error: 'Validation failed: ' + (e?.message || 'unknown error'),
      code: 'VALIDATION_FAILED',
      demo: false,
      mock: false,
      runId,
    })
  }
}
