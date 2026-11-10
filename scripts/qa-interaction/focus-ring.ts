/** 焦点环、按压边框与光标检查（①②③④）。 */
import type { ElementHandle, Page } from "playwright-core"

import {
  CHECKS,
  CONTROL_SELECTOR,
  DESKTOP,
  INTERACTIVE_SELECTOR,
  MAX_CLICKS,
  MAX_PRESSES,
  PRESS_SELECTOR,
  RING_SETTLE_MS,
  STEPPER_SELECTOR,
} from "./constants"
import { add, describe, screenshot, type Ctx, type Scope } from "./context"
import { handleAt, pressPointer, resetFocus, usableIndexes } from "./locate"

/* ------------------------------------------------------------------ */
/* 共用：量元素自身 / 控件容器 / data-slot 容器上的框与环                */
/* ------------------------------------------------------------------ */

type BoxReport = {
  tag: string
  slot: string | null
  shadow: string
  outline: { style: string; width: number; color: string }
  invalid: boolean
  hasFocus: boolean
  clip: { tag: string; slot: string | null; overflow: string }[]
}

/** 点按、聚焦前后各量一次：有变化的环才是焦点环，一直都在的是状态环 */
export async function probeBoxes(target: ElementHandle<Element>) {
  return target.evaluate((node) => {
    const candidates: Element[] = [node]
    const control = node.closest('[data-slot$="-control"]')
    if (control) candidates.push(control)
    const slot = node.closest("[data-slot]")
    if (slot) candidates.push(slot)
    const active = document.activeElement
    return {
      self: {
        tag: node.tagName.toLowerCase(),
        slot: node.getAttribute("data-slot"),
        text: (
          (node as HTMLElement).innerText ||
          node.getAttribute("aria-label") ||
          ""
        )
          .trim()
          .replace(/\s+/g, " ")
          .slice(0, 14),
      },
      isActive: document.activeElement === node,
      focusVisible: node.matches(":focus-visible"),
      focusInside: Boolean(
        active && (node === active || node.contains(active)),
      ),
      boxes: candidates
        .filter((item, position) => candidates.indexOf(item) === position)
        .map((item) => {
          const style = getComputedStyle(item)
          const rect = item.getBoundingClientRect()
          const clip: {
            tag: string
            slot: string | null
            overflow: string
          }[] = []
          for (
            let parent = item.parentElement;
            parent && parent !== document.body;
            parent = parent.parentElement
          ) {
            const parentStyle = getComputedStyle(parent)
            const overflow = `${parentStyle.overflowX}/${parentStyle.overflowY}`
            if (!/hidden|clip/.test(overflow)) continue
            const parentRect = parent.getBoundingClientRect()
            // 环从元素外扩 3px：贴着祖先的边就会被裁
            if (
              rect.left - parentRect.left < 3 ||
              parentRect.right - rect.right < 3 ||
              rect.top - parentRect.top < 3 ||
              parentRect.bottom - rect.bottom < 3
            ) {
              clip.push({
                tag: parent.tagName.toLowerCase(),
                slot: parent.getAttribute("data-slot"),
                overflow,
              })
            }
            if (clip.length >= 2) break
          }
          return {
            tag: item.tagName.toLowerCase(),
            slot: item.getAttribute("data-slot"),
            shadow: style.boxShadow,
            outline: {
              style: style.outlineStyle,
              width: Number.parseFloat(style.outlineWidth) || 0,
              color: style.outlineColor,
            },
            invalid: Boolean(
              item.matches('[aria-invalid="true"], [data-invalid]') ||
              item.closest('[aria-invalid="true"], [data-invalid]'),
            ),
            hasFocus: Boolean(
              active && (item === active || item.contains(active)),
            ),
            clip,
          }
        }),
    }
  })
}

/** 有没有看得见的 outline（浏览器默认焦点环也算看得见） */
function outlineVisible(box: BoxReport) {
  if (box.outline.width < 1) return false
  if (box.outline.style === "none" || box.outline.style === "hidden")
    return false
  if (
    /^(transparent|rgba\(0,\s*0,\s*0,\s*0\))$/.test(box.outline.color) ||
    /\/\s*0\)$/.test(box.outline.color)
  )
    return false
  return true
}

/* ------------------------------------------------------------------ */
/* ① 点按后不出现焦点环                                                 */
/* ------------------------------------------------------------------ */

/**
 * 点完每个按钮 / 选项 / 触发条后，量它自己、它的控件容器、它所在 data-slot 元素上的环；
 * 再把焦点移走（状态不变）量一次：只有「聚焦时才有」的环才算焦点环，
 * 选中态那种一直在的环不算——否则点一下色板就会误报。
 */
