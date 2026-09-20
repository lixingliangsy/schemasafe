import React from 'react'
import Head from 'next/head'
import Layout from '../components/Layout'
import { PRODUCT } from '../lib/product'

const segments = [
  {
    name: 'API payloads',
    pain: 'A 400 from a malformed JSON body slips into production.',
    how: 'Validate request and response bodies against the schema before deploy.',
  },
  {
    name: 'Config files',
    pain: 'A JSON/YAML config is silently the wrong shape.',
    how: 'Validate config against a schema in CI or on save.',
  },
  {
    name: 'Webhook bodies',
    pain: 'Third-party webhooks drift from the documented shape.',
    how: 'Validate inbound webhooks against the schema and reject bad ones early.',
  },
  {
    name: 'CI / pre-merge',
    pain: 'Shape errors are caught by users, not the pipeline.',
    how: 'Run SchemaSafe in CI so invalid payloads fail the build.',
  },
]

export default function UseCasesPage() {
  return (
    <Layout>
      <Head>
        <title>{`${PRODUCT.name} — Use Cases`}</title>
        <meta name="description" content={`How ${PRODUCT.name} helps ${PRODUCT.tagline}`} />
      </Head>
      <div className="max-w-4xl">
        <div className="text-xs font-bold tracking-widest uppercase text-indigo-600 mb-3">Use Cases</div>
        <h1 className="text-4xl font-extrabold tracking-tight mb-4">Built for API teams and backend developers</h1>
        <p className="text-lg text-slate-600 mb-10">Pick your workflow to see where schema validation pays off.</p>

        <div className="space-y-5">
          {segments.map((s) => (
            <div key={s.name} className="rounded-2xl border border-slate-200 p-6 bg-white">
              <h2 className="text-xl font-bold mb-2 text-slate-900">{s.name}</h2>
              <p className="text-sm text-slate-600 mb-2"><span className="font-semibold text-slate-900">Pain: </span>{s.pain}</p>
              <p className="text-sm text-slate-600"><span className="font-semibold text-slate-900">How {PRODUCT.name} helps: </span>{s.how}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-400 mt-8">refs: JSON Schema 2020-12 · OpenAPI 3.1 · RFC 8259 (JSON) · Ajv docs</p>
      </div>
    </Layout>
  )
}
