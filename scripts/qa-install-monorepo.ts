/**
 * monorepo 安装验收：在 shadcn 官方模板上按技能写的步骤走一遍，默认从应用目录安装。
 * 模板默认开启 noUncheckedIndexedAccess，所以这里也会查出这类类型错误。
 */
import { createHash } from "node:crypto"
import { existsSync } from "node:fs"
import { cp, readFile, readdir, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

type Item = { name: string; type: string }
type Run = (
  label: string,
  command: string[],
  cwd: string,
) => Promise<{ code: number; output: string }>
export type MonorepoStep = { name: string; ok: boolean; note: string }

const NODE_ONLY = ["node_modules", ".git", ".next", ".turbo"]

async function listFiles(dir: string, prefix = ""): Promise<string[]> {
  if (!existsSync(join(dir, prefix))) return []
  const names: string[] = []
  for (const entry of await readdir(join(dir, prefix), {
    withFileTypes: true,
  })) {
    if (NODE_ONLY.includes(entry.name)) continue
    const name = join(prefix, entry.name)
    if (entry.isDirectory()) names.push(...(await listFiles(dir, name)))
    else names.push(name)
  }
  return names
}

function errorSample(output: string) {
  const lines = output.split("\n").filter((line) => /error TS\d+/.test(line))
  return `${lines.length} 处：${lines.slice(0, 5).join(" / ")}`
}

/** 裸包名：去掉子路径；`@/` 和工作区内部的路径不算，它们缺失说明条目本身有问题。 */
export function missingPackages(output: string, workspaceScope: string) {
  const packages = new Set<string>()
  const internal = new Set<string>()
  for (const match of output.matchAll(/Cannot find module '([^']+)'/g)) {
    const spec = match[1] ?? ""
    if (spec.startsWith(".") || spec.startsWith("@/")) internal.add(spec)
    else if (spec.startsWith(`${workspaceScope}/`)) internal.add(spec)
    else {
      const parts = spec.split("/")
      packages.add(
        spec.startsWith("@") ? parts.slice(0, 2).join("/") : (parts[0] ?? spec),
      )
    }
  }
  return { packages: [...packages], internal: [...internal] }
}

async function prepareTemplate(
  run: Run,
  cli: string[],
  project: string,
  fresh: boolean,
  root: string,
) {
  const version = await run("cli-version", [...cli, "--version"], root)
  if (version.code) throw Error("无法读取 shadcn 版本")
  const cache = join(
    tmpdir(),
    `yiui-install-cache-${createHash("sha256")
      .update(version.output + process.version + "base-nova-monorepo-v1")
      .digest("hex")
      .slice(0, 12)}`,
  )
  const mono = join(project, "mono")
  if (!fresh && existsSync(join(cache, "qa-cache.json"))) {
    console.log(`复用干净初始化缓存：${cache}`)
    await cp(cache, mono, { recursive: true })
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
        "--monorepo",
        "-n",
        "mono",
        "--yes",
      ],
      project,
    )
    if (init.code || !existsSync(join(mono, "apps/web/components.json")))
      throw Error("monorepo 初始化失败，见 init 日志")
    await rm(cache, { recursive: true, force: true })
    await cp(mono, cache, {
      recursive: true,
      filter: (source) => !NODE_ONLY.includes(source.split("/").at(-1) ?? ""),
    })
    await writeFile(join(cache, "qa-cache.json"), version.output.trim())
  }
  await rm(join(mono, "qa-cache.json"), { force: true })
  const install = await run(
    "dependencies",
    ["pnpm", "install", "--frozen-lockfile"],
    mono,
  )
  if (install.code) throw Error("依赖安装失败")
  return mono
}

async function editJson(
  path: string,
  edit: (json: Record<string, Record<string, unknown>>) => void,
) {
  const json = JSON.parse(await readFile(path, "utf8"))
  edit(json)
  await writeFile(path, JSON.stringify(json, null, 2))
}

