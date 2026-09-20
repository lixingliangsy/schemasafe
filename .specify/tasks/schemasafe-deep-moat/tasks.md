# Tasks: schemasafe Deep-Data Moat

- [x] T1 Exclusivity check (no rad-upgrade-report conflict)
- [x] T2 Create governance-data JSON datasets (5 × 10–12 entries, verify:true, real refs)
- [x] T3 Implement governance-data/index.ts (retrieve/loadGovernanceIndex/invalidateGovernanceCache)
- [x] T4 Implement guardrails.ts (G1–G5, export applyGuardrails)
- [x] T5 Implement agent-core.ts (export runAgent, 5-step + redline + flywheel)
- [x] T6 Implement data-flywheel.ts (writeback/setStatus/loadContributed/getAcceptedContributed)
- [x] T7 Implement flywheel-demo.mjs (idempotent, writeFileSync('') truncate)
- [x] T8 Implement __selftest.ts (tsx; retrieve/guardrail/flywheel asserts)
- [x] T9 Wire pages/api/tool.ts (?agent=1 branch, P0 matrix preserved, source:'Model-assisted')
- [x] T10 Append refs to lib/rules/SOURCES.md
- [x] T11 Verify: tsx self-test ALL PASS
- [x] T12 Verify: node flywheel-demo.mjs pass + store empty
- [ ] T13 Verify: next build exit 0 / ENV-LIMIT
- [x] T14 Clean empty contributed/feedback-log.jsonl after self-test
