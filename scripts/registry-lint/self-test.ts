import fs from "node:fs"
import os from "node:os"
import { createRequire } from "node:module"
import path from "node:path"
import { spawnSync } from "node:child_process"
import assert from "node:assert/strict"

type Diagnostic = {
  rule: string
  level: "error" | "warn"
  file: string
  line: number
  column: number
  message: string
}
type Api = {
  lintSource: (file: string, text: string) => Diagnostic[]
  lintFile: (
    file: string,
    text: string,
  ) => {
    diagnostics: Diagnostic[]
    ignored: { rule: string; file: string; line: number }[]
  }
  lintRegistry: (root: string) => Diagnostic[]
  packageName: (spec: string) => string
  siteDependency: (spec: string, homepage: string) => string | undefined
  fixtureDir: string
}
export function runSelfTests(api: Api) {
  const file = "src/registry/blocks/test/test.tsx"
  const lint = (text: string, filename = file) => api.lintSource(filename, text)
  const bad = lint(
    fs.readFileSync(path.join(api.fixtureDir, "invalid.tsx.fixture"), "utf8"),
  )
  for (const rule of [
    "no-default-export",
    "exports-at-end",
    "use-client-first",
    "data-slot",
    "function-declaration",
    "no-forward-ref",
    "no-hardcoded-color",
    "forbidden-import",
    "labels",
    "storage-key-prefix",
  ])
    assert(
      bad.some((d) => d.rule === rule),
      `未命中 ${rule}`,
    )
  assert(bad.every((d) => d.line > 0 && d.column > 0 && d.file === file))
  const valid = fs.readFileSync(
    path.join(api.fixtureDir, "valid.tsx.fixture"),
    "utf8",
  )
  assert.deepEqual(lint(valid, "src/registry/ui/test/test.tsx"), [])
  assert.deepEqual(
    lint("const DEFAULT_LABELS = { title: <div>标题</div> };", file),
    [],
  )
  assert.equal(lint("function Panel() { return <><div /></>; }").length, 0)
  assert.equal(
    lint(
      "function Panel() { function Child() { return <div />; } return <Other />; }",
    ).filter((d) => d.rule === "data-slot").length,
    1,
  )
  assert.equal(
    lint(
      "function Panel() { return <div />; }",
      "src/registry/examples/test.tsx",
    ).length,
    0,
  )
  for (const name of ["demo", "page", "layout"])
    assert(
      !lint(
        "export default function Panel() { return <div />; }",
        `src/registry/blocks/test/${name}.tsx`,
      ).some((d) => ["data-slot", "no-default-export"].includes(d.rule)),
    )
  // exports-at-end：demo/page/layout 与 examples 按 Next.js 约定不要求集中导出。
  const moduleExport =
    'export const value = 1; export function Panel() { return <div data-slot="panel" />; }'
  assert(
    lint(moduleExport).filter((d) => d.rule === "exports-at-end").length === 2,
  )
  for (const exemptFile of [
    "src/registry/examples/test.tsx",
    "src/registry/blocks/test/demo.tsx",
    "src/registry/blocks/test/page.tsx",
    "src/registry/pages/test/layout.tsx",
  ])
    assert.deepEqual(
      lint(moduleExport, exemptFile).filter((d) => d.rule === "exports-at-end"),
      [],
      exemptFile,
    )
  // 忽略注释：必须写明规则 id，且只作用于紧邻的下一行。
  const ignoredOne = api.lintFile(
    file,
    "// registry-lint-disable-next-line exports-at-end\nexport const value = 1;",
  )
  assert.deepEqual(ignoredOne.diagnostics, [])
  assert.deepEqual(ignoredOne.ignored, [
    { rule: "exports-at-end", file, line: 2 },
  ])
  const ignoredTwo = api.lintFile(
    file,
    "// registry-lint-disable-next-line exports-at-end, data-slot\nexport function Panel() { return <div />; }",
  )
  assert.deepEqual(ignoredTwo.diagnostics, [])
  assert.deepEqual(ignoredTwo.ignored.map((entry) => entry.rule).sort(), [
    "data-slot",
    "exports-at-end",
  ])
  assert.deepEqual(
    api
      .lintFile(
        file,
        "// registry-lint-disable-next-line\nexport const value = 1;",
      )
      .diagnostics.map((d) => d.rule),
    ["disable-comment", "exports-at-end"],
  )
  assert.deepEqual(
    api
      .lintFile(
        file,
        "// registry-lint-disable-next-line nope\nexport const value = 1;",
      )
      .diagnostics.map((d) => d.rule),
    ["disable-comment", "exports-at-end"],
  )
  assert.deepEqual(
    lint(
      "// registry-lint-disable-next-line exports-at-end\n\nexport const value = 1;",
    ).map((d) => d.rule),
    ["exports-at-end"],
    "忽略注释只作用于紧邻的下一行",
  )
  assert.deepEqual(
    lint(
      `const text = "// registry-lint-disable-next-line exports-at-end"\nexport const value = 1;`,
    ).map((d) => d.rule),
    ["exports-at-end"],
    "字符串里的同名文本不是忽略注释",
  )
  assert.equal(
    lint(
      "function Panel() { return <div>一<span>二</span><span>三</span><span>四</span></div>; }",
    ).filter((d) => d.rule === "labels").length,
    3,
  )
  assert.equal(
    lint(
      "function Panel() { return <div>文案</div>; }",
      "src/registry/blocks/test/config.ts",
    ).filter((d) => d.rule === "labels").length,
    0,
  )
  for (const color of [
    "bg-blue-500",
    "text-zinc-400",
    "from-sky-300",
    "border-red-500/50",
    "hover:fill-black",
    "[&>p]:decoration-rose-950",
    "bg-[rgb(0,0,0)]",
    "text-[#aabbcc]",
    "shadow-white",
    "divide-teal-200",
  ])
    assert(
      lint(`const X = <div className=${JSON.stringify(color)} />`).some(
        (d) => d.rule === "no-hardcoded-color",
      ),
      color,
    )
  assert.equal(
    lint(
      'const X = <div className={`bg-background ${ok ? "text-red-500" : "text-primary"}`} />',
    ).filter((d) => d.rule === "no-hardcoded-color").length,
    1,
  )
  assert.equal(
    lint(
      'import { X } from "@/registry/blocks/x/x"',
      "src/registry/ui/x/x.tsx",
    ).filter((d) => d.rule === "forbidden-import").length,
    1,
  )
  assert.equal(
    lint(
      'import { X } from "../../pages/x/x"',
      "src/registry/blocks/x/x.tsx",
    ).filter((d) => d.rule === "forbidden-import").length,
    1,
  )
  assert.equal(lint('import { X } from "@/registry/ui/x/x"').length, 0)
  assert(
    lint(
      'import { forwardRef as fr } from "react"; const X = fr(() => null);',
    ).some((d) => d.rule === "no-forward-ref"),
  )
  assert(
    lint(
      'import { cva as variants } from "class-variance-authority"; variants("bg-blue-500");',
    ).some((d) => d.rule === "no-hardcoded-color"),
  )
  assert(
    lint("const X = 1; export { X as default };").some(
      (d) => d.rule === "no-default-export",
    ),
  )
  assert.equal(api.packageName("@scope/pkg/sub"), "@scope/pkg")
  assert.equal(api.packageName("@scope/pkg@^1.0"), "@scope/pkg")
  assert.equal(api.packageName("motion@^1"), "motion")
  assert.equal(api.siteDependency("@yiui/button", "https://yiui.dev"), "button")
  assert.equal(
    api.siteDependency("https://yiui.dev/r/button.json", "https://yiui.dev"),
    "button",
  )
  assert.equal(
    api.siteDependency("https://other.com/r/button.json", "https://yiui.dev"),
    undefined,
  )
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "registry-lint-"))
  try {
    const write = (name: string, content: string) => {
      fs.mkdirSync(path.dirname(path.join(root, name)), { recursive: true })
      fs.writeFileSync(path.join(root, name), content)
    }
    write(
      "src/registry/ui/a/a.tsx",
      'import "@scope/pkg/sub"; import "react/jsx-runtime"; import "next/link"; import "@/components/ui/button"; import "@/registry/ui/b"; import "./local";',
    )
    write("src/registry/ui/a/local.ts", "export {};")
    write("src/registry/ui/b/index.ts", "export {};")
    const items = [
      {
        name: "a",
        files: [
          { path: "src/registry/ui/a/a.tsx" },
          { path: "src/registry/ui/a/local.ts" },
        ],
        dependencies: ["@scope/pkg@^1"],
        registryDependencies: ["button", "https://yiui.dev/r/b.json"],
      },
      { name: "b", files: [{ path: "src/registry/ui/b/index.ts" }] },
    ]
    write("registry.json", JSON.stringify({ items }, null, 2))
    assert.deepEqual(api.lintRegistry(root), [])
    items[0]!.dependencies = ["unused@1"]
    items[0]!.registryDependencies = []
    items[0]!.files.push({ path: "missing.tsx" })
    write("registry.json", JSON.stringify({ items }, null, 2))
    const result = api.lintRegistry(root)
    assert.equal(result.filter((d) => d.level === "error").length, 4)
    assert.equal(result.filter((d) => d.level === "warn").length, 1)
    assert(
      result.filter((d) => d.file === "registry.json").every((d) => d.line > 1),
    )
    // 子进程验证参数筛选、纯 JSON、退出状态与 warning 上限。
    const script = path.resolve(api.fixtureDir, "../../registry-lint.ts")
    const cli = (...args: string[]) =>
      spawnSync(
        process.execPath,
        [
          "--import",
          createRequire(import.meta.url).resolve("tsx"),
          script,
          ...args,
        ],
        {
          cwd: root,
          encoding: "utf8",
          env: { ...process.env, NODE_PATH: path.resolve("node_modules") },
        },
      )
    const filtered = cli("--rule", "registry-deps", "--json")
    assert.equal(filtered.status, 1, filtered.stderr)
    assert(
      JSON.parse(filtered.stdout).diagnostics.every(
        (d: Diagnostic) => d.rule === "registry-deps",
      ),
    )
    write("src/registry/ui/a/warn.tsx", "export const value = 1;")
    assert.equal(
      cli("--rule", "exports-at-end", "--max-warnings", "0").status,
      1,
    )
    assert.equal(
      cli("--rule", "exports-at-end", "--max-warnings", "1").status,
      0,
    )
    // 生成文件 src/registry/__index__.tsx 不参与检查。
    write("src/registry/__index__.tsx", "export const registryExamples = {};")
    assert.equal(
      cli("--rule", "exports-at-end", "--max-warnings", "1").status,
      0,
    )
    // 被忽略的条数会进入统计与 JSON 输出，不触发退出码。
    write(
      "src/registry/ui/a/ignored.tsx",
      "// registry-lint-disable-next-line exports-at-end\nexport const value = 1;",
    )
    const suppressed = cli("--rule", "exports-at-end", "--json")
    assert.equal(suppressed.status, 0, suppressed.stderr)
    const report = JSON.parse(suppressed.stdout)
    assert.deepEqual(
      report.diagnostics.filter((d: Diagnostic) =>
        d.file.endsWith("ignored.tsx"),
      ),
      [],
    )
    assert.equal(report.summary.ignored.total, 1)
    assert.equal(report.summary.ignored.byRule["exports-at-end"], 1)
    assert.equal(report.summary.warnings, 1)
    assert.match(
      cli("--rule", "exports-at-end").stdout,
      /已忽略 1 条（exports-at-end 1）/,
    )
    assert.equal(cli("--rule", "unknown").status, 1)
    assert.equal(cli("--max-warnings", "-1").status, 1)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
}