export async function runMonorepoInstall(options: {
  root: string
  items: Item[]
  base: string
  cli: string[]
  fresh: boolean
  project: string
  run: Run
}): Promise<MonorepoStep[]> {
  const { root, items, base, cli, fresh, project, run } = options
  const steps: MonorepoStep[] = []
  const step = (name: string, ok: boolean, note = "") => {
    steps.push({ name, ok, note })
    return ok
  }
  const mono = await prepareTemplate(run, cli, project, fresh, root)
  const web = join(mono, "apps/web")
  const ui = join(mono, "packages/ui")
  const scope = JSON.parse(
    await readFile(join(ui, "package.json"), "utf8"),
  ).name.split("/")[0] as string
  const url = (item: Item) => `${base}/r/${item.name}.json`
  const isApp = (item: Item) =>
    item.type === "registry:block" || item.type === "registry:page"
  const components = items.filter(
    (item) =>
      !isApp(item) &&
      (item.type === "registry:ui" ||
        item.type === "registry:lib" ||
        item.type === "registry:hook"),
  )
  const apps = items.filter(isApp)

  // 技能写明的一步：UI 包用 Bundler 解析。
  await editJson(join(ui, "tsconfig.json"), (json) => {
    json.compilerOptions = {
      ...json.compilerOptions,
      module: "ESNext",
      moduleResolution: "Bundler",
    }
  })

  if (components.length) {
    const before = new Set(await listFiles(web))
    const added = await run(
      "add-components",
      [...cli, "add", ...components.map(url), "--yes", "--overwrite"],
      web,
    )
    step("从应用目录安装组件", !added.code, added.code ? "见日志" : "")
    const leaked = (await listFiles(web)).filter((file) => !before.has(file))
    step(
      "组件、hooks、lib 都进 UI 包",
      !leaked.length,
      leaked.length ? `写进了应用：${leaked.join("、")}` : "",
    )
    const entries = components.filter(
      (item) =>
        item.type === "registry:ui" &&
        existsSync(join(ui, "src/components", item.name, `${item.name}.tsx`)),
    )
    const missing = components.filter(
      (item) => item.type === "registry:ui" && !entries.includes(item),
    )
    step(
      "组件入口文件存在",
      !missing.length,
      missing.map((item) => item.name).join("、"),
    )
    const uiTypes = await run(
      "tsc-ui",
      ["pnpm", "exec", "tsc", "--noEmit"],
      ui,
    )
    step(
      "UI 包类型检查（严格配置）",
      !uiTypes.code,
      uiTypes.code ? errorSample(uiTypes.output) : "",
    )
    const page = existsSync(join(web, "src/app"))
      ? join(web, "src/app/page.tsx")
      : join(web, "app/page.tsx")
    await writeFile(
      page,
      [
        ...entries.map(
          (item, index) =>
            `import * as M${index} from "${scope}/ui/components/${item.name}/${item.name}"`,
        ),
        `export default function Page() { return <pre>{[${entries
          .map((_, index) => `M${index}`)
          .join(", ")}].length}</pre> }`,
      ].join("\n") + "\n",
    )
    const build = await run("build-components", ["pnpm", "build"], web)
    step(
      "应用构建（引用全部组件入口）",
      !build.code,
      build.code ? "见 build-components 日志" : `${entries.length} 个入口`,
    )
  }

  if (apps.length) {
    // 技能写明的两步：装之前改别名，装之后补依赖。
    await editJson(join(web, "components.json"), (json) => {
      json.aliases = {
        ...json.aliases,
        hooks: `${scope}/ui/hooks`,
        lib: `${scope}/ui/lib`,
      }
    })
    const added = await run(
      "add-apps",
      [...cli, "add", ...apps.map(url), "--yes", "--overwrite"],
      web,
    )
    step("从应用目录安装区块和页面", !added.code, added.code ? "见日志" : "")
    const first = await run(
      "tsc-apps-1",
      ["pnpm", "exec", "tsc", "--noEmit"],
      web,
    )
    const { packages, internal } = missingPackages(first.output, scope)
    step(
      "区块只缺 npm 包，不缺内部文件",
      !internal.length,
      internal.join("、"),
    )
    if (packages.length) {
      const addDeps = await run(
        "add-app-deps",
        ["pnpm", "add", ...packages],
        web,
      )
      step("把缺的 npm 包加到应用", !addDeps.code, packages.join("、"))
    }
    const second = await run(
      "tsc-apps-2",
      ["pnpm", "exec", "tsc", "--noEmit"],
      web,
    )
    step(
      "应用类型检查（严格配置）",
      !second.code,
      second.code ? errorSample(second.output) : "",
    )
    const build = await run("build-apps", ["pnpm", "build"], web)
    step(
      "应用构建（全部区块和页面）",
      !build.code,
      build.code ? "见 build-apps 日志" : `${apps.length} 个条目`,
    )
  }
  return steps
}
