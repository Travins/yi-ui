"use client"

import * as React from "react"
import { MoreHorizontalIcon, SearchIcon } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Kbd } from "@/components/ui/kbd"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import { useControllableState } from "@/registry/hooks/use-controllable-state"

import { AccountMenu } from "./account-menu"
import { formatLabel, resolveLabels, type Sidebar02Labels } from "./config"
import {
  DEFAULT_ACCOUNTS,
  DEFAULT_FOOTER_ITEMS,
  DEFAULT_NAV_GROUPS,
  DEFAULT_QUICK_ACTIONS,
  DEFAULT_TEAMS,
} from "./nav-data"
import {
  NavLinkItem,
  NavigationContext,
  ROW_CLASS,
  type NavigationValue,
} from "./navigation"
import { SearchCommand } from "./search-command"
import {
  formatShortcut,
  useIsApplePlatform,
  useModifierHotkey,
} from "./shortcuts"
import { TeamSwitcher } from "./team-switcher"
import type {
  Sidebar02Account,
  Sidebar02AccountAction,
  Sidebar02GroupAction,
  Sidebar02NavGroup,
  Sidebar02NavItem,
  Sidebar02NavigateSource,
  Sidebar02QuickAction,
  Sidebar02Team,
} from "./types"

/** 分组标题 + 右侧「更多」菜单 + 导航项。 */
function NavGroup({
  group,
  labels,
  onGroupAction,
}: {
  group: Sidebar02NavGroup
  labels: Sidebar02Labels
  onGroupAction?: (payload: {
    groupId: string
    action: Sidebar02GroupAction
  }) => void
}) {
  const labelId = React.useId()
  return (
    <>
      {group.label ? (
        // 收起成图标后标题会隐藏，用一条细线保留分组边界
        <SidebarSeparator className="mx-2 hidden w-auto group-data-[collapsible=icon]:block" />
      ) : null}
      <SidebarGroup
        data-slot="sidebar-02-nav-group"
        role={group.label ? "group" : undefined}
        aria-labelledby={group.label ? labelId : undefined}
      >
        {group.label ? (
          <SidebarGroupLabel id={labelId}>{group.label}</SidebarGroupLabel>
        ) : null}
        {group.label && group.actionable ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <SidebarGroupAction
                  aria-label={formatLabel(labels.groupMore, {
                    group: group.label,
                  })}
                  className="data-popup-open:bg-sidebar-accent"
                />
              }
            >
              <MoreHorizontalIcon aria-hidden="true" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              side="bottom"
              className="min-w-40"
            >
              <DropdownMenuItem
                onClick={() =>
                  onGroupAction?.({ groupId: group.id, action: "manage" })
                }
              >
                {labels.groupManage}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  onGroupAction?.({ groupId: group.id, action: "hide" })
                }
              >
                {labels.groupHide}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
        <SidebarGroupContent>
          <SidebarMenu>
            {group.items.map((item) => (
              <NavLinkItem
                key={item.id}
                item={item}
                newWindowLabel={labels.newWindow}
              />
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </>
  )
}

type Sidebar02Props = Omit<
  React.ComponentProps<typeof Sidebar>,
  "children" | "collapsible"
> & {
  /** 团队列表 */
  teams?: Sidebar02Team[]
  /** 受控的当前团队 id */
  activeTeamId?: string
  /** 非受控时的初始团队 id，默认第一个团队 */
  defaultActiveTeamId?: string
  /** 团队切换时回调（点选或按 ⌘1…⌘9），参数是新团队的 id */
  onTeamChange?: (teamId: string) => void
  onCreateTeam?: () => void
  /** 账号列表 */
  accounts?: Sidebar02Account[]
  /** 受控的当前账号 id */
  activeAccountId?: string
  /** 非受控时的初始账号 id，默认第一个账号 */
  defaultActiveAccountId?: string
  /** 账号切换时回调，参数是新账号的 id */
  onAccountChange?: (accountId: string) => void
  /** 点击个人资料、账号设置、设备管理时回调 */
  onAccountAction?: (payload: { action: Sidebar02AccountAction }) => void
  onAddAccount?: () => void
  onSignOut?: () => void
  /** 主导航分组 */
  groups?: Sidebar02NavGroup[]
  /** 底部的次要入口 */
  footerItems?: Sidebar02NavItem[]
  /** 受控的当前导航项 id */
  activeItemId?: string
  /** 非受控时的初始导航项 id，默认第一个导航项 */
  defaultActiveItemId?: string
  /** 当前导航项变化时回调 */
  onActiveItemChange?: (itemId: string) => void
  /** 渲染链接的组件，默认 "a"；用 Next.js 时传入 next/link 的 Link */
  linkComponent?: React.ElementType
  /** 点击导航项或在搜索里回车选中时回调 */
  onNavigate?: (payload: {
    href: string
    itemId: string
    source: Sidebar02NavigateSource
  }) => void
  /** 为 true 时拦截浏览器跳转，交给 onNavigate 处理（单页应用路由、预览演示） */
  interceptNavigation?: boolean
  /** 分组「更多」菜单的回调 */
  onGroupAction?: (payload: {
    groupId: string
    action: Sidebar02GroupAction
  }) => void
  /** 搜索弹窗里的快捷操作 */
  quickActions?: Sidebar02QuickAction[]
  onQuickAction?: (payload: { actionId: string }) => void
  /** 受控的搜索弹窗开关 */
  searchOpen?: boolean
  defaultSearchOpen?: boolean
  onSearchOpenChange?: (open: boolean) => void
  /** 收起方式：icon 收成图标栏（默认），offcanvas 整个滑出，none 不可收起 */
  collapsible?: "icon" | "offcanvas" | "none"
  labels?: Partial<Sidebar02Labels>
}

/**
 * 团队与账号切换侧栏：顶部团队切换 + 搜索入口，中间分组导航，底部次要入口与用户卡。
 * 基于 shadcn 官方 Sidebar：收起成图标、移动端抽屉、⌘B 收起都沿用官方行为。
 * 团队、账号、当前项、搜索弹窗都同时支持受控与非受控。
 */
function Sidebar02({
  teams = DEFAULT_TEAMS,
  activeTeamId: activeTeamIdProp,
  defaultActiveTeamId,
  onTeamChange,
  onCreateTeam,
  accounts = DEFAULT_ACCOUNTS,
  activeAccountId: activeAccountIdProp,
  defaultActiveAccountId,
  onAccountChange,
  onAccountAction,
  onAddAccount,
  onSignOut,
  groups = DEFAULT_NAV_GROUPS,
  footerItems = DEFAULT_FOOTER_ITEMS,
  activeItemId: activeItemIdProp,
  defaultActiveItemId,
  onActiveItemChange,
  linkComponent = "a",
  onNavigate,
  interceptNavigation = false,
  onGroupAction,
  quickActions = DEFAULT_QUICK_ACTIONS,
  onQuickAction,
  searchOpen: searchOpenProp,
  defaultSearchOpen = false,
  onSearchOpenChange,
  collapsible = "icon",
  labels,
  ...props
}: Sidebar02Props) {
  const text = resolveLabels(labels)
  const isApple = useIsApplePlatform()

  const [activeTeamId, setActiveTeamId] = useControllableState<
    string | undefined
  >({
    prop: activeTeamIdProp,
    defaultProp: defaultActiveTeamId ?? teams[0]?.id,
    onChange: (value) => value !== undefined && onTeamChange?.(value),
  })
  const [activeAccountId, setActiveAccountId] = useControllableState<
    string | undefined
  >({
    prop: activeAccountIdProp,
    defaultProp: defaultActiveAccountId ?? accounts[0]?.id,
    onChange: (value) => value !== undefined && onAccountChange?.(value),
  })
  const [activeItemId, setActiveItemId] = useControllableState<
    string | undefined
  >({
    prop: activeItemIdProp,
    defaultProp: defaultActiveItemId ?? groups[0]?.items[0]?.id,
    onChange: (value) => value !== undefined && onActiveItemChange?.(value),
  })
  const [searchOpen, setSearchOpen] = useControllableState({
    prop: searchOpenProp,
    defaultProp: defaultSearchOpen,
    onChange: onSearchOpenChange,
  })

  // ⌘/Ctrl + 1…9 切换团队。放在 Sidebar02 顶层而不是下拉菜单里：移动端抽屉关着时组件已卸载，菜单没打开时也要能用
  useModifierHotkey(
    (key) => /^[1-9]$/.test(key) && Number(key) <= teams.length,
    (key) => {
      const team = teams[Number(key) - 1]
      if (team) setActiveTeamId(team.id)
    },
    !searchOpen,
  )
  useModifierHotkey(
    (key) => key.toLowerCase() === "k",
    () => setSearchOpen((open) => !open),
  )

  const navigate = React.useCallback(
    (item: Sidebar02NavItem, source: Sidebar02NavigateSource) => {
      if (item.external) {
        if (source === "search") window.open(item.href, "_blank", "noreferrer")
        return
      }
      setActiveItemId(item.id)
      onNavigate?.({ href: item.href, itemId: item.id, source })
      // 从搜索里选中时没有真正的链接点击，不拦截就要自己跳转
      if (source === "search" && !interceptNavigation)
        window.location.assign(item.href)
    },
    [interceptNavigation, onNavigate, setActiveItemId],
  )

  const navigation = React.useMemo<NavigationValue>(
    () => ({ linkComponent, activeItemId, interceptNavigation, navigate }),
    [linkComponent, activeItemId, interceptNavigation, navigate],
  )

  return (
    <NavigationContext.Provider value={navigation}>
      <Sidebar collapsible={collapsible} {...props}>
        {/* 团队带高 56px（h-14），底线与右侧顶栏的底线连成一条 */}
        <SidebarHeader className="h-14 shrink-0 justify-center border-b border-sidebar-border p-1 group-data-[collapsible=icon]:p-2">
          <TeamSwitcher
            teams={teams}
            activeTeamId={activeTeamId}
            onTeamChange={setActiveTeamId}
            onCreateTeam={onCreateTeam}
            labels={text}
          />
        </SidebarHeader>
        <div className="shrink-0 border-b border-sidebar-border p-2">
          <SidebarMenu data-slot="sidebar-02-search">
            <SidebarMenuItem>
              <SidebarMenuButton
                variant="outline"
                tooltip={text.searchTooltip}
                aria-keyshortcuts="Meta+K Control+K"
                aria-haspopup="dialog"
                className={`${ROW_CLASS} text-sidebar-foreground/70`}
                onClick={() => setSearchOpen(true)}
              >
                <SearchIcon aria-hidden="true" />
                <span>{text.searchButton}</span>
                <Kbd className="ml-auto group-data-[collapsible=icon]:hidden">
                  {formatShortcut("K", isApple)}
                </Kbd>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
        <SidebarContent>
          <nav aria-label={text.navLabel} className="flex flex-col">
            {groups.map((group) => (
              <NavGroup
                key={group.id}
                group={group}
                labels={text}
                onGroupAction={onGroupAction}
              />
            ))}
          </nav>
        </SidebarContent>
        <SidebarFooter className="border-t border-sidebar-border">
          <nav aria-label={text.footerNavLabel}>
            <SidebarMenu>
              {footerItems.map((item) => (
                <NavLinkItem
                  key={item.id}
                  item={item}
                  newWindowLabel={text.newWindow}
                />
              ))}
            </SidebarMenu>
          </nav>
          <AccountMenu
            accounts={accounts}
            activeAccountId={activeAccountId}
            onAccountChange={setActiveAccountId}
            onAccountAction={onAccountAction}
            onAddAccount={onAddAccount}
            onSignOut={onSignOut}
            labels={text}
          />
        </SidebarFooter>
        {collapsible === "icon" ? <SidebarRail /> : null}
      </Sidebar>
      <SearchCommand
        open={searchOpen}
        onOpenChange={setSearchOpen}
        groups={groups}
        footerItems={footerItems}
        quickActions={quickActions}
        onSelectItem={(item) => {
          setSearchOpen(false)
          navigate(item, "search")
        }}
        onSelectAction={(action) => {
          setSearchOpen(false)
          onQuickAction?.({ actionId: action.id })
        }}
        labels={text}
      />
    </NavigationContext.Provider>
  )
}

export { Sidebar02 }
export type { Sidebar02Props }
