import type { GetServerSideProps } from "next";

/**
 * Marketing landing page now lives at /index.html (generated static file).
 * Root `/` redirects there. The interactive validator studio was relocated to
 * `pages/app.tsx` (route `/app`) so it is preserved, not removed.
 * Zero transform risk — this file only issues an SSR redirect.
 */
export default function Home() {
  return null;
}

export const getServerSideProps: GetServerSideProps = async () => {
  return { redirect: { destination: "/index.html", permanent: false } };
};
