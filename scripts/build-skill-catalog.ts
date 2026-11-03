/**
 * 由 registry.json 和文档 frontmatter 生成 skills/yi-ui/references/catalog.md，
 * 让使用者的 Agent 不联网也能选型。`--check` 只比较不写入，用于推送前检查。
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs"

import { sectionGroups } from "../src/components/docs/docs-groups"

type Item = {
  name: string
  type: string
  description?: string
  files: { path: string }[]
}

const OUTPUT = "skills/yi-ui/references/catalog.md"
const items = (
  JSON.parse(readFileSync("registry.json", "utf8")) as { items: Item[] }
).items

function frontmatter(section: string, name: string) {
  const file = `content/docs/${section}/${name}.mdx`
  if (!existsSync(file)) return null
  const head = readFileSync(file, "utf8").match(/^---\n([\s\S]*?)\n---/)?.[1] ?? ""
  const field = (key: string) =>
    head.match(new RegExp(`^${key}:\\s*(.+)$`, "m"))?.[1]?.trim()
  return {
    section,
    title: field("title") ?? name,
    description: field("description"),
    group: field("group"),
  }
}

const docOf = (item: Item) =>
  ["components", "blocks", "pages"]
    .map((section) => frontmatter(section, item.name))
    .find(Boolean) ?? null

const importPath = (item: Item) => {
  const match = item.files[0]?.path.match(/^src\/registry\/ui\/(.+)\.tsx?$/)
  return match ? `@/components/ui/${match[1]}` : null
}

const cell = (text = "") => text.replace(/\|/g, "\\|")

function table(entries: Item[], withImport: boolean) {
  const rows = entries.map((item) => {
    const doc = docOf(item)
    const link = doc
      ? `[${item.name}](https://yiui.dev/md/${doc.section}/${item.name}.md)`
      : item.name
    const summary = cell(doc?.description ?? item.description)
    return withImport
      ? `| ${link} | ${doc?.title ?? ""} | ${importPath(item) ? `\`${importPath(item)}\`` : "-"} | ${summary} |`
      : `| ${link} | ${doc?.title ?? ""} | ${summary} |`
  })
  return [
    withImport
      ? "| 条目 | 中文名 | 导入路径 | 说明 |\n| --- | --- | --- | --- |"
      : "| 条目 | 中文名 | 说明 |\n| --- | --- | --- |",
    ...rows,
  ].join("\n")
}

const components = items.filter((item) => docOf(item)?.section === "components")
const sections = (sectionGroups.components ?? []).map((group) => {
  const entries = components.filter((item) => docOf(item)?.group === group.id)
  return entries.length
    ? `### ${group.title}\n\n${table(entries, true)}`
    : ""
})
const ungrouped = components.filter(
  (item) =>
    !(sectionGroups.components ?? []).some(
      (group) => group.id === docOf(item)?.group,
    ),
)
if (ungrouped.length) sections.push(`### 其他\n\n${table(ungrouped, true)}`)

const output = `<!-- 由 scripts/build-skill-catalog.ts 生成，不要手改。 -->

# Yi UI 条目目录

安装：\`pnpm dlx shadcn@latest add @yiui/<条目>\`。点条目名读完整文档（含示例代码和属性表）。

## 组件

${sections.filter(Boolean).join("\n\n")}

## 区块

${table(items.filter((item) => docOf(item)?.section === "blocks"), false)}

## 页面

${table(items.filter((item) => docOf(item)?.section === "pages"), false)}
`

if (process.argv.includes("--check")) {
  const current = existsSync(OUTPUT) ? readFileSync(OUTPUT, "utf8") : ""
  if (current !== output) {
    console.error(`✗ ${OUTPUT} 已过期，运行 pnpm registry:build 后一起提交。`)
    process.exit(1)
  }
} else {
  writeFileSync(OUTPUT, output)
}
