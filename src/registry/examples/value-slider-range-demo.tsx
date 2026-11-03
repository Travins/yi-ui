"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { ValueSlider } from "@/registry/ui/value-slider/value-slider"

/** 每根柱子是一个 100 元档位的商品数，数据固定，每次构建都一样 */
const BUCKETS = [
  2, 5, 9, 16, 25, 33, 30, 22, 17, 21, 26, 31, 24, 18, 12, 9, 6, 4, 2, 1,
]
const BUCKET_WIDTH = 100
const TALLEST = Math.max(...BUCKETS)
const TOTAL = BUCKETS.reduce((sum, count) => sum + count, 0)

const CURRENCY: Intl.NumberFormatOptions = {
  style: "currency",
  currency: "CNY",
  maximumFractionDigits: 0,
}

/** 数组值即区间：两个手柄各自拖动，上方的柱状图跟着高亮 */
export default function ValueSliderRangeDemo() {
  // 只用来画图与统计，滑块自己管值（非受控）
  const [range, setRange] = React.useState<number[]>([200, 1200])
  const [low = 200, high = 1200] = range
  const picked = BUCKETS.reduce((sum, count, index) => {
    const start = index * BUCKET_WIDTH
    return start >= low && start + BUCKET_WIDTH <= high ? sum + count : sum
  }, 0)

  return (
    <div className="w-full max-w-sm rounded-xl border border-edge bg-background p-4 shadow-xs">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-medium">价格分布</p>
        <p className="text-xs text-muted-foreground">全场 {TOTAL} 件</p>
      </div>
      <div aria-hidden="true" className="mt-3 border-b border-edge pb-px">
        <div className="flex h-16 items-end gap-1">
          {BUCKETS.map((count, index) => {
            const start = index * BUCKET_WIDTH
            const active = start >= low && start + BUCKET_WIDTH <= high
            return (
              <span
                key={start}
                className={cn(
                  "w-full rounded-t-[2px]",
                  active ? "bg-primary" : "bg-muted-foreground/20",
                )}
                style={{ height: `${(count / TALLEST) * 100}%` }}
              />
            )
          })}
        </div>
      </div>
      <div className="mt-1 flex justify-between text-[0.7rem] text-muted-foreground">
        <span>¥0</span>
        <span>¥2,000</span>
      </div>
      <div className="mt-4 flex h-14 items-center">
        {/* 标签放到轨道上方：两个手柄常驻显示，轨道内不放文字 */}
        <ValueSlider
          label="价格"
          labelPlacement="outside"
          tone="primary"
          min={0}
          max={2000}
          step={50}
          largeStep={500}
          defaultValue={[200, 1200]}
          onValueChange={(next) => setRange([...next])}
          format={CURRENCY}
        />
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        所选区间共 {picked} 件商品
      </p>
    </div>
  )
}
