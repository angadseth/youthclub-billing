import { _electron as electron } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'

const shots = process.argv[2]
const dataDir = path.join(shots, 'ycb-data')
fs.rmSync(dataDir, { recursive: true, force: true })

const app = await electron.launch({ args: ['.'], env: { ...process.env, YCB_DATA_DIR: dataDir } })
const page = await app.firstWindow()
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))

// splash plays on launch
await page.waitForSelector('text=INDIAN INSTITUTE OF TECHNOLOGY')
await page.screenshot({ path: `${shots}/20-splash-phase0.png` })
await page.waitForSelector('text=INVOICE SOFTWARE', { timeout: 8000 })
await page.waitForTimeout(3800) // into the loading phase
await page.screenshot({ path: `${shots}/21-splash-loading.png` })
await page.click('text=Skip intro')
await page.waitForSelector('text=Dashboard')
console.log('SPLASH: ok')

// create + save a bill → data.json must land in the folder
await page.goto(page.url().split('#')[0] + '#/new?client=kaivlaya&month=2026-06')
await page.waitForSelector('text=Service rows')
await page.locator('label:has-text("Attend.") input').first().fill('25')
await page.click('button:has-text("Save")')
await page.waitForSelector('text=Saved')
await page.waitForTimeout(600)
const dataFile = path.join(dataDir, 'data.json')
const saved = fs.existsSync(dataFile) ? JSON.parse(fs.readFileSync(dataFile, 'utf8')) : null
console.log('DATA-FILE:', saved ? `ok (${saved.invoices.length} invoice)` : 'MISSING')

// PDF export → file must land in Exports folder
await page.click('button:has-text("PDF")')
await page.waitForTimeout(6000)
const exports = fs.existsSync(path.join(dataDir, 'Exports')) ? fs.readdirSync(path.join(dataDir, 'Exports')) : []
console.log('EXPORTS:', exports.length ? exports.join(', ') : 'EMPTY')

// relaunch: state must load back from disk (not localStorage)
await app.close()
const app2 = await electron.launch({ args: ['.'], env: { ...process.env, YCB_DATA_DIR: dataDir } })
const page2 = await app2.firstWindow()
await page2.waitForSelector('text=Skip intro')
await page2.click('text=Skip intro')
await page2.waitForSelector('text=Recent activity')
const hasBill = await page2.locator('text=YC/26-27/').count()
console.log('RELOAD-FROM-DISK:', hasBill > 0 ? 'ok' : 'BILL NOT FOUND')
await page2.screenshot({ path: `${shots}/22-desktop-dashboard.png`, fullPage: true })
await app2.close()

console.log('ERRORS:', errors.length ? errors.join(' || ') : 'none')
