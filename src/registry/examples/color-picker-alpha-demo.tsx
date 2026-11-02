import { ColorPicker } from "@/registry/ui/color-picker/color-picker"
export default function Demo() {
  return (
    <div className="w-full max-w-sm rounded-xl border border-edge bg-background p-4 shadow-xs">
      <ColorPicker
        label="叠加颜色"
        alpha
        defaultValue="#2563eb80"
      />
    </div>
  )
}
