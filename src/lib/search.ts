export const SEARCH_INDEX_URL = "/search.json"

export const searchGroups = [
  "文档",
  "组件",
  "区块",
  "页面",
  "主题",
  "博客",
] as const
export type SearchGroup = (typeof searchGroups)[number]

export function searchGroup(url: string): SearchGroup {
  const section = url.split("/").filter(Boolean)[0]
  const groups: Record<string, SearchGroup> = {
    docs: "文档",
    components: "组件",
    blocks: "区块",
    pages: "页面",
    themes: "主题",
    blog: "博客",
  }
  return groups[section ?? ""] ?? "页面"
}

/** 空状态的快捷入口：group 决定图标。 */
export const searchShortcuts: {
  title: string
  url: string
  group: SearchGroup
}[] = [
  { title: "文档", url: "/docs/", group: "文档" },
  { title: "组件", url: "/components/", group: "组件" },
  { title: "区块", url: "/blocks/", group: "区块" },
  { title: "页面", url: "/pages/", group: "页面" },
  { title: "颜色主题", url: "/themes/", group: "主题" },
  { title: "博客", url: "/blog/", group: "博客" },
]

/** `/components/grid-layout/` → `/components/grid-layout`（根路径保持 `/`）。 */
export function displayPath(url: string) {
  const path = url.split("#", 1).join("").replace(/\/+$/, "")
  return path || "/"
}
