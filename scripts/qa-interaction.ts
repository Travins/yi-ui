/**
 * 表单与可交互组件的交互验收：按 `component-acceptance` 技能第 6 节「表单与可交互组件的必查项」
 * 逐条跑一遍组件页里的每个示例，输出一页带截图的问题报告。
 *
 *   pnpm qa:interaction                                # 全部组件
 *   pnpm qa:interaction number-stepper phone-input     # 指定组件 / 区块
 *   pnpm qa:interaction toggle-switch --base http://localhost:3000
 *   pnpm qa:interaction toggle-switch --build          # 对 `pnpm build` 的产物起临时 next start
 *   pnpm qa:interaction toggle-switch --open           # 生成后打开报告
 *
 * 默认连已经在跑的开发服务器 http://localhost:3002（脚本不会自己起 dev server）。
 * 输出：.qa/interaction-<时间戳>/index.html + report.json；有问题时退出码为 1。
 * Chrome 路径可用 CHROME_PATH 覆盖。
 */
import { exec } from "node:child_process"
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs"
import { join, resolve } from "node:path"
import {
  chromium,
  type Browser,
  type BrowserContext,
  type ElementHandle,
  type Locator,
  type Page,
} from "playwright-core"

import { startNextServer } from "./lib/next-server"

const CHROME =
  process.env.CHROME_PATH ??
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
const DEFAULT_BASE = "http://localhost:3002"
const DESKTOP = { width: 1280, height: 1000 }
const MOBILE = { width: 390, height: 844 }

/** 没有参数时检查全部组件文档 */
const DEFAULT_NAMES = readdirSync("content/docs/components")
  .filter((file) => file.endsWith(".mdx") && file !== "index.mdx")
  .map((file) => file.slice(0, -4))

/**
 * 状态切换时宽度必须一致的控件：倒计时 / 进行中会换文字，宽度不能跟着变（叠放占位）。
 * 新增同类控件时往这里加选择器即可。
 */
const STABLE_WIDTH_SELECTORS = ["[data-slot=phone-input-send]"]

/**
 * 环要等过渡结束才量得准：shadcn Button 用 transition-all，环是渐显的（150ms）；
 * 量太早会读到过渡中间态（0px、全透明），把有环的当成没环。
 */
const RING_SETTLE_MS = 320
/** 每个示例最多点几个按钮，免得示例按钮特别多时跑太久 */
const MAX_CLICKS = 12
/** 按住检查最多摸几个按钮 */
const MAX_PRESSES = 6
/** 可点目标 */
const INTERACTIVE_SELECTOR =
  'button, [role=radio], [role=switch], [role=slider], input[type=range], [data-slot$="-trigger"]'
/** 需要「按住不盖住边框」的目标：加减、分段选项、开关 */
const PRESS_SELECTOR =
  '[data-slot$="-increment"], [data-slot$="-decrement"], [data-slot="segmented-control-item"], [role=switch], [role=radio]'
/** 「点按后不留输入光标」的目标：加减按钮 */
const STEPPER_SELECTOR = '[data-slot$="-increment"], [data-slot$="-decrement"]'
/** 表单控件的容器：判断边框、裁切、高度都从它入手 */
const CONTROL_SELECTOR =
  '[data-slot$="-control"], [data-slot="segmented-control"]'

const CHECKS = {
  pointerRing: "① 点按后不出现焦点环",
  keyboardRing: "② 键盘 Tab 聚焦看得到焦点环",
  pressedBorder: "③ 按住不盖住边框",
  caret: "④ 点按后不留输入光标",
  labels: "⑤ 390px 下每个字段都有可见标签",
  width: "⑥ 状态切换宽度不变",
  errorClear: "⑦ 错误能消失",
  mobile: "⑧ 手机不横向溢出 / 输入字号 / 控件高度",
  cardSpec: "⑨ 示例卡片规范",
  buttonHeight: "⑪ 提交按钮高度",
  runtime: "⑩ 运行时报错",
  popupHighlight: "⑫ 弹层打开时方条保持高亮",
  toolbarFit: "⑬ 工具栏里铺满整格",
} as const

const CHECK_IDS: Record<string, string> = {
  [CHECKS.pointerRing]: "pointer-ring",
  [CHECKS.keyboardRing]: "keyboard-ring",
  [CHECKS.pressedBorder]: "pressed-border",
  [CHECKS.caret]: "caret",
  [CHECKS.labels]: "labels",
  [CHECKS.width]: "width",
  [CHECKS.errorClear]: "error-clear",
  [CHECKS.mobile]: "mobile",
  [CHECKS.cardSpec]: "card-spec",
  [CHECKS.buttonHeight]: "button-height",
  [CHECKS.runtime]: "runtime",
  [CHECKS.popupHighlight]: "popup-highlight",
  [CHECKS.toolbarFit]: "toolbar-fit",
}

type Level = "error" | "warn"

type Issue = {
  component: string
  check: string
  where: string
  message: string
  level: Level
  screenshot: string | null
}

/** 一个组件的上下文：问题收集、截图缓存 */
type Ctx = {
  component: string
  url: string
  dir: string
  issues: Issue[]
  shots: Map<string, string>
  counter: { value: number }
  seen: Set<string>
  /** 跑了多少：证明检查真的点到了控件，而不是空转 */
  stats: {
    scopes: number
    clicks: number
    presses: number
    widths: number
    fields: number
    bars: number
    popups: number
    cells: number
  }
}

