import { chromium } from 'playwright'
const browser = await chromium.launch({ headless: true })
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await ctx.newPage()
const all = []
page.on('console', (m) => all.push({ type: m.type(), text: m.text() }))
page.on('pageerror', (e) => all.push({ type: 'pageerror', text: e.message + '\n' + (e.stack || '') }))
page.on('unhandledrejection', (e) => all.push({ type: 'unhandledrejection', text: String(e.reason && e.reason.stack ? e.reason.stack : e.reason) }))
await page.goto('https://sb-nomad-ui-app.mp.serendiped.com/', { waitUntil: 'networkidle' })
await page.waitForTimeout(4000)
const bad = all.filter(e => ['error', 'warning'].includes(e.type) || e.type === 'pageerror' || e.type === 'unhandledrejection')
console.log('total:', all.length, '| bad:', bad.length)
bad.forEach((e, i) => console.log(`[${i}] ${e.type}: ${e.text.slice(0, 400)}`))
await browser.close()
