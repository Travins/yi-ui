"use client"
import { PaletteEditor } from "@/registry/ui/palette-editor/palette-editor"
export default function Demo() {
  return (
    <div
      data-slot="palette-editor-demo"
      className="w-full max-w-md rounded-xl border border-edge bg-background p-4 shadow-xs"
    >
      <PaletteEditor
        minItems={2}
        maxItems={4}
        defaultValue={["#172554", "#38bdf8"]}
      />
    </div>
  )
}
