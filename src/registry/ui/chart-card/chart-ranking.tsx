"use client"

import * as React from "react"
import { Bar, BarChart, Cell, LabelList, XAxis, YAxis } from "recharts"

import { cn } from "@/lib/utils"
import { ChartContainer, type ChartConfig } from "@/components/ui/chart"
import {
  SERIES_TONES,
  formatStat,
  toneColor,
  type DataTone,
  type StatFormatOptions,
} from "@/registry/lib/data-display"

import { ChartLegendGrid } from "./chart-legend"
import { CHART_AXIS_TICK, useChartAnimation } from "./chart-parts"

type ChartRankingItem = {
  /** 条目名称，图例里显示 */
  label: string
  /** 数值，单位由 `format` 决定（默认按百分比显示） */
  value: number
  /** 色调，不设置时按顺序取默认色板 */
  tone?: DataTone
}

type ChartRankingProps = Omit<React.ComponentProps<"div">, "children"> & {
  /** 排名条目，按从高到低排列 */
  items: ChartRankingItem[]
  /**
   * 横轴满值；百分比数据用 100，其余数据默认取最大值
   */
  max?: number
  /**
   * 数值格式，默认是不压缩的百分比
   * @default { style: "percent", digits: 0 }
   */
  format?: StatFormatOptions
  /**
   * 在图表旁显示图例格（名称 + 数值）；窄屏落到图表下方
   * @default true
   */
  showLegend?: boolean
  /** 读屏名称，描述这张图表示什么 */
  label?: string
}

const ROW_HEIGHT = 36

/**
 * 横向排名条：左侧是名次，条末标出数值，右侧（窄屏在下方）是带名称的图例格。
 * 名次对应图例的顺序，所以图例同样按名次排列。
 */
function ChartRanking({
  className,
  items,
  max,
  format = { style: "percent", digits: 0 },
  showLegend = true,
  label,
  ...props
}: ChartRankingProps) {
  const ready = React.useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  )
  const animation = useChartAnimation()
  const data = items.map((item, index) => ({
    rank: String(index + 1),
    label: item.label,
    value: item.value,
    fill: toneColor(
      item.tone ?? SERIES_TONES[index % SERIES_TONES.length] ?? "blue",
    ),
  }))
  const config: ChartConfig = { value: { label: "数值" } }
  const ceiling = max ?? Math.max(...items.map((item) => item.value), 1)

  return (
    <div
      data-slot="chart-ranking"
      data-ready={ready}
      className={cn(
        "relative grid min-w-0 items-center gap-6",
        showLegend && "lg:grid-cols-2",
        className,
      )}
      {...props}
    >
      <ChartContainer
        data-slot="chart-ranking-plot"
        data-ready={ready}
        config={config}
        role="img"
        aria-label={label}
        initialDimension={{ width: 320, height: items.length * ROW_HEIGHT }}
        className="aspect-auto w-full justify-start opacity-0 transition-opacity duration-200 data-[ready=true]:opacity-100 motion-reduce:transition-none"
        style={{ height: items.length * ROW_HEIGHT + 24 }}
      >
        <BarChart
          data={data}
          layout="vertical"
          barCategoryGap="30%"
          margin={{ top: 0, right: 40, bottom: 0, left: 0 }}
        >
          <XAxis type="number" domain={[0, ceiling]} hide />
          <YAxis
            dataKey="rank"
            type="category"
            width={20}
            tickLine={false}
            axisLine={false}
            tick={CHART_AXIS_TICK}
          />
          <Bar
            dataKey="value"
            radius={[0, 4, 4, 0]}
            background={{ fill: "var(--muted)", radius: 4 }}
            {...animation}
          >
            {data.map((entry) => (
              <Cell key={entry.label} fill={entry.fill} />
            ))}
            <LabelList
              dataKey="value"
              position="right"
              offset={8}
              className="fill-foreground text-xs tabular-nums"
              formatter={(value: unknown) => formatStat(Number(value), format)}
            />
          </Bar>
        </BarChart>
      </ChartContainer>
      {showLegend ? (
        <ChartLegendGrid
          items={items.map((item, index) => ({
            label: `${index + 1}. ${item.label}`,
            tone:
              item.tone ?? SERIES_TONES[index % SERIES_TONES.length] ?? "blue",
            value: formatStat(item.value, format),
          }))}
        />
      ) : null}
      <div
        data-slot="chart-ranking-placeholder"
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-0 z-10 min-h-0 bg-muted/30 transition-opacity duration-200 motion-reduce:transition-none",
          ready && "opacity-0",
        )}
      >
        <div className="absolute inset-0 flex flex-col justify-around gap-2 p-3">
          {items.map((item, index) => (
            <div
              key={index}
              className="h-3 shrink rounded-sm bg-muted-foreground/15"
              style={{
                width: `${Math.max(12, Math.min(90, (item.value / ceiling) * 90))}%`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

const subscribe = () => () => {}

export { ChartRanking }
export type { ChartRankingItem, ChartRankingProps }
