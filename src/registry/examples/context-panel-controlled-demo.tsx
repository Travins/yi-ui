"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import {
  ContextPanel,
  ContextPanelContent,
  ContextPanelProvider,
  ContextPanelSection,
} from "@/registry/ui/context-panel/context-panel"

const TICKETS = [
  { id: "T-1024", title: "导出报表时偶发超时", owner: "陈默", level: "高" },
  { id: "T-1031", title: "手机端表格横向滚动卡顿", owner: "周屿", level: "中" },
  {
    id: "T-1040",
    title: "暗色模式下图表文字偏淡",
    owner: "许安然",
    level: "低",
  },
]

export default function ContextPanelControlledDemo() {
  // 选中的工单就是面板的开合状态：选中即打开，关闭即取消选中
  const [ticketId, setTicketId] = React.useState<string | null>(null)
  const ticket = TICKETS.find((item) => item.id === ticketId)
  return (
    <div
      data-slot="context-panel-controlled-demo"
      className="flex h-[20rem] w-full max-w-3xl overflow-hidden rounded-xl border border-edge bg-background shadow-xs"
    >
      <ContextPanelProvider
        open={ticketId !== null}
        onOpenChange={(open) => {
          if (!open) setTicketId(null)
        }}
      >
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-14 shrink-0 items-center border-b border-edge px-4">
            <p className="truncate text-sm font-semibold">待处理工单</p>
          </header>
          <ul className="min-h-0 flex-1 divide-y divide-dashed divide-edge overflow-y-auto">
            {TICKETS.map((item) => (
              <li
                key={item.id}
                data-selected={item.id === ticketId}
                className="flex items-center gap-3 px-4 py-2.5 data-[selected=true]:bg-muted/60"
              >
                <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
                  {item.id}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm">
                  {item.title}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-pressed={item.id === ticketId}
                  onClick={() =>
                    setTicketId(item.id === ticketId ? null : item.id)
                  }
                >
                  查看<span className="sr-only">：{item.title}</span>
                </Button>
              </li>
            ))}
          </ul>
          {ticket ? (
            <ContextPanelContent title={ticket.id}>
              <ContextPanelSection title="工单" description={ticket.title}>
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                  <dt className="text-sidebar-foreground/65">负责人</dt>
                  <dd>{ticket.owner}</dd>
                  <dt className="text-sidebar-foreground/65">优先级</dt>
                  <dd>{ticket.level}</dd>
                </dl>
              </ContextPanelSection>
            </ContextPanelContent>
          ) : null}
        </div>
        <ContextPanel className="h-full" />
      </ContextPanelProvider>
    </div>
  )
}
