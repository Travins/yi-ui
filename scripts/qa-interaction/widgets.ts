/** 弹层高亮、工具栏铺满、状态切换宽度、提交按钮高度检查（⑥⑪⑫⑬）。 */
import type { Page } from "playwright-core"

import {
  CHECKS,
  CONTROL_SELECTOR,
  RING_SETTLE_MS,
  STABLE_WIDTH_SELECTORS,
} from "./constants"
import { add, describe, screenshot, type Ctx, type Scope } from "./context"
import { handleAt, pressPointer, resetFocus, usableIndexes } from "./locate"

/* ------------------------------------------------------------------ */
/* ⑫ 弹层打开时方条保持高亮                                              */
/* ------------------------------------------------------------------ */

/**
 * 点开方条里的触发键，把鼠标移开后量方条底色：和未悬停时一样，
 * 用户把鼠标移进弹层时就看不出弹层属于哪一条。
 */
export async function checkPopupHighlight(ctx: Ctx, page: Page, scope: Scope) {
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

export async function checkToolbarFit(ctx: Ctx, _page: Page, scope: Scope) {
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
export async function checkStableWidth(ctx: Ctx, page: Page, url: string) {
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

export async function checkSubmitHeight(ctx: Ctx, page: Page, scope: Scope) {
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
