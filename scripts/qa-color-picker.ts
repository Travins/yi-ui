import { checkColorLock } from "./lib/qa-color-lock"
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
    await input.fill("#aabbccdd")
    await input.press("Enter")
    assert.equal(await input.getAttribute("aria-invalid"), "true")
    assert.equal(await input.inputValue(), "#aabbccdd")
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
    // 面板里的无效草稿在关闭后不能留在方条上；Esc 和点外部都要验证
    const color = await input.inputValue()
    for (const close of ["Escape", "outside"]) {
      await first.getByRole("button", { name: "选择颜色" }).click()
      const hex = page.getByRole("textbox", { name: "HEX", exact: true })
      await hex.fill("#aabbccdd")
      await hex.press("Enter")
      assert.equal(await hex.getAttribute("aria-invalid"), "true")
      if (close === "Escape") await page.keyboard.press("Escape")
      else await page.mouse.click(5, 500)
      await hex.waitFor({ state: "hidden" })
      assert.equal(await input.inputValue(), color)
      assert.equal(await input.getAttribute("aria-invalid"), "false")
    }
    // 有效草稿点外部关闭时仍然提交
    await first.getByRole("button", { name: "选择颜色" }).click()
    const hex = page.getByRole("textbox", { name: "HEX", exact: true })
    await hex.fill("#654321")
    await page.mouse.click(5, 500)
    await hex.waitFor({ state: "hidden" })
    assert.equal(await input.inputValue(), "#654321")
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
    await p
      .locator("[data-slot=color-picker-sheet]")
      .waitFor({ state: "visible" })
    assert.equal(
      await p
        .locator("[data-slot=color-picker-sheet]")
        .getAttribute("data-side"),
      "bottom",
    )
    console.log(
      "PASS: HEX 规范化、非法草稿、错误恢复、二维区键盘、色相键盘、375×812 触屏 Sheet",
    )
    await p.waitForTimeout(300)
    await p.screenshot({ path: ".qa/color-picker-sheet.png" })
    // 触屏：点「完成」关闭后，无效草稿同样不能留在方条上
    const barInput = p
      .locator("[data-slot=color-picker]")
      .first()
      .locator("input")
      .first()
    const barColor = await barInput.inputValue()
    const sheet = p.locator("[data-slot=color-picker-sheet]")
    await sheet.getByRole("textbox", { name: "HEX", exact: true }).fill("wrong")
    await sheet.getByRole("button", { name: "完成", exact: true }).tap()
    await sheet.waitFor({ state: "hidden" })
    assert.equal(await barInput.inputValue(), barColor)
    assert.equal(await barInput.getAttribute("aria-invalid"), "false")
    await checkColorLock(p, "picker")
    await checkColorLock(p, "palette")
    await checkColorLock(p, "select")
    await checkColorLock(page, "picker")
    await checkColorLock(page, "palette")
    await checkColorLock(page, "select")
    console.log("PASS: 桌面和触屏禁用关闭、松手不提交、启用不重开")
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
