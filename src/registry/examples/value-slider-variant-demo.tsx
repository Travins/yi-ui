"use client"

import * as React from "react"

import { ValueSlider } from "@/registry/ui/value-slider/value-slider"

/** 像素单位与百分比的读数格式，定义在组件外，避免每次渲染重建 */
const formatPixels = (value: number) => `${value}px`
const formatPercent = (value: number) => `${value}%`

/** 画笔轨迹的采样点（viewBox 300 × 80）。固定值，每次构建都一样 */
const POINTS = [
  [20, 50],
  [65, 26],
  [110, 54],
  [155, 24],
  [200, 54],
  [245, 26],
  [285, 48],
] as const

/**
 * 把采样点连成三次贝塞尔：`tension` 取 0 时控制点落在端点上，画出来是折线；
 * 取 1 时是 Catmull-Rom 的标准切线，拐角最软。平滑度滑块改的就是这个系数。
 */
function brushPath(tension: number) {
  const step = (Math.min(100, Math.max(0, tension)) / 100) * (1 / 6)
  let d = `M${POINTS[0][0]} ${POINTS[0][1]}`
  for (const [index, start] of POINTS.entries()) {
    const end = POINTS[index + 1]
    if (!end) break
    const previous = POINTS[index - 1] ?? start
    const next = POINTS[index + 2] ?? end
    // 固定一位小数：坐标在服务端与客户端算出的字符串完全一致
    const c1x = (start[0] + (end[0] - previous[0]) * step).toFixed(1)
    const c1y = (start[1] + (end[1] - previous[1]) * step).toFixed(1)
    const c2x = (end[0] - (next[0] - start[0]) * step).toFixed(1)
    const c2y = (end[1] - (next[1] - start[1]) * step).toFixed(1)
    d += ` C${c1x} ${c1y} ${c2x} ${c2y} ${end[0]} ${end[1]}`
  }
  return d
}

/**
 * 轨道高度示例：一张画笔设置卡片，笔刷大小与不透明度用 `compact`（中等高度，文字仍在轨道里），
 * 平滑度用 `slim`（矮轨 + 刻度，文字在上方）。三条滑块都带 `tone`，填充与手柄跟着色调走。
 */
export default function ValueSliderVariantDemo() {
  const [brush, setBrush] = React.useState(12)
  const [opacity, setOpacity] = React.useState(85)
  const [smoothness, setSmoothness] = React.useState(68)

  return (
    <div className="w-full max-w-sm rounded-xl border border-edge bg-background p-4 shadow-xs">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-medium">画笔设置</p>
        <p className="text-xs text-muted-foreground">铅笔 · 软头</p>
      </div>
      <div className="mt-3 grid h-20 place-items-center overflow-hidden rounded-lg border border-edge bg-muted/30">
        <svg viewBox="0 0 300 80" aria-hidden="true" className="size-full">
          <path
            d={brushPath(smoothness)}
            fill="none"
            stroke="currentColor"
            strokeWidth={brush}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeOpacity={opacity / 100}
            className="text-foreground"
          />
        </svg>
      </div>
      {/* 每条滑块占固定高度：调整面板换尺寸时卡片高度不变（换到 slim 时文字移到上方，会多占一行） */}
      <div className="mt-4 flex flex-col gap-2">
        <div className="flex h-8 items-center">
          <ValueSlider
            label="笔刷大小"
            variant="compact"
            tone="amber"
            min={1}
            max={24}
            step={1}
            value={brush}
            onValueChange={setBrush}
            formatValue={formatPixels}
          />
        </div>
        <div className="flex h-8 items-center">
          <ValueSlider
            label="不透明度"
            variant="compact"
            tone="violet"
            value={opacity}
            onValueChange={setOpacity}
            formatValue={formatPercent}
          />
        </div>
        <div className="flex h-12 items-center">
          <ValueSlider
            label="平滑度"
            variant="slim"
            tone="cyan"
            value={smoothness}
            onValueChange={setSmoothness}
            formatValue={formatPercent}
            ticks={4}
          />
        </div>
      </div>
    </div>
  )
}
