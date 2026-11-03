/**
 * 把组件自带的 hook、lib 文件在发布产物里标成 registry:ui。
 *
 * monorepo 下 CLI 按文件类型分流：registry:ui 进 UI 包，hook 和 lib 进运行命令的应用。
 * 组件却从 UI 包导入它们，从应用目录安装就会找不到。单应用项目只看 target，不受影响。
 * 区块自己的文件留在应用里，不改。
 */
import { readdir, readFile, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { pathToFileURL } from "node:url"

type RegistryItemJson = {
  type?: string
  files?: { type?: string }[]
}

const SHARED_ITEM_TYPES = new Set([
  "registry:ui",
  "registry:lib",
  "registry:hook",
])
const ROUTED_FILE_TYPES = new Set(["registry:lib", "registry:hook"])

/** 改动了文件类型时返回 true。 */
export function routeItemFiles(item: RegistryItemJson): boolean {
  if (!item.type || !SHARED_ITEM_TYPES.has(item.type)) return false
  let changed = false
  for (const file of item.files ?? []) {
    if (file.type && ROUTED_FILE_TYPES.has(file.type)) {
      file.type = "registry:ui"
      changed = true
    }
  }
  return changed
}

async function main() {
  const dir = join(process.cwd(), "public/r")
  let count = 0
  for (const name of await readdir(dir)) {
    if (!name.endsWith(".json") || name === "registry.json") continue
    const path = join(dir, name)
    const item = JSON.parse(await readFile(path, "utf8")) as RegistryItemJson
    if (!routeItemFiles(item)) continue
    await writeFile(path, JSON.stringify(item, null, 2))
    count++
  }
  console.log(`route-registry-files: 调整了 ${count} 个条目`)
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error: unknown) => {
    console.error(error)
    process.exit(1)
  })
}
