"use client"

import { ChevronsUpDownIcon, LogOutIcon, PlusIcon } from "lucide-react"
import {
  MonitorSmartphoneIcon,
  SettingsIcon,
  UserRoundIcon,
} from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

import { formatLabel, type Sidebar02Labels } from "./config"
import type { Sidebar02Account, Sidebar02AccountAction } from "./types"

function AccountAvatar({ account }: { account: Sidebar02Account }) {
  return (
    <Avatar>
      {account.avatar ? <AvatarImage src={account.avatar} alt="" /> : null}
      <AvatarFallback>{account.name.trim().slice(0, 1)}</AvatarFallback>
    </Avatar>
  )
}

/** 侧栏底部的用户卡：头像 + 姓名 + @用户名，菜单里有个人入口、账号切换、退出登录。 */
function AccountMenu({
  accounts,
  activeAccountId,
  onAccountChange,
  onAccountAction,
  onAddAccount,
  onSignOut,
  labels,
}: {
  accounts: Sidebar02Account[]
  activeAccountId?: string
  onAccountChange: (accountId: string) => void
  onAccountAction?: (payload: { action: Sidebar02AccountAction }) => void
  onAddAccount?: () => void
  onSignOut?: () => void
  labels: Sidebar02Labels
}) {
  const { isMobile, state } = useSidebar()
  const account = accounts.find((item) => item.id === activeAccountId) ?? accounts[0]
  if (!account) return null

  const entries: {
    action: Sidebar02AccountAction
    label: string
    icon: typeof UserRoundIcon
  }[] = [
    { action: "profile", label: labels.profile, icon: UserRoundIcon },
    { action: "settings", label: labels.accountSettings, icon: SettingsIcon },
    { action: "devices", label: labels.devices, icon: MonitorSmartphoneIcon },
  ]

  return (
    <SidebarMenu data-slot="sidebar-02-account-menu">
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                aria-label={formatLabel(labels.accountTrigger, {
                  name: account.name,
                })}
                className="data-popup-open:bg-sidebar-accent data-popup-open:text-sidebar-accent-foreground"
              />
            }
          >
            <AccountAvatar account={account} />
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{account.name}</span>
              <span className="truncate text-xs text-sidebar-foreground/70">
                @{account.username}
              </span>
            </div>
            <ChevronsUpDownIcon
              aria-hidden="true"
              className="ml-auto group-data-[collapsible=icon]:hidden"
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side={!isMobile && state === "collapsed" ? "right" : "top"}
            align={!isMobile && state === "collapsed" ? "end" : "start"}
            className="min-w-56"
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="flex items-center gap-2 px-1.5 py-1.5 text-left text-sm font-normal text-foreground">
                <AccountAvatar account={account} />
                <span className="grid flex-1 leading-tight">
                  <span className="truncate font-medium">{account.name}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    @{account.username}
                  </span>
                </span>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              {entries.map((entry) => (
                <DropdownMenuItem
                  key={entry.action}
                  onClick={() => onAccountAction?.({ action: entry.action })}
                >
                  <entry.icon />
                  {entry.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLabel>{labels.switchAccount}</DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={account.id}
                onValueChange={(value) => onAccountChange(String(value))}
              >
                {accounts.map((item) => (
                  <DropdownMenuRadioItem
                    key={item.id}
                    value={item.id}
                    className="gap-2 py-1.5"
                  >
                    <AccountAvatar account={item} />
                    <span className="grid flex-1 text-left leading-tight">
                      <span className="truncate font-medium">{item.name}</span>
                      <span className="truncate text-xs text-muted-foreground">
                        {item.email}
                      </span>
                    </span>
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
              <DropdownMenuItem onClick={onAddAccount}>
                <PlusIcon />
                {labels.addAccount}
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={onSignOut}>
              <LogOutIcon />
              {labels.signOut}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

export { AccountMenu }