/** 一个示例的预览区域：文档里的预览面板，区块是整页 */
type Scope = {
  locator: Locator
  label: string
}

/** 元素的简短描述，用来写「位置」 */
function describe(element: {
  tag: string
  slot: string | null
  text?: string
}): string {
  const slot = element.slot ? `[${element.slot}]` : ""
  const text = element.text ? `「${element.text}」` : ""
  return `${element.tag}${slot}${text}`
}

function add(
  ctx: Ctx,
  check: string,
  where: string,
  message: string,
  level: Level = "error",
  screenshot: string | null = null,
) {
  // 同一个位置同一句话只报一次：多次点击 / 多次渲染会撞出重复
  const key = `${check}|${where}|${message}`
  if (ctx.seen.has(key)) return
  ctx.seen.add(key)
  ctx.issues.push({
    component: ctx.component,
    check,
    where,
    message,
    level,
    screenshot,
  })
  console.log(
    `  ${level === "error" ? "✗" : "△"} ${check}\n    ${where}\n    ${message}`,
  )
}

/**
 * 截一张图给问题用：同一范围 + 同一检查项只截一次（多个问题共用一张图）。
 * 优先截「元素周围一圈」，整页 / 整个示例作为兜底。
 */
async function screenshot(
  ctx: Ctx,
  page: Page,
  check: string,
  target: Locator | ElementHandle<Element> | null,
  key: string,
): Promise<string | null> {
  const cacheKey = `${check}|${key}`
  const cached = ctx.shots.get(cacheKey)
  if (cached) return cached
  const id = CHECK_IDS[check] ?? "issue"
  const file = `${String(ctx.counter.value++).padStart(3, "0")}-${id}.png`
  const path = join(ctx.dir, file)
  try {
    if (target) {
      await target.scrollIntoViewIfNeeded()
      await page.waitForTimeout(60)
      const box = await target.boundingBox()
      if (box) {
        // 焦点环画在元素外面，四周留一点余量才看得见
        const pad = 24
        const viewport = page.viewportSize() ?? DESKTOP
        const clip = {
          x: Math.max(0, box.x - pad),
          y: Math.max(0, box.y - pad),
          width: Math.min(
            viewport.width - Math.max(0, box.x - pad),
            box.width + pad * 2,
          ),
          height: Math.min(
            viewport.height - Math.max(0, box.y - pad),
            box.height + pad * 2,
          ),
        }
        if (clip.width > 4 && clip.height > 4) {
          await page.screenshot({ path, clip })
        } else {
          await page.screenshot({ path })
        }
      } else {
        await page.screenshot({ path })
      }
    } else {
      await page.screenshot({ path })
    }
  } catch {
    return null
  }
  ctx.shots.set(cacheKey, file)
  return file
}

/* ------------------------------------------------------------------ */
/* 页面与示例范围                                                       */
/* ------------------------------------------------------------------ */

