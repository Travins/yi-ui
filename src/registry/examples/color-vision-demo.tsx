"use client"
import * as React from "react"
import {
  findColorConflicts,
  simulateColorVision,
  type ColorVision,
} from "@/registry/lib/color-vision"
import { ColorPicker } from "@/registry/ui/color-picker/color-picker"

const VISIONS: { value: ColorVision; label: string }[] = [
  { value: "normal", label: "正常" },
  { value: "protanopia", label: "红色盲" },
  { value: "deuteranopia", label: "绿色盲" },
  { value: "tritanopia", label: "蓝色盲" },
]

function simulated(hex: string, vision: ColorVision) {
  return vision === "normal" ? hex : simulateColorVision(hex, vision)
}

/** 默认示例：两个颜色在四种视角下的样子与色差，低于默认阈值 10 时标出难以分清 */
export default function ColorVisionDemo() {
  const [first, setFirst] = React.useState("#cc3311")
  const [second, setSecond] = React.useState("#228833")
  const results = findColorConflicts([first, second], { threshold: Infinity })
  return (
    <div
      data-slot="color-vision-demo"
      className="w-full max-w-sm space-y-3 rounded-xl border border-edge bg-background p-4 shadow-xs"
    >
      <ColorPicker label="颜色 A" value={first} onValueChange={setFirst} />
      <ColorPicker label="颜色 B" value={second} onValueChange={setSecond} />
      <ul className="space-y-2 text-sm">
        {VISIONS.map(({ value, label }) => {
          const deltaE =
            results.find((result) => result.vision === value)?.deltaE ?? 0
          return (
            <li key={value} className="flex items-center gap-2">
              <span className="w-12 shrink-0 text-muted-foreground">{label}</span>
              <span
                aria-hidden
                className="h-5 flex-1 rounded-sm"
                style={{ backgroundColor: simulated(first, value) }}
              />
              <span
                aria-hidden
                className="h-5 flex-1 rounded-sm"
                style={{ backgroundColor: simulated(second, value) }}
              />
              <span className="w-24 shrink-0 text-right text-xs">
                ΔE <span className="font-mono">{deltaE.toFixed(1)}</span>
                {deltaE < 10 && (
                  <span className="ml-1 text-muted-foreground">
                    难分清
                  </span>
                )}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
