/** 搜索结果文本处理：去 Markdown、截取摘要、标记命中词。纯函数，无 React 依赖。 */

export type Segment = { text: string; code?: boolean; match?: boolean }

/** 命中词之前 / 之后保留的字符数（摘要为单行显示，前文留短一些，让命中词落在可见区域）。 */
const BEFORE = 16
const AFTER = 56

/** 整个查询词 + 按词切分后的各部分，拼成一个全局正则；没有查询时返回 null。 */
export function buildMatcher(query: string): RegExp | null {
  const q = query.trim()
  if (!q) return null
  const words = new Set([q])
  for (const part of new Intl.Segmenter("zh-CN", {
    granularity: "word",
  }).segment(q)) {
    if (part.isWordLike) words.add(part.segment)
  }
  const pattern = [...words]
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)
    .map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|")
  return new RegExp(pattern, "gi")
}

function cleanInline(text: string) {
  return text
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/<\/?[a-zA-Z][^>]*>/g, "")
    .replace(/(\*\*|__)(?=\S)(.+?)\1/g, "$2")
    .replace(/\*(?=\S)([^*]+?)\*/g, "$1")
    .replace(/(^|\s)_(?=\S)(.+?)_(?=\s|$|[.,;:!?，。；：！？）)])/g, "$1$2")
    .replace(/~~(.+?)~~/g, "$1")
}

/** 去掉 Markdown 语法，反引号内容保留并逐字符标记为 code。 */
function parseInline(markdown: string) {
  const source = markdown
    .replace(/^\s{0,3}(#{1,6}\s+|[-*+]\s+|>\s?|\d+\.\s+)/gm, "")
    .replace(/\s*\n\s*/g, " ")
  let text = ""
  const code: boolean[] = []
  const push = (part: string, isCode: boolean) => {
    text += part
    for (let i = 0; i < part.length; i++) code.push(isCode)
  }
  let last = 0
  for (const match of source.matchAll(/`([^`]+)`/g)) {
    push(cleanInline(source.slice(last, match.index)), false)
    push(match[1] ?? "", true)
    last = match.index + match[0].length
  }
  push(cleanInline(source.slice(last)), false)
  return { text, code }
}

/**
 * 把 Markdown 文本转成可渲染的片段。
 * excerpt 为 true 时围绕首个命中词截取，并在被截断的一侧补省略号。
 */
export function toSegments(
  markdown: string,
  matcher: RegExp | null,
  excerpt = false,
): Segment[] {
  const { text, code } = parseInline(markdown)
  const matched: boolean[] = new Array(text.length).fill(false)
  if (matcher) {
    for (const hit of text.matchAll(matcher)) {
      for (let i = 0; i < hit[0].length; i++) matched[hit.index + i] = true
    }
  }

  let start = 0
  let end = text.length
  if (excerpt && text.length > BEFORE + AFTER + 8) {
    const first = matcher ? text.search(matcher) : -1
    start = first > BEFORE ? first - BEFORE : 0
    end = Math.min(text.length, start + BEFORE + AFTER)
  }

  const segments: Segment[] = []
  if (start > 0) segments.push({ text: "…" })
  for (let i = start; i < end; i++) {
    const last = segments[segments.length - 1]
    if (
      last &&
      !!last.code === code[i] &&
      !!last.match === matched[i] &&
      last.text !== "…"
    ) {
      last.text += text[i]
    } else {
      segments.push({ text: text.charAt(i), code: code[i], match: matched[i] })
    }
  }
  if (end < text.length) segments.push({ text: "…" })
  return segments
}
