import { readFile, writeFile } from "node:fs/promises"
import postcss from "postcss"

type RegistryItem = {
  name: string
  files: { path: string }[]
  cssVars?: Partial<
    Record<"theme" | "light" | "dark", Record<string, string>>
  >
}

async function main() {
  const registry = JSON.parse(await readFile("registry.json", "utf8"))
  const root = postcss.parse(await readFile("src/styles/grid.css", "utf8"))
  function object(node: postcss.Container): Record<string, unknown> {
    const result: Record<string, unknown> = {}
    node.each((child) => {
      if (child.type === "decl") result[child.prop] = child.value
      else if (child.type === "rule") result[child.selector] = object(child)
      else if (child.type === "atrule")
        result[`@${child.name} ${child.params}`.trim()] = child.nodes
          ? object(child)
          : {}
    })
    return result
  }
  const css: Record<string, unknown> = {}
  root.walkAtRules("utility", (rule) => {
    css[`@utility ${rule.params}`] = object(rule)
  })
  const expected = [
    "screen-line-top",
    "screen-line-bottom",
    "pattern-ruler",
    "pattern-hatch",
    "pattern-dots",
    "pattern-grid",
    "pattern-plus",
    "pattern-wave",
    "bg-hatch",
    "bg-dots",
    "bg-grid",
  ]
  const missing = expected.filter((name) => !css[`@utility ${name}`])
  if (missing.length || Object.keys(css).length !== expected.length)
    throw new Error(`grid.css 的工具类与预期不一致（缺少：${missing.join("、") || "无"}），请审查同步脚本`)
  const grid = registry.items.find(
    (item: { name: string }) => item.name === "grid-layout",
  )
  grid.css = { ...css, "@layer base": {
      // html 与 body 都要裁：只裁 html 时 body 仍是滚动容器，全出血的分隔带会让页面横向可滚
      "html, body": { "overflow-x": "clip" },
    } }

  // 用到线条颜色或辅助色的条目必须自己声明变量：只装这一个条目时，
  // Tailwind 没有 --color-edge 就不会生成 border-edge，线条会退回默认边框色。
  const source = (item: RegistryItem) =>
    Promise.all(item.files.map((file) => readFile(file.path, "utf8"))).then(
      (texts) => texts.join("\n"),
    )
  const flowNames = ["blue", "green", "amber", "rose", "violet", "cyan"]
  const flowOwner: RegistryItem = registry.items.find(
    (item: RegistryItem) => item.name === "stat-card",
  )
  const edgeOwner: RegistryItem = grid
  for (const item of registry.items as RegistryItem[]) {
    const text = await source(item)
    const merge = (owner: RegistryItem, keys: string[]) => {
      item.cssVars ??= {}
      for (const mode of ["theme", "light", "dark"] as const) {
        for (const key of keys) {
          const value = owner.cssVars?.[mode]?.[key]
          if (value === undefined) continue
          ;(item.cssVars[mode] ??= {})[key] = value
        }
      }
    }
    if (/\b(?:[a-z]+-)edge\b|var\(--edge\)/.test(text)) {
      merge(edgeOwner, ["color-edge", "edge"])
    }
    if (/var\(--flow-/.test(text)) {
      merge(flowOwner, flowNames.map((name) => `flow-${name}`))
    }
  }
  await writeFile("registry.json", JSON.stringify(registry, null, 2) + "\n")
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
