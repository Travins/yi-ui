import { chromium } from "playwright-core"
import assert from "node:assert/strict"
import { mkdirSync } from "node:fs"
import { startNextServer } from "./lib/next-server"
async function main() {
  const server = await startNextServer()
  const browser = await chromium.launch({
    executablePath:
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: true,
  })
  try {
    mkdirSync(".qa", { recursive: true })
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
    })
    await page.goto(server.base + "/components/palette-editor/")
    const editor = page.locator('[data-slot="palette-editor"]').first()
    const rows = editor.locator('[data-slot="palette-editor-item"]')
    await rows.first().waitFor()
    const input = () => rows.locator("input").first()
    const original = await input().inputValue()
    await rows
      .first()
      .getByRole("button", { name: /^下移第 \d+ 个颜色$/ })
      .click()
    assert.notEqual(await input().inputValue(), original)
    await rows
      .nth(1)
      .getByRole("button", { name: /^上移第 \d+ 个颜色$/ })
      .press("Alt+ArrowUp")
    assert.equal(await input().inputValue(), original)
    assert.match(
      await editor.locator("[aria-live=polite]").innerText(),
      /第 2 项已移到第 1 项/,
    )
    await rows
      .first()
      .getByRole("button", { name: /^下移第 \d+ 个颜色$/ })
      .press("Alt+ArrowDown")
    assert.match(
      await editor.locator("[aria-live=polite]").innerText(),
      /第 1 项已移到第 2 项/,
    )
    const swatch = editor.locator("[data-slot=palette-editor-swatch]").first()
    const before = await swatch.getAttribute("style")
    await editor.getByRole("radio", { name: "红色盲", exact: true }).click()
    assert.notEqual(await swatch.getAttribute("style"), before)
    while ((await rows.count()) > 1)
      await rows
        .last()
        .getByRole("button", { name: /^删除第 \d+ 个颜色$/ })
        .click()
    assert.equal(
      await rows
        .first()
        .getByRole("button", { name: /^删除第 \d+ 个颜色$/ })
        .isDisabled(),
      true,
    )
    await input().fill("#000000")
    await input().press("Enter")
    await editor.getByRole("button", { name: "添加颜色", exact: true }).click()
    await rows.nth(1).locator("input").fill("#000000")
    await rows.nth(1).locator("input").press("Enter")
    assert.match(
      await editor.locator("[data-slot=palette-editor-conflicts]").innerText(),
      /难以分清/,
    )
    await rows.nth(1).locator("input").fill("#ffffff")
    await rows.nth(1).locator("input").press("Enter")
    // 没有冲突时不渲染提示区
    assert.equal(
      await editor.locator("[data-slot=palette-editor-conflicts]").count(),
      0,
    )
    while ((await rows.count()) < 12)
      await editor
        .getByRole("button", { name: "添加颜色", exact: true })
        .click()
    assert.equal(
      await editor
        .getByRole("button", { name: "添加颜色", exact: true })
        .isDisabled(),
      true,
    )
    await page.setViewportSize({ width: 375, height: 812 })
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    )
    await editor.screenshot({ path: ".qa/palette-editor-mobile.png" })
    // findConflicts：提示只来自传入的函数（示例只查绿色盲视角）
    await page.setViewportSize({ width: 1440, height: 1000 })
    const custom = page
      .locator('[data-slot="palette-editor"]')
      .filter({ has: page.locator('input[value="#0077bb"]') })
    const hints = custom.locator("[data-slot=palette-editor-conflicts] li")
    assert.ok((await hints.count()) > 0)
    for (const text of await hints.allInnerTexts())
      assert.match(text, /绿色盲视角/)
    console.log(
      "PASS: 自定义检查、增删上下限、按钮与 Alt 排序、播报、色觉切换、冲突出现与消失、375px 无溢出",
    )
  } finally {
    await browser.close()
    server.close()
  }
}
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
