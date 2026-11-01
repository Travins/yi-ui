"use client"
import * as React from "react"
import { ColorPicker } from "@/registry/ui/color-picker/color-picker"
import { Button } from "@/components/ui/button"
export default function ColorPickerDemo() {
  const [primary, setPrimary] = React.useState("#2563eb"),
    [accent, setAccent] = React.useState("#a855f7")
  return (
    <div className="w-full max-w-sm rounded-xl border border-edge bg-card p-4 shadow-xs">
      <h3 className="mb-1 font-medium">品牌设置</h3>
      <p className="mb-5 text-xs text-muted-foreground">
        为你的下一个作品挑选颜色
      </p>
      <div className="space-y-3">
        <ColorPicker label="主色" value={primary} onValueChange={setPrimary} />
        <ColorPicker label="强调色" value={accent} onValueChange={setAccent} />
      </div>
      <div className="mt-5 flex items-center gap-3 border-t border-border pt-4">
        <Button
          type="button"
          style={{ backgroundColor: primary, color: "#ffffff" }}
        >
          开始创作
        </Button>
        <span
          className="rounded-full px-2 py-1 text-xs"
          style={{ backgroundColor: accent + "20", color: accent }}
        >
          新作品
        </span>
      </div>
    </div>
  )
}
