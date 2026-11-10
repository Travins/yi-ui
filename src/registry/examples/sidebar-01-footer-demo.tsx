"use client"

import * as React from "react"
import { LoaderCircleIcon, LogOutIcon } from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { ROW_CLASS } from "@/registry/blocks/sidebar-01/config"
import { Sidebar01 } from "@/registry/blocks/sidebar-01/sidebar-01"

/** 放进 footer 的当前用户：头像首字 + 名字 + 一行说明，下面是「退出登录」；收起成图标栏后只剩头像和退出图标。 */
function SidebarUser({
  name,
  description,
  onSignOut,
}: {
  name: string
  description: string
  onSignOut: () => Promise<void>
}) {
  const [pending, setPending] = React.useState(false)
  const signOut = async () => {
    setPending(true)
    try {
      await onSignOut()
    } finally {
      setPending(false)
    }
  }
  return (
    <SidebarMenu data-slot="sidebar-user" className="gap-1">
      <SidebarMenuItem>
        <div className="flex h-12 items-center gap-2 px-2 group-data-[collapsible=icon]:px-0">
          <Avatar className="size-8 shrink-0">
            <AvatarFallback className="bg-sidebar-primary text-xs font-medium text-sidebar-primary-foreground">
              {/* 按码点取首字，避免把 emoji、生僻字截成半个 */}
              {Array.from(name.trim())[0] ?? "?"}
            </AvatarFallback>
          </Avatar>
          <div className="grid min-w-0 flex-1 leading-tight group-data-[collapsible=icon]:hidden">
            <span className="truncate text-sm font-medium">{name}</span>
            <span className="truncate text-xs text-sidebar-foreground/65">
              {description}
            </span>
          </div>
        </div>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton
          tooltip="退出登录"
          disabled={pending}
          onClick={signOut}
          className={ROW_CLASS}
        >
          {pending ? (
            <LoaderCircleIcon aria-hidden="true" className="animate-spin" />
          ) : (
            <LogOutIcon aria-hidden="true" />
          )}
          <span>{pending ? "正在退出…" : "退出登录"}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

export default function Sidebar01FooterDemo() {
  const [href, setHref] = React.useState("/overview")
  return (
    // contain-layout 只为文档预览：官方 Sidebar 是 fixed 定位，这样它才留在预览框里。真实页面不需要这一层，也不用传 h-full
    <div
      data-slot="sidebar-01-footer-demo"
      className="h-[36rem] w-full overflow-hidden rounded-xl border border-edge bg-background shadow-xs contain-layout"
    >
      <SidebarProvider
        defaultOpen
        className="h-full min-h-0 pointer-coarse:[--sidebar-width-icon:3.5rem]!"
      >
        <Sidebar01
          className="h-full"
          currentHref={href}
          navigation={{
            intercept: true,
            onNavigate: ({ href }) => setHref(href),
          }}
          footer={
            <SidebarUser
              name="林知夏"
              description="管理员"
              onSignOut={() =>
                new Promise((resolve) => setTimeout(resolve, 800))
              }
            />
          }
        />
        <SidebarInset className="min-w-0">
          <header className="flex h-14 shrink-0 items-center gap-2 border-b border-edge px-3">
            <SidebarTrigger aria-label="切换侧栏" />
            <p className="truncate text-sm font-semibold">工作概览</p>
          </header>
          <p className="p-4 text-sm leading-6 text-muted-foreground">
            当前用户和「退出登录」放在 <code>footer</code>{" "}
            插槽里，排在「帮助中心」「设置」之后。
          </p>
        </SidebarInset>
      </SidebarProvider>
    </div>
  )
}
