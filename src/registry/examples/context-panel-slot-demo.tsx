"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import {
  ContextPanel,
  ContextPanelContent,
  ContextPanelProvider,
  ContextPanelSection,
  ContextPanelTrigger,
} from "@/registry/ui/context-panel/context-panel"

/** 订单页声明了面板内容 */
function OrdersPage() {
  return (
    <>
      <p className="text-sm leading-6 text-muted-foreground">
        订单页里写了 <code>ContextPanelContent</code>，顶栏右侧出现开合按钮。
      </p>
      <ContextPanelContent title="筛选条件">
        <ContextPanelSection title="时间范围" description="按下单时间">
          <p className="text-sm">近 30 天</p>
        </ContextPanelSection>
        <ContextPanelSection title="订单状态">
          <p className="text-sm">待发货、已发货</p>
        </ContextPanelSection>
      </ContextPanelContent>
    </>
  )
}

/** 设置页没有声明：面板和开合按钮都不出现 */
function SettingsPage() {
  return (
    <p className="text-sm leading-6 text-muted-foreground">
      设置页没有声明面板内容，开合按钮不渲染，面板也不占位置。
    </p>
  )
}

const PAGES = [
  { id: "orders", label: "订单页" },
  { id: "settings", label: "设置页" },
]

export default function ContextPanelSlotDemo() {
  const [page, setPage] = React.useState("orders")
  return (
    <div
      data-slot="context-panel-slot-demo"
      className="flex h-[20rem] w-full max-w-3xl overflow-hidden rounded-xl border border-edge bg-background shadow-xs"
    >
      <ContextPanelProvider defaultOpen>
        <div className="flex min-w-0 flex-1 flex-col">
          {/* 顶栏属于公共布局：开合按钮只写这一次 */}
          <header className="flex h-14 shrink-0 items-center gap-2 border-b border-edge px-4">
            <div role="group" aria-label="切换页面" className="flex gap-2">
              {PAGES.map((item) => (
                <Button
                  key={item.id}
                  variant={page === item.id ? "secondary" : "ghost"}
                  size="sm"
                  aria-pressed={page === item.id}
                  onClick={() => setPage(item.id)}
                >
                  {item.label}
                </Button>
              ))}
            </div>
            <div className="ml-auto">
              <ContextPanelTrigger />
            </div>
          </header>
          <div className="p-4">
            {page === "orders" ? <OrdersPage /> : <SettingsPage />}
          </div>
        </div>
        <ContextPanel className="h-full" />
      </ContextPanelProvider>
    </div>
  )
}
