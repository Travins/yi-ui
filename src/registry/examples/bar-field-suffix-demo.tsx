"use client"

import { BarField } from "@/registry/ui/bar-field/bar-field"

export default function BarFieldSuffixDemo() {
  return (
    <div data-slot="bar-field-suffix-demo" className="w-full max-w-sm space-y-4 rounded-xl border border-edge bg-background p-4 shadow-xs">
      <BarField
        label="宽度"
        inputMode="numeric"
        defaultValue="320"
        suffix={<span className="px-2 font-mono text-xs">px</span>}
      />
      <BarField
        label="团队地址"
        defaultValue="lin-studio"
        spellCheck={false}
        suffix={<span className="-ml-1.5 pr-2 text-sm">.yiui.dev</span>}
      />
    </div>
  )
}
