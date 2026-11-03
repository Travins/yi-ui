"use client"

import * as React from "react"
import { useReducedMotion } from "motion/react"
import { Pie, PieChart } from "recharts"

import { cn } from "@/lib/utils"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  SERIES_TONES,
  formatStat,
  toneColor,
  type DataTone,
  type StatFormatOptions,
} from "@/registry/lib/data-display"

type MiniDonutSegment = {
  /** 分类名，同时是提示框里的名称 */
  label: string
  value: number
  /** 色调，不设置时按顺序取默认色板 */
  tone?: DataTone
}

type MiniDonutProps = Omit<React.ComponentProps<"div">, "children"> & {
  /** 分段数据 */
  segments: MiniDonutSegment[]
  /**
   * 外径（像素）
   * @default 96
   */
  size?: number
  /**
   * 环的粗细，占半径的百分比
   * @default 30
   */
  thickness?: number
  /** 悬停提示框里数值的格式 */
  format?: StatFormatOptions
  /** 环中央的内容，如合计数字 */
  children?: React.ReactNode
  /** 读屏名称 */
  label?: string
}

/** 环形图：几个分类的占比，中央可放合计。分段之间留 2° 的缝。 */
function MiniDonut({
  className,
  segments,
  size = 96,
  thickness = 30,
  format,
  children,
  label,
  style,
  ...props
}: MiniDonutProps) {
  const ready = React.useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  )
  const reduced = useReducedMotion()
  const config: ChartConfig = {}
  const data = segments.map((segment, index) => {
    const color = toneColor(
      segment.tone ?? SERIES_TONES[index % SERIES_TONES.length] ?? "blue",
    )
    config[segment.label] = { label: segment.label, color }
    return { label: segment.label, value: segment.value, fill: color }
  })
  return (
    <div
      data-slot="mini-donut"
      data-ready={ready}
      role="img"
      aria-label={label}
      className={cn("relative shrink-0", className)}
      style={{ width: size, height: size, ...style }}
      {...props}
    >
      <ChartContainer
        config={config}
        initialDimension={{ width: size, height: size }}
        className={cn(
          "aspect-auto size-full transition-opacity duration-200 motion-reduce:transition-none",
          !ready && "opacity-0",
        )}
      >
        <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          <ChartTooltip
            cursor={false}
            content={
              <ChartTooltipContent
                hideLabel
                nameKey="label"
                className="min-w-28 shadow-sm"
                formatter={(value, name, item) => (
                  <>
                    <span
                      aria-hidden="true"
                      className="size-2 shrink-0 rounded-[2px]"
                      style={{ backgroundColor: item.payload?.fill }}
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
          <Pie
            data={data}
            dataKey="value"
            nameKey="label"
            innerRadius={`${100 - thickness}%`}
            outerRadius="100%"
            paddingAngle={2}
            cornerRadius={3}
            strokeWidth={0}
            isAnimationActive={!reduced}
            animationDuration={700}
          />
        </PieChart>
      </ChartContainer>
      <div
        data-slot="mini-donut-placeholder"
        style={{ borderWidth: (size * thickness) / 200 }}
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-0 rounded-full border-muted/50 transition-opacity duration-200 motion-reduce:transition-none",
          ready && "opacity-0",
        )}
      />
      {children ? (
        <div
          data-slot="mini-donut-content"
          className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center leading-tight tabular-nums"
        >
          {children}
        </div>
      ) : null}
    </div>
  )
}

const subscribe = () => () => {}

export { MiniDonut }
export type { MiniDonutProps, MiniDonutSegment }
