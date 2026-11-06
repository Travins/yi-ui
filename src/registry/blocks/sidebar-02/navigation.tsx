"use client"

import * as React from "react"
import { ExternalLinkIcon } from "lucide-react"

import {
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

import type { Sidebar02NavItem, Sidebar02NavigateSource } from "./types"

type NavigationValue = {
  /** 渲染链接的组件，默认 "a"，可换成 Next 的 Link */
  linkComponent: React.ElementType
  activeItemId?: string
  /** 为 true 时拦截浏览器默认跳转，由 onNavigate 自行处理 */
  interceptNavigation: boolean
  /** 选中一个导航项：更新当前项、通知外部，必要时自己跳转 */
  navigate: (item: Sidebar02NavItem, source: Sidebar02NavigateSource) => void
}

const NavigationContext = React.createContext<NavigationValue | null>(null)

function useNavigation() {
  const value = React.useContext(NavigationContext)
  if (!value) throw new Error("导航组件必须放在 Sidebar02 内部使用")
  return value
}

/** 触屏上菜单行加高一档（32 → 40px）；收起成图标时保持 32px 方块。 */
const ROW_CLASS = "pointer-coarse:h-10"

/** 选中项左侧的细竖线，让当前位置不只靠底色表达。 */
const ACTIVE_BAR_CLASS =
  "relative before:absolute before:inset-y-1.5 before:left-0 before:w-0.5 before:rounded-full before:bg-sidebar-primary before:opacity-0 data-active:before:opacity-100"

/** 一行导航：链接 + 计数 + 外链图标，收起时用 Tooltip 显示名称。 */
function NavLinkItem({
  item,
  newWindowLabel,
}: {
  item: Sidebar02NavItem
  newWindowLabel: string
}) {
  const { linkComponent: LinkComponent, activeItemId, navigate, interceptNavigation } =
    useNavigation()
  const { isMobile, setOpenMobile } = useSidebar()
  const active = !item.external && item.id === activeItemId

  function handleClick(event: React.MouseEvent<HTMLAnchorElement>) {
    // 修饰键、非左键点击保留浏览器原生行为（新标签页等）
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return
    if (isMobile) setOpenMobile(false)
    if (item.external) return
    if (interceptNavigation) event.preventDefault()
    navigate(item, "menu")
  }

  const externalProps = item.external
    ? { target: "_blank", rel: "noreferrer" }
    : undefined

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={active}
        tooltip={item.label}
        className={cn(
          ROW_CLASS,
          ACTIVE_BAR_CLASS,
          item.badge !== undefined && "pr-10",
        )}
        render={
          <LinkComponent
            href={item.href}
            aria-current={active ? "page" : undefined}
            onClick={handleClick}
            {...externalProps}
          />
        }
      >
        <item.icon />
        <span className="truncate">
          {item.label}
          {item.external ? (
            <span className="sr-only">{newWindowLabel}</span>
          ) : null}
        </span>
        {item.external ? (
          <ExternalLinkIcon
            aria-hidden="true"
            className="ml-auto size-3.5! opacity-60 group-data-[collapsible=icon]:hidden"
          />
        ) : null}
      </SidebarMenuButton>
      {item.badge !== undefined ? (
        <SidebarMenuBadge className="tabular-nums pointer-coarse:top-2.5">
          {item.badge}
        </SidebarMenuBadge>
      ) : null}
    </SidebarMenuItem>
  )
}

export { NavLinkItem, NavigationContext, ROW_CLASS, useNavigation }
export type { NavigationValue }
