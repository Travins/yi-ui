import type { SortedResult } from "fumadocs-core/search"
import {
  displayPath,
  searchGroup,
  searchGroups,
  searchShortcuts,
  type SearchGroup,
} from "@/lib/search"
import { buildMatcher, toSegments, type Segment } from "./search-text"

/** 每个页面最多展示的子命中数，超出部分折叠成“还有 N 处匹配”。 */
const MAX_HITS = 3

export type Row =
  | {
      kind: "page"
      index: number
      key: string
      url: string
      group: SearchGroup
      title: Segment[]
      path: string
    }
  | {
      kind: "heading" | "text"
      index: number
      key: string
      url: string
      segments: Segment[]
    }
  | { kind: "more"; index: number; key: string; url: string; count: number }
  | {
      kind: "shortcut"
      index: number
      key: string
      url: string
      group: SearchGroup
      title: string
      path: string
    }
  | { kind: "recent"; index: number; key: string; query: string }

/** 一个页面主项 + 它的子命中（单个快捷入口 / 最近搜索也各自成块）。 */
export type Block = Row[]

export type Section = {
  id: string
  label: string
  blocks: Block[]
  /** 分组标题右侧的操作 */
  action?: "clear-recent"
}

export type SearchModel = {
  sections: Section[]
  rows: Row[]
  pageCount: number
  hitCount: number
}

function finish(sections: Section[], pageCount = 0, hitCount = 0): SearchModel {
  return {
    sections,
    rows: sections.flatMap((section) => section.blocks.flat()),
    pageCount,
    hitCount,
  }
}

/** 搜索结果：按页面聚合，再按类型分组。 */
export function buildResultModel(
  results: SortedResult[],
  query: string,
): SearchModel {
  const matcher = buildMatcher(query)
  const pages = new Map<
    string,
    { url: string; title: string; hits: SortedResult[] }
  >()
  const seen = new Set<string>()

  for (const result of results) {
    const url = result.url.split("#", 1).join("")
    let page = pages.get(url)
    if (!page) {
      page = { url, title: "", hits: [] }
      pages.set(url, page)
    }
    if (result.type === "page") {
      page.title = String(result.content)
      continue
    }
    const key = `${result.url}\n${result.content}`
    if (seen.has(key)) continue
    seen.add(key)
    page.hits.push(result)
  }

  let index = 0
  let hitCount = 0
  const sections: Section[] = []
  for (const group of searchGroups) {
    const blocks: Block[] = []
    for (const page of pages.values()) {
      if (searchGroup(page.url) !== group) continue
      const path = displayPath(page.url)
      const block: Block = [
        {
          kind: "page",
          index: index++,
          key: page.url,
          url: page.url,
          group,
          title: toSegments(page.title || path, matcher),
          path,
        },
      ]
      for (const hit of page.hits.slice(0, MAX_HITS)) {
        const heading = hit.type === "heading"
        block.push({
          kind: heading ? "heading" : "text",
          index: index++,
          key: `${hit.url}\n${hit.content}`,
          url: hit.url,
          segments: toSegments(String(hit.content), matcher, !heading),
        })
      }
      if (page.hits.length > MAX_HITS) {
        block.push({
          kind: "more",
          index: index++,
          key: `${page.url}#more`,
          url: page.url,
          count: page.hits.length - MAX_HITS,
        })
      }
      hitCount += page.hits.length
      blocks.push(block)
    }
    if (blocks.length) sections.push({ id: group, label: group, blocks })
  }
  return finish(sections, pages.size, hitCount)
}

/** 空状态：快捷入口 + 最近搜索。 */
export function buildIdleModel(recent: string[]): SearchModel {
  let index = 0
  const sections: Section[] = [
    {
      id: "shortcuts",
      label: "快捷入口",
      blocks: searchShortcuts.map((item) => [
        {
          kind: "shortcut",
          index: index++,
          key: item.url,
          url: item.url,
          group: item.group,
          title: item.title,
          path: displayPath(item.url),
        },
      ]),
    },
  ]
  if (recent.length) {
    sections.push({
      id: "recent",
      label: "最近搜索",
      action: "clear-recent",
      blocks: recent.map((query) => [
        { kind: "recent", index: index++, key: query, query },
      ]),
    })
  }
  return finish(sections)
}
