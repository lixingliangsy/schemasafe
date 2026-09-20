// scan.mjs — schemasafe GDPR/CCPA 追踪扫描（真实实现，由 T1 审计模板契约驱动）
// 幂等：同输入同输出、无副作用、可重入。返回 { items:[{id,...}], metrics:{...} }
// 接入方式：把本产品的实际扫描逻辑包进 scan()，输出带 id 的项即可获得 diff/回归能力。
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const DATA = path.join(ROOT, '.data')
const AUDIT = path.join(DATA, 'audit')

// 已知第三方追踪器签名（命中即发出一条 tracker item）
const TRACKERS = [
  { id: 'tracker:google-analytics', name: 'Google Analytics', re: /google-analytics\.com\/analytics\.js|ga\(|'_gaq'|gtag\.js/i, severity: 'low' },
  { id: 'tracker:google-tag-manager', name: 'Google Tag Manager', re: /googletagmanager\.com\/gtm\.js/i, severity: 'low' },
  { id: 'tracker:facebook-pixel', name: 'Facebook Pixel', re: /connect\.facebook\.net\/[a-z_]+\/fbevents\.js|fbq\(/i, severity: 'medium' },
  { id: 'tracker:hotjar', name: 'Hotjar', re: /static\.hotjar\.com|hotjar\.com/i, severity: 'low' },
  { id: 'tracker:segment', name: 'Segment', re: /cdn\.segment\.com|segment\.io|window\.analytics/i, severity: 'low' },
  { id: 'tracker:mixpanel', name: 'Mixpanel', re: /cdn\.mixpanel\.com|mixpanel/i, severity: 'low' }
]

async function fetchText(url) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), 8000)
  try {
    const r = await fetch(url, { signal: ctrl.signal, redirect: 'follow' })
    return await r.text()
  } finally { clearTimeout(t) }
}

async function loadTargets(targets) {
  const htmls = []
  for (const t of targets) {
    try {
      if (/^https?:\/\//i.test(t)) {
        htmls.push(await fetchText(t)) // 真实联网扫描（可配置 https 目标）
      } else {
        const p = path.isAbsolute(t) ? t : path.join(AUDIT, t) // 离线 fixture 演示（默认）
        htmls.push(fs.readFileSync(p, 'utf8'))
      }
    } catch (e) {
      console.warn('[scan] target load failed, skipped: ' + t + ' (' + e.message + ')')
    }
  }
  return htmls.join('\n')
}

export async function scan(ctx) {
  const cfg = JSON.parse(fs.readFileSync(path.join(DATA, 'config.json'), 'utf8'))
  const targets = (cfg.scan && cfg.scan.targets) || [path.join(AUDIT, 'sample-target.html')]
  const html = await loadTargets(targets)

  const items = []

  // 1) 第三方追踪器
  for (const tr of TRACKERS) {
    if (tr.re.test(html)) {
      items.push({
        id: tr.id,
        category: 'tracker',
        severity: tr.severity,
        title: tr.name + ' detected',
        detail: 'Matched signature ' + tr.re.toString().slice(0, 40),
        present: true
      })
    }
  }

  // 2) Cookie 同意横幅（GDPR）
  const consentPresent = /accept\s*all|cookie\s*(consent|policy|banner)|gdpr|i\s*agree/i.test(html)
  if (consentPresent) {
    items.push({ id: 'consent-banner', category: 'consent', severity: 'info', title: 'Cookie Consent Banner', detail: 'Accept-all / GDPR cookie notice present', present: true })
  }

  // 3) 隐私政策链接（GDPR/CCPA 共有）
  const privacyPresent = /href=["'][^"']*privacy[^"']*["']/i.test(html)
  if (privacyPresent) {
    items.push({ id: 'privacy-policy', category: 'policy', severity: 'info', title: 'Privacy Policy Link', detail: 'Privacy policy link detected in markup', present: true })
  }

  // 4) CCPA「Do Not Sell」链接（美国加州）——缺失不发文噪声 item，仅计入评分/metrics
  const ccpaPresent = /do\s*not\s*sell|do-not-sell|your\s*privacy\s*choices|opt[- ]?out\s*of\s*sale/i.test(html)

  // 5) 指标 + 合规评分
  const trackersFound = items.filter(i => i.category === 'tracker').length
  let score = 100
  if (!consentPresent) score -= 20
  if (!privacyPresent) score -= 20
  if (!ccpaPresent) score -= 25
  score -= Math.min(trackersFound * 2, 30)
  score = Math.max(0, score)

  const metrics = {
    scanned: targets.length,
    trackers_found: trackersFound,
    consent_present: consentPresent,
    privacy_policy_present: privacyPresent,
    ccpa_present: ccpaPresent,
    score
  }

  return { items, metrics }
}
