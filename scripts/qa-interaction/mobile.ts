/** 手机视口检查：可见标签、字号与控件高度、横向溢出（⑤⑧）。 */
import type { Page } from "playwright-core"

import { CHECKS, MOBILE } from "./constants"
import { add, screenshot, type Ctx, type Scope } from "./context"

/* ------------------------------------------------------------------ */
/* ⑤ 390px 下每个字段都有可见标签 / ⑧ 手机布局                          */
/* ------------------------------------------------------------------ */

export type MobileField = {
  name: string
  fontSize: number
  ariaLabel: string | null
  labels: string[]
  hasAccessibleName: boolean
  searchWithHiddenLabel: boolean
}

export type MobileBar = {
  tag: string
  slot: string | null
  height: number
}

/**
 * 390 宽 + 触屏下扫一遍示例里的输入框与方条控件。
 * 视觉上藏起来的输入（hidden、sr-only、clip-path、1px、opacity 0）不算字段：
 * 那些是自绘控件的无障碍替身，不需要可见标签、也不会弹软键盘。
 */
export async function mobileSnapshot(
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
export async function checkVisibleLabels(
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
export async function checkMobileLayout(
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
export async function checkMobileOverflow(ctx: Ctx, page: Page, url: string) {
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
