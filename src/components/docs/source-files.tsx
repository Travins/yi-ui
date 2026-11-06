import "server-only"

import { readFile } from "node:fs/promises"
import { cache } from "react"
import { CodeBlock } from "./code-block"
import { getInternalParts } from "./install-plan"
import { getRegistryItem } from "./registry-items"
import { installedPath, toInstalledImports } from "./installed-imports"

// 同次服务端渲染共享已解析节点，让查看器与源码列表在 RSC 中引用同一份高亮。
export const getSourceFiles = cache(async (name: string) => {
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
      const extension = path.split(".").at(-1)!
      return {
        path,
        source,
        lines: source.replace(/\n$/, "").split("\n").length,
        code: await CodeBlock({
          code: source,
          lang:
            (
              { ts: "ts", tsx: "tsx", css: "css", json: "json" } as Record<
                string,
                string
              >
            )[extension] ?? "tsx",
          bare: true,
          collapse: false,
        }),
      }
    }),
  )
})
