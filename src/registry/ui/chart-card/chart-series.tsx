"use client"

import * as React from "react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts"

import { cn } from "@/lib/utils"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  SERIES_TONES,
  conventionClass,
  createAxisFormatter,
  formatStat,
  toneColor,
  type DataConvention,
  type DataTone,
  type StatFormatOptions,
} from "@/registry/lib/data-display"

import { ChartLegendList } from "./chart-legend"
import { CHART_AXIS_TICK, CHART_GRID, useChartAnimation } from "./chart-parts"

type ChartSeriesItem = {
  /** 数据里这条序列的字段名 */
  key: string
  /** 图例与提示框里的名称 */
  label: string
  /** 色调，不设置时按顺序取默认色板（蓝、琥珀、绿、紫、玫红、青） */
  tone?: DataTone
}

type ChartSeriesProps = Omit<React.ComponentProps<"div">, "children"> & {
  /** 数据行，每行一个横轴位置 */
  data: Record<string, string | number>[]
  /** 横轴对应的字段名 */
  xKey: string
  /** 要画的序列 */
  series: ChartSeriesItem[]
  /**
   * 图形：折线、柱、面积
   * @default "line"
   */
  type?: "line" | "bar" | "area"
  /**
   * 堆叠柱 / 面积；`"diverging"` 让正负值分别向上、向下堆叠，用来对比两组相反方向的数据
   * @default false
   */
  stacked?: boolean | "diverging"
  /**
   * 折线与面积的插值：平滑、折线、阶梯
   * @default "monotone"
   */
  curve?: "monotone" | "linear" | "step"
  /** 横轴刻度文字的格式化，如把 `"2026-02-14"` 变成 `"2月14日"` */
  xTickFormatter?: (value: string, index: number) => string
  /** 提示框标题的格式化，默认同横轴刻度 */
  labelFormatter?: (value: string) => string
  /** 提示框里数值的格式，默认 `zh-CN` 压缩；纵轴取其中的 `style`、`locale`、`currency`、`digits`，并按整条轴统一单位（万 / 亿或 K / M / B） */
  format?: StatFormatOptions
  /** 纵轴范围，不设置时自动 */
  yDomain?: [number, number]
  /** 纵轴刻度位置 */
  yTicks?: number[]
  /**
   * 显示纵轴
   * @default true
   */
  showYAxis?: boolean
  /**
   * 显示水平虚线网格
   * @default true
   */
  showGrid?: boolean
  /**
   * 在图表上方显示图例；默认序列多于一条时显示
   */
  showLegend?: boolean
  /** 柱宽上限（像素） */
  barSize?: number
  /** 涨跌配色约定，仅序列使用 `up` / `down` 色调时有用；不设置时沿用外层 */
  convention?: DataConvention
  /** 读屏名称，描述这张图表示什么 */
  label?: string
}

