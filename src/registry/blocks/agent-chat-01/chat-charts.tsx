"use client"

import {
  ChartCard,
  ChartCardContent,
  ChartCardDescription,
  ChartCardHeader,
  ChartCardTitle,
  ChartMetric,
  ChartMetrics,
} from "@/registry/ui/chart-card/chart-card"
import { ChangeSummary } from "@/registry/ui/change-summary/change-summary"
import { MiniChart, MiniRing } from "@/registry/ui/mini-chart/mini-chart"
import type { ChatChanges, ChatChart } from "./types"

/**
 * 回答里的图表卡片。刻意做得紧凑：内边距 12px、图表只有 96px 高，
 * 宽度跟随助手面板（嵌入约 400px、浮动窗口更窄），和折叠的分析过程放在一起不会把消息撑得很长。
 */
function AgentChatChart({ chart }: { chart: ChatChart }) {
  return (
    <ChartCard data-slot="agent-chat-chart" data-kind={chart.kind}>
      {/* 头部在面板里始终上下排布，所以覆盖掉卡片默认的 sm 以上左右排布 */}
      <ChartCardHeader className="gap-0.5 p-3 sm:flex-col sm:items-stretch">
        <ChartCardTitle>{chart.title}</ChartCardTitle>
        {chart.description ? (
          <ChartCardDescription className="text-xs">
            {chart.description}
          </ChartCardDescription>
        ) : null}
      </ChartCardHeader>
      <ChartCardContent className="flex flex-col gap-3 p-3">
        {chart.kind === "series" ? (
          <>
            {chart.metrics?.length ? (
              <ChartMetrics>
                {chart.metrics.map((metric) => (
                  <ChartMetric
                    key={metric.label}
                    label={metric.label}
                    value={metric.value}
                    tone={metric.tone}
                  />
                ))}
              </ChartMetrics>
            ) : null}
            <MiniChart
              type={chart.type ?? "area"}
              data={chart.data}
              tone={chart.tone}
              format={chart.format}
              highlight={chart.highlight}
              seriesLabel={chart.seriesLabel}
              label={chart.label}
              showAxis
              className="h-24"
            />
          </>
        ) : (
          <ul aria-label={chart.label} className="grid grid-cols-3 gap-2">
            {chart.items.map((item) => (
              <li
                key={item.label}
                className="flex min-w-0 flex-col items-center gap-1.5"
              >
                <MiniRing
                  value={item.value}
                  max={item.max}
                  tone={item.tone}
                  arc={270}
                  size={64}
                  thickness={9}
                  label={`${item.label} ${item.display}`}
                >
                  <span className="text-xs font-semibold">{item.display}</span>
                </MiniRing>
                <span className="max-w-full truncate text-xs text-muted-foreground">
                  {item.label}
                </span>
              </li>
            ))}
          </ul>
        )}
      </ChartCardContent>
    </ChartCard>
  )
}

/** 回答里的改动摘要：直接渲染成 `ChangeSummary`，数据来自 `data-changes` 数据块。 */
function AgentChatChanges({ data }: { data: ChatChanges }) {
  return (
    <ChangeSummary
      data-slot="agent-chat-changes"
      title={data.title}
      period={data.period}
      changes={data.changes}
    />
  )
}

export { AgentChatChart, AgentChatChanges }