export async function checkPointerRing(ctx: Ctx, page: Page, scope: Scope) {
  const targets = scope.locator.locator(INTERACTIVE_SELECTOR)
  const picked = await usableIndexes(targets, MAX_CLICKS)
  for (const index of picked) {
    const target = await handleAt(targets.nth(index))
    if (!target) continue
    try {
      await resetFocus(page, scope)
      const pressed = await pressPointer(page, target)
      if (!pressed) continue
      ctx.stats.clicks += 1
      // 等过渡结束再量，否则读到的是环渐显的中间态
      await page.waitForTimeout(RING_SETTLE_MS)
      const focused = await probeBoxes(target)
      // 焦点不在这个元素里：那是状态环，不是点按带来的
      if (focused.focusInside) {
        await page.evaluate(() =>
          (document.activeElement as HTMLElement | null)?.blur(),
        )
        await page.waitForTimeout(RING_SETTLE_MS)
        const blurred = await probeBoxes(target)
        for (const [position, box] of focused.boxes.entries()) {
          if (!box.hasFocus || box.invalid) continue
          const ring = widestRing(box.shadow)
          const baseline = widestRing(blurred.boxes[position]?.shadow ?? "")
          if (!ring || ring.spread < 3) continue
          if (ring.spread <= (baseline?.spread ?? 0)) continue
          const file = await screenshot(
            ctx,
            page,
            CHECKS.pointerRing,
            target,
            `${scope.label}|${describe(focused.self)}`,
          )
          add(
            ctx,
            CHECKS.pointerRing,
            `${scope.label} · ${describe(focused.self)}`,
            `点按后 ${box.tag}${box.slot ? `[${box.slot}]` : ""} 出现 ${ring.spread}px 外圈（box-shadow: ${box.shadow.slice(0, 90)}），指针聚焦不该有外圈`,
            "error",
            file,
          )
        }
      }
    } catch {
      // 点完之后示例结构变了（元素被替换 / 卸载），这个目标跳过
    }
    await resetFocus(page, scope)
  }
}

/* ------------------------------------------------------------------ */
/* ② 键盘 Tab 聚焦看得到焦点环                                          */
/* ------------------------------------------------------------------ */

/** 从 computed box-shadow 里挑出看得见的环：全透明的层、0 扩散的普通阴影都不算 */
function ringLayers(shadow: string): { spread: number; inset: boolean }[] {
  const layers: string[] = []
  let depth = 0
  let current = ""
  for (const char of shadow) {
    if (char === "(") depth += 1
    if (char === ")") depth -= 1
    if (char === "," && depth === 0) {
      layers.push(current)
      current = ""
      continue
    }
    current += char
  }
  layers.push(current)
  return layers.flatMap((layer) => {
    const value = layer.trim()
    if (!value || value === "none") return []
    // Chrome 把颜色写在长度前面：全透明色的层看不见
    if (
      /^(rgba\(0,\s*0,\s*0,\s*0\)|transparent)\b/.test(value) ||
      /^[a-z]+\([^)]*\/\s*0\)/.test(value)
    )
      return []
    const lengths = [...value.matchAll(/(-?\d+(?:\.\d+)?)px/g)].map((match) =>
      Number(match[1]),
    )
    if (lengths.length < 3) return []
    const spread = lengths[3] ?? 0
    if (spread < 1) return []
    return [{ spread, inset: /\binset\b/.test(value) }]
  })
}

/** 单个元素上最显眼的环：非 inset 优先，其次扩散大的 */
function widestRing(shadow: string) {
  const layers = ringLayers(shadow)
  if (!layers.length) return null
  return layers.sort(
    (left, right) =>
      Number(left.inset) - Number(right.inset) || right.spread - left.spread,
  )[0]
}

/**
 * 先按一次 Tab 让浏览器进入键盘模式，再程序化聚焦第一个控件：
 * 要求聚焦后「新出现」一圈看得见的环（≥3px）——选中态本来就有的环不算焦点指示。
 * 只有浏览器默认 outline、没有 3px 环的记为警告（示例里手写的按钮常见）。
 * 环还不能被 overflow 隐藏的祖先裁掉（放在容器里的选项要用 ring-inset）。
 */
