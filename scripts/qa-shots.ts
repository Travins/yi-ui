/**
 * 组件验收截图：对构建产物（先 `pnpm build`）起临时的 next start，按 component-acceptance 技能第 5 节的组合截图，
 * 并检查 hydration / 运行时报错与横向溢出，最后生成一页对比报告。
 *
 *   pnpm qa:shots isometric-mark            # 一个组件
 *   pnpm qa:shots orbit ripple              # 多个组件
 *   pnpm qa:shots isometric-mark --open     # 生成后用浏览器打开报告
 *
 * 输出：.qa/<时间戳>/index.html（含所有截图与检查结果）。Chrome 路径可用 CHROME_PATH 覆盖。
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { exec } from "node:child_process"
import { join, resolve } from "node:path"
import { chromium, type Browser, type Page } from "playwright-core"

import { startNextServer } from "./lib/next-server"

const CHROME =
  process.env.CHROME_PATH ??
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
const THEMES = ["blue", "orange", "violet"]
type Shot = { group: string; label: string; file: string }
type Issue = { component: string; where: string; message: string }

async function open(
  browser: Browser,
  url: string,
  options: { width: number; dark?: boolean; theme?: string },
  issues: Issue[],
  component: string,
) {
  const page = await browser.newPage({
    viewport: { width: options.width, height: 1000 },
    colorScheme: options.dark ? "dark" : "light",
  })
  const where = `${url} @${options.width}${options.dark ? " dark" : ""}${options.theme ? ` ${options.theme}` : ""}`
  // Vercel Analytics 的脚本只在部署到 Vercel 后才存在，本地 next start 下给个空脚本，免得 404 算成问题
  await page.route("**/_vercel/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/javascript",
      body: "",
    }),
  )
  page.on("pageerror", (error) =>
    issues.push({ component, where, message: error.message }),
  )
  page.on("console", (message) => {
    if (message.type() === "error")
      issues.push({ component, where, message: message.text().slice(0, 300) })
  })
  await page.goto(url, { waitUntil: "networkidle" })
  if (options.theme) {
    await page.evaluate(
      (theme) => document.documentElement.setAttribute("data-theme", theme),
      options.theme,
    )
  }
  await page.waitForTimeout(1200)
  // 站点给 html、body 都设了 overflow-x: clip，页面的 scrollWidth 永远等于视口宽，量不出溢出。
  // 改为逐个元素检查：超出视口、且没有被任何祖先裁掉的才算溢出；网格分隔带是有意的全出血，排除。
  const offenders = await page.evaluate(() => {
    const width = window.innerWidth
    const found: string[] = []
    for (const element of document.body.querySelectorAll("*")) {
      if (element.closest('[data-slot^="grid-"]')) continue
      const rect = element.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) continue
      if (rect.right <= width + 1 && rect.left >= -1) continue
      // 祖先里有任何一层 overflow-x 不是 visible，就已经被裁掉了。
      // 这里不写成内部函数：tsx 会给具名函数注入 __name，浏览器里没有这个辅助函数
      let clipped = false
      for (
        let parent = element.parentElement;
        parent && parent !== document.body;
        parent = parent.parentElement
      ) {
        if (getComputedStyle(parent).overflowX !== "visible") {
          clipped = true
          break
        }
      }
      if (clipped) continue
      const slot = element.getAttribute("data-slot")
      found.push(
        `${element.tagName.toLowerCase()}${slot ? `[${slot}]` : ""} ${Math.round(rect.left)}→${Math.round(rect.right)}`,
      )
      if (found.length >= 3) break
    }
    return found
  })
  if (offenders.length)
    issues.push({
      component,
      where,
      message: `元素超出视口：${offenders.join("；")}`,
    })
  return page
}

async function previews(page: Page) {
  const panels = page.locator("[role=tabpanel]:visible")
  const result = []
  for (let i = 0; i < (await panels.count()); i++) {
    const panel = panels.nth(i)
    // 只要示例预览：跳过安装命令、代码等面板（它们包含命令或代码文本）
    const text = (await panel.innerText()).slice(0, 400)
    if (/shadcn@latest|npx |pnpm |yarn |bun /.test(text)) continue
    if (await panel.locator("pre").count()) continue
    result.push(panel)
  }
  return result
}

