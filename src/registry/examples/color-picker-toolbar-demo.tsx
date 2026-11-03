import { ColorPicker } from "@/registry/ui/color-picker/color-picker"
import {
  GridToolbar,
  GridToolbarItem,
} from "@/registry/ui/grid-toolbar/grid-toolbar"
import { NumberStepper } from "@/registry/ui/number-stepper/number-stepper"

export default function ColorPickerToolbarDemo() {
  return (
    <GridToolbar className="max-w-xl">
      <GridToolbarItem grow className="min-w-44">
        <ColorPicker label="填充" defaultValue="#2563eb" />
      </GridToolbarItem>
      <GridToolbarItem grow className="min-w-44">
        <ColorPicker label="描边" defaultValue="#0f172a" />
      </GridToolbarItem>
      <GridToolbarItem grow className="min-w-52">
        <NumberStepper
          label="线宽"
          defaultValue={1.5}
          step={0.5}
          unit="px"
          format={{ minimumFractionDigits: 1, maximumFractionDigits: 1 }}
        />
      </GridToolbarItem>
    </GridToolbar>
  )
}