export async function checkKeyboardRing(ctx: Ctx, page: Page, scope: Scope) {
  const targets = scope.locator.locator(
    "button, [role=radio], [role=switch], [role=slider]",
  )
  const picked = await usableIndexes(targets, 1)
  if (!picked.length) return
  const target = await handleAt(targets.nth(picked[0] ?? 0))
  if (!target) return
  // 先量没聚焦的样子：选中态的环在聚焦前后都在，不能当作焦点指示
  await page.mouse.move(1, 1)
  await page.evaluate(() =>
    (document.activeElement as HTMLElement | null)?.blur(),
  )
  await page.waitForTimeout(RING_SETTLE_MS)
  const before = await probeBoxes(target)
  // 按一次 Tab 进入键盘模式，再程序化聚焦（这样 :focus-visible 才会生效）
  await page.keyboard.press("Tab")
  await target.evaluate((node) => (node as HTMLElement).focus())
  await page.waitForTimeout(RING_SETTLE_MS)
  const after = await probeBoxes(target)
  if (!after.isActive) return
  const where = `${scope.label} · ${describe(after.self)}`
  const rows = after.boxes.map((box, position) => {
    const ring = widestRing(box.shadow)
    const previousRing =
      widestRing(before.boxes[position]?.shadow ?? "")?.spread ?? 0
    const previousOutline = before.boxes[position]
      ? outlineVisible(before.boxes[position])
      : false
    return {
      box,
      ring: ring && ring.spread > previousRing ? ring : null,
      newOutline: outlineVisible(box) && !previousOutline,
    }
  })
  const strong = rows.find((row) => row.ring && row.ring.spread >= 3)
  const thin = rows.find((row) => row.ring)
  const outlined = rows.find((row) => row.newOutline)
  if (!strong && !thin && !outlined) {
    const file = await screenshot(
      ctx,
      page,
      CHECKS.keyboardRing,
      target,
      `${scope.label}|${describe(after.self)}`,
    )
    add(
      ctx,
      CHECKS.keyboardRing,
      where,
      `键盘聚焦后没有任何可见焦点指示（:focus-visible = ${after.focusVisible}）：既没有环也没有 outline，键盘用户看不出焦点在哪；聚焦前后都有的环只是状态指示`,
      "error",
      file,
    )
    return
  }
  const ring = strong ?? thin
  // 组件有意用 ≥2px 实线 outline 做焦点指示（如色点：选中态已占用 ring，焦点改画外圈 outline 才分得开）也算合格；
  // 只有浏览器默认的 auto outline 才提示换成 ring
  const designedOutline =
    outlined?.box &&
    outlined.box.outline.style === "solid" &&
    outlined.box.outline.width >= 2
  if (!ring && !designedOutline) {
    // 只有浏览器默认 outline：看得见，但不是设计系统里的 3px 环
    const owner = outlined?.box
    const file = await screenshot(
      ctx,
      page,
      CHECKS.keyboardRing,
      target,
      `${scope.label}|${describe(after.self)}|outline`,
    )
    add(
      ctx,
      CHECKS.keyboardRing,
      where,
      `键盘聚焦只有浏览器默认 outline（${owner?.outline.style} ${owner?.outline.width}px），没有按规范给 focus-visible:ring-3：示例里手写的按钮请换成 Button / buttonVariants`,
      "warn",
      file,
    )
    return
  }
  // 用 outline 做焦点指示的（见上方 designedOutline）不再检查 ring 粗细与裁切
  if (!ring) return
  if (ring.ring && ring.ring.spread < 3) {
    const file = await screenshot(
      ctx,
      page,
      CHECKS.keyboardRing,
      target,
      `${scope.label}|${describe(after.self)}|thin`,
    )
    add(
      ctx,
      CHECKS.keyboardRing,
      where,
      `键盘聚焦时 ${ring.box.tag}${ring.box.slot ? `[${ring.box.slot}]` : ""} 只有 ${ring.ring.spread}px 的环（规范要求 3px）：可能被选中态环盖住，或本身写得偏细`,
      "warn",
      file,
    )
    return
  }
  // ring-inset 的环画在元素内侧，不会被裁
  if (!ring.ring || ring.ring.inset || !ring.box.clip.length) return
  const file = await screenshot(
    ctx,
    page,
    CHECKS.keyboardRing,
    target,
    `${scope.label}|${describe(after.self)}|clip`,
  )
  add(
    ctx,
    CHECKS.keyboardRing,
    where,
    `焦点环可能被裁切：祖先 ${ring.box.clip
      .map(
        (item) =>
          `${item.tag}${item.slot ? `[${item.slot}]` : ""}（overflow: ${item.overflow}）`,
      )
      .join("、")}，元素贴着它的边；这类容器里的选项应该用 ring-inset`,
    "warn",
    file,
  )
}

/* ------------------------------------------------------------------ */
/* ③ 按住不盖住边框                                                     */
/* ------------------------------------------------------------------ */

/**
 * 按住加减 / 分段 / 开关按钮，截下按下时的样子，并量按钮是否还留在控件边框的内侧。
 * 按钮伸到边框上（负边距、加高）时按下底色会盖住边框，出错态的红边就断了。
 */
