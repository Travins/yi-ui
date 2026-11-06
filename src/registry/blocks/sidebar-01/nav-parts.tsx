"use client"

import * as React from "react"
import { ChevronRightIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { ROW_CLASS, SUB_ROW_CLASS } from "./config"
import { useSidebar01 } from "./context"
import { NavAnchor } from "./nav-anchor"
import type { Sidebar01Item, Sidebar01SubItem } from "./types"
import { normalizeHref } from "./utils"

/** 子项左侧的一小段横线，连到父级的竖向引导线上（竖线 = 容器左边框）。 */
const CONNECTOR_CLASS =
  "before:pointer-events-none before:absolute before:top-1/2 before:-left-2.5 before:h-px before:w-2.5 before:bg-sidebar-border"

function isActiveSub(sub: Sidebar01SubItem, activeHref?: string) {
  return activeHref !== undefined && normalizeHref(sub.href) === activeHref
}

function SubBadge({ children }: { children: React.ReactNode }) {
  return (
    <span
      data-slot="sidebar-01-sub-badge"
      className="ms-auto shrink-0 text-xs text-sidebar-foreground/70 tabular-nums"
    >
      {children}
    </span>
  )
}

/** 没有子项的条目；收起后悬停或聚焦时用 Tooltip 显示名称。 */
function NavLeaf({ item }: { item: Sidebar01Item }) {
  const { activeHref } = useSidebar01()
  const isActive =
    activeHref !== undefined &&
    item.href !== undefined &&
    normalizeHref(item.href) === activeHref
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        tooltip={item.label}
        isActive={isActive}
        className={cn(ROW_CLASS, item.badge !== undefined && "pr-9")}
        render={
          <NavAnchor
            href={item.href ?? "#"}
            aria-current={isActive ? "page" : undefined}
          />
        }
      >
        <item.icon />
        <span>{item.label}</span>
      </SidebarMenuButton>
      {item.badge !== undefined ? (
        <SidebarMenuBadge className="top-1/2! -translate-y-1/2">
          {item.badge}
        </SidebarMenuBadge>
      ) : null}
    </SidebarMenuItem>
  )
}

/** 展开态的父项：Collapsible + 带引导线的子项列表。 */
function ExpandedParent({ item }: { item: Sidebar01Item }) {
  const { activeHref, expandedIds, searching, setExpanded } = useSidebar01()
  const subs = item.items ?? []
  const open = searching || expandedIds.includes(item.id)
  const hasActive = subs.some((sub) => isActiveSub(sub, activeHref))
  return (
    <SidebarMenuItem>
      <Collapsible
        open={open}
        onOpenChange={(next) => setExpanded(item.id, next)}
      >
        <CollapsibleTrigger
          render={
            <SidebarMenuButton
              className={cn(ROW_CLASS, hasActive && "font-medium")}
            />
          }
        >
          <item.icon />
          {/* 有计数时给绝对定位的徽标让出位置 */}
          <span className={cn("truncate", item.badge !== undefined && "pe-8")}>
            {item.label}
          </span>
          <ChevronRightIcon
            aria-hidden
            className={cn(
              "ms-auto transition-transform duration-200 motion-reduce:transition-none",
              open && "rotate-90",
            )}
          />
        </CollapsibleTrigger>
        {item.badge !== undefined ? (
          <SidebarMenuBadge className="top-4! right-7 -translate-y-1/2 pointer-coarse:top-5!">
            {item.badge}
          </SidebarMenuBadge>
        ) : null}
        <CollapsibleContent className="h-(--collapsible-panel-height) overflow-hidden transition-[height] duration-200 data-ending-style:h-0 data-starting-style:h-0 motion-reduce:transition-none">
          <SidebarMenuSub>
            {subs.map((sub) => {
              const isActive = isActiveSub(sub, activeHref)
              return (
                <SidebarMenuSubItem key={sub.id} className={CONNECTOR_CLASS}>
                  <SidebarMenuSubButton
                    isActive={isActive}
                    className={cn(SUB_ROW_CLASS, isActive && "font-medium")}
                    render={
                      <NavAnchor
                        href={sub.href}
                        aria-current={isActive ? "page" : undefined}
                      />
                    }
                  >
                    <span>{sub.label}</span>
                    {sub.badge !== undefined ? (
                      <SubBadge>{sub.badge}</SubBadge>
                    ) : null}
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              )
            })}
          </SidebarMenuSub>
        </CollapsibleContent>
      </Collapsible>
    </SidebarMenuItem>
  )
}

