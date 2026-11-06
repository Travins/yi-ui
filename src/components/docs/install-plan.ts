import { siteConfig } from "@/config/site"
import {
  getRegistryItem,
  type CssTree,
  type RegistryItem,
} from "./registry-items"

const SELF_URL = new RegExp(
  `^${siteConfig.url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/r/([^/]+)\\.json$`,
)
const NAMESPACE = /^@yiui\/(.+)$/

/** registryDependencies 里的一项：本站条目名，或 shadcn 官方组件名。 */
function parseDependency(ref: string): { entry: string } | { shadcn: string } {
  const own = ref.match(SELF_URL)?.[1] ?? ref.match(NAMESPACE)?.[1]
  return own ? { entry: own } : { shadcn: ref }
}

/**
 * 内部部件：类型为 `registry:component` 的条目是某个区块的一部分（例如 auth-05-panel 是 auth-05 的面板），
 * 没有独立的文档页，也不进列表。依赖它的条目在文档里连它的源码一起展示，依赖列表里不单独列出。
 */
export function isInternalPart(item: { type: string }) {
  return item.type === "registry:component"
}

/** 条目依赖的内部部件（沿 registryDependencies 递归，被依赖的排在前面）。 */
export function getInternalParts(name: string): RegistryItem[] {
  const parts: RegistryItem[] = []
  const seen = new Set<string>()
  function visit(itemName: string) {
    if (seen.has(itemName)) return
    seen.add(itemName)
    const item = getRegistryItem(itemName)
    for (const ref of item.registryDependencies ?? []) {
      const dep = parseDependency(ref)
      if ("entry" in dep) visit(dep.entry)
    }
    if (itemName !== name && isInternalPart(item)) parts.push(item)
  }
  visit(name)
  return parts
}

export type InstallPlan = {
  /** 先于本条目安装的本站条目，按依赖顺序（被依赖的排在前面） */
  entries: { name: string; title: string; type: string }[]
  /** 本条目及依赖条目用到的 shadcn 官方组件 */
  shadcn: string[]
  /** 本条目及依赖条目用到的 npm 包 */
  npm: string[]
  /** 需要合并进全局样式的 CSS（变量、主题映射、工具类），没有则为空串 */
  css: string
}

/**
 * 解析手动安装需要的全部东西：把 registryDependencies 展开成完整的依赖闭包，
 * 合并 npm 依赖与样式，这样手动安装的人不必逐个翻依赖条目的页面去凑。
 */
export function getInstallPlan(name: string): InstallPlan {
  const ordered: RegistryItem[] = []
  const shadcn = new Set<string>()
  const visiting = new Set<string>()

  function visit(itemName: string) {
    if (visiting.has(itemName)) return
    visiting.add(itemName)
    const item = getRegistryItem(itemName)
    for (const ref of item.registryDependencies ?? []) {
      const dep = parseDependency(ref)
      if ("entry" in dep) visit(dep.entry)
      else shadcn.add(dep.shadcn)
    }
    ordered.push(item)
  }
  visit(name)

  const npm = new Set<string>()
  for (const item of ordered)
    for (const pkg of item.dependencies ?? []) npm.add(pkg)

  return {
    entries: ordered
      .filter((item) => item.name !== name && !isInternalPart(item))
      .map(({ name, title, type }) => ({ name, title, type })),
    shadcn: [...shadcn],
    npm: [...npm],
    css: mergeCss(ordered),
  }
}

/** 条目类型 → 文档页地址 */
export function entryHref({ name, type }: { name: string; type: string }) {
  const section =
    type === "registry:block"
      ? "blocks"
      : type === "registry:page"
        ? "pages"
        : "components"
  return `/${section}/${name}/`
}

function declarations(vars: Record<string, string>) {
  return Object.entries(vars).map(([key, value]) => `  --${key}: ${value};`)
}

function block(selector: string, lines: string[]) {
  return lines.length ? [`${selector} {`, ...lines, "}"].join("\n") : ""
}

function serializeCss(tree: CssTree, indent = ""): string[] {
  const out: string[] = []
  for (const [key, value] of Object.entries(tree)) {
    if (typeof value === "string") {
      out.push(`${indent}${key}: ${value};`)
    } else {
      out.push(
        `${indent}${key} {`,
        ...serializeCss(value, `${indent}  `),
        `${indent}}`,
      )
    }
  }
  return out
}

/** 与 shadcn CLI 写入 globals.css 的内容一致：@theme inline、:root、.dark、再加条目自带的 css。 */
function mergeCss(items: RegistryItem[]) {
  const theme: Record<string, string> = {}
  const light: Record<string, string> = {}
  const dark: Record<string, string> = {}
  const css: CssTree = {}
  for (const item of items) {
    Object.assign(theme, item.cssVars?.theme)
    Object.assign(light, item.cssVars?.light)
    Object.assign(dark, item.cssVars?.dark)
    Object.assign(css, item.css)
  }
  return [
    block("@theme inline", declarations(theme)),
    block(":root", declarations(light)),
    block(".dark", declarations(dark)),
    ...Object.entries(css).map(([selector, body]) =>
      block(selector, typeof body === "string" ? [] : serializeCss(body, "  ")),
    ),
  ]
    .filter(Boolean)
    .join("\n\n")
}
