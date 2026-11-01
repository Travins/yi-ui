import { ColorPicker } from "@/registry/ui/color-picker/color-picker"
export default function Demo() {
  return (
    <div className="w-full max-w-xs space-y-2">
      <p id="color-picker-fill-label" className="text-sm text-muted-foreground">
        图形填充色
      </p>
      <ColorPicker
        aria-label="图形填充色"
        aria-labelledby="color-picker-fill-label"
      />
    </div>
  )
}
