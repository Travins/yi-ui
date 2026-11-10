import { FileCode, Terminal } from "lucide-react"
import { codeToHtml } from "shiki"
import { cache, type ComponentProps, type ReactNode } from "react"
import { cn } from "@/lib/utils"
import { codeThemes } from "./highlight-theme"
import { CopyButton } from "./copy-button"
import { CodeView } from "./code-view"
import { DocFrame, DocFrameBar, DocFramePanel } from "./doc-frame"

const shellLangs = new Set(["bash", "sh", "shell", "zsh", "console"])

// 双主题输出 --shiki-light / --shiki-dark，亮暗切换由 docs.css 决定。
export const highlight = cache((code: string, lang: string) =>
  codeToHtml(code, { lang, themes: codeThemes, defaultColor: false }),
)

const countLines = (code: string) => code.replace(/\n$/, "").split("\n").length

/**
 * 代码块的双层框：有 title（文件名）时外层工具栏显示文件图标 + 文件名 + 复制按钮；
 * 没有 title 时不显示工具栏，复制按钮浮在右上角，悬停 / 聚焦时出现（触屏始终可见）。
 */
export function CodeFrame({
  code,
  title,
  lang,
  children,
  className,
}: {
  code: string
  title?: string
  lang?: string
  children: ReactNode
  className?: string
}) {
  const Icon = lang && shellLangs.has(lang) ? Terminal : FileCode
  return (
    <DocFrame className={cn("group/code", className)}>
      {title && (
        <DocFrameBar>
          <span className="flex min-w-0 items-center gap-1.5 font-mono text-xs text-muted-foreground">
            <Icon aria-hidden="true" className="size-3.5 shrink-0" />
            <span className="truncate">{title}</span>
          </span>
          <CopyButton value={code} />
        </DocFrameBar>
      )}
      <DocFramePanel className="relative">
        <CodeView lines={countLines(code)}>{children}</CodeView>
        {!title && (
          <div className="absolute top-1.5 right-1.5 z-10 rounded-md bg-background/90 opacity-0 transition-opacity group-focus-within/code:opacity-100 group-hover/code:opacity-100 pointer-coarse:opacity-100">
            <CopyButton value={code} />
          </div>
        )}
      </DocFramePanel>
    </DocFrame>
  )
}

/**
 * 读取源码 → 高亮 → 展示。bare 时只输出代码区（供预览 / 区块查看器放进自己的框里，
 * 复制按钮由它们的工具栏提供）；collapse={false} 关闭折叠。
 */
export async function CodeBlock({
  code,
  lang = "tsx",
  title,
  bare = false,
  collapse = true,
}: {
  code: string
  lang?: string
  title?: string
  bare?: boolean
  collapse?: boolean
}) {
  const html = await highlight(code, lang)
  const content = <div dangerouslySetInnerHTML={{ __html: html }} />
  if (bare)
    return (
      <CodeView lines={countLines(code)} collapse={collapse}>
        {content}
      </CodeView>
    )
  return (
    <CodeFrame code={code} title={title} lang={lang}>
      {content}
    </CodeFrame>
  )
}

function textOf(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node)
  if (Array.isArray(node)) return node.map(textOf).join("")
  if (node && typeof node === "object" && "props" in node)
    return textOf((node.props as { children?: ReactNode }).children)
  return ""
}

/** MDX 里的围栏代码块：rehype-code 已经完成高亮，这里只加外框。 */
export function MdxPre({
  children,
  title,
  ...props
}: ComponentProps<"pre"> & { "data-language"?: string }) {
  return (
    <CodeFrame
      code={textOf(children)}
      title={title}
      lang={props["data-language"]}
    >
      <pre {...props}>{children}</pre>
    </CodeFrame>
  )
}
