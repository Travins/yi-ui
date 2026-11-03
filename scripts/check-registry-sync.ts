/**
 * 检查 public/r/*.json 是否与发布源码一致，防止改了组件却漏提交产物（线上安装到的还是旧代码）。
 * 只读 git 对象，不碰工作区，也不重新构建：
 *
 *   tsx scripts/check-registry-sync.ts --ref :      # 暂存区（pre-commit）
 *   tsx scripts/check-registry-sync.ts --ref HEAD   # 最新提交（pre-push）
 */
import { execFileSync } from "node:child_process"

type RegistryFile = { path: string; content?: string }
type RegistryItem = {
  name: string
  files?: RegistryFile[]
  dependencies?: string[]
  registryDependencies?: string[]
}

const refArg = process.argv.indexOf("--ref")
const ref = refArg === -1 ? "HEAD" : process.argv[refArg + 1]
// `:path` 是暂存区，`HEAD:path` 是提交
const spec = (file: string) => (ref === ":" ? `:${file}` : `${ref}:${file}`)

function read(file: string): string | null {
  try {
    return execFileSync("git", ["show", spec(file)], {
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
      stdio: ["ignore", "pipe", "ignore"],
    })
  } catch {
    return null
  }
}

/**
 * shadcn build 会把站内路径改写成安装后的别名，比较前两边统一。
 * 区块和页面的目录名取决于 target（如 app-shell-01 → app-shell），这里统一抹掉这一段。
 */
function normalize(source: string) {
  return source
    .replaceAll("@/registry/ui/", "@/components/ui/")
    .replaceAll("@/registry/hooks/", "@/hooks/")
    .replaceAll("@/registry/lib/", "@/lib/")
    .replace(/@\/(?:registry\/(?:blocks|pages)|components)\/[^/"]+\//g, "@/~/")
}

const same = (a: string[] = [], b: string[] = []) =>
  JSON.stringify([...a].sort()) === JSON.stringify([...b].sort())

const manifest = read("registry.json")
if (manifest === null) {
  console.error(`✗ 读不到 ${spec("registry.json")}`)
  process.exit(1)
}

const problems: string[] = []
for (const item of (JSON.parse(manifest) as { items: RegistryItem[] }).items) {
  const built = read(`public/r/${item.name}.json`)
  if (built === null) {
    problems.push(`${item.name}：缺少 public/r/${item.name}.json`)
    continue
  }
  const output = JSON.parse(built) as RegistryItem
  if (!same(item.dependencies, output.dependencies))
    problems.push(`${item.name}：dependencies 不一致`)
  if (!same(item.registryDependencies, output.registryDependencies))
    problems.push(`${item.name}：registryDependencies 不一致`)
  const contents = new Map(output.files?.map((f) => [f.path, f.content]))
  for (const file of item.files ?? []) {
    const source = read(file.path)
    if (source === null) problems.push(`${item.name}：缺少源文件 ${file.path}`)
    else if (normalize(source) !== normalize(contents.get(file.path) ?? ""))
      problems.push(`${item.name}：${file.path} 与产物不一致`)
  }
}

if (problems.length) {
  console.error("✗ public/r 与发布源码不一致：")
  for (const problem of problems) console.error(`  ${problem}`)
  console.error("运行 pnpm registry:build，再把 public/r 一起提交。")
  process.exit(1)
}
