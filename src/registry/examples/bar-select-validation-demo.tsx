"use client"

import * as React from "react"
import { BarSelect } from "@/registry/ui/bar-select/bar-select"

export default function BarSelectValidationDemo() {
  const [value, setValue] = React.useState<string | null>(null)
  return (
    <div data-slot="bar-select-validation-demo" className="w-full max-w-sm rounded-xl border border-edge bg-background p-4 shadow-xs">
      <BarSelect
        label="审批人"
        value={value}
        onValueChange={setValue}
        error={!value ? "请选择一位审批人" : undefined}
        options={[
          { value: "lin", label: "林小满" },
          { value: "chen", label: "陈青" },
        ]}
      />
    </div>
  )
}
