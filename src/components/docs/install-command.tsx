import { CodeBlock } from "./code-block"
import { ComponentSource } from "./component-source"
import { InstallCommandClient } from "./install-command-client"
import { entryHref, getInstallPlan } from "./install-plan"
import { getRegistryItem } from "./registry-items"

/**
 * 安装区：命令（CLI，可切换 URL / 命名空间）与手动（依赖条目 + npm 包 + 源码 + 样式）两种方式。
 * bare 时只输出命令框（不带外层标题、不带手动安装），放进别的框里使用。
 */
export function InstallCommand({
  name,
  bare = false,
}: {
  name: string
  bare?: boolean
}) {
  const plan = getInstallPlan(name)
  // 区块和页面会把示例页装进 app/，安装后就是一个能访问的路由，要在安装区提醒
  const pageRoutes = getRegistryItem(name)
    .files.filter(
      (file) =>
        file.type === "registry:page" && file.target?.startsWith("app/"),
    )
    .map((file) => file.target as string)
  return (
    <InstallCommandClient
      name={name}
      bare={bare}
      pageRoutes={pageRoutes}
      npm={plan.npm}
      shadcn={plan.shadcn}
      entries={plan.entries.map((entry) => ({
        ...entry,
        href: entryHref(entry),
      }))}
      source={bare ? null : <ComponentSource name={name} />}
      css={
        bare || !plan.css ? null : (
          <CodeBlock code={plan.css} lang="css" title="globals.css" />
        )
      }
    />
  )
}
