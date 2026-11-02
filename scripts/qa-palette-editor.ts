import { chromium } from "playwright-core"
import assert from "node:assert/strict"
import { mkdirSync } from "node:fs"
import {
  hsvToRgb,
  parseHex,
  rgbToHex,
  rgbToHsv,
} from "../src/registry/lib/color"
import { findColorConflicts } from "../src/registry/lib/color-vision"
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
    // 从公开三色示例扩展两次：数量、顺序和零冲突都必须稳定。
    const sequences: string[][] = []
    for (let run = 0; run < 2; run++) {
      assert.equal(await rows.count(), 3)
      while ((await rows.count()) < 12) {
        await editor
          .getByRole("button", { name: "添加颜色", exact: true })
          .click()
        assert.equal(
          await editor.locator("[data-slot=palette-editor-conflicts]").count(),
          0,
        )
      }
      sequences.push(
        await rows
          .locator("input")
          .evaluateAll((els) =>
            els.map((el) => (el as HTMLInputElement).value),
          ),
      )
      await page.reload()
      await rows.first().waitFor()
    }
    assert.deepEqual(sequences[0], sequences[1])
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
    // 构造大量冲突，隐藏的提示仍须保留所有行的警示标记。
    const colors = Array.from(
      { length: 12 },
      (_, i) => `#${(i * 2).toString(16).padStart(2, "0").repeat(3)}`,
    )
    for (const [i, color] of colors.entries()) {
      await rows.nth(i).locator("input").fill(color)
      await rows.nth(i).locator("input").press("Enter")
    }
    const conflictList = editor.locator(
      "[data-slot=palette-editor-conflicts] li",
    )
    assert.equal(await conflictList.count(), 5)
    const texts = await conflictList.allInnerTexts()
    const expected = [...findColorConflicts(colors)].sort(
      (a, b) => a.deltaE - b.deltaE,
    )
    assert.equal(texts[4], `另有 ${expected.length - 4} 条同样难以分清`)
    const shownRows = new Set<number>()
    const deltas = texts.slice(0, 4).map((text, i) => {
      const match = text.match(/第 (\d+)、(\d+) 项.*ΔE ([\d.]+)/)
      assert.ok(match, text)
      shownRows.add(Number(match[1]) - 1)
      shownRows.add(Number(match[2]) - 1)
      assert.equal(Number(match[1]) - 1, expected[i].a)
      assert.equal(Number(match[2]) - 1, expected[i].b)
      assert.equal(Number(match[3]), Number(expected[i].deltaE.toFixed(1)))
      return Number(match[3])
    })
    assert.deepEqual(
      deltas,
      [...deltas].sort((a, b) => a - b),
    )
    const marked = rows.filter({ has: page.locator("text=难以分清") })
    const allConflictRows = new Set(expected.flatMap((c) => [c.a, c.b]))
    assert.equal(
      await editor
        .locator("[data-slot=palette-editor-item][data-conflict]")
        .count(),
      allConflictRows.size,
    )
    assert.equal(await marked.count(), allConflictRows.size)
    assert.ok(allConflictRows.size > shownRows.size)
    await page.setViewportSize({ width: 375, height: 812 })
    // 窄屏下 HEX 必须完整显示，放不下时操作按钮换行
    for (const box of await rows
      .locator("input")
      .evaluateAll((els) =>
        els.map((e) => [
          (e as HTMLInputElement).scrollWidth,
          (e as HTMLInputElement).clientWidth,
        ]),
      ))
      assert.ok(box[0] <= box[1], `HEX 被截断：${box}`)
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
    const customInputs = custom.locator("[data-slot=palette-editor-item] input")
    const last = await customInputs.last().inputValue()
    const hsv = rgbToHsv(parseHex(last)!)
    const golden = rgbToHex(
      hsvToRgb({
        ...hsv,
        h: (hsv.h + 137.5) % 360,
        s: Math.max(hsv.s, 0.45),
        v: Math.max(hsv.v, 0.55),
      }),
    )
    await custom.getByRole("button", { name: "添加颜色", exact: true }).click()
    assert.equal(await customInputs.last().inputValue(), golden)
    console.log(
      "PASS: 自定义检查、增删上下限、按钮与 Alt 排序、播报、色觉切换、冲突出现与消失、提示上限与汇总、ΔE 升序、全部冲突行标记、375px 无溢出且 HEX 完整",
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
