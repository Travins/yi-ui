"use client"
import { PaletteEditor } from "@/registry/ui/palette-editor/palette-editor"
export default function Demo() {
  return (
    <div
      data-slot="palette-editor-demo"
      className="w-full max-w-md rounded-lg border border-edge bg-card p-4"
    >
      <PaletteEditor defaultValue={["#cc3311", "#228833", "#ee7733"]} />
    </div>
  )
}
