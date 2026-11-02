"use client"
import * as React from "react"
import { parseHex, rgbToHsl, rgbToHsv } from "@/registry/lib/color"
import { ColorPicker } from "@/registry/ui/color-picker/color-picker"

const round = (value: number) => Math.round(value)

/** 默认示例：选一个颜色，看它换算成 RGB、HSV、HSL 的结果 */
export default function ColorDemo() {
  const [hex, setHex] = React.useState("#2563eb")
  const rgb = parseHex(hex) ?? { r: 0, g: 0, b: 0, a: 1 }
  const hsv = rgbToHsv(rgb)
  const hsl = rgbToHsl(rgb)
  const rows = [
    ["RGB", `${round(rgb.r)}, ${round(rgb.g)}, ${round(rgb.b)}`],
    ["HSV", `${round(hsv.h)}°, ${round(hsv.s * 100)}%, ${round(hsv.v * 100)}%`],
    ["HSL", `${round(hsl.h)}°, ${round(hsl.s * 100)}%, ${round(hsl.l * 100)}%`],
  ]
  return (
    <div
      data-slot="color-demo"
      className="w-full max-w-xs space-y-3 rounded-lg border border-edge bg-card p-4"
    >
      <ColorPicker label="颜色" value={hex} onValueChange={setHex} />
      <dl className="space-y-1.5 text-sm">
        {rows.map(([name, value]) => (
          <div key={name} className="flex items-baseline justify-between gap-3">
            <dt className="text-muted-foreground">{name}</dt>
            <dd className="font-mono text-xs">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
