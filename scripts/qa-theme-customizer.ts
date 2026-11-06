/** 专项验收：首帧脚本、损坏存储、局部隔离、恢复与触屏布局。 */
import assert from "node:assert/strict"
import { readFileSync, mkdirSync } from "node:fs"
import { renderToStaticMarkup } from "react-dom/server"
import { createElement } from "react"
import { chromium } from "playwright-core"
import { ThemeCustomizerScript } from "../src/registry/blocks/theme-customizer-01/theme-customizer-script"
import { chromePath } from "./lib/chrome"
import { startNextServer } from "./lib/next-server"

async function main() {
  const server = await startNextServer()
  const browser = await chromium.launch({
    executablePath: chromePath(),
    headless: true,
  })
  const errors: string[] = []
  try {
    const page = await browser.newPage()
    page.on("pageerror", (e) => errors.push(e.message))
    page.on("console", (m) => {
      if (m.type() === "error" && /hydration|hydrated/i.test(m.text()))
        errors.push(m.text())
    })
    const markup = renderToStaticMarkup(createElement(ThemeCustomizerScript))
    await page.route("**/script-test", (route) =>
      route.fulfill({
        contentType: "text/html",
        body:
          "<html><head>" +
          markup +
          "<script>window.firstAttributes = {...document.documentElement.dataset}</script></head><body>Test</body></html>",
      }),
    )
    await page.goto(server.base)
    await page.evaluate(() =>
      localStorage.setItem(
        "yiui:theme-customizer",
        JSON.stringify({
          theme: "blue",
          radius: "lg",
          contentWidth: "compact",
        }),
      ),
    )
    await page.goto(server.base + "/script-test")
    assert.deepEqual(
      await page.evaluate(
        () =>
          (window as unknown as { firstAttributes: unknown }).firstAttributes,
      ),
      { theme: "blue", radius: "lg", contentWidth: "compact" },
    )
    await page.evaluate(() =>
      localStorage.setItem("yiui:theme-customizer", "broken"),
    )
    await page.reload()
    assert.equal(
      await page.locator("html").getAttribute("data-theme"),
      "neutral",
    )
    await page.route("**/disabled-storage", (route) =>
      route.fulfill({
        contentType: "text/html",
        body:
          '<html><head><script>Object.defineProperty(window,"localStorage",{get(){throw Error("disabled")}})</script>' +
          markup +
          "</head><body>Test</body></html>",
      }),
    )
    await page.goto(server.base + "/disabled-storage")
    assert.equal(
      await page.locator("html").getAttribute("data-theme"),
      "neutral",
    )
    await page.goto(server.base + "/view/theme-customizer-01/")
    const before = await page.evaluate(() => ({
      attrs: document.documentElement.outerHTML.split(">")[0],
      storage: JSON.stringify(localStorage),
    }))
    await page.getByRole("button", { name: "定制主题" }).click()
    const initialButtonColor = await page
      .getByRole("button", { name: "创建项目" })
      .evaluate((e) => getComputedStyle(e).backgroundColor)
    await page.getByRole("radio", { name: "蓝色", exact: true }).click()
    await page.waitForTimeout(400)
    assert.notEqual(
      await page
        .getByRole("button", { name: "创建项目" })
        .evaluate((e) => getComputedStyle(e).backgroundColor),
      initialButtonColor,
    )
    await page.getByRole("radio", { name: "大", exact: true }).click()
    await page.getByRole("radio", { name: "深色", exact: true }).click()
    assert.equal(
      await page
        .locator('[data-slot="theme-customizer-preview"]')
        .getAttribute("data-radius"),
      "lg",
    )
    mkdirSync(".qa/theme-customizer", { recursive: true })
    await page.waitForTimeout(400)
    await page.screenshot({ path: ".qa/theme-customizer/desktop-popover.png" })
    const darkBackground = await page
      .locator('[data-slot="theme-customizer-preview"]')
      .evaluate((e) => getComputedStyle(e).backgroundColor)
    await page.getByRole("radio", { name: "浅色", exact: true }).click()
    assert.notEqual(
      await page
        .locator('[data-slot="theme-customizer-preview"]')
        .evaluate((e) => getComputedStyle(e).backgroundColor),
      darkBackground,
    )
    await page.getByRole("button", { name: "恢复默认" }).click()
    assert.equal(
      await page
        .locator('[data-slot="theme-customizer-preview"]')
        .getAttribute("data-radius"),
      "md",
    )
    const after = await page.evaluate(() => ({
      attrs: document.documentElement.outerHTML.split(">")[0],
      storage: JSON.stringify(localStorage),
    }))
    assert.deepEqual(after, before)
    await page.close()
    const mobile = await browser.newPage({
      viewport: { width: 375, height: 812 },
      hasTouch: true,
      isMobile: true,
    })
    await mobile.goto(server.base + "/view/theme-customizer-01/")
    await mobile.getByRole("button", { name: "定制主题" }).click()
    await mobile.locator('[data-slot="sheet-content"]').waitFor()
    assert.equal(
      await mobile.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    )
    mkdirSync(".qa/theme-customizer", { recursive: true })
    await mobile.waitForTimeout(500)
    await mobile.screenshot({ path: ".qa/theme-customizer/mobile-sheet.png" })
    assert.equal(
      readFileSync(
        "src/registry/blocks/theme-customizer-01/theme-customizer.css",
        "utf8",
      ).includes("--chart-"),
      false,
    )
    assert.deepEqual(errors, [])
    console.log("theme-customizer: all checks passed")
  } finally {
    await browser.close()
    server.close()
  }
}
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
