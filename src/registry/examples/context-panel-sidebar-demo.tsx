"use client"

import * as React from "react"

import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"
import { Sidebar01 } from "@/registry/blocks/sidebar-01/sidebar-01"
import {
  ContextPanel,
  ContextPanelContent,
  ContextPanelProvider,
  ContextPanelSection,
  ContextPanelTrigger,
  useContextPanel,
} from "@/registry/ui/context-panel/context-panel"

/** 主内容：把两栏各自的状态读出来，方便对照 */
function Main() {
  const sidebar = useSidebar()
  const panel = useContextPanel()
  return (
    <div className="flex flex-col gap-4 p-4">
      <dl
        data-slot="context-panel-sidebar-demo-status"
        className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm"
      >
        <dt className="text-muted-foreground">左侧导航</dt>
        <dd className="font-medium">
          {/* 窄屏的导航是抽屉，开合状态在 openMobile 里 */}
          {(sidebar.isMobile ? sidebar.openMobile : sidebar.open)
            ? "展开"
            : "收起"}
        </dd>
        <dt className="text-muted-foreground">右侧面板</dt>
        <dd className="font-medium">{panel.open ? "打开" : "关闭"}</dd>
      </dl>
      <p className="text-sm leading-6 text-muted-foreground">
        按 ⌘B / Ctrl+B
        或点左上角的按钮，只有左侧导航收起；点右上角的按钮，只有右侧面板开合。
      </p>
      <ContextPanelContent title="文章详情">
        <ContextPanelSection title="发布信息" description="春季专题策划稿">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-sidebar-foreground/65">状态</dt>
            <dd>待审核</dd>
            <dt className="text-sidebar-foreground/65">作者</dt>
            <dd>林知夏</dd>
            <dt className="text-sidebar-foreground/65">字数</dt>
            <dd className="tabular-nums">2,480</dd>
          </dl>
        </ContextPanelSection>
        <ContextPanelSection title="修改记录">
          <ul className="space-y-2 text-sm">
            <li>周屿 调整了标题</li>
            <li>许安然 替换了头图</li>
          </ul>
        </ContextPanelSection>
      </ContextPanelContent>
    </div>
  )
}

export default function ContextPanelSidebarDemo() {
  const [href, setHref] = React.useState("/content/articles")
  return (
    // contain-layout 只为文档预览：官方 Sidebar 是 fixed 定位，这样它才留在预览框里。真实页面不需要这一层，也不用传 h-full
    <div
      data-slot="context-panel-sidebar-demo"
      className="h-[32rem] w-full overflow-hidden rounded-xl border border-edge bg-background shadow-xs contain-layout"
    >
      <SidebarProvider
        defaultOpen
        className="h-full min-h-0 pointer-coarse:[--sidebar-width-icon:3.5rem]!"
      >
        <Sidebar01
          className="h-full"
          searchable={false}
          currentHref={href}
          navigation={{
            intercept: true,
            onNavigate: ({ href }) => setHref(href),
          }}
        />
        {/* 右侧面板有自己的 Provider：SidebarProvider 的 ⌘B 和 open 状态管不到它 */}
        <ContextPanelProvider defaultOpen>
          <SidebarInset className="min-w-0">
            <header className="flex h-14 shrink-0 items-center gap-2 border-b border-edge px-3">
              <SidebarTrigger aria-label="切换侧栏" />
              <p className="truncate text-sm font-semibold">全部文章</p>
              <div className="ml-auto">
                <ContextPanelTrigger />
              </div>
            </header>
            <Main />
          </SidebarInset>
          <ContextPanel className="h-full [--context-panel-width:16rem]" />
        </ContextPanelProvider>
      </SidebarProvider>
    </div>
  )
}
