import { ColorPicker } from "@/registry/ui/color-picker/color-picker"
export default function Demo() {
  return (
    <div className="w-full max-w-sm rounded-xl border border-edge bg-background p-4 shadow-xs">
      <ColorPicker
        label="系列颜色"
        presets={["#2563eb", "#a855f7", "#f97316", "#16a34a"]}
      />
    </div>
  )
}
