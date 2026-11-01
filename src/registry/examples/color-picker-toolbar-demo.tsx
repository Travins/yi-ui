import { BarField } from "@/registry/ui/bar-field/bar-field"
import { ColorPicker } from "@/registry/ui/color-picker/color-picker"
import {
  GridToolbar,
  GridToolbarItem,
} from "@/registry/ui/grid-toolbar/grid-toolbar"

export default function ColorPickerToolbarDemo() {
  return (
    <GridToolbar className="max-w-xl">
      <GridToolbarItem grow className="min-w-44">
        <ColorPicker label="填充" defaultValue="#2563eb" />
      </GridToolbarItem>
      <GridToolbarItem grow className="min-w-44">
        <ColorPicker label="描边" defaultValue="#0f172a" />
      </GridToolbarItem>
      <GridToolbarItem className="w-32">
        <BarField
          label="线宽"
          type="number"
          inputMode="decimal"
          min={0}
          step={0.5}
          defaultValue="1.5"
          suffix={<span className="pe-2 text-xs">px</span>}
        />
      </GridToolbarItem>
    </GridToolbar>
  )
}
