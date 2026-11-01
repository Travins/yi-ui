import { chromium } from "playwright-core"
import assert from "node:assert/strict"
import { startNextServer } from "./lib/next-server"
async function main() {
  const server = await startNextServer()
  const browser = await chromium.launch({
    executablePath:
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: true,
  })
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
    })
    await page.goto(server.base + "/components/color-picker/")
    await page.waitForTimeout(1500)
    const first = page.locator("[data-slot=color-picker]").first()
    const input = first.locator("input").first()
    await input.fill("AbC")
    await input.press("Enter")
    await assert.equal(await input.inputValue(), "#aabbcc")
    await input.fill("wrong")
    await input.press("Enter")
    assert.equal(await input.getAttribute("aria-invalid"), "true")
    assert.equal(await input.inputValue(), "wrong")
    await input.fill("123456")
    await input.press("Enter")
    assert.equal(await input.inputValue(), "#123456")
    assert.equal(await input.getAttribute("aria-invalid"), "false")
    await first.getByRole("button", { name: "选择颜色" }).click()
    const saturation = page.getByRole("slider", { name: "饱和度", exact: true })
    await saturation.focus()
    const old = Number(await saturation.inputValue())
    await saturation.press("ArrowLeft")
    assert.ok(Number(await saturation.inputValue()) < old)
    await saturation.press("Shift+ArrowLeft")
    await saturation.press("Home")
    assert.equal(Number(await saturation.inputValue()), 0)
    const hue = page.getByRole("slider", { name: "色相", exact: true })
    await hue.focus()
    await hue.press("ArrowRight")
    assert.ok(await hue.getAttribute("aria-valuetext"))
    await page.waitForTimeout(300)
    await page.screenshot({ path: ".qa/color-picker-popover.png" })
    await page.keyboard.press("Escape")
    const mobile = await browser.newContext({
      viewport: { width: 375, height: 812 },
      isMobile: true,
      hasTouch: true,
    })
    const p = await mobile.newPage()
    await p.goto(server.base + "/components/color-picker/")
    await p
      .locator("[data-slot=color-picker]")
      .first()
      .getByRole("button", { name: "选择颜色" })
      .tap()
    await p.waitForTimeout(1000)
    await p.locator("[data-slot=sheet-content]").waitFor({ state: "visible" })
    assert.equal(
      await p.locator("[data-slot=sheet-content]").getAttribute("data-side"),
      "bottom",
    )
    console.log(
      "PASS: HEX 规范化、非法草稿、错误恢复、二维区键盘、色相键盘、375×812 触屏 Sheet",
    )
    await p.waitForTimeout(300)
    await p.screenshot({ path: ".qa/color-picker-sheet.png" })
    await mobile.close()
  } finally {
    await browser.close()
    server.close()
  }
}
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
