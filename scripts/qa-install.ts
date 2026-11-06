/** 本地安装验收：只从本地构建产物提供 Yi UI 条目。 */
import { spawn } from "node:child_process"
import { createHash } from "node:crypto"
import { createServer } from "node:http"
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from "node:fs/promises"
import { existsSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join, resolve, relative } from "node:path"
import { chromium } from "playwright-core"

import { chromePath } from "./lib/chrome"
import { componentMountPage } from "./lib/qa-component-mounts"
import { runMonorepoInstall } from "./qa-install-monorepo"

type Item = {
  name: string
  type: string
  files: { path: string; target?: string }[]
}
const root = process.cwd()
const args = process.argv.slice(2).filter((a) => a !== "--")
const env: NodeJS.ProcessEnv = {
  ...process.env,
  CI: "1",
  NEXT_TELEMETRY_DISABLED: "1",
}
// 只去掉 SOCKS 的 ALL_PROXY（会让 shadcn CLI 请求失败）；HTTP(S)_PROXY 要保留，
// 初始化项目时 CLI 要 git clone GitHub 上的模板，没有代理的网络下会失败。本地 registry 走 NO_PROXY
for (const key of ["ALL_PROXY", "all_proxy"]) {
  delete env[key]
  delete process.env[key]
}
const report = join(root, ".qa", `install-${Date.now()}`)
const rows: {
  name: string
  install: string
  render: string
  notes: string[]
  routes: string[]
}[] = []
const issues: string[] = []
let sequence = 0
async function run(label: string, command: string[], cwd: string) {
  const start = Date.now()
  console.log(`→ ${label}`)
  const result = await new Promise<{ code: number; output: string }>(
    (resolveResult, reject) => {
      const [executable, ...parameters] = command
      if (!executable) throw new Error("缺少命令")
      const child = spawn(executable, parameters, {
        cwd,
        env,
        stdio: ["ignore", "pipe", "pipe"],
      })
      let output = ""
      child.stdout.on("data", (d) => {
        output += d
      })
      child.stderr.on("data", (d) => {
        output += d
      })
      const timer = setTimeout(() => child.kill("SIGTERM"), 15 * 60_000)
      child.on("error", reject)
      child.on("close", (code) => {
        clearTimeout(timer)
        resolveResult({ code: code ?? 1, output })
      })
    },
  )
  const seconds = ((Date.now() - start) / 1000).toFixed(1)
  await writeFile(
    join(report, `${++sequence}-${label}.log`),
    `退出码 ${result.code}；耗时 ${seconds}s\n${result.output}`,
  )
  console.log(`  ${result.code === 0 ? "✓" : "✗"} ${seconds}s`)
  return result
}
async function files(dir: string, prefix = ""): Promise<Map<string, string>> {
  const result = new Map<string, string>()
  for (const entry of await readdir(join(dir, prefix), {
    withFileTypes: true,
  })) {
    if (["node_modules", ".next", ".git"].includes(entry.name)) continue
    const name = join(prefix, entry.name)
    if (entry.isDirectory())
      for (const [k, v] of await files(dir, name)) result.set(k, v)
    else
      result.set(
        name,
        createHash("sha256")
          .update(await readFile(join(dir, name)))
          .digest("hex"),
      )
  }
  return result
}
const cli = ["pnpm", "dlx", "shadcn@latest"]
async function main() {
  await mkdir(report, { recursive: true })
  const started = Date.now()
  let project = ""
  let stopNext: (() => void) | undefined
  const server = createServer(async (req, res) => {
    const match = /^\/r\/([a-z0-9-]+)\.json$/.exec(req.url ?? "")
    try {
      if (!match) throw Error("路径无效")
      const data = await readFile(
        join(root, "public/r", `${match[1]}.json`),
        "utf8",
      )
      res.setHeader("Content-Type", "application/json")
      res.end(data.replaceAll("https://yiui.dev/r/", `${base}/r/`))
    } catch {
      res.statusCode = 404
      res.end("未找到条目")
    }
  })
  let base = ""
  try {
    if (
      !existsSync("public/r/registry.json") ||
      (await stat("public/r/registry.json")).mtimeMs <
        (await stat("registry.json")).mtimeMs
    )
      throw Error("本地 registry 缺失或过期，请先运行 pnpm registry:build")
    const catalog: { items: Item[] } = JSON.parse(
      await readFile("registry.json", "utf8"),
    )
    const names = args.filter((a) => !a.startsWith("--"))
    for (const arg of args.filter((a) => a.startsWith("--")))
      if (!["--keep", "--fresh", "--namespace", "--monorepo"].includes(arg))
        throw Error(`未知选项 ${arg}`)
    for (const name of names)
      if (!catalog.items.some((i) => i.name === name))
        throw Error(`未知条目 ${name}`)
    const items = catalog.items.filter(
      (i) => !names.length || names.includes(i.name),
    )
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r))
    base = `http://127.0.0.1:${(server.address() as { port: number }).port}`
    project = await mkdtemp(join(tmpdir(), "yiui-install-"))
    if (args.includes("--monorepo")) {
      if (args.includes("--namespace"))
        throw Error("--monorepo 不支持 --namespace")
      const steps = await runMonorepoInstall({
        root,
        items,
        base,
        cli,
        fresh: args.includes("--fresh"),
        project,
        run,
      })
      for (const step of steps)
        rows.push({
          name: step.name,
          install: step.ok ? "通过" : "失败",
          render: "不适用",
          notes: step.note ? [step.note] : [],
          routes: [],
        })
      return
    }
    const version = await run("cli-version", [...cli, "--version"], root)
    if (version.code) throw Error("无法读取 shadcn 版本")
    const cache = join(
      tmpdir(),
      `yiui-install-cache-${createHash("sha256")
        .update(version.output + process.version + "base-nova-v1")
        .digest("hex")
        .slice(0, 12)}`,
    )
    const app = join(project, "app")
    if (!args.includes("--fresh") && existsSync(join(cache, "qa-cache.json"))) {
      console.log(`复用干净初始化缓存：${cache}`)
      await cp(cache, app, { recursive: true })
    } else {
      const init = await run(
        "init",
        [
          ...cli,
          "init",
          "-t",
          "next",
          "-b",
          "base",
          "-p",
          "nova",
          "-n",
          "app",
          "--yes",
          "--no-monorepo",
        ],
        project,
      )
      if (init.code || !existsSync(join(app, "components.json")))
        throw Error("初始化失败，见 init 日志")
      await rm(cache, { recursive: true, force: true })
      await cp(app, cache, {
        recursive: true,
        filter: (source) =>
          !["node_modules", ".git", ".next"].includes(
            source.split("/").at(-1)!,
          ),
      })
      await writeFile(
        join(cache, "qa-cache.json"),
        JSON.stringify({
          cli: version.output.trim(),
          next: JSON.parse(await readFile(join(app, "package.json"), "utf8"))
            .dependencies.next,
        }),
      )
    }
    if (
      (await run("dependencies", ["pnpm", "install", "--frozen-lockfile"], app))
        .code
    )
      throw Error("依赖安装失败")
    if (args.includes("--namespace")) {
      const config = JSON.parse(
        await readFile(join(app, "components.json"), "utf8"),
      )
      config.registries = {
        ...config.registries,
        "@yiui": `${base}/r/{name}.json`,
      }
      await writeFile(
        join(app, "components.json"),
        JSON.stringify(config, null, 2),
      )
    }
    const appRoot = existsSync(join(app, "src/app")) ? "src" : ""
    const installedTargets = new Map<string, string>()
    for (const item of items) {
      const row = {
        name: item.name,
        install: "失败",
        render: "未检查",
        notes: [] as string[],
        routes: [] as string[],
      }
      rows.push(row)
      const before = await files(app)
      const pkgBefore = JSON.parse(
        await readFile(join(app, "package.json"), "utf8"),
      ).dependencies
      const result = await run(
        item.name,
        [
          ...cli,
          "add",
          args.includes("--namespace")
            ? `@yiui/${item.name}`
            : `${base}/r/${item.name}.json`,
          "--yes",
          "--overwrite",
        ],
        app,
      )
      const after = await files(app)
      const created = [...after.keys()].filter((k) => !before.has(k))
      const updated = [...after.keys()].filter(
        (k) => before.has(k) && before.get(k) !== after.get(k),
      )
      const skipped = [...after.keys()].filter(
        (k) => before.get(k) === after.get(k),
      )
      const pkgAfter = JSON.parse(
        await readFile(join(app, "package.json"), "utf8"),
      ).dependencies
      await writeFile(
        join(report, `${item.name}-files.json`),
        JSON.stringify(
          {
            created,
            updated,
            unchanged: skipped,
            dependencies: Object.keys(pkgAfter).filter((k) => !pkgBefore[k]),
            output: result.output,
          },
          null,
          2,
        ),
      )
      if (
        result.code ||
        /Would you like to overwrite/i.test(result.output) ||
        (!created.length &&
          !updated.length &&
          !/Skipped \d+ files?/i.test(result.output))
      ) {
        row.notes.push("CLI 失败、覆盖提示或未写文件")
        continue
      }
      for (const file of item.files) {
        // @ui/ 与 @components/ 跟随使用方的别名落点，其余 target 不在这里核对
        const alias = file.target?.match(/^@(ui|components)\/(.+)$/)
        if (!alias) continue
        const target = join(
          app,
          appRoot,
          alias[1] === "ui" ? "components/ui" : "components",
          alias[2] ?? "",
        )
        if (!existsSync(target)) row.notes.push(`缺少组件独立文件 ${target}`)
        else if (!installedTargets.has(target))
          installedTargets.set(target, await readFile(target, "utf8"))
      }
      for (const [target, content] of installedTargets)
        if ((await readFile(target, "utf8")) !== content)
          row.notes.push(`已安装文件被覆盖 ${target}`)
      row.install = "通过"
      try {
        // 区块、页面条目自带页面，直接访问；组件与工具库（registry:lib）用文档示例生成页面
        if (item.type === "registry:block" || item.type === "registry:page") {
          row.routes = item.files
            .filter(
              (f) =>
                f.target?.startsWith("app/") &&
                f.target.endsWith("/page.tsx") &&
                !f.target.includes("["),
            )
            .map(
              (f) =>
                "/" +
                f
                  .target!.split("/")
                  .slice(1, -1)
                  .filter((s) => !s.startsWith("("))
                  .join("/"),
            )
          if (!row.routes.length && item.name === "theme-customizer-01") {
            // Header 区块没有页面入口，为安装验收单独挂载，使用真正安装的组件与 CSS。
            const dest = join(app, appRoot, "app/qa/theme-customizer-01")
            await mkdir(dest, { recursive: true })
            await writeFile(
              join(dest, "page.tsx"),
              '"use client"\nimport { ThemeProvider } from "next-themes"\nimport { ThemeCustomizer } from "@/components/theme-customizer-01/theme-customizer-01"\nimport "@/components/theme-customizer-01/theme-customizer.css"\nexport default function Page() { return <ThemeProvider attribute="class" defaultTheme="system" enableSystem><ThemeCustomizer /><main className="theme-content">安装验收</main></ThemeProvider> }\n',
            )
            row.routes = ["/qa/theme-customizer-01"]
          }
          if (!row.routes.length) throw Error("未找到可直接访问的页面 target")
          for (const f of item.files.filter((f) =>
            f.target?.startsWith("app/"),
          ))
            if (!existsSync(join(app, appRoot, f.target!)))
              throw Error(`未安装 ${f.target}`)
        } else if (componentMountPage(item.name, "@/components")) {
          // 区块的部件（registry:component）没有示例页：写一个挂载页把安装后的组件真正渲染出来
          const dest = join(app, appRoot, "app/qa", item.name)
          await mkdir(dest, { recursive: true })
          await writeFile(
            join(dest, "page.tsx"),
            componentMountPage(item.name, "@/components")!,
          )
          row.routes = [`/qa/${item.name}`]
        } else {
          const index = await readFile(
            join(root, "src/registry/__index__.tsx"),
            "utf8",
          )
          const match = new RegExp(
            `"${item.name}-demo": lazy\\(\\(\\) => import\\("(.+?)"\\)\\)`,
          ).exec(index)
          if (!match) throw Error("索引缺少默认 demo")
          const dest = join(app, appRoot, "app/qa", item.name)
          const seen = new Set<string>()
          async function copyDemo(source: string) {
            if (seen.has(source)) return
            seen.add(source)
            let text = await readFile(source, "utf8")
            for (const m of text.matchAll(
              /(?:from\s*|import\s*\()(["'])([^"']+)\1/g,
            )) {
              const spec = m[2]
              if (spec === undefined) continue
              if (spec.startsWith("./")) {
                const dep = resolve(dirname(source), spec)
                const actual = [dep, dep + ".tsx", dep + ".ts"].find(existsSync)
                if (!actual) throw Error(`相对依赖不存在 ${spec}`)
                await copyDemo(actual)
              } else if (spec.startsWith("@/")) {
                const candidate = spec
                  .replace("@/registry/ui/", "@/components/ui/")
                  .replace("@/registry/", "@/")
                const path = join(app, appRoot, candidate.slice(2))
                // 示例可能用到条目本身不依赖的 shadcn 官方组件（如工具库示例里的 input），缺了就先装上
                const official = /^@\/components\/ui\/([a-z-]+)$/.exec(
                  candidate,
                )
                if (
                  official?.[1] &&
                  ![path + ".tsx", path + ".ts"].some(existsSync)
                ) {
                  const added = await run(
                    `${item.name}-demo-${official[1]}`,
                    [...cli, "add", official[1], "--yes"],
                    app,
                  )
                  if (added.code)
                    throw Error(`示例依赖的官方组件安装失败：${official[1]}`)
                  // 只是补齐示例环境，不算失败（备注列只记录问题）
                  console.log(`  示例额外安装官方组件 ${official[1]}`)
                }
                // 示例引用的本站条目不在被测条目的依赖里（如选择器示例用的行政区划数据、时间线示例用的统计卡片），
                // 按 target 或源码路径找到对应条目补装，只是补齐示例环境。
                const installed = () =>
                  [
                    path + ".tsx",
                    path + ".ts",
                    join(path, "index.tsx"),
                    join(path, "index.ts"),
                  ].some(existsSync)
                if (!installed()) {
                  const companion = catalog.items.find((i) =>
                    i.files.some(
                      (f) =>
                        f.target?.replace(/\.tsx?$/, "") ===
                          candidate.slice(2) ||
                        f.path.replace(/\.tsx?$/, "") ===
                          `src/${spec.slice(2)}`,
                    ),
                  )
                  if (companion) {
                    const added = await run(
                      `${item.name}-demo-${companion.name}`,
                      [
                        ...cli,
                        "add",
                        args.includes("--namespace")
                          ? `@yiui/${companion.name}`
                          : `${base}/r/${companion.name}.json`,
                        "--yes",
                        "--overwrite",
                      ],
                      app,
                    )
                    if (added.code)
                      throw Error(
                        `示例依赖的本站条目安装失败：${companion.name}`,
                      )
                    console.log(`  示例额外安装本站条目 ${companion.name}`)
                  }
                }
                if (!installed())
                  throw Error(`找不到安装后的 import：${spec} → ${candidate}`)
                text = text.replaceAll(spec, candidate)
              }
            }
            const target = join(
              dest,
              relative(join(root, "src/registry/examples"), source),
            )
            await mkdir(dirname(target), { recursive: true })
            await writeFile(target, text)
          }
          await copyDemo(resolve(root, "src/registry", match[1] + ".tsx"))
          // 与 __index__.tsx 的客户端边界一致，示例可调用客户端模块导出的函数。
          await writeFile(
            join(dest, "page.tsx"),
            `"use client"\nimport Demo from "./${item.name}-demo"\nexport default function Page() { return <Demo /> }\n`,
          )
          row.routes = [`/qa/${item.name}`]
        }
      } catch (error) {
        row.notes.push(String(error))
      }
    }
    const types = await run("tsc", ["pnpm", "exec", "tsc", "--noEmit"], app)
    const build = await run("build", ["pnpm", "build"], app)
    if (types.code) issues.push("类型检查失败，见 tsc 日志")
    if (build.code) issues.push("构建失败，见 build 日志")
    if (!build.code) {
      const probe = createServer()
      await new Promise<void>((r) => probe.listen(0, "127.0.0.1", r))
      const port = (probe.address() as { port: number }).port
      await new Promise<void>((r) => probe.close(() => r()))
      const child = spawn(
        "pnpm",
        ["exec", "next", "start", "-p", String(port)],
        { cwd: app, env, stdio: ["ignore", "pipe", "pipe"] },
      )
      let log = ""
      child.stdout.on("data", (d) => {
        log += d
      })
      child.stderr.on("data", (d) => {
        log += d
      })
      stopNext = () => {
        child.kill()
        void writeFile(join(report, "next-start.log"), log)
      }
      const origin = `http://127.0.0.1:${port}`
      let ready = false
      for (let i = 0; i < 60; i++) {
        try {
          if ((await fetch(origin)).ok) {
            ready = true
            break
          }
        } catch {}
        await new Promise((r) => setTimeout(r, 500))
      }
      if (!ready) throw Error("next start 未就绪")
      const browser = await chromium.launch({
        executablePath: chromePath(),
        env,
      })
      try {
        for (const row of rows) {
          if (row.install !== "通过" || !row.routes.length) continue
          for (const route of row.routes) {
            const observations: string[] = []
            const page = await browser.newPage()
            page.on("console", (msg) => {
              if (msg.type() === "error")
                row.notes.push(`${route} console: ${msg.text()}`)
            })
            page.on("pageerror", (error) =>
              row.notes.push(`${route} pageerror: ${error.message}`),
            )
            page.on("response", (response) => {
              observations.push(`${response.status()} ${response.url()}`)
              if (response.status() >= 400)
                row.notes.push(`${response.status()} ${response.url()}`)
            })
            page.on("requestfailed", (request) =>
              row.notes.push(
                `请求失败 ${request.url()}: ${request.failure()?.errorText}`,
              ),
            )
            try {
              const response = await page.goto(origin + route, {
                waitUntil: "networkidle",
                timeout: 30_000,
              })
              if (!response?.ok()) row.notes.push(`HTTP ${response?.status()}`)
              await page.waitForTimeout(1000)
              if (
                !(await page.locator("body").innerText()).trim() &&
                !(await page.locator("svg,canvas,[data-slot]").count())
              )
                row.notes.push("页面无内容")
            } catch (error) {
              row.notes.push(String(error))
            }
            await page.close()
            await writeFile(
              join(
                report,
                `${row.name}-${row.routes.indexOf(route)}-browser.log`,
              ),
              [...observations, ...row.notes].join("\n"),
            )
          }
          row.render = row.notes.length ? "失败" : "通过"
        }
      } finally {
        await browser.close()
      }
    }
  } catch (error) {
    issues.push(String(error))
  } finally {
    stopNext?.()
    server.close()
    const table = [
      "| 条目 | 安装 | 渲染 | 备注 |",
      "| --- | --- | --- | --- |",
      ...rows.map(
        (r) =>
          `| ${r.name} | ${r.install} | ${r.render} | ${r.notes.join("；").replaceAll("|", "\\|").replaceAll("\n", " ")} |`,
      ),
    ].join("\n")
    const summary = `${table}\n\n${issues.join("\n")}\n\n耗时 ${((Date.now() - started) / 1000).toFixed(1)}s\n测试项目：${project}（${args.includes("--keep") ? "保留" : "删除"}）\n`
    console.log(summary)
    await writeFile(join(report, "report.md"), summary)
    console.log(`报告：${report}`)
    if (project && !args.includes("--keep"))
      await rm(project, { recursive: true, force: true })
    process.exitCode =
      issues.length ||
      rows.some(
        (r) =>
          r.install !== "通过" ||
          (r.render === "不适用"
            ? false
            : r.render !== "通过" || r.notes.length),
      )
        ? 1
        : 0
  }
}
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
