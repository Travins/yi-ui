/** 加载验收：对构建产物起 next start，阻塞外部脚本，保留 React 流式 HTML 的内联替换。 */
import { chromium } from "playwright-core"
import { readdir, mkdir, writeFile } from "node:fs/promises"

import { chromePath } from "./lib/chrome"
import { startNextServer } from "./lib/next-server"

async function main() {
  const directory = `.qa/loading-${Date.now()}`
  await mkdir(directory, { recursive: true })
  const { base, close } = await startNextServer()
  const browser = await chromium.launch({
    executablePath: chromePath(),
  })
  const issues: string[] = []
  const measurements: unknown[] = []
  try {
    // 组件清单取自文档目录：content/docs/components/<name>.mdx（index 是列表页）
    const names = (await readdir("content/docs/components"))
      .filter((f) => f.endsWith(".mdx") && f !== "index.mdx")
      .map((f) => f.replace(/\.mdx$/, ""))
    for (const url of [
      ...names.map((n) => `/components/${n}/`),
      "/",
      "/themes/",
      "/blocks/",
      "/pages/",
      "/components/",
      "/view/app-shell-01/",
    ]) {
      const page = await browser.newPage({
        viewport: { width: 1280, height: 900 },
      })
      // 路由保持挂起，不返回脚本内容；关闭页面时由浏览器取消请求。
      let hold = true
      const release: (() => void)[] = []
      await page.route(/\.js(?:\?|$)/, async (route) => {
        if (hold) await new Promise<void>((resolve) => release.push(resolve))
        await route.continue().catch(() => {})
      })
      await page.goto(base + url, { waitUntil: "commit" })
      await page.waitForTimeout(700)
      const blanks = await page.evaluate(() => {
        const result: string[] = []
        for (const el of document.querySelectorAll<HTMLElement>(
          '[data-slot="chart-series"], [data-slot="mini-chart"], [data-slot="mini-donut"], [data-slot="chart-ranking"], [data-slot="chart-gauge"], [data-slot="mini-ring"], [data-slot="globe"], [data-slot="glyph-field"]',
        )) {
          const box = el.getBoundingClientRect()
          if (box.width < 20 || box.height < 20) continue
          const scope = el.closest('[data-slot$="-frame"]') ?? el
          if (
            !scope.querySelector(
              'svg path, svg circle, svg line, canvas, [data-slot$="-placeholder"]',
            )
          )
            result.push(el.dataset.slot ?? "未知区域")
        }
        return result
      })
      issues.push(...blanks.map((b) => `${url}: ${b} 无内容或占位`))
      await page.screenshot({
        path: `${directory}/${url.replaceAll("/", "_")}.png`,
        fullPage: true,
      })
      if (
        [
          "/components/mini-chart/",
          "/components/chart-card/",
          "/components/",
          "/view/app-shell-01/",
        ].includes(url)
      )
        await page.screenshot({
          path: `${directory}/${url.replaceAll("/", "_")}-blocked-viewport.png`,
        })
      const before = await page.evaluate(() => {
        return [
          ...document.querySelectorAll<HTMLElement>(
            '[data-slot="chart-series"], [data-slot="chart-ranking"], [data-slot="mini-chart"], [data-slot="mini-donut"]',
          ),
        ]
          .map((el, index) => {
            const rect = el.getBoundingClientRect()
            const placeholder = el.querySelector<HTMLElement>(
              '[data-slot$="-placeholder"]',
            )
            const box = placeholder?.getBoundingClientRect()
            const next = placeholder?.nextSibling
            placeholder?.remove()
            const without = el.getBoundingClientRect().height
            if (placeholder) el.insertBefore(placeholder, next ?? null)
            return {
              index,
              slot: el.dataset.slot,
              width: rect.width,
              height: rect.height,
              without,
              placeholder: box
                ? { width: box.width, height: box.height }
                : null,
            }
          })
          .filter((item) => item.width > 20 && item.height > 20)
      })
      for (const item of before) {
        if (Math.abs(item.height - item.without) > 0)
          issues.push(
            `${url} ${item.slot}[${item.index}]: 移除占位造成高度变化 ${item.height - item.without}px`,
          )
        if (
          !item.placeholder ||
          item.placeholder.width <= 0 ||
          item.placeholder.height <= 0
        )
          issues.push(`${url} ${item.slot}[${item.index}]: 占位无尺寸`)
      }
      hold = false
      release.forEach((resolve) => resolve())
      await page.waitForFunction(() =>
        [
          ...document.querySelectorAll<HTMLElement>(
            '[data-slot="chart-series"], [data-slot="chart-ranking"], [data-slot="mini-chart"], [data-slot="mini-donut"]',
          ),
        ].every(
          (el) =>
            el.getBoundingClientRect().width < 20 ||
            el.getBoundingClientRect().height < 20 ||
            el.dataset.ready === "true",
        ),
      )
      await page.waitForTimeout(800)
      const after = await page.evaluate(() =>
        [
          ...document.querySelectorAll<HTMLElement>(
            '[data-slot="chart-series"], [data-slot="chart-ranking"], [data-slot="mini-chart"], [data-slot="mini-donut"]',
          ),
        ].map((el) => {
          const box = el.getBoundingClientRect()
          return { width: box.width, height: box.height }
        }),
      )
      for (const item of before) {
        const actual = after[item.index]
        if (
          !actual ||
          !item.placeholder ||
          Math.abs(item.placeholder.width - actual.width) > 2 ||
          Math.abs(item.placeholder.height - actual.height) > 2
        )
          issues.push(
            `${url} ${item.slot}[${item.index}]: 拦 JS 占位与正常图表尺寸不一致`,
          )
      }
      measurements.push({ url, before, after })
      if (
        [
          "/components/mini-chart/",
          "/components/chart-card/",
          "/components/",
          "/view/app-shell-01/",
        ].includes(url)
      )
        await page.screenshot({
          path: `${directory}/${url.replaceAll("/", "_")}-ready.png`,
          fullPage: true,
        })
      if (
        [
          "/components/mini-chart/",
          "/components/chart-card/",
          "/components/",
          "/view/app-shell-01/",
        ].includes(url)
      )
        await page.screenshot({
          path: `${directory}/${url.replaceAll("/", "_")}-ready-viewport.png`,
        })
      await page.close()
    }
    // 详情页预渲染 HTML 里示例必须在原位：<!--$?--> 表示先输出占位、再用脚本替换，首屏会闪一下
    for (const url of [
      "/components/palette-editor/",
      "/components/mini-chart/",
      "/view/app-shell-01/",
    ]) {
      const html = await (await fetch(base + url)).text()
      const pending = html.split("<!--$?-->").length - 1
      if (pending) issues.push(`${url}: HTML 里有 ${pending} 处待替换的占位`)
    }
    const thumbnails = await browser.newPage({
      viewport: { width: 1280, height: 900 },
    })
    await thumbnails.goto(base + "/themes/", { waitUntil: "networkidle" })
    await thumbnails.route(/\.js(?:\?|$)/, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 2000))
      await route.continue().catch(() => {})
    })
    await thumbnails.locator('a[href="/components/"]').first().click()
    await thumbnails.waitForURL("**/components/")
    const skeleton = thumbnails
      .locator('[data-slot="preview-skeleton"]')
      .first()
    await skeleton.waitFor({ state: "attached" })
    const animation = await skeleton.evaluate((el) => {
      const clone = el.cloneNode(true) as HTMLElement
      const frame = document.createElement("div")
      frame.style.cssText =
        "position:fixed;width:320px;height:200px;top:100px;left:0"
      frame.append(clone)
      document.body.append(frame)
      const style = getComputedStyle(clone)
      const result = { name: style.animationName, opacity: style.opacity }
      frame.remove()
      return result
    })
    if (animation.name === "none" || animation.opacity !== "0")
      issues.push(`骨架动画或延迟失效：${JSON.stringify(animation)}`)
    await thumbnails.waitForTimeout(180)
    const empty = await thumbnails
      .locator('[role="group"] [data-slot="preview-skeleton"]')
      .evaluateAll(
        (elements) =>
          elements.filter((el) => {
            const b = el.getBoundingClientRect()
            const frame = el.closest('[role="group"]')!.getBoundingClientRect()
            return (
              b.width <= 0 ||
              b.height <= 0 ||
              Math.abs(b.width - frame.width) > 2 ||
              Math.abs(b.height - frame.height) > 2
            )
          }).length,
      )
    if (empty) issues.push(`缩略图 ${empty} 个骨架未铺满画框`)
    await thumbnails.screenshot({
      path: `${directory}/thumbnails-loading.png`,
      fullPage: true,
    })
    await thumbnails.close()
    // 列表会加载所有缩略图示例，因此选不在列表中展示的第二示例页面，延迟尚未加载的 chunk。
    const page = await browser.newPage({
      viewport: { width: 1280, height: 900 },
    })
    await page.goto(base + "/components/", { waitUntil: "networkidle" })
    // 水合完成前点击会走浏览器原生跳转（没有骨架、也没有加载指示），所以先等 NavigationProgress
    // 在 effect 里挂好点击监听后设的 data-nav-ready。
    await page.waitForSelector("html[data-nav-ready=true]", { timeout: 15_000 })
    let delayedScripts = 0
    await page.route(/\.js(?:\?|$)/, async (route) => {
      delayedScripts += 1
      await new Promise((resolve) => setTimeout(resolve, 2000))
      await route.continue().catch(() => {})
    })
    await page.locator('a[href="/components/mini-chart/"]').first().click()
    // 点击后立刻开始等加载反馈，和截图并行：整页截图在机器忙时可能花一两秒，
    // 截完再查会错过只持续到脚本放行（2 秒）为止的骨架和加载指示。
    const feedbackSeen = page
      .waitForFunction(
        () =>
          [
            ...document.querySelectorAll(
              '[data-slot="preview-skeleton"], [data-slot="navigation-progress"][data-pending="true"]',
            ),
          ].some((el) => {
            const box = el.getBoundingClientRect()
            return (
              box.width > 0 &&
              box.height > 0 &&
              getComputedStyle(el).opacity !== "0"
            )
          }),
        undefined,
        { timeout: 1800, polling: 50 },
      )
      .then(
        () => true,
        () => false,
      )
    for (const [delay, label] of [
      [300, "300ms"],
      [700, "1s"],
    ] as const) {
      await page.waitForTimeout(delay)
      await page.screenshot({
        path: `${directory}/navigation-${label}.png`,
        fullPage: true,
      })
      if (await page.getByText(/正在加载示例|正在加载预览/).count())
        issues.push(`导航 ${label}: 存在文字 fallback`)
    }
    const feedback = await feedbackSeen
    if (!feedback) {
      // 失败时带上现场，区分「跳转已经完成」「点击没被客户端路由接管」和「指示确实没出现」
      const state = await page.evaluate(() => ({
        path: location.pathname,
        pending: document
          .querySelector('[data-slot="navigation-progress"]')
          ?.getAttribute("data-pending"),
        navReady: document.documentElement.dataset.navReady,
      }))
      issues.push(
        `导航延迟用例未观察到骨架或加载指示（${JSON.stringify(state)}，被延迟的脚本 ${delayedScripts} 个）`,
      )
    }
    await page.close()
    const slow = await browser.newPage({
      viewport: { width: 1280, height: 900 },
    })
    let holdData = true
    const releaseData: (() => void)[] = []
    // 拦住 /themes/ 的导航数据（RSC 请求带 _rsc 参数；静态导出时是 .txt 文件），模拟未预取的慢请求
    const isThemesData = (url: URL) =>
      url.pathname.startsWith("/themes/") &&
      (url.searchParams.has("_rsc") || url.pathname.endsWith(".txt"))
    await slow.route(isThemesData, async (route) => {
      if (holdData)
        await new Promise<void>((resolve) => releaseData.push(resolve))
      await route.continue().catch(() => {})
    })
    await slow.goto(base + "/components/", { waitUntil: "domcontentloaded" })
    // 同一条时序要求：点击必须由客户端路由接管，否则会变成原生跳转、没有加载指示
    await slow.waitForSelector("html[data-nav-ready=true]", { timeout: 15_000 })
    await slow.waitForTimeout(700)
    await slow.locator('a[href="/themes/"]').first().click()
    await slow.waitForTimeout(300)
    if (
      (await slow
        .locator('[data-slot="navigation-progress"][data-pending="true"]')
        .count()) !== 1
    )
      issues.push("未预取导航缺少加载指示")
    await slow.screenshot({ path: `${directory}/navigation-progress.png` })
    holdData = false
    releaseData.forEach((resolve) => resolve())
    await slow.waitForTimeout(2500)
    if (
      await slow
        .locator('[data-slot="navigation-progress"][data-pending="true"]')
        .count()
    )
      issues.push("导航完成后加载指示未结束")
    await slow.close()
    await writeFile(
      `${directory}/report.json`,
      JSON.stringify(
        { pages: names.length + 6, issues, animation, measurements },
        null,
        2,
      ),
    )
    console.log(
      `检查 ${names.length + 6} 页，${issues.length} 个问题；截图：${directory}`,
    )
    if (issues.length) {
      console.error(issues.join("\n"))
      process.exitCode = 1
    }
  } finally {
    await browser.close()
    close()
  }
}
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
