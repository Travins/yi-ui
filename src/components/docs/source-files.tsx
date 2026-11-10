import "server-only"

import { readFile } from "node:fs/promises"
import { cache } from "react"
import { CodeBlock, highlight } from "./code-block"
import { getInternalParts } from "./install-plan"
import { getRegistryItem } from "./registry-items"
import { installedPath, toInstalledImports } from "./installed-imports"

const LANGS: Record<string, string> = {
  ts: "ts",
  tsx: "tsx",
  css: "css",
  json: "json",
}

const countLines = (source: string) =>
  source.replace(/\n$/, "").split("\n").length

/** 条目安装后会得到哪些文件：安装路径与行数，不读高亮。区块查看器首屏只需要这些。 */
export const getSourceList = cache(async (name: string) => {
  const item = getRegistryItem(name)
  // 内部部件（如 auth-05-panel）没有自己的文档页，源码并到依赖它的条目里；同一个安装路径只列一次
  const files = [
    ...item.files,
    ...getInternalParts(name).flatMap((part) => part.files),
  ].filter(
    (file, index, all) =>
      all.findIndex((other) => installedPath(other) === installedPath(file)) ===
      index,
  )
  return Promise.all(
    files.map(async (file) => {
      const path = installedPath(file)
      const source = toInstalledImports(await readFile(file.path, "utf8"))
      return {
        path,
        source,
        lines: countLines(source),
        lang: LANGS[path.split(".").at(-1)!] ?? "tsx",
      }
    }),
  )
})

/** 高亮后的 HTML 字符串，供 /code/<name>.json 输出，由区块查看器在打开「代码」时请求。 */
export const getSourceHtml = cache(async (name: string) =>
  Promise.all(
    (await getSourceList(name)).map(async ({ path, source, lines, lang }) => ({
      path,
      source,
      lines,
      html: await highlight(source, lang),
    })),
  ),
)

// 同次服务端渲染共享已解析节点，源码列表里同一个文件只高亮一次。
export const getSourceFiles = cache(async (name: string) =>
  Promise.all(
    (await getSourceList(name)).map(async ({ path, source, lines, lang }) => ({
      path,
      source,
      lines,
      code: await CodeBlock({ code: source, lang, bare: true, collapse: false }),
    })),
  ),
)
