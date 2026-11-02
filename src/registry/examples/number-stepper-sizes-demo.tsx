"use client"

import * as React from "react"

import { NumberStepper } from "@/registry/ui/number-stepper/number-stepper"

/** 当前时段还能预约几位：超过就报错，调回范围内错误自动消失 */
const AVAILABLE = 4

/** 三档尺寸、禁用，以及随值变化的出错态（加到 5 位超出可约名额时报错，减回 4 位错误就消失）。 */
export default function NumberStepperSizesDemo() {
  const [count, setCount] = React.useState<number | null>(3)
  const over = count !== null && count > AVAILABLE

  return (
    <div
      data-slot="number-stepper-sizes-demo"
      className="w-full max-w-sm rounded-xl border border-edge bg-background p-4 shadow-xs"
    >
      <div className="flex items-baseline justify-between gap-2 pb-3">
        <div className="min-w-0">
          <p className="text-sm font-medium">尺寸与状态</p>
          <p className="truncate text-xs text-muted-foreground">
            高度与其他方条控件同一套
          </p>
        </div>
        <p className="shrink-0 font-mono text-[11px] text-muted-foreground">
          28 / 32 / 36
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <NumberStepper label="小号" size="sm" defaultValue={2} max={9} />
        <NumberStepper label="默认" defaultValue={2} max={9} />
        <NumberStepper label="大号" size="lg" defaultValue={2} max={9} />
        <NumberStepper label="暂不可选" defaultValue={2} disabled />
        <NumberStepper
          label="预约数量"
          value={count}
          onValueChange={setCount}
          max={9}
          error={
            over ? `当前时段最多可预约 ${AVAILABLE} 位，请调整人数` : undefined
          }
        />
      </div>
    </div>
  )
}
