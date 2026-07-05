import { chromium } from 'playwright'
const base = 'file:///C:/Users/24f20/Desktop/Claude-Lab/experiments/06-business-setup/collateral/'
const out = 'C:/Users/24f20/Desktop/Claude-Lab/experiments/06-business-setup/collateral/'
const b = await chromium.launch()

// pricing card PNG 1080x1350
let c = await b.newContext({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 2 })
let p = await c.newPage()
await p.goto(base + 'pricing-card.html', { waitUntil: 'networkidle' })
await p.waitForTimeout(400)
await p.screenshot({ path: out + 'pricing-card.png' })
await c.close()

// pamphlet PDF A5
c = await b.newContext()
p = await c.newPage()
await p.goto(base + 'pamphlet.html', { waitUntil: 'networkidle' })
await p.pdf({ path: out + 'pamphlet-A5.pdf', width: '148mm', height: '210mm', printBackground: true })

// visiting card PDF + PNGs
await p.goto(base + 'visiting-card.html', { waitUntil: 'networkidle' })
await p.pdf({ path: out + 'visiting-card.pdf', width: '89mm', height: '54mm', printBackground: true })
const cards = await p.locator('.card').all()
await cards[0].screenshot({ path: out + 'visiting-card-front.png' })
await cards[1].screenshot({ path: out + 'visiting-card-back.png' })

// company profile PDF A4 + preview PNG
await p.goto(base + 'company-profile.html', { waitUntil: 'networkidle' })
await p.pdf({ path: out + 'company-profile.pdf', width: '210mm', height: '297mm', printBackground: true })
await p.locator('.page').screenshot({ path: out + 'company-profile.png' })

await b.close()
console.log('all collateral rendered')
