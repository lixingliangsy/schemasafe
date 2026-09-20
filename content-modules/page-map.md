# SchemaSafe — Page Map (route plan)

| Module | Route | Status |
|---|---|---|
| security.md | `/security` | NEW (mandatory) |
| use-cases.md | `/use-cases` | NEW |
| integrations.md | `/integrations` | NEW |
| how-it-works.md | `/how-it-works` | NEW |
| geo-blog-plan.md | `/blog` | NEW (GEO) |
| roi-proof.md | inline on `/` | template |
| social-proof.md | replace `#testimonials` | template |
| feature-pillars.md | inline `#features` | source |
| pricing.md | `/#pricing` | align |
| faq.md | `/#faq` | align |
| case-study-template.md | `/case-studies` | when real data |
| hero.md | `/` | source |

## Nav additions (header + footer in `index.tsx` + `Layout`)
Use cases · Integrations · Security · Blog

## Wire-in
Create `pages/security.tsx`, `use-cases.tsx`, `integrations.tsx`, `how-it-works.tsx`, `blog.tsx`.
`next build` must pass.
