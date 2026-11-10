import { hasRegistryItem } from "@/components/docs/registry-items"
import registry from "../../../../registry.json"
import { getSourceHtml } from "@/components/docs/source-files"

export const dynamic = "force-static"
export const dynamicParams = false

/** /code/auth-05.json：条目的高亮源码，构建时静态生成，文档页在用户点开代码时请求。 */
export function generateStaticParams() {
  return registry.items.map((item) => ({ file: `${item.name}.json` }))
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ file: string }> },
) {
  const name = (await params).file.replace(/\.json$/, "")
  if (!hasRegistryItem(name)) return new Response("Not Found", { status: 404 })
  return Response.json(await getSourceHtml(name))
}
