import * as React from "react"

import { cn } from "@/lib/utils"
import {
  SERIES_TONES,
  formatStat,
  motionStyles,
  toneColor,
  type DataTone,
  type StatFormatOptions,
} from "@/registry/lib/data-display"

import {
  DEFAULT_LABELS,
  STATUS_TONES,
  healthStatus,
  usageStatus,
  type StatLabels,
} from "./config"

function toneVar(tone: DataTone, style?: React.CSSProperties) {
  return { "--stat-tone": toneColor(tone), ...style } as React.CSSProperties
}

const clampPercent = (value: number, max: number) =>
  max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0

type StatProgressProps = Omit<React.ComponentProps<"div">, "children"> & {
  /** 当前值 */
  value: number
  /**
   * 满值
   * @default 100
   */
  max?: number
  /**
   * 填充色。`"usage"`：按用量自动变色（65% 起关注、90% 起风险），适合配额；
   * `"health"`：按健康度变色（低于 40% 风险、低于 75% 关注）
   * @default "primary"
   */
  tone?: DataTone | "usage" | "health"
  /**
   * 粗细：`sm` 4px、`default` 6px、`lg` 8px
   * @default "default"
   */
  size?: "sm" | "default" | "lg"
  /** 读屏名称 */
  label?: string
  /** 覆盖默认文案 */
  labels?: Partial<StatLabels>
}

const BAR_SIZES = { sm: "h-1", default: "h-1.5", lg: "h-2" } as const

function autoTone(tone: StatProgressProps["tone"], percent: number): DataTone {
  if (tone === "usage") return STATUS_TONES[usageStatus(percent)]
  if (tone === "health") return STATUS_TONES[healthStatus(percent)]
  return tone ?? "primary"
}

/** 进度条：服务端直接输出最终宽度，填充用 CSS 从左向右展开；系统开启「减少动态效果」时不播放。 */
function StatProgress({
  className,
  value,
  max = 100,
  tone,
  size = "default",
  label,
  labels,
  style,
  ...props
}: StatProgressProps) {
  const percent = clampPercent(value, max)
  return (
    <div
      data-slot="stat-progress"
      role="progressbar"
      aria-label={label ?? { ...DEFAULT_LABELS, ...labels }.progress}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      className={cn(
        "w-full overflow-hidden rounded-full bg-muted",
        BAR_SIZES[size],
        className,
      )}
      style={toneVar(autoTone(tone, percent), style)}
      {...props}
    >
      {motionStyles()}
      <div
        data-slot="stat-progress-fill"
        data-dd-anim="reveal"
        className="h-full rounded-full bg-[color:var(--stat-tone)]"
        style={{ width: `${percent}%` }}
      />
    </div>
  )
}

type StatMeterProps = Omit<React.ComponentProps<"div">, "children"> & {
  /** 0–100 的百分比，按它点亮格子 */
  value: number
  /**
   * 格数
   * @default 10
   */
  segments?: number
  /**
   * 点亮的颜色。默认按健康度自动变色：低于 40% 风险、低于 75% 关注，其余达标
   * @default "health"
   */
  tone?: DataTone | "health" | "usage"
  /** 读屏名称 */
  label?: string
  /** 覆盖默认文案 */
  labels?: Partial<StatLabels>
}

/** 分格计量条：N 个小格，按值从左到右依次点亮；常用来表示服务健康度。 */
function StatMeter({
  className,
  value,
  segments = 10,
  tone = "health",
  label,
  labels,
  style,
  ...props
}: StatMeterProps) {
  const percent = clampPercent(value, 100)
  const lit = Math.round((percent * segments) / 100)
  return (
    <div
      data-slot="stat-meter"
      role="meter"
      aria-label={label ?? { ...DEFAULT_LABELS, ...labels }.meter}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
      className={cn("flex h-6 w-28 items-stretch gap-0.5", className)}
      style={toneVar(autoTone(tone, percent), style)}
      {...props}
    >
      {motionStyles()}
      {Array.from({ length: segments }, (_, index) =>
        index < lit ? (
          <span
            key={index}
            data-state="on"
            data-dd-anim="rise"
            className="flex-1 origin-bottom rounded-[3px] bg-[color:var(--stat-tone)]"
            style={{ animationDelay: `${index * 40}ms` }}
          />
        ) : (
          <span
            key={index}
            data-state="off"
            className="flex-1 rounded-[3px] bg-foreground/8"
          />
        ),
      )}
    </div>
  )
}

