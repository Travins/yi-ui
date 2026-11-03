"use client"

import * as React from "react"
import { parseHex } from "@/registry/lib/color"
import { ColorPicker } from "@/registry/ui/color-picker/color-picker"

/** WCAG 相对亮度与对比度：文字放在白底上至少要 4.5:1 */
function contrastOnWhite(hex: string) {
  const rgb = parseHex(hex)
  if (!rgb) return 21
  const [r = 0, g = 0, b = 0] = [rgb.r, rgb.g, rgb.b].map((v) => {
    const c = v / 255
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return 1.05 / (luminance + 0.05)
}

export default function ColorPickerValidationDemo() {
  const [value, setValue] = React.useState("#334155")
  const ratio = contrastOnWhite(value)
  return (
    <div className="w-full max-w-sm rounded-xl border border-edge bg-background p-4 shadow-xs">
      <ColorPicker
        label="正文颜色"
        value={value}
        onValueChange={setValue}
        error={
          ratio < 4.5
            ? `在白底上对比度只有 ${ratio.toFixed(1)}:1，正文至少需要 4.5:1`
            : undefined
        }
        description={`白底对比度 ${ratio.toFixed(1)}:1`}
      />
    </div>
  )
}
