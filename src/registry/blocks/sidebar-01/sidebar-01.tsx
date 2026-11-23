"use client"

import * as React from "react"
import {
  LayersIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  SearchIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { DEFAULT_LABELS, type Sidebar01Labels } from "./config"
import {
  Sidebar01Context,
  useSidebar01,
  type Sidebar01ContextValue,
} from "./context"
import { NavAnchor } from "./nav-anchor"
import { DEFAULT_BRAND, DEFAULT_FOOTER_ITEMS, DEFAULT_GROUPS } from "./nav-data"
import { NavItem } from "./nav-parts"
import type {
  Sidebar01Brand,
  Sidebar01Group,
  Sidebar01Item,
  Sidebar01Navigation,
} from "./types"
import {
  collectHrefs,
  filterGroups,
  findActiveHref,
  findActiveParentId,
  formatLabel,
} from "./utils"

type Sidebar01Props = Omit<
  React.ComponentProps<typeof Sidebar>,
  "collapsible" | "children"
> & {
  /**
   * 导航分组
   * @default 示例数据（nav-data.ts）
   */
  groups?: Sidebar01Group[]
  /**
   * 固定在底部的次要入口，只放链接
   * @default 帮助中心、设置
   */
  footerItems?: Sidebar01Item[]
  /** 底部插槽，排在 footerItems 之后：放当前用户、退出登录这类不是链接的内容 */
  footer?: React.ReactNode
  /** 品牌：方形 logo + 名称 */
  brand?: Sidebar01Brand
  /**
   * 是否显示导航搜索框；条目很少时可以关掉
   * @default true
   */
  searchable?: boolean
  /** 当前地址（pathname），用来高亮当前项并默认展开它所在的父项 */
  currentHref?: string
  /**
   * 手风琴：同一时间只展开一个父项
   * @default true
   */
  accordion?: boolean
  /** 链接行为：点击回调与拦截跳转，同 app-shell-01 的 NavLinkBehavior */
  navigation?: Sidebar01Navigation
  /**
   * 链接组件，换成 Next 的 Link 即可走客户端路由
   * @default "a"
   */
  linkComponent?: React.ElementType
  /** 覆盖默认文案 */
  labels?: Partial<Sidebar01Labels>
}

/** 品牌方块：默认图标可通过 brand.logo 替换。 */
function BrandLogo({ logo }: { logo?: React.ReactNode }) {
  return (
    <span
      data-slot="sidebar-01-logo"
      className="flex size-8 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground [&_svg:not([class*='size-'])]:size-4"
    >
      {logo ?? <LayersIcon />}
    </span>
  )
}

function Sidebar01Header({
  brand,
  searchable,
  query,
  onQueryChange,
}: {
  brand: Sidebar01Brand
  searchable: boolean
  query: string
  onQueryChange: (query: string) => void
}) {
  const { labels } = useSidebar01()
  const { toggleSidebar } = useSidebar()
  const name = (
    <>
      <BrandLogo logo={brand.logo} />
      <span className="truncate text-sm font-semibold">{brand.name}</span>
    </>
  )
  return (
    <>
      {/* 品牌带高 56px（h-14），底线与右侧顶栏的底线连成一条 */}
      <SidebarHeader className="h-14 shrink-0 justify-center border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          {brand.href ? (
            <NavAnchor
              href={brand.href}
              className="flex min-w-0 flex-1 items-center gap-2 rounded-md outline-hidden group-data-[collapsible=icon]:hidden focus-visible:ring-2 focus-visible:ring-sidebar-ring"
            >
              {name}
            </NavAnchor>
          ) : (
            <div className="flex min-w-0 flex-1 items-center gap-2 group-data-[collapsible=icon]:hidden">
              {name}
            </div>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={labels.collapse}
            onClick={toggleSidebar}
            className="group-data-[collapsible=icon]:hidden"
          >
            <PanelLeftCloseIcon />
          </Button>
          {/* 收起后图标栏只有 32px：logo 本身就是展开按钮，悬停时换成展开图标 */}
          <Button
            variant="ghost"
            size="icon"
            aria-label={labels.expand}
            onClick={toggleSidebar}
            className="group/expand relative hidden p-0 group-data-[collapsible=icon]:flex"
          >
            <span className="transition-opacity group-hover/expand:opacity-0 group-focus-visible/expand:opacity-0">
              <BrandLogo logo={brand.logo} />
            </span>
            <PanelLeftOpenIcon className="absolute opacity-0 transition-opacity group-hover/expand:opacity-100 group-focus-visible/expand:opacity-100" />
          </Button>
        </div>
      </SidebarHeader>
      {searchable ? (
        <div className="relative shrink-0 border-b border-sidebar-border p-2 group-data-[collapsible=icon]:hidden">
          <SearchIcon
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-4.5 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <SidebarInput
            type="search"
            aria-label={labels.search}
            placeholder={labels.searchPlaceholder}
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            className="pl-8 [&::-webkit-search-cancel-button]:appearance-none"
          />
        </div>
      ) : null}
    </>
  )
}

/**
 * 可收起侧栏：基于 shadcn 官方 Sidebar（`collapsible="icon"`），补上收起后的浮出子菜单。
 * 必须放在 `SidebarProvider` 内；移动端沿用官方的 Sheet 抽屉。
 */
function Sidebar01({
  groups = DEFAULT_GROUPS,
  footerItems = DEFAULT_FOOTER_ITEMS,
  footer,
  brand = DEFAULT_BRAND,
  searchable = true,
  currentHref,
  accordion = true,
  navigation,
  linkComponent = "a",
  labels: labelsProp,
  className,
  ...props
}: Sidebar01Props) {
  const labels = React.useMemo(
    () => ({ ...DEFAULT_LABELS, ...labelsProp }),
    [labelsProp],
  )
  const activeHref = React.useMemo(
    () => findActiveHref(collectHrefs(groups, footerItems), currentHref),
    [groups, footerItems, currentHref],
  )
  const activeParentId = findActiveParentId(groups, activeHref)

  // 当前页面所在的父项初始就展开；地址变化落到别的父项时也跟着展开
  const [expandedIds, setExpandedIds] = React.useState<string[]>(
    activeParentId ? [activeParentId] : [],
  )
  const [lastActiveParentId, setLastActiveParentId] =
    React.useState(activeParentId)
  if (activeParentId !== lastActiveParentId) {
    setLastActiveParentId(activeParentId)
    if (activeParentId) {
      setExpandedIds((current) => {
        if (accordion) return [activeParentId]
        return current.includes(activeParentId)
          ? current
          : [...current, activeParentId]
      })
    }
  }

  const setExpanded = React.useCallback(
    (id: string, open: boolean) => {
      setExpandedIds((current) => {
        if (accordion) return open ? [id] : current.filter((x) => x !== id)
        return open
          ? current.includes(id)
            ? current
            : [...current, id]
          : current.filter((x) => x !== id)
      })
    },
    [accordion],
  )

  const [query, setQuery] = React.useState("")
  const visibleGroups = React.useMemo(
    () => filterGroups(groups, query),
    [groups, query],
  )
  const searching = query.trim() !== ""

  const context = React.useMemo<Sidebar01ContextValue>(
    () => ({
      labels,
      linkComponent,
      navigation,
      activeHref,
      expandedIds,
      searching,
      setExpanded,
    }),
    [
      labels,
      linkComponent,
      navigation,
      activeHref,
      expandedIds,
      searching,
      setExpanded,
    ],
  )

  return (
    <Sidebar01Context.Provider value={context}>
      <TooltipProvider>
        <Sidebar
          collapsible="icon"
          className={cn("border-sidebar-border", className)}
          {...props}
        >
          <Sidebar01Header
            brand={brand}
            searchable={searchable}
            query={query}
            onQueryChange={setQuery}
          />
          <SidebarContent data-slot="sidebar-01-content">
            <nav aria-label={labels.navLabel}>
              {visibleGroups.map((group) => (
                <SidebarGroup key={group.id}>
                  <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {group.items.map((item) => (
                        <NavItem key={item.id} item={item} />
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              ))}
            </nav>
            <div role="status" className="group-data-[collapsible=icon]:hidden">
              {searching && visibleGroups.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                  {formatLabel(labels.empty, { query: query.trim() })}
                </p>
              ) : null}
            </div>
          </SidebarContent>
          {footerItems.length > 0 || footer ? (
            <SidebarFooter className="border-t border-sidebar-border">
              {footerItems.length > 0 ? (
                <nav aria-label={labels.footerLabel}>
                  <SidebarMenu>
                    {footerItems.map((item) => (
                      <NavItem key={item.id} item={item} />
                    ))}
                  </SidebarMenu>
                </nav>
              ) : null}
              {footer}
            </SidebarFooter>
          ) : null}
          <SidebarRail />
        </Sidebar>
      </TooltipProvider>
    </Sidebar01Context.Provider>
  )
}

export { Sidebar01 }
export type { Sidebar01Props }
