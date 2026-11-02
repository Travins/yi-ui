"use client"
import * as React from "react"
import { PaletteEditor } from "@/registry/ui/palette-editor/palette-editor"
export default function Demo() {
  const [colors, setColors] = React.useState(["#172554", "#38bdf8", "#fef3c7"])
  return (
    <div
      data-slot="palette-editor-demo"
      className="w-full max-w-md space-y-3 rounded-lg border border-edge bg-card p-4"
    >
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-medium">图表系列配色</p>
        <p className="text-xs text-muted-foreground">{colors.length} 个系列</p>
      </div>
      <PaletteEditor value={colors} onValueChange={setColors} />
    </div>
  )
}
