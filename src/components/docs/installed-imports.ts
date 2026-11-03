import registry from "../../../registry.json"

type RegistryFile = { path: string; type?: string; target?: string }

// shadcn 在没有 target 时保留类型目录之后的相对路径（已用 shadcn add 实测）：
// src/registry/ui/grid-layout/grid-layout.tsx → components/ui/grid-layout/grid-layout.tsx
const DEFAULT_DIR: Record<string, string> = {
  ui: "components/ui",
  hooks: "hooks",
  lib: "lib",
  blocks: "components",
  pages: "components",
}

/**
 * 文件安装到用户项目后的相对路径（不含 `src/` 前缀）：
 * 有 target 用 target，否则保留类型目录之后的相对路径。
 */
export function installedPath(file: RegistryFile) {
  const [, segment = "", rest = ""] =
    file.path.match(/^src\/registry\/([^/]+)\/(.+)$/) ?? []
  const target =
    file.target ?? `${DEFAULT_DIR[segment] ?? "components"}/${rest}`
  return target
    .replace(/^src\//, "")
    .replace(/^@(ui|lib|hooks|components)\//, (_, alias: string) =>
      alias === "ui" ? "components/ui/" : `${alias}/`,
    )
}

function installedModule(file: RegistryFile) {
  return `@/${installedPath(file).replace(/\.(tsx?|jsx?)$/, "")}`
}

// 站内源码路径（不含扩展名）→ 安装到用户项目后的模块路径
const IMPORT_MAP = new Map<string, string>()
for (const item of registry.items as { files: RegistryFile[] }[]) {
  for (const file of item.files) {
    const local = `@/${file.path.replace(/^src\//, "").replace(/\.(tsx?|jsx?)$/, "")}`
    if (!IMPORT_MAP.has(local)) IMPORT_MAP.set(local, installedModule(file))
  }
}

/**
 * 文档里展示的代码改写为用户安装后的引入路径（与 shadcn CLI 的改写结果一致），
 * 例如 `@/registry/ui/grid-layout/grid-layout` → `@/components/ui/grid-layout/grid-layout`。
 */
export function toInstalledImports(code: string) {
  return code.replace(
    /(["'])(@\/registry\/[^"']+)\1/g,
    (match, quote, spec) => {
      const mapped = IMPORT_MAP.get(spec)
      return mapped ? `${quote}${mapped}${quote}` : match
    },
  )
}
