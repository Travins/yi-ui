/** 运行编排：打开页面，跑桌面、手机和条目交互场景。 */
import { existsSync } from "node:fs"
import { resolve } from "node:path"
import { pathToFileURL } from "node:url"
import type { Browser, BrowserContext, Page } from "playwright-core"

import type {
  Scenario,
  ScenarioContext,
  ScenarioResult,
} from "../qa-scenarios/types"
import { CHECKS, DESKTOP, MOBILE } from "./constants"
import { add, screenshot, watchRuntime, type Ctx } from "./context"
import {
  checkCaretAfterPress,
  checkKeyboardRing,
  checkPointerRing,
  checkPressedBorder,
} from "./focus-ring"
import { exampleScopes } from "./locate"
import {
  checkMobileLayout,
  checkMobileOverflow,
  checkVisibleLabels,
  mobileSnapshot,
} from "./mobile"
import {
  checkPopupHighlight,
  checkStableWidth,
  checkSubmitHeight,
  checkToolbarFit,
} from "./widgets"

/* ------------------------------------------------------------------ */
/* 页面流程                                                             */
/* ------------------------------------------------------------------ */

export async function openPage(
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


/** 桌面宽：点按、键盘、按住、光标、状态宽度 */
export async function runDesktop(
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
export async function runMobile(
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

/** 每步独立导航，失败不会污染后续步骤；监听沿用通用运行时错误收集。 */
export async function runScenario(
  ctx: Ctx,
  browser: Browser,
  base: string,
  results: ScenarioResult[],
) {
  const file = resolve("scripts/qa-scenarios", `${ctx.component}.ts`)
  if (!existsSync(file)) return
  const scenario = (
    (await import(pathToFileURL(file).href)) as { default: Scenario }
  ).default
  for (const viewport of scenario.viewports) {
    const url = new URL(scenario.path ?? `/view/${ctx.component}/`, base).href
    const page = await openPage(ctx, browser, url, {
      mobile: viewport === "mobile",
    })
    if (!page) continue
    try {
      for (const step of scenario.steps) {
        if (step.viewport && step.viewport !== viewport) continue
        const result: ScenarioResult = {
          component: ctx.component,
          scenario: scenario.name,
          viewport,
          step: step.name,
          passed: false,
          screenshots: [],
        }
        const shot = async (name: string) => {
          const file = await screenshot(
            ctx,
            page,
            "交互场景",
            null,
            `${viewport}|${step.name}|${name}`,
          )
          result.screenshots.push(file)
          return file
        }
        const assert: ScenarioContext["assert"] = (condition, message) => {
          if (!condition) throw new Error(message)
        }
        const context: ScenarioContext = {
          page,
          role: page.getByRole.bind(page),
          name: (name) => page.getByText(name, { exact: true }),
          assert,
          shot,
          visible: async (target, message) => {
            try {
              await target.waitFor({ state: "visible" })
            } catch {
              throw new Error(message)
            }
          },
          box: async (target) => {
            const box = await target.boundingBox()
            if (!box) throw new Error("元素应有可见的边界框")
            return box
          },
          settle: async () => {
            await page.waitForTimeout(350)
            await page.evaluate(async () => {
              await Promise.all(
                document
                  .getAnimations()
                  .filter((a) => a.effect?.getTiming().iterations !== Infinity)
                  .map((a) => a.finished.catch(() => {})),
              )
            })
          },
          press: (keys) =>
            page.keyboard.press(
              keys.replaceAll(
                "Mod",
                process.platform === "darwin" ? "Meta" : "Control",
              ),
            ),
        }
        try {
          await page.goto(url, { waitUntil: "networkidle" })
          await context.settle()
          await step.run(context)
          result.passed = true
        } catch (error) {
          result.message = `场景「${step.name}」失败：${error instanceof Error ? error.message : String(error)}`
          add(
            ctx,
            "交互场景",
            `${viewport} · ${step.name}`,
            result.message,
            "error",
            await shot("失败"),
          )
        } finally {
          await shot("结果")
          results.push(result)
          console.log(
            `    ${result.passed ? "✓" : "✗"} ${viewport} · ${step.name}`,
          )
        }
      }
    } finally {
      await page.context().close()
    }
  }
}
