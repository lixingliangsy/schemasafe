// lib/schema.ts — GEO JSON-LD helpers (server-side injection)

// --- GEO JSON-LD helpers (server-side Head injection) ---
export interface FaqItem {
  question: string
  answer: string
}

export interface HowToStep {
  name: string
  text: string
}

export function buildFaqJsonLd(items: FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((it) => ({
      "@type": "Question",
      name: it.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: it.answer,
      },
    })),
  }
}

export function buildHowToJsonLd(name: string, steps: HowToStep[]) {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name,
    step: steps.map((s, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: s.name,
      text: s.text,
    })),
  }
}


// --- GEO Batch1: Product schema (derived from PRODUCT; no rating — compliant with red line) ---
export type ProductLike = {
  name: string
  slug?: string
  definitionLead?: string
  priceMonthly?: number
  priceYearly?: number
  productId?: string
}

export function buildProductJsonLd(p: ProductLike, siteUrl: string) {
  const offers: object[] = [
    {
      "@type": "Offer",
      name: p.name + " — Monthly subscription",
      price: String(p.priceMonthly ?? 0),
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      url: siteUrl + "/pricing",
      eligibleQuantity: { "@type": "QuantitativeValue", unitCode: "MON" },
    },
  ]
  if (p.priceYearly) {
    offers.push({
      "@type": "Offer",
      name: p.name + " — Annual subscription",
      price: String(p.priceYearly),
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      url: siteUrl + "/pricing",
    })
  }
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: p.definitionLead || "",
    url: siteUrl + "/",
    brand: { "@type": "Brand", name: "LXSAI" },
    offers,
    // aggregateRating / review omitted: no verified public reviews yet (GEO compliance red line)
  }
}
