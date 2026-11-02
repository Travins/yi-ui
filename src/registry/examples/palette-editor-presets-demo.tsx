"use client"
import { PaletteEditor } from "@/registry/ui/palette-editor/palette-editor"
export default function Demo() {
  return (
    <div
      data-slot="palette-editor-demo"
      className="w-full max-w-md rounded-lg border border-edge bg-card p-4"
    >
      <PaletteEditor
        presets={[
          { label: "海岸", colors: ["#172554", "#38bdf8", "#fef3c7"] },
          { label: "纸墨", colors: ["#111111", "#eeeeee"] },
        ]}
      />
    </div>
  )
}
