"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ThemeCopyButton } from "@/components/themes/copy-button"
import { formatThemeCss, type ColorTheme } from "@/lib/themes"
import { siteConfig } from "@/config/site"

function CommandRow({ command, label }: { command: string; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-edge bg-muted/50 py-1.5 pr-1.5 pl-3">
      <code className="min-w-0 flex-1 overflow-x-auto py-1 font-mono text-xs leading-6 whitespace-nowrap">
        {command}
      </code>
      <ThemeCopyButton value={command} label={label} />
    </div>
  )
}

/** 当前主题的 CSS 变量与 shadcn 安装命令。 */
export function ThemeCodePanel({ theme }: { theme: ColorTheme }) {
  const css = formatThemeCss(theme)
  const itemName = `theme-${theme.id}`
  const urlCommand = `pnpm dlx shadcn@latest add ${siteConfig.url}/r/${itemName}.json`
  const namedCommand = `pnpm dlx shadcn@latest add @yiui/${itemName}`

  return (
    <Tabs defaultValue="css" className="gap-4">
      <TabsList>
        <TabsTrigger value="css">CSS 变量</TabsTrigger>
        <TabsTrigger value="cli">命令行安装</TabsTrigger>
      </TabsList>

      <TabsContent value="css" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm leading-7 text-muted-foreground">
            粘贴到 <code className="font-mono text-xs">globals.css</code>，替换
            同名的 <code className="font-mono text-xs">:root</code> 与{" "}
            <code className="font-mono text-xs">.dark</code> 变量。
          </p>
          <ThemeCopyButton
            value={css}
            label={`复制${theme.name}主题的 CSS 变量`}
          />
        </div>
        <pre
          tabIndex={0}
          aria-label={`${theme.name}主题的 CSS 变量`}
          className="max-h-80 overflow-auto rounded-lg border border-edge bg-muted/50 p-4 font-mono text-xs leading-6 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <code>{css}</code>
        </pre>
      </TabsContent>

      <TabsContent value="cli" className="flex flex-col gap-3">
        <p className="text-sm leading-7 text-muted-foreground">
          通过 URL 安装，无需任何配置：
        </p>
        <CommandRow command={urlCommand} label="复制 URL 安装命令" />
        <p className="text-sm leading-7 text-muted-foreground">
          或用 @yiui 命名空间（已收录进 shadcn 官方目录，同样无需配置）：
        </p>
        <CommandRow command={namedCommand} label="复制命名空间安装命令" />
      </TabsContent>
    </Tabs>
  )
}
