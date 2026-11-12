"use client"

import { PreviewSkeleton } from "@/components/docs/preview-skeleton"

import * as React from "react"

import { cn } from "@/lib/utils"
import { PreviewBackdrop } from "@/components/docs/preview-backdrop"
import { registryExamples } from "@/registry/__index__"

/**
 * 缩略图一律展示组件详情页的第一个示例，保证列表里看到的效果在详情页都能找到。
 * 默认取 `${name}-demo`；详情页首个示例不叫这个名字的组件在这里登记（与 MDX 第一个 ComponentPreview 保持一致）。
 */
const firstExamples: Record<string, string> = {
  "chart-card": "chart-card-target-demo",
  "flow-diagram": "flow-diagram-showcase-demo",
  greeting: "greeting-card-demo",
  "local-time": "local-time-world-clock-demo",
}

/**
 * 示例按原尺寸居中展示；画框宽屏为 16:10，窄屏固定 20rem 高（aspect-ratio 与 min-height 同时设置会把宽度撑开，所以分开写）。
 * 少数示例原尺寸放不进画框，在这里单独缩小（transform 只影响视觉，不改变示例自身排版）。
 */
const fitClasses: Record<string, string> = {
  "color-picker": "scale-[0.85]",
  // 色卡行放不下时 HEX 会被截断：固定排版宽度后整体缩小
  "palette-editor": "w-[28rem] scale-[0.65] max-lg:scale-[0.6]",
  "bar-field": "scale-[0.8]",
  "bar-select": "scale-[0.85]",
  "grid-toolbar": "scale-[0.75]",
  "grid-pagination": "w-[48rem] scale-[0.65] max-lg:scale-[0.38]",
  "grid-layout": "max-lg:scale-[0.6]",
  "local-time": "max-lg:scale-[0.78]",
  "stat-card": "max-lg:scale-[0.62]",
  "mini-chart": "max-lg:scale-90",
  "change-summary": "max-lg:scale-[0.8]",
  "chart-card": "max-lg:scale-[0.55]",
  timeline: "max-lg:scale-[0.85]",
  "card-stack": "max-lg:scale-90",
  orbit: "max-lg:scale-[0.85]",
  // 门面示例窄屏时预览与面板堆成两段，缩到画框里才看得全
  "control-panel": "max-lg:scale-[0.72]",
  // 照片卡与拖拽板门面示例都是竖向堆叠的卡片，窄屏画框只有 20rem 高
  "angle-dial": "max-lg:scale-[0.82]",
  "xy-pad": "max-lg:scale-[0.7]",
  // 三行读数的转换器卡片，窄屏画框只有 20rem 高
  "chinese-number": "max-lg:scale-[0.85]",
  // 列表加 20rem 的面板要 42rem 才排得开；窄屏面板变抽屉，画框里只剩列表
  "context-panel":
    "max-md:scale-[0.8] md:w-[42rem] md:scale-[0.45] lg:scale-[0.6]",
}

/**
 * 本身就是满幅背景的示例：铺满画框、去掉自身的圆角与边框，不留内边距。
 * `*:` 作用在示例根元素上，`**:data-[slot=…]` 让示例里固定高度的画布跟着撑满。
 */
const fillClasses: Record<string, string> = {
  marquee: "*:h-full",
  "text-animate": "*:h-full *:min-h-0",
  "isometric-mark":
    "*:h-full *:min-h-0 *:max-w-none *:rounded-none *:border-0 **:data-[slot=isometric-mark]:mx-auto **:data-[slot=isometric-mark]:w-3/4",
  "glyph-field": "*:h-full *:rounded-none **:data-[slot=glyph-field]:h-full",
  // 窄屏画框只有 20rem 高：地球往右下角挪，露出大半个球面，又不压到左上的指标
  globe:
    "*:h-full! *:max-w-none *:rounded-none *:border-0 max-lg:**:data-[slot=globe]:left-auto max-lg:**:data-[slot=globe]:-right-[18%] max-lg:**:data-[slot=globe]:w-[95cqh] max-lg:**:data-[slot=globe]:translate-x-0 max-lg:**:data-[slot=globe]:translate-y-[36%]",
  "value-slider": "*:h-full",
}

export function ComponentThumbnail({
  name,
  label,
}: {
  name: string
  label: string
}) {
  const Preview = registryExamples[firstExamples[name] ?? `${name}-demo`]
  const fill = fillClasses[name]

  return (
    // 缩略图是可交互的实时演示（悬停、点击都生效），跳转只交给下方的标题区
    <div
      role="group"
      aria-label={label}
      className={cn(
        "relative isolate flex h-80 min-w-0 items-center justify-center overflow-clip bg-muted/20 lg:aspect-[16/10] lg:h-auto",
        !fill && "px-6",
      )}
    >
      <PreviewBackdrop name={name} />
      <React.Suspense
        fallback={<PreviewSkeleton className="absolute inset-0" />}
      >
        <div
          className={cn(
            fill
              ? cn("absolute inset-0 flex", fill)
              : "flex w-full shrink-0 items-center justify-center",
            fitClasses[name],
          )}
        >
          {Preview ? <Preview /> : null}
        </div>
      </React.Suspense>
    </div>
  )
}