/** 多序列图表：折线、柱、面积三合一，支持堆叠与正负对比。高度用 `className` 控制（默认 `h-64`）。 */
function ChartSeries({
  className,
  data,
  xKey,
  series,
  type = "line",
  stacked = false,
  curve = "monotone",
  xTickFormatter,
  labelFormatter,
  format,
  yDomain,
  yTicks,
  showYAxis = true,
  showGrid = true,
  showLegend = series.length > 1,
  barSize,
  convention,
  label,
  ...props
}: ChartSeriesProps) {
  const ready = React.useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  )
  const animation = useChartAnimation()
  const gradientBase = React.useId().replaceAll(":", "")
  const resolved = series.map((item, index) => ({
    ...item,
    color: toneColor(
      item.tone ?? SERIES_TONES[index % SERIES_TONES.length] ?? "blue",
    ),
  }))
  const config: ChartConfig = {}
  for (const item of resolved)
    config[item.key] = { label: item.label, color: item.color }

  // 纵轴整条轴共用一个单位：先找出数据（堆叠时是每列的合计）的最大绝对值，再选「万 / 亿」或 K / M
  const keys = series.map((item) => item.key)
  const peak =
    yDomain && yDomain.length === 2
      ? Math.max(Math.abs(yDomain[0]), Math.abs(yDomain[1]))
      : Math.max(
          0,
          ...data.map((row) => {
            const values = keys.map((key) => Number(row[key]) || 0)
            return stacked
              ? Math.max(
                  values.filter((v) => v > 0).reduce((a, b) => a + b, 0),
                  -values.filter((v) => v < 0).reduce((a, b) => a + b, 0),
                )
              : Math.max(...values.map(Math.abs))
          }),
        )
  const formatTick = createAxisFormatter(peak, format)
  const margin = { top: 8, right: 8, bottom: 0, left: 0 }
  const grid = showGrid ? <CartesianGrid {...CHART_GRID} /> : null
  const xAxis = (
    <XAxis
      dataKey={xKey}
      tickLine={false}
      axisLine={false}
      tickMargin={8}
      minTickGap={16}
      tick={CHART_AXIS_TICK}
      tickFormatter={xTickFormatter}
    />
  )
  const yAxis = (
    <YAxis
      hide={!showYAxis}
      width="auto"
      tickLine={false}
      axisLine={false}
      tickMargin={8}
      tick={CHART_AXIS_TICK}
      domain={yDomain}
      ticks={yTicks}
      tickFormatter={formatTick}
    />
  )
  const tooltip = (
    <ChartTooltip
      cursor={type === "bar" ? false : { stroke: "var(--edge)" }}
      content={
        <ChartTooltipContent
          className="min-w-36 shadow-sm"
          labelFormatter={
            labelFormatter
              ? (value) => labelFormatter(String(value))
              : undefined
          }
          formatter={(value, name, item) => (
            <>
              <span
                aria-hidden="true"
                className="size-2 shrink-0 rounded-[2px]"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-muted-foreground">{name}</span>
              <span className="ml-auto font-mono font-medium text-foreground tabular-nums">
                {formatStat(Number(value), format)}
              </span>
            </>
          )}
        />
      }
    />
  )
  const stackId = stacked ? "stack" : undefined

  return (
    <div
      data-slot="chart-series"
      data-ready={ready}
      data-type={type}
      className={cn(
        "relative flex h-64 min-w-0 flex-col gap-3",
        conventionClass(convention),
        className,
      )}
      {...props}
    >
      {showLegend ? (
        <ChartLegendList
          marker={type === "line" ? "line" : "dot"}
          items={resolved.map((item) => ({
            label: item.label,
            tone: item.color,
          }))}
        />
      ) : null}
      <ChartContainer
        data-slot="chart-series-plot"
        data-ready={ready}
        config={config}
        role="img"
        aria-label={label}
        initialDimension={{ width: 320, height: 200 }}
        className="aspect-auto min-h-0 w-full flex-1 justify-start opacity-0 transition-opacity duration-200 data-[ready=true]:opacity-100 motion-reduce:transition-none"
      >
        {type === "bar" ? (
          <BarChart
            data={data}
            margin={margin}
            barCategoryGap="28%"
            stackOffset={stacked === "diverging" ? "sign" : undefined}
          >
            {grid}
            {xAxis}
            {yAxis}
            {tooltip}
            {resolved.map((item, index) => (
              <Bar
                key={item.key}
                dataKey={item.key}
                name={item.label}
                fill={`var(--color-${item.key})`}
                stackId={stackId}
                maxBarSize={barSize ?? 24}
                radius={
                  stacked &&
                  stacked !== "diverging" &&
                  index < resolved.length - 1
                    ? 0
                    : [3, 3, 0, 0]
                }
                {...animation}
              />
            ))}
          </BarChart>
        ) : type === "area" ? (
          <AreaChart data={data} margin={margin}>
            <defs>
              {resolved.map((item) => (
                <linearGradient
                  key={item.key}
                  id={`${gradientBase}-${item.key}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="0%"
                    stopColor={`var(--color-${item.key})`}
                    stopOpacity={0.28}
                  />
                  <stop
                    offset="100%"
                    stopColor={`var(--color-${item.key})`}
                    stopOpacity={0}
                  />
                </linearGradient>
              ))}
            </defs>
            {grid}
            {xAxis}
            {yAxis}
            {tooltip}
            {resolved.map((item) => (
              <Area
                key={item.key}
                dataKey={item.key}
                name={item.label}
                type={curve === "step" ? "stepAfter" : curve}
                stroke={`var(--color-${item.key})`}
                strokeWidth={2}
                fill={`url(#${gradientBase}-${item.key})`}
                stackId={stackId}
                activeDot={{ r: 3, strokeWidth: 0 }}
                {...animation}
              />
            ))}
          </AreaChart>
        ) : (
          <LineChart data={data} margin={margin}>
            {grid}
            {xAxis}
            {yAxis}
            {tooltip}
            {resolved.map((item) => (
              <Line
                key={item.key}
                dataKey={item.key}
                name={item.label}
                type={curve === "step" ? "stepAfter" : curve}
                stroke={`var(--color-${item.key})`}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 3, strokeWidth: 0 }}
                {...animation}
              />
            ))}
          </LineChart>
        )}
      </ChartContainer>
      <div
        data-slot="chart-series-placeholder"
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-0 z-10 min-h-0 bg-muted/30 transition-opacity duration-200 motion-reduce:transition-none",
          ready && "opacity-0",
        )}
      >
        <svg
          className="absolute inset-0 size-full text-muted-foreground/20"
          preserveAspectRatio="none"
          viewBox="0 0 100 100"
        >
          <path
            d="M0 25H100 M0 50H100 M0 75H100"
            fill="none"
            stroke="currentColor"
            strokeDasharray="3 3"
          />
        </svg>
      </div>
    </div>
  )
}

const subscribe = () => () => {}

export { ChartSeries }
export type { ChartSeriesItem, ChartSeriesProps }
