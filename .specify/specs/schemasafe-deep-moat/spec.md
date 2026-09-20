# Spec: schemasafe Deep-Data Moat (R11 pattern)

**Cluster:** privacy-compliance · **Domain:** JSON Schema validation
**Slug:** schemasafe · **CANONICAL:** a11yguard/a11y-agent

## 1. Problem
schemasafe validates JSON against schemas, but its output is only as trustworthy as the
rules it cites. Generic LLM answers about JSON Schema / OpenAPI / RFC 8259 drift and
hallucinate. We need a proprietary, citable, continuously-growing standards corpus.

## 2. Goals
- Ship a curated, web-researched corpus (≥40 entries across 5 datasets) with `verify:true`.
- Provide a 5-step agent (retrieve→crossref→assess→cite→report) grounded in that corpus.
- Enforce honest guardrails (G1–G5): no correctness-certificate / no guarantee wording.
- Grow the corpus via a human-in-the-loop data flywheel (never silent auto-merge).

## 3. Out of scope
- Live API contract scanning (existing product surface) beyond schema advice.
- Auto-publishing contributed entries without human review.

## 4. Functional requirements
- F1 `retrieve(query, {scope, topK})` semantic search over the corpus.
- F2 `runAgent(inputs, deps)` multi-step grounded assessment; emits `source:'Model-assisted'`.
- F3 `applyGuardrails` rejects ungrounded / absolute-assurance text.
- F4 `writeback` / `setStatus` / `getAcceptedContributed` flywheel with `verify:true` always.
- F5 API `?agent=1` branch wired AFTER key/quota, BEFORE classic call, preserving P0 matrix.

## 5. Acceptance
- tsx self-test ALL PASS (retrieve≥1, guardrail reject≥1, flywheel accept→retrieve).
- `node flywheel-demo.mjs` passes and leaves store empty.
- `next build` exit 0 (or ENV-LIMIT if OOM-only).