type StatSegment = {
  /** 分类名 */
  label: string
  /** 数值，按占比决定宽度 */
  value: number
  /** 色调，不设置时按顺序取默认色板 */
  tone?: DataTone
}

type StatSegmentsProps = Omit<React.ComponentProps<"div">, "children"> & {
  /** 分段数据 */
  segments: StatSegment[]
  /** 读屏名称；默认把每段的占比念出来 */
  label?: string
}

/** 横向分段条：每段宽度按占比分配，段间留 2px 缝；整条从左向右扫出。 */
function StatSegments({
  className,
  segments,
  label,
  ...props
}: StatSegmentsProps) {
  const total = segments.reduce((sum, item) => sum + item.value, 0)
  const summary =
    label ??
    segments
      .map(
        (item) =>
          `${item.label} ${formatStat(total ? (item.value / total) * 100 : 0, { style: "percent" })}`,
      )
      .join("，")
  return (
    <div
      data-slot="stat-segments"
      role="img"
      aria-label={summary}
      className={cn("h-2 w-full", className)}
      {...props}
    >
      {motionStyles()}
      <div
        data-dd-anim="reveal"
        className="flex size-full gap-0.5 overflow-hidden rounded-full"
      >
        {segments.map((item, index) =>
          item.value > 0 ? (
            <span
              key={item.label}
              className="h-full min-w-0 basis-0"
              style={{
                flexGrow: item.value,
                backgroundColor: toneColor(
                  item.tone ??
                    SERIES_TONES[index % SERIES_TONES.length] ??
                    "blue",
                ),
              }}
            />
          ) : null,
        )}
      </div>
    </div>
  )
}

type StatDistributionProps = Omit<React.ComponentProps<"div">, "children"> & {
  /** 分段数据 */
  segments: StatSegment[]
  /** 图例里每项数值的格式，默认 `zh-CN` 压缩 */
  format?: StatFormatOptions
  /**
   * 显示图例格（色条 + 分类名 + 占比 + 数值）
   * @default true
   */
  legend?: boolean
  /**
   * 图例列数上限，窄屏自动减少
   * @default 4
   */
  columns?: 2 | 3 | 4
}

const LEGEND_COLUMNS = {
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
} as const

/** 占比分布：分段条加图例格。图例同时写出占比和数值，不靠颜色区分分类。 */
function StatDistribution({
  className,
  segments,
  format,
  legend = true,
  columns = 4,
  ...props
}: StatDistributionProps) {
  const total = segments.reduce((sum, item) => sum + item.value, 0)
  return (
    <div
      data-slot="stat-distribution"
      className={cn("flex flex-col gap-3", className)}
      {...props}
    >
      <StatSegments segments={segments} />
      {legend ? (
        <ul
          data-slot="stat-legend"
          className={cn("grid gap-2", LEGEND_COLUMNS[columns])}
        >
          {segments.map((item, index) => {
            const percent = total ? (item.value / total) * 100 : 0
            return (
              <li
                key={item.label}
                data-slot="stat-legend-item"
                className="flex items-center gap-2.5 rounded-md border border-edge px-3 py-2"
              >
                <span
                  aria-hidden="true"
                  className="h-8 w-1 shrink-0 rounded-full"
                  style={{
                    backgroundColor: toneColor(
                      item.tone ??
                        SERIES_TONES[index % SERIES_TONES.length] ??
                        "blue",
                    ),
                  }}
                />
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate text-xs text-muted-foreground">
                    {item.label}
                  </span>
                  <span className="text-sm font-semibold tabular-nums">
                    {formatStat(percent, { style: "percent" })}
                    <span className="ml-1.5 font-normal text-muted-foreground">
                      {formatStat(item.value, format)}
                    </span>
                  </span>
                </div>
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}

export { StatDistribution, StatMeter, StatProgress, StatSegments }
export type {
  StatDistributionProps,
  StatMeterProps,
  StatProgressProps,
  StatSegment,
  StatSegmentsProps,
}
