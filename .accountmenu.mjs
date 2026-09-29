import { chromium } from 'playwright'
const browser = await chromium.launch({ headless: true })
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await ctx.newPage()
await page.goto('https://sb-nomad-ui-app.mp.serendiped.com/?section=barra-nomad', { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)
const info = await page.evaluate(() => {
  const out = []
  // Cada painel aberto (ntb-panel--inline) e seu pai
  document.querySelectorAll('.ntb-panel--inline').forEach((p) => {
    const pr = p.getBoundingClientRect()
    const parent = p.closest('[data-testid="topbar-closed"]') || p.parentElement
    const parentCard = p.closest('.relative')
    const prCard = parentCard?.getBoundingClientRect()
    out.push({
      panelW: Math.round(pr.width),
      panelRight: Math.round(pr.right),
      cardLeft: prCard ? Math.round(prCard.left) : null,
      cardRight: prCard ? Math.round(prCard.right) : null,
      overflows: prCard ? (pr.right > prCard.right + 1) : null,
    })
  })
  return out
})
console.log(JSON.stringify(info, null, 2))
await browser.close()
