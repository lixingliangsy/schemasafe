import Head from "next/head";
import Layout from "../components/Layout";
import FeedbackForm from "../components/FeedbackForm";

export default function FeedbackPage() {
  return (
    <Layout>
      <Head>
        <title>Feedback · SchemaSafe</title>
        <meta name="description" content="Submit feedback, suggestions, or issues to SchemaSafe" />
      </Head>
      <div className="mx-auto w-full max-w-2xl px-4 py-10">
        <h1 className="text-2xl font-bold text-slate-900">Submit Feedback</h1>
        <p className="mt-2 text-slate-600">Your feedback goes directly to our team and helps us improve the product.</p>
        <div className="mt-6">
          <FeedbackForm />
        </div>
      </div>
    </Layout>
  );
}