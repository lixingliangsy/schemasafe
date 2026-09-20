import type { AppProps } from 'next/app'
import Head from 'next/head'
import Script from 'next/script'
import '../styles/globals.css'
import ChatWidget from '../components/ChatWidget'
import { SUPPORT } from '../lib/support.config'

const UMAMI_ID = process.env.NEXT_PUBLIC_UMAMI_ID
const UMAMI_URL = (process.env.NEXT_PUBLIC_UMAMI_URL || 'https://analytics.umami.is').replace(/\/$/, '')

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      {UMAMI_ID && (
        <Script
          async
          src={`${UMAMI_URL}/script.js`}
          data-website-id={UMAMI_ID}
          strategy="afterInteractive"
        />
      )}
            <><Head>
        <meta property="og:type" content="website" />
        <meta property="og:title" content="SchemaSafe — Hero &amp; Value Proposition" />
        <meta property="og:description" content="Enter your site URL; get a scan for common tracking and consent violations with fix guidance. For SMB website owners and digital agencies managing multiple client sites." />
        <meta property="og:url" content="https://schemasafe.lxsaihub.com/" />
        <meta property="og:image" content="https://schemasafe.lxsaihub.com/og.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="SchemaSafe — Hero &amp; Value Proposition" />
        <meta name="twitter:description" content="Enter your site URL; get a scan for common tracking and consent violations with fix guidance. For SMB website owners and digital agencies managing multiple client sites." />
        <meta name="twitter:image" content="https://schemasafe.lxsaihub.com/og.png" />
                                        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: '{"@context":"https://schema.org","@type":"SoftwareApplication","name":"SchemaSafe","url":"https://schemasafe.lxsaihub.com/","description":"Enter your site URL; get a scan for common tracking and consent violations with fix guidance. For SMB website owners and digital agencies managing multiple client sites.","applicationCategory":"BusinessApplication","operatingSystem":"Web"}' }} />
      </Head>
      <Component {...pageProps} />
      <ChatWidget productName={SUPPORT.productName} brandColor={SUPPORT.brandColor} sessionKeyPrefix={SUPPORT.productSlug} /></>
    </>
  )
}
