import { SEARCH_LIMIT } from "./config"
import type { RegionOption } from "./types"

/** 搜索用的节点快照：名称、拼音、首字母都预先小写、去空格，每个节点只算一次 */
type IndexNode = {
  node: RegionOption
  name: string
  code: string
  /** 全拼，去掉音节间空格 */
  pinyin: string
  /** 每个音节在 `pinyin` 里的起点，用来限定「包含」只能从音节开头匹配 */
  bounds: number[]
  /** 各音节首字母 */
  initials: string
  /** 音节数与名称字数一致时，拼音命中的区间才能对应回具体的字 */
  aligned: boolean
}

type IndexEntry = {
  /** 从最顶层到该节点 */
  path: RegionOption[]
  nodes: IndexNode[]
  /** 从 0 数的层级 */
  level: number
}

type RegionIndex = {
  /** 最顶层节点，浏览模式的起点 */
  roots: RegionOption[]
  entries: IndexEntry[]
  /** 代码 → 路径，覆盖整棵树（不受 depth 限制），用来回显已保存的值 */
  byCode: Map<string, RegionOption[]>
}

/** 命中在某个节点上的高亮区间，左闭右开；`name` 对应名称的字，`code` 对应代码的字符 */
type RegionHighlight = {
  name?: [number, number]
  code?: [number, number]
}

type RegionSearchResult = {
  /** 命中的节点 */
  node: RegionOption
  /** 从最顶层到命中节点的完整路径 */
  path: RegionOption[]
  /** 命中节点所在层级，从 0 数 */
  level: number
  /** 与 `path` 一一对应的高亮区间，没有命中的节点为 `null` */
  highlights: (RegionHighlight | null)[]
}

type RegionSearchOptions = {
  /** 只搜索到第几级，同组件的 `depth` */
  depth?: number
  /**
   * 结果上限
   * @default 50
   */
  limit?: number
}

function toIndexNode(node: RegionOption): IndexNode {
  const syllables = (node.pinyin ?? "")
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
  const bounds: number[] = []
  let offset = 0
  for (const syllable of syllables) {
    bounds.push(offset)
    offset += syllable.length
  }
  return {
    node,
    name: node.name.toLowerCase(),
    code: node.code.toLowerCase(),
    pinyin: syllables.join(""),
    bounds,
    initials: syllables.map((syllable) => syllable[0]).join(""),
    aligned: syllables.length === node.name.length,
  }
}

/** 末级判定：没有下级，或已经到达可选的最大层级 */
function isLeafRegion(node: RegionOption, level: number, depth = Infinity) {
  return !node.children?.length || level + 1 >= depth
}

/**
 * 为一棵地区树建立搜索与回显索引。
 * 数据不变时只建一次（组件里用 useMemo）；一次性查询可直接用 `searchRegions`。
 */
function createRegionIndex(
  regions: RegionOption[],
  options: { depth?: number } = {},
): RegionIndex {
  const depth = options.depth ?? Infinity
  const entries: IndexEntry[] = []
  const byCode = new Map<string, RegionOption[]>()

  const visit = (
    nodes: RegionOption[],
    path: RegionOption[],
    indexed: IndexNode[],
  ) => {
    for (const node of nodes) {
      const here = [...path, node]
      const hereIndexed = [...indexed, toIndexNode(node)]
      if (!byCode.has(node.code)) byCode.set(node.code, here)
      const level = here.length - 1
      if (level < depth) entries.push({ path: here, nodes: hereIndexed, level })
      if (node.children?.length) visit(node.children, here, hereIndexed)
    }
  }
  visit(regions, [], [])
  return { roots: regions, entries, byCode }
}

type Hit = {
  /** 越小越靠前：0 完全相等，1 名称开头，2 拼音 / 首字母 / 代码开头，3 名称包含，4 拼音包含 */
  tier: number
  highlight: RegionHighlight
}

