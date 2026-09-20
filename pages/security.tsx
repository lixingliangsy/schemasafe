import React from 'react'
import Head from 'next/head'
import Layout from '../components/Layout'
import { PRODUCT } from '../lib/product'

const Sec = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mb-10">
    <h2 className="text-2xl font-extrabold mb-3 text-slate-900">{title}</h2>
    <div className="text-slate-600 leading-relaxed space-y-2">{children}</div>
  </section>
)

export default function SecurityPage() {
  return (
    <Layout>
      <Head>
        <title>{`${PRODUCT.name} — Security`}</title>
        <meta name="description" content={`How ${PRODUCT.name} handles your schema and instance data.`} />
      </Head>
      <div className="max-w-3xl">
        <div className="text-xs font-bold tracking-widest uppercase text-indigo-600 mb-3">Security</div>
        <h1 className="text-4xl font-extrabold tracking-tight mb-4">Your data, our posture</h1>
        <p className="text-lg text-slate-600 mb-10">
          SchemaSafe processes the schema and instance you submit for validation. This page states, plainly, what we handle and what we do not claim.
        </p>

        <Sec title="What we handle">
          <p>the JSON Schema and JSON instance you submit for validation. We do not scan any live server, URL, or third-party site.</p>
        </Sec>

        <Sec title="Data handling commitments">
          <ul className="list-disc pl-5 space-y-1">
            <li>Validation runs on your input and is not used to train any model. No AI key is required for validation.</li>
            <li>We apply standard access controls where customer account data is stored.</li>
            <li>BYOK keys (Enterprise), when offered, are stored <strong>server-side only</strong> and never exposed to the browser.</li>
          </ul>
        </Sec>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 mb-10 text-sm text-amber-900">
          <strong>Honesty rule:</strong> SchemaSafe validates shape against your schema. A passing result does not guarantee the data is "correct" for your business — only that it matches the declared constraints. We do <strong>not</strong> claim "guaranteed correct" or "auto-fix".
        </div>

        <Sec title="Our posture">
          <ul className="list-disc pl-5 space-y-1">
            <li>SchemaSafe is a <strong>developer utility</strong>, not a certified validator or auditor.</li>
            <li>For data-modeling decisions in regulated domains, consult a qualified engineer or standard.</li>
          </ul>
        </Sec>

        <Sec title="Subprocessors &amp; payments">
          <ul className="list-disc pl-5 space-y-1">
            <li>Payments are processed by <strong>Waffo Pancake</strong> (merchant of record).</li>
            <li>See <a className="text-indigo-600 font-semibold underline" href="/privacy.html">Privacy</a> and <a className="text-indigo-600 font-semibold underline" href="/terms.html">Terms</a> for full terms.</li>
          </ul>
        </Sec>

        <p className="text-xs text-slate-400 mt-8">
          refs: JSON Schema 2020-12 · OpenAPI 3.1 · RFC 8259 (JSON)
        </p>
      </div>
    </Layout>
  )
}
