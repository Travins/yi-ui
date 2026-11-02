import { createRequire } from "node:module"
import type { Page } from "playwright-core"
import assert from "node:assert/strict"

// 使用 tsx 已安装的打包器，在脚本内挂载受控夹具，不增加公开示例或路由。
export async function checkColorLock(
  page: Page,
  kind: "picker" | "palette" | "select",
) {
  const require = createRequire(import.meta.url)
  const { build } = createRequire(require.resolve("tsx"))("esbuild")
  const result = await build({
    stdin: {
      contents: `
import * as React from "react"
import { createRoot } from "react-dom/client"
import { ColorPicker } from "@/registry/ui/color-picker/color-picker"
import { PaletteEditor } from "@/registry/ui/palette-editor/palette-editor"
import { BarSelect } from "@/registry/ui/bar-select/bar-select"
function Fixture() {
 const [locked, setLocked] = React.useState(false)
 const [value, setValue] = React.useState("#123456")
 const [colors, setColors] = React.useState(["#123456", "#abcdef"])
 const [calls, setCalls] = React.useState(0)
 React.useEffect(() => {
  const lock = () => setLocked(true), unlock = () => setLocked(false)
  window.addEventListener("qa-lock", lock)
  window.addEventListener("qa-unlock", unlock)
  return () => { window.removeEventListener("qa-lock", lock); window.removeEventListener("qa-unlock", unlock) }
 }, [])
 const commit = () => setCalls(n => n + 1)
 return <div data-qa-fixture>
 <output data-qa-calls>{calls}</output>
 {${JSON.stringify(kind)} === "picker" ? <ColorPicker value={value} onValueChange={v => {setValue(v); commit()}} onValueCommit={commit} disabled={locked} /> :
 ${JSON.stringify(kind)} === "palette" ? <PaletteEditor value={colors} onValueChange={v => {setColors(v); commit()}} onValueCommit={commit} disabled={locked} /> :
 <BarSelect options={[{value:"a",label:"甲"},{value:"b",label:"乙"}]} disabled={locked} />}
 </div>
}
document.body.innerHTML = ""
const root = document.createElement("div"); document.body.append(root)
createRoot(root).render(<Fixture />)
`,
      resolveDir: process.cwd(),
      loader: "tsx",
    },
    bundle: true,
    write: false,
    format: "iife",
    platform: "browser",
    define: { "process.env.NODE_ENV": '"production"' },
    tsconfig: "tsconfig.json",
  })
  if (kind === "picker")
    await page.evaluate(`Object.defineProperty(window, "EyeDropper", {
    configurable: true, value: class {
      open() { return new Promise(resolve => window.addEventListener("qa-eye",
        () => resolve({ sRGBHex: "#abcdef" }), { once: true })) }
    }
  })`)
  await page.addScriptTag({ content: result.outputFiles[0].text })
  const fixture = page.locator("[data-qa-fixture]")
  await fixture.waitFor()
  if (kind === "picker") {
    const input = fixture.locator("input").first()
    await input.fill("#aabbccdd")
    await input.press("Enter")
    assert.equal(await input.getAttribute("aria-invalid"), "true")
    assert.equal(await fixture.locator("[data-qa-calls]").textContent(), "0")
    await input.fill("#123456")
    await input.press("Escape")
  }
  const trigger = fixture
    .getByRole("button", {
      name:
        kind === "palette"
          ? "选择第 1 个颜色"
          : kind === "picker"
            ? "选择颜色"
            : undefined,
    })
    .first()
  await (
    kind === "select"
      ? fixture.locator("[data-slot=combobox-trigger]")
      : trigger
  ).click()
  const popup = page.locator(
    kind === "select"
      ? '[data-slot="combobox-content"],[data-slot="sheet-content"]'
      : '[data-slot="color-picker-panel"]',
  )
  await popup.waitFor({ state: "visible" })
  if (kind === "picker")
    await page.getByRole("button", { name: "吸取屏幕颜色" }).click()
  const slider = page.getByRole("slider", { name: "饱和度", exact: true })
  if (kind !== "select") {
    const box = await slider.boundingBox()
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
      await page.mouse.down()
    }
  }
  const calls = await fixture.locator("[data-qa-calls]").textContent()
  await page.evaluate(() => window.dispatchEvent(new Event("qa-lock")))
  await popup.waitFor({ state: "hidden" })
  await page.evaluate(() => window.dispatchEvent(new Event("qa-eye")))
  await page.mouse.up()
  await page.waitForTimeout(250)
  assert.equal(await fixture.locator("[data-qa-calls]").textContent(), calls)
  await page.evaluate(() => window.dispatchEvent(new Event("qa-unlock")))
  await page.waitForTimeout(100)
  assert.equal(await popup.isVisible(), false)
}