/**
 * 收起态的父项：官方 Sidebar 收起后子菜单会被隐藏，这里用 Menu 浮层补上。
 * 悬停（带安全三角，鼠标移向浮层途中不会闪退）、点击、Enter / Space / → 都能打开；
 * 方向键在子项间移动，Esc 关闭并把焦点还给图标，点子项跳转并关闭。
 */
function CollapsedParent({ item }: { item: Sidebar01Item }) {
  const { activeHref } = useSidebar01()
  const subs = item.items ?? []
  const hasActive = subs.some((sub) => isActiveSub(sub, activeHref))

  // Menu 默认只响应 Enter / Space / ↑ / ↓，补上 →（侧栏子菜单向右展开）
  function handleKeyDown(event: React.KeyboardEvent<HTMLElement>) {
    if (
      event.key === "ArrowRight" &&
      event.currentTarget.getAttribute("aria-expanded") !== "true"
    ) {
      event.preventDefault()
      event.currentTarget.click()
    }
  }

  return (
    <SidebarMenuItem>
      <DropdownMenu>
        <DropdownMenuTrigger
          openOnHover
          delay={60}
          closeDelay={120}
          onKeyDown={handleKeyDown}
          render={
            <SidebarMenuButton
              isActive={hasActive}
              className={cn(
                ROW_CLASS,
                "data-popup-open:bg-sidebar-accent data-popup-open:text-sidebar-accent-foreground",
              )}
            />
          }
        >
          <item.icon />
          <span>{item.label}</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side="right"
          align="start"
          sideOffset={8}
          alignOffset={-4}
          className="w-52 min-w-52 bg-sidebar text-sidebar-foreground shadow-sm ring-sidebar-border"
        >
          <DropdownMenuGroup>
            <DropdownMenuLabel className="px-2 py-1.5 text-sm font-medium text-sidebar-foreground">
              {item.label}
            </DropdownMenuLabel>
            <div
              role="presentation"
              className="mx-3.5 flex flex-col gap-1 border-l border-sidebar-border px-2.5 pt-0.5 pb-1"
            >
              {subs.map((sub) => {
                const isActive = isActiveSub(sub, activeHref)
                return (
                  <DropdownMenuItem
                    key={sub.id}
                    data-active={isActive || undefined}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "h-7 px-2 focus:bg-sidebar-accent focus:text-sidebar-accent-foreground data-active:bg-sidebar-accent data-active:font-medium data-active:text-sidebar-accent-foreground",
                      SUB_ROW_CLASS,
                      CONNECTOR_CLASS,
                    )}
                    render={<NavAnchor href={sub.href} />}
                  >
                    <span className="truncate">{sub.label}</span>
                    {sub.badge !== undefined ? (
                      <SubBadge>{sub.badge}</SubBadge>
                    ) : null}
                  </DropdownMenuItem>
                )
              })}
            </div>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  )
}

/** 按当前侧栏状态选择渲染方式：收起（仅桌面）用浮层，其余用折叠列表。 */
function NavItem({ item }: { item: Sidebar01Item }) {
  const { isMobile, state } = useSidebar()
  if (!item.items?.length) return <NavLeaf item={item} />
  return state === "collapsed" && !isMobile ? (
    <CollapsedParent item={item} />
  ) : (
    <ExpandedParent item={item} />
  )
}

export { NavItem, NavLeaf }