export async function checkPressedBorder(ctx: Ctx, page: Page, scope: Scope) {
  const targets = scope.locator.locator(PRESS_SELECTOR)
  const picked = await usableIndexes(targets, MAX_PRESSES)
  for (const index of picked) {
    const target = await handleAt(targets.nth(index))
    if (!target) continue
    await resetFocus(page, scope)
    const box = await target.boundingBox()
    if (!box) continue
    const x = box.x + box.width / 2
    const y = box.y + box.height / 2
    const viewport = page.viewportSize() ?? DESKTOP
    if (x < 1 || y < 1 || x > viewport.width - 1 || y > viewport.height - 1)
      continue
    try {
      await page.mouse.move(x, y)
      await page.mouse.down()
      ctx.stats.presses += 1
      await page.waitForTimeout(140)
      const report = await target.evaluate((node, controlSelector) => {
        const control = node.closest(controlSelector)
        if (!control || control === node || node.contains(control)) return null
        // 控件本身没有边框（如放进网格工具栏的无框写法），没有可盖住的边，跳过
        const style = getComputedStyle(control)
        if (
          [
            style.borderTopWidth,
            style.borderRightWidth,
            style.borderBottomWidth,
            style.borderLeftWidth,
          ].every((width) => parseFloat(width) === 0)
        )
          return null
        const rect = node.getBoundingClientRect()
        const rectC = control.getBoundingClientRect()
        // 按钮离控件四边最近的那一段，小于 0.5px 就算压到边框上了
        const margin = Math.min(
          rect.left - rectC.left,
          rectC.right - rect.right,
          rect.top - rectC.top,
          rectC.bottom - rect.bottom,
        )
        return {
          margin: Math.round(margin * 100) / 100,
          self: {
            tag: node.tagName.toLowerCase(),
            slot: node.getAttribute("data-slot"),
            text: (node.getAttribute("aria-label") || "")
              .trim()
              .replace(/\s+/g, " ")
              .slice(0, 14),
          },
          control: {
            tag: control.tagName.toLowerCase(),
            slot: control.getAttribute("data-slot"),
          },
        }
      }, CONTROL_SELECTOR)
      if (report && report.margin < 0.5) {
        // 按下时的样子最直观：截控件，边框和按钮都在画面里
        const file = await screenshot(
          ctx,
          page,
          CHECKS.pressedBorder,
          target,
          `${scope.label}|${describe(report.self)}`,
        )
        add(
          ctx,
          CHECKS.pressedBorder,
          `${scope.label} · ${describe(report.self)}`,
          `按下时按钮压到 ${describe(report.control)} 的边框上（按钮离边框最近 ${report.margin}px，应该在边框内侧 ≥1px），按下底色会盖住边框和出错态红边`,
          "error",
          file,
        )
      }
    } catch {
      // 句柄失效：跳过这个目标
    }
    await page.mouse.up().catch(() => {})
    await resetFocus(page, scope)
  }
}

/* ------------------------------------------------------------------ */
/* ④ 点按后不留输入光标                                                 */
/* ------------------------------------------------------------------ */

/** 点加减按钮后焦点落在数字输入框上时，光标必须是透明的（不然触屏会弹软键盘） */
export async function checkCaretAfterPress(ctx: Ctx, page: Page, scope: Scope) {
  const targets = scope.locator.locator(STEPPER_SELECTOR)
  const picked = await usableIndexes(targets, 2)
  for (const index of picked) {
    const target = await handleAt(targets.nth(index))
    if (!target) continue
    const self = await target.evaluate((node) => ({
      tag: node.tagName.toLowerCase(),
      slot: node.getAttribute("data-slot"),
      text: (node.getAttribute("aria-label") || "").trim().slice(0, 14),
    }))
    await resetFocus(page, scope)
    const pressed = await pressPointer(page, target)
    if (!pressed) continue
    await page.waitForTimeout(180)
    try {
      const report = await page.evaluate(() => {
        const active = document.activeElement as HTMLInputElement | null
        if (!active || active.tagName !== "INPUT") return null
        return {
          caretColor: getComputedStyle(active).caretColor,
          slot: active.getAttribute("data-slot"),
        }
      })
      if (report && !/transparent|rgba\(0, 0, 0, 0\)/.test(report.caretColor)) {
        const file = await screenshot(
          ctx,
          page,
          CHECKS.caret,
          target,
          `${scope.label}|${describe(self)}`,
        )
        add(
          ctx,
          CHECKS.caret,
          `${scope.label} · ${describe(self)}`,
          `点按后焦点在 input${report.slot ? `[${report.slot}]` : ""} 上，caret-color 是 ${report.caretColor}（应为 transparent），触屏会弹出软键盘`,
          "error",
          file,
        )
      }
    } catch {
      // 句柄失效：跳过
    }
    await resetFocus(page, scope)
  }
}
