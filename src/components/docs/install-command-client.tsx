"use client"
import { ChevronDown, Terminal } from "lucide-react"
import Link from "next/link"
import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { siteConfig } from "@/config/site"
import { cn } from "@/lib/utils"
import { CopyButton } from "./copy-button"
import {
  DocFrameBar,
  DocTabsList,
  DocTabsTrigger,
  docFrameClass,
  docFramePanelClass,
} from "./doc-frame"
import { useStoredChoice } from "./use-stored-choice"

const managers = {
  pnpm: { dlx: "pnpm dlx", add: "pnpm add" },
  npm: { dlx: "npx", add: "npm install" },
  yarn: { dlx: "yarn dlx", add: "yarn add" },
  bun: { dlx: "bunx", add: "bun add" },
} as const
type Manager = keyof typeof managers
const managerNames = Object.keys(managers) as Manager[]

const sources = {
  url: "URL",
  namespace: "@yiui",
} as const
type Source = keyof typeof sources
const sourceNames = Object.keys(sources) as Source[]

// 包管理器与安装来源记在 localStorage 里，全站所有安装区共享
export const useManager = () =>
  useStoredChoice<Manager>("travinsy:package-manager", managerNames, "pnpm")
export const useSource = () =>
  useStoredChoice<Source>("travinsy:install-source", sourceNames, "url")

function SourceMenu({
  value,
  onChange,
}: {
  value: Source
  onChange: (value: Source) => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label="安装来源"
            className="font-mono text-xs text-muted-foreground hover:text-foreground"
          />
        }
      >
        {sources[value]}
        <ChevronDown aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(next) => onChange(next as Source)}
        >
          <DropdownMenuRadioItem value="url" closeOnClick>
            URL
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="namespace" closeOnClick>
            @yiui 命名空间
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * 命令框：外层工具栏 = 终端图标 + 包管理器标签 + （可选）安装来源 + 复制；内层显示命令。
 * flat 时不画外层框，直接嵌进别的双层框里。
 */
function CommandFrame({
  commandFor,
  source,
  flat = false,
  className,
}: {
  commandFor: (manager: Manager) => string
  source?: { value: Source; onChange: (value: Source) => void }
  flat?: boolean
  className?: string
}) {
  const [manager, setManager] = useManager()
  return (
    <Tabs
      value={manager}
      onValueChange={(value) => setManager(value as Manager)}
      className={cn(
        flat ? "flex flex-col gap-0" : docFrameClass,
        "my-0",
        className,
      )}
    >
      <DocFrameBar>
        <div className="flex min-w-0 items-stretch gap-1.5 self-stretch">
          <Terminal
            aria-hidden="true"
            className="ml-1 size-3.5 shrink-0 self-center text-muted-foreground"
          />
          <DocTabsList aria-label="选择包管理器">
            {managerNames.map((name) => (
              <DocTabsTrigger
                key={name}
                value={name}
                className="font-mono text-xs"
              >
                {name}
              </DocTabsTrigger>
            ))}
          </DocTabsList>
        </div>
        <div className="flex items-center gap-0.5">
          {source && <SourceMenu {...source} />}
          <CopyButton value={commandFor(manager)} label="复制命令" />
        </div>
      </DocFrameBar>
      {managerNames.map((name) => (
        <TabsContent
          key={name}
          value={name}
          className={cn(docFramePanelClass, "px-4 py-3")}
        >
          <code className="block font-mono text-[13px] leading-6 break-words text-muted-foreground select-all">
            {commandFor(name)}
          </code>
        </TabsContent>
      ))}
    </Tabs>
  )
}

type EntryRef = { name: string; title: string; href: string }