async function main() {
  const args = process.argv.slice(2)
  const names = args.filter((arg) => !arg.startsWith("--"))
  if (!names.length) {
    console.error("用法：pnpm qa:shots <组件名> [更多组件名] [--open]")
    process.exit(1)
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)
  const dir = resolve(".qa", stamp)
  mkdirSync(dir, { recursive: true })
  const { base, close } = await startNextServer()
  const browser = await chromium.launch({
    executablePath: CHROME,
    args: ["--enable-unsafe-swiftshader"],
  })
  const shots: Shot[] = []
  const issues: Issue[] = []
  let index = 0
  const save = async (
    group: string,
    label: string,
    target: { screenshot: (o: { path: string }) => Promise<unknown> },
  ) => {
    const file = `${String(index++).padStart(3, "0")}.png`
    await target.screenshot({ path: join(dir, file) })
    shots.push({ group, label, file })
  }

  for (const name of names) {
    if (
      existsSync(`content/docs/blocks/${name}.mdx`) ||
      existsSync(`content/docs/pages/${name}.mdx`)
    ) {
      const section = existsSync(`content/docs/blocks/${name}.mdx`)
        ? "blocks"
        : "pages"
      for (const width of [1440, 768, 375]) {
        const page = await open(
          browser,
          `${base}/${section}/`,
          { width },
          issues,
          name,
        )
        const title = JSON.parse(
          readFileSync("registry.json", "utf8"),
        ).items.find((item: { name: string }) => item.name === name).title
        const frame = page.getByTitle(`${title} 预览`, { exact: true })
        await frame.scrollIntoViewIfNeeded()
        await page.waitForTimeout(1200)
        await save(`${name} · 列表`, String(width), frame)
        await page.close()
      }
      for (const options of [
        { width: 1440 },
        { width: 375 },
        { width: 1440, dark: true },
        ...THEMES.map((theme) => ({ width: 1440, theme })),
      ]) {
        const page = await open(
          browser,
          `${base}/view/${name}/`,
          options,
          issues,
          name,
        )
        if (
          "theme" in options &&
          options.theme &&
          (await page.locator('[data-slot="theme-customizer-preview"]').count())
        ) {
          await page
            .locator('[data-slot="theme-customizer-preview"]')
            .evaluate(
              (element, theme) =>
                element.setAttribute("data-theme", theme as string),
              options.theme,
            )
        }
        await page.waitForTimeout(400)
        await save(`${name} · 示例`, JSON.stringify(options), page)
        await page.close()
      }
      continue
    }
    const detail = `${base}/components/${name}/`
    console.log(`· ${name}`)

    // 组件页全部示例：1440 亮 / 暗、375 亮
    for (const [width, dark] of [
      [1440, false],
      [1440, true],
      [375, false],
    ] as const) {
      const page = await open(browser, detail, { width, dark }, issues, name)
      const list = await previews(page)
      if (!list.length)
        issues.push({
          component: name,
          where: detail,
          message: "没有找到示例预览",
        })
      for (const [i, panel] of list.entries()) {
        await panel.scrollIntoViewIfNeeded()
        await page.waitForTimeout(400)
        await save(
          `${name} · 示例 ${width}${dark ? " 暗" : " 亮"}`,
          `#${i + 1}`,
          panel,
        )
      }
      await page.close()
    }

    // 颜色主题：只截默认示例
    for (const theme of THEMES) {
      const page = await open(
        browser,
        detail,
        { width: 1440, theme },
        issues,
        name,
      )
      const [first] = await previews(page)
      if (first) await save(`${name} · 颜色主题`, theme, first)
      await page.close()
    }

    // 组件列表缩略图：1440 / 768 / 375
    for (const width of [1440, 768, 375]) {
      const page = await open(
        browser,
        `${base}/components/`,
        { width },
        issues,
        name,
      )
      const card = page
        .locator(`article:has(a[href="/components/${name}/"])`)
        .first()
      if (await card.count()) {
        await card.scrollIntoViewIfNeeded()
        await page.waitForTimeout(800)
        await save(`${name} · 列表缩略图`, `${width}`, card)
      } else {
        issues.push({
          component: name,
          where: "/components/",
          message: "列表里没有找到这个组件",
        })
      }
      await page.close()
    }

    // 首页 Bento（入选时）：1440 亮 / 暗、375
    for (const [width, dark] of [
      [1440, false],
      [1440, true],
      [375, false],
    ] as const) {
      const page = await open(
        browser,
        `${base}/`,
        { width, dark },
        issues,
        name,
      )
      const link = page.locator(`a[href="/components/${name}/"]`).first()
      if (!(await link.count())) {
        await page.close()
        break
      }
      const card = link.locator(
        "xpath=ancestor::*[@role='group' or contains(@class,'group/card')][1]",
      )
      const target = (await card.count()) ? card : link
      await target.scrollIntoViewIfNeeded()
      await page.waitForTimeout(800)
      await save(`${name} · 首页`, `${width}${dark ? " 暗" : " 亮"}`, target)
      await page.close()
    }
  }

  await browser.close()
  close()

  const groups = [...new Set(shots.map((shot) => shot.group))]
  const html = `<!doctype html><meta charset="utf-8"><title>QA · ${names.join(", ")}</title>
<style>
body{font:14px/1.5 system-ui,sans-serif;margin:24px;background:#f6f6f6;color:#111}
h1{font-size:18px}h2{font-size:14px;margin:28px 0 8px}
.grid{display:flex;flex-wrap:wrap;gap:12px;align-items:flex-start}
figure{margin:0;background:#fff;border:1px solid #ddd;border-radius:6px;padding:6px;max-width:520px}
figure img{display:block;max-width:100%;height:auto}
figcaption{font-size:12px;color:#666;margin-top:4px}
.issues{background:#fff4f4;border:1px solid #f0c4c4;border-radius:6px;padding:8px 12px}
.ok{background:#f2fbf4;border:1px solid #bfe3c8;border-radius:6px;padding:8px 12px}
</style>
<h1>组件验收截图 · ${names.join("、")} · ${stamp}</h1>
${
  issues.length
    ? `<div class="issues"><b>${issues.length} 个问题</b><ul>${issues
        .map(
          (i) =>
            `<li><b>${i.component}</b> · ${i.where}<br>${i.message.replace(/</g, "&lt;")}</li>`,
        )
        .join("")}</ul></div>`
    : `<div class="ok">没有发现运行时报错与横向溢出</div>`
}
${groups
  .map(
    (group) =>
      `<h2>${group}</h2><div class="grid">${shots
        .filter((shot) => shot.group === group)
        .map(
          (shot) =>
            `<figure><img src="${shot.file}" loading="lazy"><figcaption>${shot.label}</figcaption></figure>`,
        )
        .join("")}</div>`,
  )
  .join("")}`
  const report = join(dir, "index.html")
  writeFileSync(report, html)
  console.log(`\n${shots.length} 张截图，${issues.length} 个问题`)
  for (const issue of issues)
    console.log(`  ✗ ${issue.component} · ${issue.where}\n    ${issue.message}`)
  console.log(`报告：${report}`)
  if (args.includes("--open")) exec(`open "${report}"`)
  process.exitCode = issues.length ? 1 : 0
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
