import { readFile } from "node:fs/promises"
import { pageMarkdown } from "./page-markdown"
import { toInstalledImports } from "./installed-imports"
import { componentPropRows } from "./props-table"
import { siteConfig } from "@/config/site"

const attribute = (tag: string, name: string) =>
  tag.match(new RegExp(`\\b${name}="([^"]+)"`))?.[1]

const tableCell = (text: string) =>
  text.replace(/\|/g, "\\|").replace(/\s*\n\s*/g, " ")

async function exampleCode(tag: string) {
  const name = attribute(tag, "name")
  if (!name) return tag
  const source = toInstalledImports(
    await readFile(`src/registry/examples/${name}.tsx`, "utf8"),
  )
  return `\`\`\`tsx title="${name}.tsx"\n${source.trim()}\n\`\`\``
}

async function propsTable(tag: string) {
  const name = attribute(tag, "name")
  const component = attribute(tag, "component")
  if (!name || !component) return tag
  const rows = await componentPropRows(name, component)
  if (!rows.length) return `${component} 没有自定义 Props，继承原生元素的全部属性。`
  return [
    `\`${component}\` 的属性：`,
    "",
    "| 属性 | 类型 | 默认值 | 说明 |",
    "| --- | --- | --- | --- |",
    ...rows.map((row) =>
      [
        `| \`${row.name}${row.required ? "" : "?"}\``,
        `\`${tableCell(row.type)}\``,
        row.default ? `\`${tableCell(row.default)}\`` : "-",
        `${tableCell(row.description ?? "")}${row.deprecated ? "（已弃用）" : ""} |`,
      ].join(" | "),
    ),
  ].join("\n")
}

const installCommand = (tag: string) => {
  const name = attribute(tag, "name")
  return name
    ? `\`\`\`bash\npnpm dlx shadcn@latest add @yiui/${name}\n\`\`\``
    : tag
}

const sourceLink = (tag: string) => {
  const name = attribute(tag, "name")
  return name ? `完整源码：${siteConfig.url}/r/${name}.json` : tag
}

const expanders: [RegExp, (tag: string) => string | Promise<string>][] = [
  [/<ComponentPreview\b[^>]*\/>/g, exampleCode],
  [/<PropsTable\b[^>]*\/>/g, propsTable],
  [/<InstallCommand\b[^>]*\/>/g, installCommand],
  [/<ComponentSource\b[^>]*\/>/g, sourceLink],
]

async function replaceAsync(
  text: string,
  pattern: RegExp,
  replacer: (tag: string) => string | Promise<string>,
) {
  const results = await Promise.all(
    [...text.matchAll(pattern)].map((match) => replacer(match[0])),
  )
  let index = 0
  return text.replace(pattern, () => results[index++])
}

/**
 * 给 Agent 读的 Markdown（/md/*.md）：把文档组件换成实际内容，
 * 示例展开成代码，属性表从源码生成，读完一页就够写代码，不用再去翻仓库。
 * 页面上的「复制页面」仍用 pageMarkdown，避免 HTML 体积膨胀。
 */
export async function agentMarkdown(
  page: Parameters<typeof pageMarkdown>[0],
) {
  // 只展开代码围栏之外的部分：文档里可能把这些标签写成示例
  const parts = (await pageMarkdown(page)).split(/(^```[\s\S]*?^```$)/m)
  for (let i = 0; i < parts.length; i += 2) {
    for (const [pattern, replacer] of expanders) {
      parts[i] = await replaceAsync(parts[i], pattern, replacer)
    }
  }
  return parts.join("")
}
