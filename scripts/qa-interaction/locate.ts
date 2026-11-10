/** 定位与指针辅助：示例范围、复位焦点、按下、可点目标。 */
import type { ElementHandle, Locator, Page } from "playwright-core"

import { DESKTOP } from "./constants"
import type { Scope } from "./context"

/**
 * 找出页面上每个示例的预览区域。
 * 组件页取文档预览面板（`main [role=tabpanel]`，跳过代码面板、安装命令面板与嵌套标签页），
 * 区块的独立预览页整页就是一个示例。
 */
export async function exampleScopes(
  page: Page,
  isView: boolean,
  url: string,
): Promise<Scope[]> {
  if (isView) {
    const main = page.locator("main").first()
    const locator = (await main.count()) ? main : page.locator("body")
    return [{ locator, label: "整页" }]
  }
  const panels = page.locator("main [role=tabpanel]")
  const found = await page.evaluate(() => {
    const result: { index: number; text: string }[] = []
    document
      .querySelectorAll("main [role=tabpanel]")
      .forEach((panel, index) => {
        // 嵌套的标签页是示例内部的东西，不是示例本身
        if (panel.parentElement?.closest("[role=tabpanel]")) return
        // 代码面板挂了 keepMounted，但尺寸是 0，下面的尺寸检查会跳过它们。
        // 这里不能按「有没有 pre」排除：有的表单示例会在预览里显示一段代码
        const text = ((panel as HTMLElement).innerText || "").trim()
        // 安装命令面板
        if (/shadcn@latest|npx |pnpm |yarn |bun /.test(text)) return
        const rect = panel.getBoundingClientRect()
        if (rect.width < 1 || rect.height < 1) return
        result.push({
          index,
          text: text.replace(/\s+/g, " ").slice(0, 18),
        })
      })
    return result
  })
  return found.map((item, index) => ({
    locator: panels.nth(item.index),
    label: `${url} · 示例 #${index + 1}${item.text ? `（${item.text}…）` : ""}`,
  }))
}

/**
 * 回到「什么都没按」的状态：先按 Escape 关掉弹出的菜单 / 浮层，
 * 再点示例范围内的空白处把焦点移走。范围里找不到空白点时退化成 blur。
 */
export async function resetFocus(page: Page, scope: Scope) {
  await page.keyboard.press("Escape").catch(() => {})
  await page.waitForTimeout(40)
  const point = await scope.locator.evaluate((root) => {
    const rect = root.getBoundingClientRect()
    const candidates: [number, number][] = [
      [rect.left + 3, rect.top + 3],
      [rect.right - 3, rect.top + 3],
      [rect.left + 3, rect.bottom - 3],
      [rect.right - 3, rect.bottom - 3],
    ]
    for (const [x, y] of candidates) {
      if (
        x < 1 ||
        y < 1 ||
        x > window.innerWidth - 1 ||
        y > window.innerHeight - 1
      )
        continue
      const node = document.elementFromPoint(x, y)
      if (!node) continue
      if (node !== root && !root.contains(node)) continue
      if (
        node.closest(
          "button, a, input, select, textarea, [role=button], [role=radio], [role=switch], [role=slider], [tabindex]",
        )
      )
        continue
      return [x, y] as [number, number]
    }
    return null
  })
  if (point) {
    await page.mouse.click(point[0], point[1])
  } else {
    await page.evaluate(() =>
      (document.activeElement as HTMLElement | null)?.blur(),
    )
  }
  await page.waitForTimeout(40)
}

/**
 * 用鼠标在有坐标的位置按下再抬起（和真人点按一致：会产生 pointerdown / pointerup）。
 * 元素被别的元素盖住时返回 false，避免点错东西。
 */
export async function pressPointer(
  page: Page,
  target: ElementHandle<Element>,
): Promise<boolean> {
  try {
    await target.scrollIntoViewIfNeeded({ timeout: 2000 })
  } catch {
    return false
  }
  const box = await target.boundingBox()
  if (!box || box.width < 1 || box.height < 1) return false
  const x = box.x + box.width / 2
  const y = box.y + box.height / 2
  const viewport = page.viewportSize() ?? DESKTOP
  if (x < 1 || y < 1 || x > viewport.width - 1 || y > viewport.height - 1)
    return false
  const reachable = await target.evaluate(
    (node, point) => {
      const hit = document.elementFromPoint(point[0] ?? 0, point[1] ?? 0)
      if (!hit) return false
      return hit === node || node.contains(hit) || hit.contains(node)
    },
    [x, y],
  )
  if (!reachable) return false
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.up()
  return true
}

/** 判断一批目标里哪些可以点（可见、没有禁用） */
export async function usableIndexes(
  targets: Locator,
  limit: number,
): Promise<number[]> {
  const flags = await targets.evaluateAll((nodes) =>
    nodes.map((node) => {
      const rect = node.getBoundingClientRect()
      const style = getComputedStyle(node)
      const disabled = Boolean(
        node.closest("[aria-disabled='true'], [data-disabled], :disabled"),
      )
      return {
        usable:
          rect.width > 1 &&
          rect.height > 1 &&
          style.visibility !== "hidden" &&
          !disabled,
      }
    }),
  )
  return flags
    .map((flag, index) => (flag.usable ? index : -1))
    .filter((index) => index >= 0)
    .slice(0, limit)
}

/* ------------------------------------------------------------------ */
/* 共用：把 locator 变成 element handle                                 */
/* ------------------------------------------------------------------ */

/**
 * 点按会改状态，示例可能把按钮整个换掉：locator 再查一次会等 30 秒。
 * 先拿成 handle，句柄失效时立刻抛错，跳过这个目标就行。
 */
export async function handleAt(
  target: Locator,
): Promise<ElementHandle<Element> | null> {
  try {
    return await target.elementHandle({ timeout: 2000 })
  } catch {
    return null
  }
}
