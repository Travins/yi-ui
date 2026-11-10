/** 一个组件的检查上下文：问题收集与截图。 */
import { join } from "node:path"
import type { ElementHandle, Locator, Page } from "playwright-core"

import { CHECK_IDS, CHECKS, DESKTOP } from "./constants"

export type Level = "error" | "warn"

export type Issue = {
  component: string
  check: string
  where: string
  message: string
  level: Level
  screenshot: string | null
}

/** 一个组件的上下文：问题收集、截图缓存 */
export type Ctx = {
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
export type Scope = {
  locator: Locator
  label: string
}

/** 元素的简短描述，用来写「位置」 */
export function describe(element: {
  tag: string
  slot: string | null
  text?: string
}): string {
  const slot = element.slot ? `[${element.slot}]` : ""
  const text = element.text ? `「${element.text}」` : ""
  return `${element.tag}${slot}${text}`
}

export function add(
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
export async function screenshot(
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
export function watchRuntime(ctx: Ctx, page: Page, where: string) {
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
