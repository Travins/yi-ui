import { agentMarkdown } from "@/components/docs/agent-markdown"
import { docsPages } from "@/lib/site-content"

export const dynamic = "force-static"
export const dynamicParams = false

// 原有卡片目录不生成 Markdown。
const overviewSections = new Set(["components", "blocks", "pages"])

const markdownPages = () =>
  docsPages().filter(
    (page) => !(page.slugs.length === 1 && overviewSections.has(page.slugs[0])),
  )

/** /md/components/grid-layout.md：给 Agent 读的 Markdown，示例和属性表已展开，构建时静态生成。 */
export function generateStaticParams() {
  return markdownPages().map((page) => ({
    slug: [...page.slugs.slice(0, -1), `${page.slugs.at(-1)}.md`],
  }))
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string[] }> },
) {
  const { slug } = await params
  const key = [...slug.slice(0, -1), slug.at(-1)!.replace(/\.md$/, "")].join(
    "/",
  )
  const page = markdownPages().find((item) => item.slugs.join("/") === key)
  if (!page) return new Response("Not Found", { status: 404 })
  return new Response(`${await agentMarkdown(page)}\n`, {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  })
}