/** 拼音命中 [start, end) 对应到名称里的字 */
function syllableRange(
  target: IndexNode,
  start: number,
  end: number,
): [number, number] | undefined {
  if (!target.aligned) return undefined
  let first = 0
  let last = 0
  target.bounds.forEach((bound, i) => {
    if (bound <= start) first = i
    if (bound < end) last = i
  })
  return [first, last + 1]
}

/** 一个检索词在一个节点上的最佳命中；各字段取 tier 最小的 */
function matchNode(target: IndexNode, token: string): Hit | null {
  let best: Hit | null = null
  const consider = (tier: number, highlight: RegionHighlight) => {
    if (!best || tier < best.tier) best = { tier, highlight }
  }

  const nameAt = target.name.indexOf(token)
  if (nameAt !== -1) {
    const range: [number, number] = [nameAt, nameAt + token.length]
    consider(target.name === token ? 0 : nameAt === 0 ? 1 : 3, { name: range })
  }

  if (target.code.startsWith(token))
    consider(target.code === token ? 0 : 2, { code: [0, token.length] })

  // 拼音只对纯字母检索词有意义，避免汉字、数字去白白扫一遍
  if (target.pinyin && /^[a-z]+$/.test(token)) {
    if (target.pinyin === token) {
      consider(0, { name: syllableRange(target, 0, token.length) })
    } else if (target.pinyin.startsWith(token)) {
      consider(2, { name: syllableRange(target, 0, token.length) })
    } else {
      for (
        let at = target.pinyin.indexOf(token);
        at !== -1;
        at = target.pinyin.indexOf(token, at + 1)
      ) {
        if (target.bounds.includes(at)) {
          consider(4, { name: syllableRange(target, at, at + token.length) })
          break
        }
      }
    }
    if (target.initials === token)
      consider(0, { name: target.aligned ? [0, token.length] : undefined })
    else if (target.initials.startsWith(token))
      consider(2, { name: target.aligned ? [0, token.length] : undefined })
  }
  return best
}

/** 空格、斜杠、顿号、逗号都当作检索词的分隔 */
function splitQuery(query: string) {
  return query
    .trim()
    .toLowerCase()
    .split(/[\s/、,，]+/)
    .filter(Boolean)
}

type Match = {
  tier: number
  highlights: (RegionHighlight | null)[]
}

function matchEntry(
  entry: IndexEntry,
  compact: string,
  tokens: string[],
): Match | null {
  let best: Match | null = null
  const own = entry.nodes[entry.level]
  if (!own) return null

  // 整句去掉分隔后直接匹配本节点：「hang zhou」「hangzhou」都能命中杭州市
  const whole = matchNode(own, compact)
  if (whole) {
    const highlights = entry.nodes.map(() => null) as Match["highlights"]
    highlights[entry.level] = whole.highlight
    best = { tier: whole.tier, highlights }
  }

  // 带路径的检索：「杭州 西湖」——最后一个词命中本节点，其余的词命中本节点或任一上级。
  // 整句已经命中的不再走这里（路径检索的 tier 恒大于直接命中）
  if (!best && tokens.length > 1) {
    const last = matchNode(own, tokens.at(-1) ?? "")
    if (last) {
      const highlights = entry.nodes.map(() => null) as Match["highlights"]
      highlights[entry.level] = last.highlight
      let ok = true
      for (const token of tokens.slice(0, -1)) {
        let found = false
        for (const [i, node] of entry.nodes.entries()) {
          if (i > entry.level || found) break
          const hit = matchNode(node, token)
          if (hit) {
            highlights[i] = { ...hit.highlight, ...highlights[i] }
            found = true
          }
        }
        if (!found) {
          ok = false
          break
        }
      }
      if (ok) best = { tier: last.tier + 5, highlights }
    }
  }
  return best
}

/**
 * 在已建好的索引上搜索，返回前 `limit` 条与命中总数。
 * 支持汉字（包含）、全拼（去空格）、拼音首字母、代码前缀，以及带路径的写法（「杭州 西湖」）。
 * 完全匹配、开头匹配优先，同级时层级浅的优先，再同级保持数据里的顺序。
 */
