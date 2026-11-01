import { ColorPicker } from "@/registry/ui/color-picker/color-picker"
export default function Demo() {
  return (
    <ColorPicker
      className="max-w-sm"
      label="叠加颜色"
      alpha
      defaultValue="#2563eb80"
    />
  )
}
