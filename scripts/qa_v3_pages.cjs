const { chromium } = require('playwright')
const fs = require('fs')
const path = require('path')

const rootOutput = path.resolve(__dirname, '../tmp/qa/v4-readability')
const captureScreenshots = process.env.QA_CAPTURE !== '0'
const matrices = [
  { width: 375, dpr: 2 }, { width: 375, dpr: 3 },
  { width: 390, dpr: 2 }, { width: 390, dpr: 3 },
  { width: 430, dpr: 2 }, { width: 430, dpr: 3 },
]
const allAudits = []

function ensureDir(directory) { fs.mkdirSync(directory, { recursive: true }) }

async function auditPage(page, name, config) {
  const audit = await page.evaluate(({ name, config }) => {
    const viewportWidth = document.documentElement.clientWidth
    const visible = (element) => {
      const style = getComputedStyle(element)
      const rect = element.getBoundingClientRect()
      return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0 && rect.width > 0 && rect.height > 0
    }
    const textViolations = []
    const overflowViolations = []
    const candidates = [...document.querySelectorAll('p,small,time,button,span,strong,b,em,h1,h2,h3,label')]
    for (const element of candidates) {
      if (!visible(element) || !element.textContent?.trim()) continue
      const style = getComputedStyle(element)
      const size = Number.parseFloat(style.fontSize)
      const text = element.textContent.trim().replace(/\s+/g, ' ').slice(0, 52)
      const isPrimary = element.matches('.primary-button,.secondary-button,.confirm-play,.restart-button,.calendar-sim-main,.home-play-button')
      const minimum = isPrimary ? 14 : element.matches('p') ? 12 : 11
      if (size + .01 < minimum) textViolations.push({ tag: element.tagName, className: element.className, text, size, minimum })

      const hasOwnText = [...element.childNodes].some((node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim())
      if (hasOwnText) {
        const rect = element.getBoundingClientRect()
        if (rect.left < -1 || rect.right > viewportWidth + 1) overflowViolations.push({ tag: element.tagName, className: element.className, text, left: rect.left, right: rect.right })
      }
    }

    return {
      name, config,
      width: viewportWidth,
      scrollWidth: document.documentElement.scrollWidth,
      height: document.documentElement.clientHeight,
      scrollHeight: document.documentElement.scrollHeight,
      textViolations,
      overflowViolations,
    }
  }, { name, config })
  if (audit.scrollWidth > audit.width + 1) audit.overflowViolations.push({ document: true, width: audit.width, scrollWidth: audit.scrollWidth })
  return audit
}

async function shot(page, directory, name, config, fullPage = false) {
  await page.waitForTimeout(380)
  if (captureScreenshots) await page.screenshot({ path: path.join(directory, `${name}.png`), fullPage })
  const audit = await auditPage(page, name, config)
  allAudits.push(audit)
  console.log(`${config.width}@${config.dpr} ${name}`, JSON.stringify({ width: audit.width, scrollWidth: audit.scrollWidth, text: audit.textViolations.length, overflow: audit.overflowViolations.length }))
}

async function setSave(page, mutateSource) {
  await page.evaluate((source) => {
    const key = 'lantu-career-v1'
    const save = JSON.parse(localStorage.getItem(key))
    Function('save', source)(save)
    localStorage.setItem(key, JSON.stringify(save))
  }, mutateSource)
}

async function runMatrix(browser, config) {
  const directory = path.join(rootOutput, `${config.width}-dpr${config.dpr}`)
  ensureDir(directory)
  const context = await browser.newContext({ viewport: { width: config.width, height: 844 }, deviceScaleFactor: config.dpr })
  const page = await context.newPage()
  page.setDefaultTimeout(9000)
  const consoleErrors = []
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()) })
  page.on('pageerror', error => consoleErrors.push(error.message))

  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => localStorage.clear())
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.evaluate(() => document.fonts.ready)
  await shot(page, directory, '01-builder-identity', config, true)
  await page.getByRole('button', { name: /继续建模/ }).click()
  await shot(page, directory, '02-builder-body', config, true)
  await page.getByRole('button', { name: /分配能力点/ }).click()
  await page.waitForSelector('.style-builder')
  await shot(page, directory, '03-builder-style', config, true)
  await page.getByRole('button', { name: /快速创建/ }).click()
  await page.waitForSelector('.story-v3')
  await shot(page, directory, '04-story-modal', config)
  await setSave(page, `save.pendingStory = null; save.player.name = '谢伊·吉尔杰斯-亚历山大'; save.player.number = 99; save.money = 600000;`)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await shot(page, directory, '05-home-long-name', config, true)

  await page.getByRole('button', { name: '生涯', exact: true }).click()
  await page.waitForSelector('.calendar-v3')
  await shot(page, directory, '06-calendar', config, true)

  await page.getByRole('button', { name: '首页', exact: true }).click()
  await page.locator('.home-play-button').click()
  await page.waitForSelector('.game-v3')
  await shot(page, directory, '07-game', config, true)

  await setSave(page, `save.injury = { name: '脚踝扭伤', gamesLeft: 4, severity: 2, reinjuryRisk: 34, playedThrough: 0 }; save.activeTab = 'game'; save.pendingStory = null;`)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await shot(page, directory, '08-game-injury', config, true)
  await page.locator('.game-head button').click()
  await setSave(page, `save.injury = null; save.activeTab = 'home'; save.pendingStory = null;`)
  await page.reload({ waitUntil: 'domcontentloaded' })

  await page.getByRole('button', { name: '手机', exact: true }).click()
  await page.waitForSelector('.phone-v3')
  await shot(page, directory, '09-phone-mentor', config, true)
  await page.getByRole('button', { name: /场边动态/ }).click()
  await shot(page, directory, '10-phone-social', config, true)

  await page.getByRole('button', { name: '球员', exact: true }).click()
  await page.waitForSelector('.player-v3')
  await shot(page, directory, '11-player-attributes', config, true)
  await page.locator('.player-tabs button').filter({ hasText: '徽章' }).click()
  await shot(page, directory, '12-player-badges', config, true)

  await page.getByRole('button', { name: '联盟', exact: true }).click()
  await page.waitForSelector('.league-v3')
  await shot(page, directory, '13-league-standings', config, true)
  await page.locator('.league-v3 .segmented button').filter({ hasText: '球星库' }).click()
  await shot(page, directory, '14-league-library', config, true)
  await page.locator('.league-v3 .segmented button').filter({ hasText: '新秀' }).click()
  await shot(page, directory, '15-league-rookies', config, true)

  await setSave(page, `save.activeTab = 'home'; save.phase = 'career'; save.seasonStage = 'offseason'; save.pendingStory = null;`)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.offseason-v3')
  await shot(page, directory, '16-offseason', config, true)

  await setSave(page, `save.phase = 'retired'; save.pendingStory = null;`)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.retired-v3')
  await shot(page, directory, '17-retired', config, true)

  await context.close()
  return consoleErrors
}

;(async () => {
  ensureDir(rootOutput)
  const browser = await chromium.launch({ headless: true })
  const consoleErrors = []
  for (const config of matrices) consoleErrors.push(...(await runMatrix(browser, config)).map(error => ({ config, error })))
  await browser.close()
  fs.writeFileSync(path.join(rootOutput, 'audit.json'), JSON.stringify({ consoleErrors, audits: allAudits }, null, 2))
  const violations = allAudits.flatMap(audit => [
    ...audit.textViolations.map(detail => ({ type: 'text', page: audit.name, config: audit.config, detail })),
    ...audit.overflowViolations.map(detail => ({ type: 'overflow', page: audit.name, config: audit.config, detail })),
    ...audit.skinViolations.map(detail => ({ type: 'skin', page: audit.name, config: audit.config, detail })),
  ])
  console.log('SUMMARY', JSON.stringify({ pages: allAudits.length, consoleErrors: consoleErrors.length, violations: violations.length }))
  if (consoleErrors.length || violations.length) {
    console.error(JSON.stringify({ consoleErrors, violations: violations.slice(0, 40) }, null, 2))
    process.exit(1)
  }
})().catch(error => { console.error(error); process.exit(1) })
