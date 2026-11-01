import { ColorPicker } from "@/registry/ui/color-picker/color-picker"
export default function Demo() {
  return (
    <ColorPicker
      className="max-w-sm"
      label="系列颜色"
      presets={["#2563eb", "#a855f7", "#f97316", "#16a34a"]}
    />
  )
}
