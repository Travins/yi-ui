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
 * Chrome 由 scripts/lib/chrome.ts 自动查找，可用 CHROME_PATH 覆盖。
 * 条目场景放在 scripts/qa-scenarios/<name>.ts；通用检查之外逐步执行，记录结果与截图。
 * 场景失败后重新加载再继续，控制台错误同样计入问题。
 */
import { exec } from "node:child_process"
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { join, resolve } from "node:path"
import { chromium } from "playwright-core"

import { chromePath } from "./lib/chrome"
import { startNextServer } from "./lib/next-server"
import type { ScenarioResult } from "./qa-scenarios/types"
import { DEFAULT_BASE, DEFAULT_NAMES } from "./qa-interaction/constants"
import { add, type Ctx, type Issue } from "./qa-interaction/context"
import { renderReport } from "./qa-interaction/report"
import { runDesktop, runMobile, runScenario } from "./qa-interaction/run"
import {
  checkExampleCards,
  checkHardcodedError,
  exampleFiles,
} from "./qa-interaction/static-checks"
import { CHECKS } from "./qa-interaction/constants"

const CHROME = chromePath()

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
  const scenarios: ScenarioResult[] = []
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
      await runScenario(ctx, browser, base, scenarios)
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
    scenarios,
  }
  writeFileSync(join(dir, "report.json"), JSON.stringify(report, null, 2))
  const html = renderReport({
    names,
    base,
    stamp,
    scenarios,
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

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
