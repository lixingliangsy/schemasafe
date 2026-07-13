export interface InputField {
  key: string
  label: string
  type: 'input' | 'textarea' | 'select'
  placeholder?: string
  options?: string[]
}

export const PRODUCT = {
  name: "SchemaSafe",
  slug: "schemasafe",
  tagline: "Scan your live site for GDPR/CCPA tracking violations.",
  description: "Enter your site URL; get a scan for common tracking and consent violations with fix guidance. For SMB website owners and digital agencies managing multiple client sites.",
  toolTitle: "Scan my site",
  resultLabel: "Scan report",
  ctaLabel: "Scan",
  features: [
  "Live site scan",
  "Violation detail",
  "White-label (Team)",
  "Continuous"
],
  inputs: [
  {
    "key": "url",
    "label": "Site URL",
    "type": "input",
    "placeholder": "https://yoursite.com"
  }
] as InputField[],
  systemPrompt: "You are a privacy-compliance scanner. Given a site URL, check for common GDPR/CCPA issues (cookie consent, third-party trackers, privacy policy links, CCPA opt-out) and report violations with fix guidance.",
  pricing: [
  {
    "tier": "Free",
    "price": "$0",
    "desc": "1 site, monthly scan"
  },
  {
    "tier": "Pro",
    "price": "$29/mo",
    "desc": "5 sites, weekly + detail"
  },
  {
    "tier": "Team",
    "price": "$79/mo",
    "desc": "50 sites, continuous, white-label"
  }
],
  mock: (inputs: Record<string, string>): string => {
  const url = (inputs['url'] || '').trim()
  if (!url) return 'Enter a site URL to scan.'
  let out = 'PRIVACY SCAN - ' + url + '\n\n'
  const checks = [
    ['Cookie consent banner present', /consent|cookie/i.test(url) || true],
    ['No hidden third-party trackers', false],
    ['GDPR privacy policy linked', true],
    ['CCPA opt-out link', false],
    ['Data Processing Agreement for EU', false]
  ]
  let pass = 0
  checks.forEach(c => { out += (c[1] ? '[OK] ' : '[RISK] ') + c[0] + '\n'; if (c[1]) pass++ })
  out += '\n' + pass + '/' + checks.length + ' passed. ' + (pass < checks.length ? 'Fix the [RISK] items.' : 'Clean.')
  out += '\n\n--- (Mock heuristic. Pro scans the live DOM for real trackers + fix guidance.)'
  return out
}
}
