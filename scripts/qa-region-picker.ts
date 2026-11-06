/**
 * 省市区搜索的回归检查：对构建产物运行（先 pnpm build）。
 * 选项够多会按字母分组，此时搜索结果比当前层级少就曾经整页崩溃，所以只测带分组的那个示例。
 */
import assert from "node:assert/strict"
import { chromium, type Page } from "playwright-core"

import { chromePath } from "./lib/chrome"
import { startNextServer } from "./lib/next-server"

const OPTION = "[data-slot=region-picker-list] [role=option]"

async function search(page: Page, base: string, label: string) {
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  await page.goto(`${base}/components/region-picker/`, {
    waitUntil: "networkidle",
  })
  const pickers = page.locator("[data-slot=region-picker]")
  let grouped = false
  for (let i = 0; i < (await pickers.count()) && !grouped; i++) {
    const picker = pickers.nth(i)
    await picker.evaluate((node) => node.scrollIntoView({ block: "center" }))
    await picker.locator("button").first().click({ force: true })
    await page.locator(OPTION).first().waitFor()
    grouped = (await page.locator("[data-slot=region-picker-group]").count()) > 0
    if (!grouped) {
      await page.keyboard.press("Escape")
      await page.waitForTimeout(350)
    }
  }
  assert.ok(grouped, `${label} 没有找到带分组的示例，检查没有真正运行`)
  const input = page.locator("[data-slot=region-picker-search]").first()
  for (const query of ["杭州", "3301", "hz"]) {
    await input.fill(query, { timeout: 3000 })
    await page.waitForTimeout(300)
    assert.deepEqual(errors, [], `${label} 搜索「${query}」报错`)
    assert.ok((await page.locator(OPTION).count()) > 0, `${label} 搜索「${query}」没有结果`)
  }
  await page.locator(OPTION).first().click({ force: true })
  await page.waitForTimeout(200)
  assert.deepEqual(errors, [], `${label} 选中搜索结果报错`)
}

async function main() {
  const server = await startNextServer()
  const browser = await chromium.launch({
    executablePath: chromePath(),
  })
  try {
    await search(
      await browser.newPage({ viewport: { width: 1280, height: 900 } }),
      server.base,
      "桌面",
    )
    const touch = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
    })
    await search(await touch.newPage(), server.base, "触屏")
    console.log("PASS: 桌面和触屏的省市区搜索不崩溃，结果可选中")
  } finally {
    await browser.close()
    server.close()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