/** 运行时报错与 console.error 归到第 ⑩ 项 */
function watchRuntime(ctx: Ctx, page: Page, where: string) {
  page.on("pageerror", (error) => {
    add(ctx, CHECKS.runtime, where, error.message.slice(0, 300))
  })
  page.on("console", (message) => {
    if (message.type() !== "error") return
    const text = message.text()
    // 本地 next start 不代理 Vercel Analytics，这条 404 是环境噪声
    if (/_vercel\//.test(`${text} ${message.location().url ?? ""}`)) return
    add(ctx, CHECKS.runtime, where, text.slice(0, 300))
  })
}

/**
 * 找出页面上每个示例的预览区域。
 * 组件页取文档预览面板（`main [role=tabpanel]`，跳过代码面板、安装命令面板与嵌套标签页），
 * 区块的独立预览页整页就是一个示例。
 */
async function exampleScopes(
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
async function resetFocus(page: Page, scope: Scope) {
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
async function pressPointer(
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
async function usableIndexes(
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
async function handleAt(
  target: Locator,
): Promise<ElementHandle<Element> | null> {
  try {
    return await target.elementHandle({ timeout: 2000 })
  } catch {
    return null
  }
}

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
async function probeBoxes(target: ElementHandle<Element>) {
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
async function checkPointerRing(ctx: Ctx, page: Page, scope: Scope) {
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
async function checkKeyboardRing(ctx: Ctx, page: Page, scope: Scope) {
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
async function checkPressedBorder(ctx: Ctx, page: Page, scope: Scope) {
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
async function checkCaretAfterPress(ctx: Ctx, page: Page, scope: Scope) {
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

/* ------------------------------------------------------------------ */
/* ⑫ 弹层打开时方条保持高亮                                              */
/* ------------------------------------------------------------------ */

/**
 * 点开方条里的触发键，把鼠标移开后量方条底色：和未悬停时一样，
 * 用户把鼠标移进弹层时就看不出弹层属于哪一条。
 */
async function checkPopupHighlight(ctx: Ctx, page: Page, scope: Scope) {
  const controls = scope.locator.locator(
    '[data-slot$="-control"]:has(button[aria-expanded])',
  )
  for (const index of await usableIndexes(controls, 4)) {
    const control = controls.nth(index)
    const trigger = await handleAt(
      control.locator("button[aria-expanded]").first(),
    )
    if (!trigger) continue
    const background = () =>
      control.evaluate((node) => getComputedStyle(node).backgroundColor)
    const where = `${scope.label} · ${await control.getAttribute("data-slot")}`
    await resetFocus(page, scope)
    await page.mouse.move(1, 1)
    await page.waitForTimeout(RING_SETTLE_MS)
    const idle = await background()
    if (!(await pressPointer(page, trigger))) continue
    await page.mouse.move(1, 1)
    await page.waitForTimeout(RING_SETTLE_MS)
    if ((await trigger.getAttribute("aria-expanded")) === "true") {
      ctx.stats.popups += 1
      const open = await background()
      if (open === idle) {
        add(
          ctx,
          CHECKS.popupHighlight,
          where,
          `弹层打开、鼠标移开后方条底色仍是 ${idle}，看不出弹层属于这一条`,
          "error",
          await screenshot(ctx, page, CHECKS.popupHighlight, trigger, where),
        )
      }
    }
    await resetFocus(page, scope)
  }
}

/* ------------------------------------------------------------------ */
/* ⑬ 工具栏里铺满整格                                                    */
/* ------------------------------------------------------------------ */

async function checkToolbarFit(ctx: Ctx, _page: Page, scope: Scope) {
  const reports = await scope.locator.evaluate((root, selector) => {
    const cells = root.querySelectorAll("[data-slot=grid-toolbar-item]")
    return [...cells].flatMap((cell) => {
      const control = cell.querySelector(selector)
      if (!control) return []
      const style = getComputedStyle(control)
      const inner = control.getBoundingClientRect()
      return {
        slot: control.getAttribute("data-slot"),
        border: parseFloat(style.borderTopWidth),
        radius: parseFloat(style.borderTopLeftRadius),
        // 格子的边线占 1px
        gap: cell.getBoundingClientRect().height - inner.height,
      }
    })
  }, CONTROL_SELECTOR)
  for (const report of reports) {
    ctx.stats.cells += 1
    const problems = [
      report.border > 0 && `还有 ${report.border}px 外框`,
      report.radius > 0 && `还有 ${report.radius}px 圆角`,
      report.gap > 1.5 && `比格子矮 ${report.gap}px`,
    ].filter(Boolean)
    if (problems.length) {
      add(
        ctx,
        CHECKS.toolbarFit,
        `${scope.label} · ${report.slot}`,
        `放进 GridToolbarItem 后${problems.join("、")}，缺少 in-data-[slot=grid-toolbar]: 适配`,
      )
    }
  }
}

/* ------------------------------------------------------------------ */
/* ⑥ 状态切换宽度不变                                                   */
/* ------------------------------------------------------------------ */

/** 触发一次状态切换（倒计时 / 进行中 / 完成），在 0 / 100 / 900 / 1500ms 各量一次宽度 */
async function checkStableWidth(ctx: Ctx, page: Page, url: string) {
  for (const selector of STABLE_WIDTH_SELECTORS) {
    const targets = page.locator(`main ${selector}`)
    const picked = await usableIndexes(targets, 3)
    for (const index of picked) {
      const target = await handleAt(targets.nth(index))
      if (!target) continue
      const width = () =>
        target.evaluate(
          (node) => Math.round(node.getBoundingClientRect().width * 100) / 100,
        )
      const samples = [await width()]
      const pressed = await pressPointer(page, target)
      if (!pressed) continue
      ctx.stats.widths += 1
      let waited = 0
      try {
        for (const at of [0, 100, 900, 1500]) {
          if (at > waited) {
            await page.waitForTimeout(at - waited)
            waited = at
          }
          samples.push(await width())
        }
      } catch {
        continue
      }
      const unique = [...new Set(samples)]
      if (unique.length > 1) {
        const file = await screenshot(
          ctx,
          page,
          CHECKS.width,
          target,
          `${url}|${selector}|${index}`,
        )
        const self = await target.evaluate((node) => ({
          tag: node.tagName.toLowerCase(),
          slot: node.getAttribute("data-slot"),
          text: ((node as HTMLElement).innerText || "").trim().slice(0, 14),
        }))
        add(
          ctx,
          CHECKS.width,
          `${url} · ${describe(self)}`,
          `状态切换时宽度变了：${samples.join(" → ")}px（触发前 / 0 / 100 / 900 / 1500ms），状态文字应该叠放占位、宽度保持一致`,
          "error",
          file,
        )
      }
    }
  }
}

/* ------------------------------------------------------------------ */
/* ⑤ 390px 下每个字段都有可见标签 / ⑧ 手机布局                          */
/* ------------------------------------------------------------------ */

type MobileField = {
  name: string
  fontSize: number
  ariaLabel: string | null
  labels: string[]
  hasAccessibleName: boolean
  searchWithHiddenLabel: boolean
}

type MobileBar = {
  tag: string
  slot: string | null
  height: number
}

/**
 * 390 宽 + 触屏下扫一遍示例里的输入框与方条控件。
 * 视觉上藏起来的输入（hidden、sr-only、clip-path、1px、opacity 0）不算字段：
 * 那些是自绘控件的无障碍替身，不需要可见标签、也不会弹软键盘。
 */
async function mobileSnapshot(
  scope: Scope,
): Promise<{ fields: MobileField[]; bars: MobileBar[] }> {
  return scope.locator.evaluate((root) => {
    const fields: {
      name: string
      fontSize: number
      ariaLabel: string | null
      labels: string[]
      hasAccessibleName: boolean
      searchWithHiddenLabel: boolean
    }[] = []
    root.querySelectorAll("input").forEach((input) => {
      const rect = input.getBoundingClientRect()
      const style = getComputedStyle(input)
      const hidden =
        input.type === "hidden" ||
        Boolean(input.closest(".sr-only")) ||
        rect.width <= 1 ||
        rect.height <= 1 ||
        style.opacity === "0" ||
        style.visibility === "hidden" ||
        style.display === "none" ||
        style.clipPath === "inset(50%)" ||
        style.clip === "rect(0px, 0px, 0px, 0px)"
      if (hidden) return
      const labels: string[] = []
      // 候选标签：<label> 关联的 + aria-labelledby 指向的
      const candidates: Element[] = []
      Array.from(input.labels ?? []).forEach((label) => candidates.push(label))
      ;(input.getAttribute("aria-labelledby") || "")
        .split(/\s+/)
        .filter(Boolean)
        .forEach((id) => {
          const node = document.getElementById(id)
          if (node) candidates.push(node)
        })
      candidates.forEach((label) => {
        if (label.closest(".sr-only")) return
        const labelStyle = getComputedStyle(label)
        const labelRect = label.getBoundingClientRect()
        const text = (label.textContent || "").trim()
        if (!text) return
        if (labelStyle.display === "none" || labelStyle.visibility === "hidden")
          return
        if (labelStyle.opacity === "0") return
        if (labelRect.width < 1 || labelRect.height < 1) return
        labels.push(text.replace(/\s+/g, " ").slice(0, 20))
      })
      const ariaLabel = input.getAttribute("aria-label")
      fields.push({
        name:
          input.getAttribute("data-slot") ||
          input.name ||
          input.id ||
          input.type,
        fontSize: Number.parseFloat(style.fontSize),
        ariaLabel: ariaLabel ? ariaLabel.trim() : null,
        labels,
        hasAccessibleName: Boolean(labels.length || ariaLabel?.trim()),
        // 搜索框允许隐藏标签；仍需真实关联名称、占位提示和可见搜索图标。
        searchWithHiddenLabel:
          input.type === "search" &&
          Boolean(input.placeholder.trim()) &&
          (Array.from(input.labels ?? []).some(
            (label) =>
              Boolean(label.textContent?.trim()) &&
              Boolean(label.querySelector('svg[aria-hidden="true"]')),
          ) ||
            // 或用 aria-label 命名，且同一方条内有可见的搜索图标
            (Boolean(ariaLabel?.trim()) &&
              Boolean(
                (
                  input.closest('[data-slot="bar-field"]') ??
                  input.parentElement
                )?.querySelector("svg"),
              ))),
      })
    })
    const bars: { tag: string; slot: string | null; height: number }[] = []
    root
      .querySelectorAll('[data-slot$="-control"], [data-slot$="-trigger"]')
      .forEach((node) => {
        // compact 档是有意做小的（不给手指用），不按触屏高度要求
        if (node.closest('[data-variant="compact"]')) return
        const rect = node.getBoundingClientRect()
        if (rect.width < 1 || rect.height < 1) return
        bars.push({
          tag: node.tagName.toLowerCase(),
          slot: node.getAttribute("data-slot"),
          height: Math.round(rect.height * 10) / 10,
        })
      })
    return { fields, bars }
  })
}

/** 表单字段须有可见标签；带图标与占位提示的搜索框可使用关联的隐藏标签。 */
async function checkVisibleLabels(
  ctx: Ctx,
  page: Page,
  scope: Scope,
  snapshot: { fields: MobileField[] },
) {
  const seen = new Map<string, number>()
  for (const field of snapshot.fields) {
    if (field.labels.length || field.searchWithHiddenLabel) continue
    const count = (seen.get(field.name) ?? 0) + 1
    seen.set(field.name, count)
    const file = await screenshot(
      ctx,
      page,
      CHECKS.labels,
      scope.locator,
      `${scope.label}|${field.name}|${count}`,
    )
    // 同一个示例里有多个同名方条时带上序号，免得被当成重复问题合并掉
    const where = `${scope.label} · input[${field.name}]${count > 1 ? ` #${count}` : ""}`
    if (field.hasAccessibleName) {
      add(
        ctx,
        CHECKS.labels,
        where,
        `没有可见标签，只有可访问名称（${field.ariaLabel ? `aria-label「${field.ariaLabel}」` : "aria-labelledby"}）：窄容器下标签要挪到方条上方，不能直接藏掉`,
        "warn",
        file,
      )
    } else {
      add(
        ctx,
        CHECKS.labels,
        where,
        "没有可见标签，也没有可访问名称（aria-label / aria-labelledby 都没有）：窄容器下标签要挪到方条上方",
        "error",
        file,
      )
    }
  }
}

/** 手机上的字号与控件高度：输入框字号 ≥16px（iOS 聚焦不缩放），方条 ≥36px */
async function checkMobileLayout(
  ctx: Ctx,
  page: Page,
  scope: Scope,
  snapshot: { fields: MobileField[]; bars: MobileBar[] },
) {
  const seen = new Map<string, number>()
  for (const field of snapshot.fields) {
    if (field.fontSize >= 16) continue
    const count = (seen.get(field.name) ?? 0) + 1
    seen.set(field.name, count)
    const file = await screenshot(
      ctx,
      page,
      CHECKS.mobile,
      scope.locator,
      `${scope.label}|font|${field.name}|${count}`,
    )
    add(
      ctx,
      CHECKS.mobile,
      `${scope.label} · input[${field.name}]${count > 1 ? ` #${count}` : ""}`,
      `触屏下输入框字号 ${field.fontSize}px < 16px，iOS 聚焦时会缩放页面（触屏档应上到 text-base）`,
      "error",
      file,
    )
  }
  for (const bar of snapshot.bars) {
    if (bar.height >= 36) continue
    const file = await screenshot(
      ctx,
      page,
      CHECKS.mobile,
      scope.locator,
      `${scope.label}|height|${bar.slot}`,
    )
    add(
      ctx,
      CHECKS.mobile,
      `${scope.label} · ${bar.tag}${bar.slot ? `[${bar.slot}]` : ""}`,
      `触屏下高度 ${bar.height}px < 36px，方条 / 触发条在触屏档应至少 36px`,
      "warn",
      file,
    )
  }
}

/** 页面整体不能横向溢出 */
async function checkMobileOverflow(ctx: Ctx, page: Page, url: string) {
  const report = await page.evaluate(() => ({
    scrollWidth: document.scrollingElement?.scrollWidth ?? 0,
    innerWidth: window.innerWidth,
  }))
  if (report.scrollWidth > report.innerWidth) {
    add(
      ctx,
      CHECKS.mobile,
      `${url} @${MOBILE.width}`,
      `页面横向溢出：scrollingElement.scrollWidth = ${report.scrollWidth} > innerWidth = ${report.innerWidth}`,
      "error",
      await screenshot(ctx, page, CHECKS.mobile, null, `${url}|overflow`),
    )
    return
  }
  // 内容比设备宽时 Chrome 会把 layout viewport 撑大、整页缩小显示（真机上就像页面被缩小了），
  // 这时 scrollWidth 与 innerWidth 一起被撑大，上面的比较看不出来，只能看 innerWidth 有没有偏离设备宽度
  if (report.innerWidth > MOBILE.width + 1) {
    add(
      ctx,
      CHECKS.mobile,
      `${url} @${MOBILE.width}`,
      `页面被内容撑大：innerWidth = ${report.innerWidth} > 设备宽 ${MOBILE.width}，真机上会整页缩小显示（有元素超出视口）`,
      "error",
      await screenshot(ctx, page, CHECKS.mobile, null, `${url}|overflow`),
    )
  }
}

/* ------------------------------------------------------------------ */
/* ⑦ 错误能消失 / ⑨ 示例卡片规范（静态检查）                            */
/* ------------------------------------------------------------------ */

/** 只找这个组件自己的示例文件：src/registry/examples/<name>-*.tsx */
function exampleFiles(component: string): string[] {
  try {
    return readdirSync("src/registry/examples")
      .filter(
        (file) => file.startsWith(`${component}-`) && file.endsWith(".tsx"),
      )
      .map((file) => join("src/registry/examples", file))
  } catch {
    return []
  }
}

/** 示例里写死 error 属性，错误永远消不掉：改成随值计算 */
function checkHardcodedError(ctx: Ctx, files: string[]) {
  for (const file of files) {
    const lines = readFileSync(file, "utf8").split("\n")
    lines.forEach((line, index) => {
      if (!/\berror=(?:"|'|\{["'`])/.test(line)) return
      add(
        ctx,
        CHECKS.errorClear,
        `${file}:${index + 1}`,
        `示例写死了 error：${line.trim().slice(0, 90)} —— 硬编码的错误永远不消失，应改成随值计算`,
        "error",
        null,
      )
    })
  }
}

/**
 * 示例最外层卡片：写了 `rounded-xl border` 就要配 `p-4` 与 `shadow-xs`，
 * 否则组件页里的卡片框和内边距各写各的。手机壳外框（*-mobile-demo）不在此列。
 */
function checkExampleCards(ctx: Ctx, files: string[]) {
  for (const file of files) {
    if (/-mobile-demo\.tsx$/.test(file)) continue
    // 有意的整版布局：控制面板两栏网格 / 动作展台、二维拖拽板满幅网格卡片，不套用 p-4 卡片规范
    if (
      /(control-panel-demo|control-panel-actions-demo|xy-pad-demo|xy-pad-view-demo)\.tsx$/.test(
        file,
      )
    )
      continue
    const source = readFileSync(file, "utf8")
    for (const match of source.matchAll(/"([^"\n]*rounded-xl[^"\n]*)"/g)) {
      const value = match[1] ?? ""
      const tokens = value.split(/\s+/)
      const hasBorder = tokens.some(
        (token) => token === "border" || token.startsWith("border-"),
      )
      if (!hasBorder) continue
      // 固定尺寸的图标块（size-14 / size-16 之类）不是卡片
      if (tokens.some((token) => /^size-\d+$/.test(token))) continue
      // 分区卡片：overflow-hidden 加各分区自带内边距（如 checklist 的头部 + 列表），外框不加 p-4
      if (tokens.includes("overflow-hidden") && tokens.includes("shadow-xs"))
        continue
      // max-w-xs 的密排卡片（compact 档）用 p-3 是同一种紧凑尺度，不算偏离规范
      const compactCard = tokens.includes("max-w-xs")
      const hasPadding =
        tokens.includes("p-4") || (compactCard && tokens.includes("p-3"))
      const missing: string[] = []
      if (!hasPadding) missing.push("p-4")
      if (!tokens.includes("shadow-xs")) missing.push("shadow-xs")
      if (!missing.length) continue
      add(
        ctx,
        CHECKS.cardSpec,
        file,
        `示例卡片缺少 ${missing.join(" / ")}：className="${value.slice(0, 100)}"`,
        "warn",
        null,
      )
    }
  }
}

/* ------------------------------------------------------------------ */
/* 页面流程                                                             */
/* ------------------------------------------------------------------ */

async function openPage(
  ctx: Ctx,
  browser: Browser,
  url: string,
  options: { mobile?: boolean },
): Promise<Page | null> {
  const context: BrowserContext = await browser.newContext(
    options.mobile
      ? {
          viewport: MOBILE,
          hasTouch: true,
          isMobile: true,
          deviceScaleFactor: 2,
          colorScheme: "light",
        }
      : { viewport: DESKTOP, colorScheme: "light" },
  )
  const page = await context.newPage()
  // 示例状态一变，旧的 locator 可能已经不存在；默认 30 秒会把整轮卡住
  page.setDefaultTimeout(4000)
  const where = `${url} @${options.mobile ? MOBILE.width : DESKTOP.width}`
  watchRuntime(ctx, page, where)
  // 首次编译可能很慢，导航单独给足时间；下面的默认超时只用于定位元素
  const response = await page
    .goto(url, { waitUntil: "networkidle", timeout: 90_000 })
    .catch(() => null)
  if (!response || !response.ok()) {
    add(
      ctx,
      CHECKS.runtime,
      where,
      `页面打不开：HTTP ${response?.status() ?? "-"}`,
    )
    await context.close()
    return null
  }
  await page.waitForTimeout(1200)
  return page
}

async function checkSubmitHeight(ctx: Ctx, page: Page, scope: Scope) {
  const issues = await scope.locator.evaluate((root) => {
    // 基准取「默认档」：桌面 32px、触屏 40px。同一示例里如果有更高一档的单行控件（大号方条 36 / 44px），
    // 提交按钮也要跟到那一档；超过上限的是多行或展示型容器（大号金额、带说明的复合输入），不参与比较
    const coarse = matchMedia("(pointer: coarse)").matches
    const floor = coarse ? 40 : 32
    const cap = coarse ? 44 : 36
    const heights = Array.from(
      root.querySelectorAll(
        "input:not([type=hidden]):not([type=file]):not([type=checkbox]):not([type=radio]):not([type=range]), [role=combobox]",
      ),
    )
      .map((el) => {
        // 方条里的 input 本身可能比条矮，取最近的有边框的方条容器
        const bar =
          el.closest(
            '[data-slot$="-bar"], [data-slot$="-field"], [data-slot="input"]',
          ) ?? el
        const rect = bar.getBoundingClientRect()
        return getComputedStyle(el).visibility === "hidden" || rect.width === 0
          ? 0
          : Math.round(rect.height)
      })
      .filter((height) => height > 0 && height <= cap)
    const minimum = Math.max(floor, ...heights)
    return Array.from(root.querySelectorAll("button")).flatMap((button) => {
      // 切换表单视图的文字链接不属于提交操作。
      if (button.matches('[data-slot$="-link-button"]')) return []
      const text = (button.textContent ?? "").trim()
      const height =
        getComputedStyle(button).visibility === "hidden" ||
        button.getBoundingClientRect().width === 0
          ? 0
          : button.getBoundingClientRect().height
      return /^(提交|保存|确认|确定|下一步|登录|注册|支付|重试|使用这张)/.test(
        text,
      ) &&
        height > 0 &&
        height < minimum
        ? [{ text, height, minimum }]
        : []
    })
  })
  for (const issue of issues)
    add(
      ctx,
      CHECKS.buttonHeight,
      scope.label,
      `按钮「${issue.text}」高度 ${issue.height}px，小于同一示例要求的 ${issue.minimum}px`,
      "error",
      await screenshot(
        ctx,
        page,
        CHECKS.buttonHeight,
        scope.locator,
        scope.label,
      ),
    )
}

/** 桌面宽：点按、键盘、按住、光标、状态宽度 */
async function runDesktop(
  ctx: Ctx,
  browser: Browser,
  url: string,
  isView: boolean,
) {
  const page = await openPage(ctx, browser, url, {})
  if (!page) return
  const scopes = await exampleScopes(page, isView, url)
  ctx.stats.scopes += scopes.length
  if (!scopes.length) {
    add(
      ctx,
      CHECKS.runtime,
      `${url} @${DESKTOP.width}`,
      "没有找到示例预览",
      "warn",
    )
  }
  // 宽度检查最先跑：它要触发状态切换（倒计时），先点别的话按钮可能已经禁用、状态也变了
  try {
    await checkStableWidth(ctx, page, url)
  } catch (error) {
    console.warn(
      `    ! 状态切换宽度检查跳过：${(error as Error).message.slice(0, 120)}`,
    )
  }
  for (const scope of scopes) {
    for (const check of [
      checkSubmitHeight,
      checkToolbarFit,
      checkKeyboardRing,
      checkPointerRing,
      checkPressedBorder,
      checkCaretAfterPress,
      // 放最后：它会打开又关闭弹层，排在焦点环检查前面会影响那边的基准样式
      checkPopupHighlight,
    ]) {
      try {
        await check(ctx, page, scope)
      } catch (error) {
        console.warn(
          `    ! ${scope.label} 的 ${check.name} 跳过：${(error as Error).message.slice(0, 120)}`,
        )
      }
    }
  }
  await page.context().close()
}

/** 390 + 触屏：可见标签、字号、控件高度、横向溢出 */
async function runMobile(
  ctx: Ctx,
  browser: Browser,
  url: string,
  isView: boolean,
) {
  const page = await openPage(ctx, browser, url, { mobile: true })
  if (!page) return
  const scopes = await exampleScopes(page, isView, url)
  if (!scopes.length) {
    add(
      ctx,
      CHECKS.runtime,
      `${url} @${MOBILE.width}`,
      "移动端没有找到示例预览",
      "warn",
    )
  }
  for (const scope of scopes) {
    await checkSubmitHeight(ctx, page, scope)
    const snapshot = await mobileSnapshot(scope)
    ctx.stats.fields += snapshot.fields.length
    ctx.stats.bars += snapshot.bars.length
    await checkVisibleLabels(ctx, page, scope, snapshot)
    await checkMobileLayout(ctx, page, scope, snapshot)
  }
  await checkMobileOverflow(ctx, page, url)
  await page.context().close()
}

/* ------------------------------------------------------------------ */
/* 入口                                                                 */
/* ------------------------------------------------------------------ */

/** registry.json 里 registry:block / registry:page 的条目有 /view/<name>/ 独立预览页 */
function viewItemNames(): Set<string> {
  try {
    const registry = JSON.parse(readFileSync("registry.json", "utf8")) as {
      items?: { name?: string; type?: string }[]
    }
    return new Set(
      (registry.items ?? [])
        .filter(
          (item) =>
            item.type === "registry:block" || item.type === "registry:page",
        )
        .map((item) => item.name)
        .filter((name): name is string => Boolean(name)),
    )
  } catch {
    return new Set()
  }
}

function parseArgs(argv: string[]) {
  const names: string[] = []
  let baseArg: string | undefined
  let useBuild = false
  let open = false
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index]
    if (arg === undefined) continue
    if (arg === "--base") {
      baseArg = argv[++index]
      continue
    }
    if (arg.startsWith("--base=")) {
      baseArg = arg.slice("--base=".length)
      continue
    }
    if (arg === "--build") {
      useBuild = true
      continue
    }
    if (arg === "--open") {
      open = true
      continue
    }
    if (arg === "--help" || arg === "-h") {
      console.log(
        "用法：pnpm qa:interaction [组件名…] [--base <地址>] [--build] [--open]",
      )
      process.exit(0)
    }
    if (arg.startsWith("--")) {
      console.error(`未知参数：${arg}`)
      process.exit(1)
    }
    if (arg.trim()) names.push(arg.trim())
  }
  return {
    names: names.length ? names : DEFAULT_NAMES,
    baseArg,
    useBuild,
    open,
  }
}

async function main() {
  const { names, baseArg, useBuild, open } = parseArgs(process.argv.slice(2))
  let base = baseArg ?? DEFAULT_BASE
  let close: () => void = () => {}
  if (useBuild) {
    const server = await startNextServer()
    base = server.base
    close = server.close
  } else {
    const reachable = await fetch(`${base}/`)
      .then((response) => response.ok)
      .catch(() => false)
    if (!reachable) {
      console.error(
        `连不上 ${base}：先开 \`pnpm dev\`（默认 3002 端口），或用 --base 指定地址，或加 --build 对构建产物跑`,
      )
      process.exit(1)
    }
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)
  const dir = resolve(".qa", `interaction-${stamp}`)
  mkdirSync(dir, { recursive: true })

  const browser = await chromium.launch({
    executablePath: CHROME,
    args: ["--enable-unsafe-swiftshader"],
  })
  const views = viewItemNames()
  const issues: Issue[] = []
  const counter = { value: 0 }
  const started = Date.now()

  for (const name of names) {
    const isView = views.has(name)
    const url = `${base}${isView ? "/view/" : "/components/"}${name}/`
    const ctx: Ctx = {
      component: name,
      url,
      dir,
      issues,
      shots: new Map(),
      counter,
      seen: new Set(),
      stats: {
        scopes: 0,
        clicks: 0,
        presses: 0,
        widths: 0,
        fields: 0,
        bars: 0,
        popups: 0,
        cells: 0,
      },
    }
    console.log(`\n· ${name}（${url}）`)
    const files = exampleFiles(name)
    checkHardcodedError(ctx, files)
    checkExampleCards(ctx, files)
    try {
      await runDesktop(ctx, browser, url, isView)
      await runMobile(ctx, browser, url, isView)
    } catch (error) {
      add(
        ctx,
        CHECKS.runtime,
        url,
        `检查过程出错：${(error as Error).message.slice(0, 200)}`,
      )
    }
    console.log(
      `    ${ctx.stats.scopes} 个示例 · 点按 ${ctx.stats.clicks} 次 · 按住 ${ctx.stats.presses} 次 · 弹层 ${ctx.stats.popups} 个 · 工具栏格 ${ctx.stats.cells} 个 · 量宽度 ${ctx.stats.widths} 次 · 390 下扫到 ${ctx.stats.fields} 个输入框 / ${ctx.stats.bars} 个方条`,
    )
  }

  await browser.close()
  close()

  const errors = issues.filter((issue) => issue.level === "error")
  const warnings = issues.filter((issue) => issue.level === "warn")
  const report = {
    generatedAt: new Date().toISOString(),
    base,
    names,
    summary: { error: errors.length, warn: warnings.length },
    issues,
  }
  writeFileSync(join(dir, "report.json"), JSON.stringify(report, null, 2))
  const html = renderReport({
    names,
    base,
    stamp,
    issues,
    seconds: Math.round((Date.now() - started) / 1000),
  })
  const file = join(dir, "index.html")
  writeFileSync(file, html)

  console.log(
    `\n${issues.length ? errors.length + warnings.length : 0} 个问题：${errors.length} 个错误、${warnings.length} 个警告（${names.length} 个目标）`,
  )
  for (const issue of issues) {
    console.log(
      `  ${issue.level === "error" ? "✗" : "△"} ${issue.component} · ${issue.check}\n    ${issue.where}\n    ${issue.message}`,
    )
  }
  console.log(`报告：${file}`)
  if (open) exec(`open "${file}"`)
  process.exitCode = issues.length ? 1 : 0
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function renderReport({
  names,
  base,
  stamp,
  issues,
  seconds,
}: {
  names: string[]
  base: string
  stamp: string
  issues: Issue[]
  seconds: number
}) {
  const errors = issues.filter((issue) => issue.level === "error").length
  const warnings = issues.length - errors
  const components = names.filter((name) =>
    issues.some((issue) => issue.component === name),
  )
  const card = (issue: Issue) => `
    <article class="issue ${issue.level}">
      <header>
        <span class="badge">${issue.level === "error" ? "错误" : "警告"}</span>
        <b>${escapeHtml(issue.check)}</b>
      </header>
      <p class="where">${escapeHtml(issue.where)}</p>
      <p class="message">${escapeHtml(issue.message)}</p>
      ${
        issue.screenshot
          ? `<figure><img src="${issue.screenshot}" loading="lazy" alt=""><figcaption>${issue.screenshot}</figcaption></figure>`
          : `<p class="noshot">（没有截图）</p>`
      }
    </article>`
  return `<!doctype html><meta charset="utf-8"><title>交互验收 · ${escapeHtml(names.join(", "))}</title>
<style>
body{font:14px/1.6 system-ui,-apple-system,"PingFang SC",sans-serif;margin:24px;background:#f6f6f6;color:#111}
h1{font-size:18px;margin:0 0 6px}
h2{font-size:15px;margin:26px 0 10px;padding-bottom:6px;border-bottom:1px solid #ddd}
.meta{color:#666;font-size:12px}
.summary{margin:12px 0;padding:10px 14px;border-radius:8px;background:${errors ? "#fff4f4" : "#f2fbf4"};border:1px solid ${errors ? "#f0c4c4" : "#bfe3c8"}}
.issue{background:#fff;border:1px solid #e2e2e2;border-left-width:4px;border-radius:8px;padding:10px 14px;margin:0 0 12px}
.issue.error{border-left-color:#d33}
.issue.warn{border-left-color:#e0a020}
.issue header{display:flex;gap:8px;align-items:center;font-size:13px}
.badge{font-size:11px;padding:1px 6px;border-radius:4px;background:#eee;color:#444}
.issue.error .badge{background:#fde8e8;color:#a11}
.issue.warn .badge{background:#fdf3e0;color:#8a5a00}
.where{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;color:#555;margin:6px 0}
.message{margin:6px 0 8px}
figure{margin:0}
figure img{max-width:min(100%,520px);border:1px solid #ddd;border-radius:6px;display:block}
figcaption{font-size:11px;color:#888;margin-top:3px}
.noshot{font-size:12px;color:#888;margin:0}
.ok{color:#3a7d44}
</style>
<h1>表单 / 可交互组件交互验收</h1>
<p class="meta">目标：${escapeHtml(names.join("、"))} · 地址 ${escapeHtml(base)} · 生成于 ${stamp} · 用时 ${seconds}s</p>
<div class="summary"><b>${errors} 个错误 · ${warnings} 个警告</b>${issues.length ? "" : ' <span class="ok">没有发现问题</span>'}</div>
${
  components.length
    ? components
        .map(
          (
            name,
          ) => `<h2>${escapeHtml(name)}（${issues.filter((issue) => issue.component === name).length}）</h2>
${issues
  .filter((issue) => issue.component === name)
  .map(card)
  .join("")}`,
        )
        .join("")
    : `<p class="ok">全部通过。</p>`
}
<p class="meta">检查项：${escapeHtml(Object.values(CHECKS).join("、"))}</p>`
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
