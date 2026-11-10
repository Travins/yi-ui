import { hasRegistryItem, viewItems } from "@/components/docs/registry-items"
import { getSourceHtml } from "@/components/docs/source-files"

export const dynamic = "force-static"
export const dynamicParams = false

/** /code/auth-05.json：区块 / 页面的高亮源码，构建时静态生成，查看器打开「代码」时请求。 */
export function generateStaticParams() {
  return viewItems().map((item) => ({ file: `${item.name}.json` }))
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ file: string }> },
) {
  const name = (await params).file.replace(/\.json$/, "")
  if (!hasRegistryItem(name)) return new Response("Not Found", { status: 404 })
  return Response.json(await getSourceHtml(name))
}