function searchRegionIndex(
  index: RegionIndex,
  query: string,
  limit = SEARCH_LIMIT,
): { results: RegionSearchResult[]; total: number } {
  const tokens = splitQuery(query)
  if (!tokens.length) return { results: [], total: 0 }
  const compact = tokens.join("")

  const matched: { entry: IndexEntry; match: Match }[] = []
  for (const entry of index.entries) {
    const match = matchEntry(entry, compact, tokens)
    if (match) matched.push({ entry, match })
  }
  // Array.prototype.sort 是稳定排序，同 tier 同层级时保持数据顺序
  matched.sort(
    (a, b) => a.match.tier - b.match.tier || a.entry.level - b.entry.level,
  )
  return {
    total: matched.length,
    results: matched.slice(0, limit).flatMap(({ entry, match }) => {
      const node = entry.path[entry.level]
      return node
        ? [
            {
              node,
              path: entry.path,
              level: entry.level,
              highlights: match.highlights,
            },
          ]
        : []
    }),
  }
}

/**
 * 一次性搜索，内部每次重建索引。
 * 高频场景（输入框边敲边搜）请先 `createRegionIndex` 再 `searchRegionIndex`。
 */
function searchRegions(
  regions: RegionOption[],
  query: string,
  options: RegionSearchOptions = {},
): RegionSearchResult[] {
  const index = createRegionIndex(regions, { depth: options.depth })
  return searchRegionIndex(index, query, options.limit).results
}

/** 按代码找到从最顶层到它的完整路径；找不到返回空数组 */
function findRegionPath(regions: RegionOption[], code: string): RegionOption[] {
  for (const node of regions) {
    if (node.code === code) return [node]
    if (node.children?.length) {
      const rest = findRegionPath(node.children, code)
      if (rest.length) return [node, ...rest]
    }
  }
  return []
}

const depthCache = new WeakMap<RegionOption[], number>()

/** 一组节点往下最多有几级（自身算一级），用来决定步骤条显示几步；按数组引用缓存 */
function regionTreeDepth(nodes: RegionOption[] | undefined): number {
  if (!nodes?.length) return 0
  const cached = depthCache.get(nodes)
  if (cached !== undefined) return cached
  let below = 0
  for (const node of nodes)
    below = Math.max(below, regionTreeDepth(node.children))
  depthCache.set(nodes, below + 1)
  return below + 1
}

type RegionGroup = {
  /** 大写首字母 */
  letter: string
  items: RegionOption[]
}

/**
 * 按拼音首字母分组并按拼音排序，像通讯录一样；有节点缺拼音时返回 `null`，保持数据原顺序。
 * 多音字已在数据的 pinyin 里处理好，这里只取第一个字母。
 */
function groupRegionsByInitial(nodes: RegionOption[]): RegionGroup[] | null {
  if (!nodes.every((node) => node.pinyin?.trim())) return null
  const sorted = [...nodes].sort((a, b) =>
    a.pinyin!.localeCompare(b.pinyin!, "en"),
  )
  const groups: RegionGroup[] = []
  for (const node of sorted) {
    const letter = node.pinyin!.trim().charAt(0).toUpperCase()
    const last = groups[groups.length - 1]
    if (last?.letter === letter) last.items.push(node)
    else groups.push({ letter, items: [node] })
  }
  return groups
}

/** 路径转成文字：`formatRegionPath(path)` → 「浙江省 / 杭州市」，`formatRegionPath(path, "")` → 「浙江省杭州市」 */
function formatRegionPath(path: RegionOption[], separator = " / "): string {
  return path.map((node) => node.name).join(separator)
}

export {
  createRegionIndex,
  findRegionPath,
  formatRegionPath,
  groupRegionsByInitial,
  isLeafRegion,
  regionTreeDepth,
  searchRegionIndex,
  searchRegions,
}
export type {
  RegionGroup,
  RegionHighlight,
  RegionIndex,
  RegionSearchOptions,
  RegionSearchResult,
}
