"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

// 只用整数运算的伪随机数：服务端与浏览器生成同一条路径，水合时不会出现差异
function createRandom(seed: number) {
  let state = (seed * 2654435761 + 1013904223) >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const HEIGHT = 16
// 量到真实宽度之前（服务端输出、首次渲染）用的占位宽度，随后会被量到的值替换
const FALLBACK_WIDTH = 120

/** 把折线点平滑成二次曲线：每个中间点作控制点，相邻点的中点作端点。 */
function smooth(points: [number, number][]) {
  const fmt = (n: number) => n.toFixed(1)
  const [first, ...rest] = points
  if (!first) return ""
  let d = `M${fmt(first[0])} ${fmt(first[1])}`
  rest.forEach((point, i) => {
    const next = rest[i + 1]
    d += next
      ? ` Q${fmt(point[0])} ${fmt(point[1])} ${fmt((point[0] + next[0]) / 2)} ${fmt((point[1] + next[1]) / 2)}`
      : ` L${fmt(point[0])} ${fmt(point[1])}`
  })
  return d
}

/**
 * 生成「手写划掉」的路径：一道略有起伏的长划线，右端折回，再往回补半截。
 * 起伏来自 seed，同一个 seed 路径固定，不同条目的划线各不相同。
 */
function scribblePath(width: number, seed: number) {
  const random = createRandom(seed)
  const jitter = (amount: number) => (random() - 0.5) * 2 * amount
  const mid = HEIGHT / 2
  const steps = Math.max(3, Math.round(width / 40))
  const forward: [number, number][] = Array.from(
    { length: steps + 1 },
    (_, i) => [-3 + ((width + 6) * i) / steps, mid - 1 + jitter(1.8)],
  )
  const back: [number, number][] = [
    [width + 3, mid + 2.5 + jitter(0.8)],
    [width * 0.72, mid + 2 + jitter(1.4)],
    [width * 0.5, mid + 3 + jitter(1)],
  ]
  return smooth([...forward, ...back])
}

/**
 * 盖在文字上的手写划线：宽度量自文字本身，所以中文、英文、数字都能完整划过。
 * 用 `pathLength` 归一化后以 dash 偏移做描绘动画，系统开启「减少动态效果」时直接显示结果。
 */
function Scribble({
  checked,
  seed = 0,
  className,
  ...props
}: Omit<React.ComponentProps<"svg">, "children"> & {
  /** 是否已划掉 */
  checked: boolean
  /** 路径种子，决定起伏 */
  seed?: number
}) {
  const ref = React.useRef<SVGSVGElement>(null)
  const [width, setWidth] = React.useState(FALLBACK_WIDTH)
  React.useLayoutEffect(() => {
    const svg = ref.current
    if (!svg) return
    const measure = () => {
      const next = Math.round(svg.getBoundingClientRect().width)
      if (next > 0) setWidth(next)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(svg)
    return () => observer.disconnect()
  }, [])
  return (
    <svg
      ref={ref}
      data-slot="checklist-scribble"
      data-checked={checked || undefined}
      aria-hidden="true"
      viewBox={`0 0 ${width} ${HEIGHT}`}
      preserveAspectRatio="none"
      className={cn(
        "pointer-events-none absolute inset-x-0 top-1/2 h-4 w-full -translate-y-1/2 overflow-visible",
        className,
      )}
      {...props}
    >
      <path
        d={scribblePath(width, seed)}
        pathLength={1}
        fill="none"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cn(
          "stroke-(--flow-tone)/80 [stroke-dasharray:1_2] motion-reduce:[transition:none]",
          checked
            ? "opacity-100 [stroke-dashoffset:0] [transition:stroke-dashoffset_0.7s_cubic-bezier(0.4,0,0.2,1),opacity_0s]"
            : "opacity-0 [stroke-dashoffset:1] [transition:stroke-dashoffset_0.4s_ease-in,opacity_0s_0.4s]",
        )}
      />
    </svg>
  )
}

export { Scribble, scribblePath }
