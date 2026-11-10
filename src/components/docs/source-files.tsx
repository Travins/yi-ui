import "server-only"

import { readFile } from "node:fs/promises"
import { cache } from "react"
import { highlight } from "./code-block"
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

// 超过这个行数的文件（如全国行政区划数据）只高亮开头一段，原文仍完整提供给复制按钮
const MAX_HIGHLIGHT_LINES = 1500
const SHOWN_LINES = 200

/**
 * 高亮后的 HTML 字符串，供 /code/<name>.json 输出。
 * 查看器、手动安装和源码列表都在用户点开时才请求它，页面本身不内联源码。
 */
export const getSourceHtml = cache(async (name: string) =>
  Promise.all(
    (await getSourceList(name)).map(async ({ path, source, lines, lang }) => {
      const long = lines > MAX_HIGHLIGHT_LINES
      return {
        path,
        source,
        lines,
        html: await highlight(
          long ? source.split("\n").slice(0, SHOWN_LINES).join("\n") : source,
          lang,
        ),
        ...(long ? { shown: SHOWN_LINES } : null),
      }
    }),
  ),
)