export function InstallCommandClient({
  name,
  bare,
  npm,
  shadcn,
  entries,
  pageRoutes,
  source,
  css,
}: {
  name: string
  bare: boolean
  /** 安装时会创建的示例页面（app/ 下的 page.tsx） */
  pageRoutes: string[]
  /** 本条目及依赖条目用到的 npm 包 */
  npm: string[]
  /** 本条目及依赖条目用到的 shadcn 官方组件 */
  shadcn: string[]
  /** 需要先装好的本站条目，被依赖的排在前面 */
  entries: EntryRef[]
  source: ReactNode
  css: ReactNode
}) {
  const [installSource, setSource] = useSource()
  const target =
    installSource === "namespace"
      ? `@yiui/${name}`
      : `${siteConfig.url}/r/${name}.json`
  const command = (manager: Manager) =>
    `${managers[manager].dlx} shadcn@latest add ${target}`
  const frame = (
    <CommandFrame
      commandFor={command}
      source={{ value: installSource, onChange: setSource }}
      flat={bare}
    />
  )
  if (bare) return frame

  const hasPrereq = shadcn.length > 0 || entries.length > 0
  const steps: { title: string; hint?: ReactNode; body: ReactNode }[] = []
  if (hasPrereq)
    steps.push({
      title: "先装依赖条目",
      hint: "下面这些会被本条目的源码直接引入，需要先装好。",
      body: (
        <div className="flex flex-col gap-4">
          {shadcn.length > 0 && (
            <div className="flex flex-col gap-2">
              <div className="text-[13px] leading-6 text-muted-foreground">
                shadcn 官方组件，用 CLI 安装（会按你的底座与风格生成）：
              </div>
              <CommandFrame
                commandFor={(manager) =>
                  `${managers[manager].dlx} shadcn@latest add ${shadcn.join(" ")}`
                }
              />
            </div>
          )}
          {entries.length > 0 && (
            <div className="flex flex-col gap-2">
              <div className="text-[13px] leading-6 text-muted-foreground">
                本站条目，按顺序打开各自的文档页，用「手动」或「命令」装好（它们的
                npm 包与样式已汇总在下面两步，不必重复）：
              </div>
              <ol className="flex flex-col gap-1 text-[13px] leading-6">
                {entries.map((entry) => (
                  <li key={entry.name} className="flex items-baseline gap-2">
                    <Link
                      href={entry.href}
                      className="underline underline-offset-4"
                    >
                      {entry.title}
                    </Link>
                    <code className="font-mono text-xs text-muted-foreground">
                      {entry.name}
                    </code>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      ),
    })
  if (npm.length > 0)
    steps.push({
      title: "安装 npm 依赖",
      hint: entries.length > 0 ? "已包含上面依赖条目需要的包。" : undefined,
      body: (
        <CommandFrame
          commandFor={(manager) => `${managers[manager].add} ${npm.join(" ")}`}
        />
      ),
    })
  steps.push({
    title: "复制源码",
    hint: "每个文件标题是安装路径：默认在 src/ 下（没有 src 目录则在项目根），以 components.json 的别名为准。源码从 @/lib/utils 引入 cn，shadcn 初始化时已生成。",
    body: (
      <div className="flex flex-col gap-4 [&_[data-slot=doc-frame]]:my-0">
        {source}
      </div>
    ),
  })
  if (css)
    steps.push({
      title: "合并样式",
      hint: "合并进全局样式（如 app/globals.css）。已有的变量和工具类不用重复添加，CLI 安装会自动完成这一步。",
      body: <div className="[&_[data-slot=doc-frame]]:my-0">{css}</div>,
    })

  return (
    <div className="not-prose my-6 min-w-0">
      <Tabs defaultValue="command" className="gap-3">
        <DocTabsList aria-label="安装方式">
          <DocTabsTrigger value="command">命令</DocTabsTrigger>
          <DocTabsTrigger value="manual">手动</DocTabsTrigger>
        </DocTabsList>
        <TabsContent value="command" className="flex flex-col gap-3">
          {frame}
          {installSource === "namespace" && (
            <div className="text-[13px] leading-6 text-muted-foreground">
              @yiui 已收录进 shadcn 官方目录，无需配置；CLI
              会在首次安装时把它写进 components.json，详见{" "}
              <Link
                href="/docs/registry/"
                className="underline underline-offset-4"
              >
                Registry 与命名空间
              </Link>
              。
            </div>
          )}
          {hasPrereq && (
            <div className="text-[13px] leading-6 text-muted-foreground">
              会连带安装
              {shadcn.length > 0 && (
                <>
                  {" "}
                  shadcn 组件{" "}
                  <span className="font-mono text-xs">{shadcn.join("、")}</span>
                </>
              )}
              {shadcn.length > 0 && entries.length > 0 && "，"}
              {entries.length > 0 && (
                <>
                  {" "}
                  本站条目{" "}
                  {entries.map((entry, index) => (
                    <span key={entry.name}>
                      {index > 0 && "、"}
                      <Link
                        href={entry.href}
                        className="font-mono text-xs underline underline-offset-4"
                      >
                        {entry.name}
                      </Link>
                    </span>
                  ))}
                </>
              )}
              。已存在的文件会询问是否覆盖；本地改过的组件先加{" "}
              <code className="font-mono text-xs">--dry-run</code> 或{" "}
              <code className="font-mono text-xs">--diff</code> 看清差异再装。
            </div>
          )}
          {pageRoutes.length > 0 && (
            <div className="text-[13px] leading-6 text-muted-foreground">
              还会创建示例页面{" "}
              {pageRoutes.map((route, index) => (
                <span key={route}>
                  {index > 0 && "、"}
                  <code className="font-mono text-xs">{route}</code>
                </span>
              ))}
              ，安装后就是一个可以访问的路由。生产项目里请按需删除，或改成自己的路径。
            </div>
          )}
        </TabsContent>
        <TabsContent value="manual" className="flex flex-col gap-5">
          {steps.map((step, index) => (
            <ManualStep
              key={step.title}
              index={index + 1}
              title={step.title}
              hint={step.hint}
            >
              {step.body}
            </ManualStep>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function ManualStep({
  index,
  title,
  hint,
  children,
}: {
  index: number
  title: string
  hint?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-baseline gap-2.5">
        <span className="flex size-5 shrink-0 translate-y-0.5 items-center justify-center rounded-full border border-edge bg-muted font-mono text-[11px] text-muted-foreground">
          {index}
        </span>
        <div className="min-w-0">
          <div className="text-[15px] font-medium">{title}</div>
          {hint && (
            <div className="text-[13px] leading-6 text-muted-foreground">
              {hint}
            </div>
          )}
        </div>
      </div>
      <div className="min-w-0 pl-0 sm:pl-[1.875rem]">{children}</div>
    </div>
  )
}
