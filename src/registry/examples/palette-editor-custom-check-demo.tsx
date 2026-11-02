"use client"
import { findColorConflicts } from "@/registry/lib/color-vision"
import { PaletteEditor } from "@/registry/ui/palette-editor/palette-editor"

/** 项目自己的检查规则：这里只看绿色盲视角，阈值放宽到 15 */
function checkForPublication(colors: string[]) {
  return findColorConflicts(colors, {
    threshold: 15,
    visions: ["deuteranopia"],
  })
}

export default function Demo() {
  return (
    <div
      data-slot="palette-editor-demo"
      className="w-full max-w-md rounded-xl border border-edge bg-background p-4 shadow-xs"
    >
      <PaletteEditor
        defaultValue={["#cc3311", "#228833", "#0077bb"]}
        findConflicts={checkForPublication}
      />
    </div>
  )
}
