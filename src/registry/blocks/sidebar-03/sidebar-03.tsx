"use client"
import * as React from "react"
import {
  LayersIcon,
  PlusIcon,
  EllipsisIcon,
  CircleHelpIcon,
  SettingsIcon,
  LogOutIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Sidebar,
  SidebarContent,
  SidebarInput,
  useSidebar,
} from "@/components/ui/sidebar"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import { useControllableState } from "@/registry/hooks/use-controllable-state"
import { DEFAULT_LABELS, type Sidebar03Labels } from "./config"
import { DEFAULT_MODULES, DEFAULT_USAGE } from "./nav-data"
import { Sidebar03Tree, findPath } from "./tree"
import type {
  Sidebar03Module,
  Sidebar03TreeNode,
  Sidebar03Usage,
  Sidebar03Navigation,
  Sidebar03Link,
} from "./types"

type Sidebar03Props = Omit<
  React.ComponentProps<typeof Sidebar>,
  "children" | "collapsible"
> & {
  /** 模块与树数据；默认中文示例。 */
  modules?: Sidebar03Module[]
  /** 受控模块 id。 */
  moduleId?: string
  /** 初始模块；默认第一个。 */
  defaultModuleId?: string
  onModuleChange?: (id: string) => void
  /** 当前页面节点。 */
  activeNodeId?: string
  /** 初始展开节点；默认包含当前节点的祖先。 */
  defaultExpandedIds?: string[]
  /** 受控展开节点，跨模块 id 必须唯一。 */
  expandedIds?: string[]
  onExpandedChange?: (ids: string[]) => void
  /** 底部用量；默认 9.2 GB / 10 GB。 */
  usage?: Sidebar03Usage
  /** 链接组件；默认 a。 */
  linkComponent?: Sidebar03Link
  navigation?: Sidebar03Navigation
  labels?: Partial<Sidebar03Labels>
  onCreate?: (payload: { moduleId: string }) => void
  onUtilityAction?: (payload: {
    action: "help" | "settings" | "signOut"
  }) => void
}
function Sidebar03({
  modules = DEFAULT_MODULES,
  moduleId,
  defaultModuleId,
  onModuleChange,
  activeNodeId,
  expandedIds,
  defaultExpandedIds = [],
  onExpandedChange,
  usage = DEFAULT_USAGE,
  linkComponent: Link = "a",
  navigation,
  labels: labelsProp,
  onCreate,
  onUtilityAction,
  className,
  style,
  ...props
}: Sidebar03Props) {
  const labels = { ...DEFAULT_LABELS, ...labelsProp }
  const { isMobile, state, setOpen, setOpenMobile } = useSidebar()
  const [currentId, setCurrentId] = useControllableState({
    prop: moduleId,
    defaultProp: defaultModuleId ?? modules[0]?.id ?? "",
    onChange: onModuleChange,
  })
  const current =
    modules.find((module) => module.id === currentId) ?? modules[0]
  const [expanded, setExpanded] = useControllableState({
    prop: expandedIds,
    defaultProp: [
      ...new Set([
        ...defaultExpandedIds,
        ...modules.flatMap((module) =>
          findPath(module.tree, activeNodeId)
            .slice(0, -1)
            .map((node) => node.id),
        ),
      ]),
    ],
    onChange: onExpandedChange,
  })
  const [query, setQuery] = React.useState("")
  function navigate(
    event: React.MouseEvent<HTMLAnchorElement>,
    href: string,
    nodeId?: string,
  ) {
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return
    if (navigation?.intercept) event.preventDefault()
    navigation?.onNavigate?.({ href, nodeId })
    if (isMobile) setOpenMobile(false)
  }
  function renderLink(node: Sidebar03TreeNode, content: React.ReactNode) {
    return (
      <Link
        href={node.href}
        tabIndex={-1}
        aria-current={node.id === activeNodeId ? "page" : undefined}
        onClick={(event: React.MouseEvent<HTMLAnchorElement>) =>
          navigate(event, node.href!, node.id)
        }
        {...(navigation?.intercept && Link !== "a" ? { prefetch: false } : {})}
        className="flex min-w-0 flex-1 items-center gap-2 pr-2"
      >
        {content}
      </Link>
    )
  }
  const percent =
    usage.total > 0
      ? Math.max(0, Math.min(100, (usage.used / usage.total) * 100))
      : 0
  return (
    <div
      data-slot="sidebar-03-shell"
      className="contents"
      style={
        {
          "--sidebar-width": "19rem",
          "--sidebar-width-icon": "3rem",
        } as React.CSSProperties
      }
    >
      <Sidebar
        data-slot="sidebar-03"
        collapsible="icon"
        className={cn("overflow-hidden", className)}
        style={
          {
            "--sidebar-width": "19rem",
            "--sidebar-width-icon": "3rem",
            ...style,
          } as React.CSSProperties
        }
        {...props}
      >
        <TooltipProvider>
          <div className="flex h-full min-h-0">
            <Sidebar
              collapsible="none"
              className="w-12 shrink-0 border-r border-sidebar-border"
            >
              <div
                data-slot="sidebar-03-brand"
                className="flex h-14 shrink-0 items-center justify-center border-b border-sidebar-border"
              >
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={labels.brand}
                  onClick={() => setOpen(true)}
                >
                  <LayersIcon aria-hidden />
                </Button>
              </div>
              <nav
                aria-label={labels.modules}
                className="flex flex-1 flex-col items-center gap-2 py-3"
              >
                {modules.map((module) => (
                  <Tooltip key={module.id}>
                    <TooltipTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={module.label}
                          aria-pressed={module.id === current?.id}
                          className="aria-pressed:bg-sidebar-accent aria-pressed:text-sidebar-accent-foreground"
                          onClick={() => {
                            setCurrentId(module.id)
                            setQuery("")
                            if (!isMobile) setOpen(true)
                          }}
                        >
                          <module.icon aria-hidden />
                        </Button>
                      }
                    />
                    <TooltipContent side="right">{module.label}</TooltipContent>
                  </Tooltip>
                ))}
              </nav>
              <div className="flex flex-col items-center gap-2 border-t border-sidebar-border py-3">
                {(
                  [
                    { key: "help", icon: CircleHelpIcon },
                    { key: "settings", icon: SettingsIcon },
                    { key: "signOut", icon: LogOutIcon },
                  ] as const
                ).map(({ key, icon: Icon }) => (
                  <Tooltip key={key}>
                    <TooltipTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={labels[key]}
                          onClick={() => onUtilityAction?.({ action: key })}
                        >
                          <Icon aria-hidden />
                        </Button>
                      }
                    />
                    <TooltipContent side="right">{labels[key]}</TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </Sidebar>
            {(isMobile || state === "expanded") && (
              <Sidebar collapsible="none" className="min-w-0 flex-1">
                <div
                  data-slot="sidebar-03-panel-header"
                  className="flex h-14 shrink-0 items-center gap-1 border-b border-sidebar-border px-3"
                >
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                    {current?.label}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={labels.create}
                    onClick={() =>
                      current && onCreate?.({ moduleId: current.id })
                    }
                  >
                    <PlusIcon aria-hidden />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={labels.more}
                        >
                          <EllipsisIcon aria-hidden />
                        </Button>
                      }
                    />
                    <DropdownMenuContent align="start">
                      {current?.actions?.length ? (
                        current.actions.map((action) => (
                          <DropdownMenuItem
                            key={action.id}
                            onClick={action.onSelect}
                          >
                            {action.label}
                          </DropdownMenuItem>
                        ))
                      ) : (
                        <DropdownMenuItem
                          onClick={() =>
                            onUtilityAction?.({ action: "settings" })
                          }
                        >
                          {labels.settings}
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="border-b border-sidebar-border p-3">
                  <SidebarInput
                    aria-label={labels.search}
                    placeholder={labels.search}
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    className="text-base focus-visible:border-sidebar-ring focus-visible:ring-0 md:text-sm"
                  />
                </div>
                <SidebarContent>
                  {current && (
                    <Sidebar03Tree
                      key={current.id}
                      nodes={current.tree}
                      expanded={expanded}
                      onExpandedChange={setExpanded}
                      activeId={activeNodeId}
                      query={query}
                      labels={labels}
                      renderLink={renderLink}
                    />
                  )}
                </SidebarContent>
                <div className="space-y-3 border-t border-sidebar-border p-4 text-xs">
                  <div className="flex justify-between gap-2">
                    <span>{usage.label}</span>
                    {usage.href && (
                      <Link
                        href={usage.href}
                        className="underline underline-offset-4"
                        onClick={(event: React.MouseEvent<HTMLAnchorElement>) =>
                          navigate(event, usage.href!)
                        }
                      >
                        {labels.upgrade}
                      </Link>
                    )}
                  </div>
                  <div
                    role="progressbar"
                    aria-label={usage.label}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={percent}
                    className="h-1.5 overflow-hidden rounded-full bg-sidebar-accent"
                  >
                    <div
                      className="h-full bg-sidebar-primary"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <p className="text-sidebar-foreground/60 tabular-nums">
                    {labels.used} {usage.used} {usage.unit} / {usage.total}{" "}
                    {usage.unit}
                  </p>
                </div>
              </Sidebar>
            )}
          </div>
        </TooltipProvider>
      </Sidebar>
    </div>
  )
}
export { Sidebar03 }
export type { Sidebar03Props }
