# Plan: schemasafe Deep-Data Moat

**Mirror:** a11yguard/a11y-agent (file structure + export names/signatures)

## Steps
1. ✅ Exclusivity check — `product-factory/rad-upgrade-reports/` absent → no conflict.
2. Build `schemasafe-agent/`:
   - governance-data/*.json — 5 datasets (jsonschema, openapi, rfc8259, ajv, edgecases), 10–12 entries each, `verify:true`, real refs (WebSearch-verified: json-schema.org, spec.openapis.org, rfc-editor.org, ajv.js.org, openapis.org).
   - governance-data/index.ts — `retrieve` / `loadGovernanceIndex` / `invalidateGovernanceCache`.
   - guardrails.ts — G1–G5 honest guardrails; export `applyGuardrails` (same signature).
   - agent-core.ts — export `runAgent`, 5-step loop + redline + non-fatal flywheel.
   - data-flywheel.ts — `writeback` / `setStatus` / `loadContributed` / `getAcceptedContributed`; `verify:true` always; no auto-merge.
   - flywheel-demo.mjs — idempotent, self-clean via `fs.writeFileSync('')`.
   - __selftest.ts — ESM, tsx; retrieve/guardrail/flywheel asserts; self-clean.
3. Wire API `pages/api/tool.ts`: add `agent?: number`; insert agent branch after quota, before classic call; return `source:'Model-assisted'`; preserve P0 matrix.
4. Append authoritative refs to `lib/rules/SOURCES.md`.
5. Verify: tsx self-test ALL PASS; node flywheel-demo.mjs pass; `next build` exit 0 / ENV-LIMIT. Clean empty contributed store.

## Risks
- tsx not preinstalled → install as devDependency.
- Build OOM on sandbox → report ENV-LIMIT (do not loop-retry).
