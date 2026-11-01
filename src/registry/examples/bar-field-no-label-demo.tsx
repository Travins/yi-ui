"use client"

import { Search } from "lucide-react"
import { BarField } from "@/registry/ui/bar-field/bar-field"

export default function BarFieldNoLabelDemo() {
  return (
    <div data-slot="bar-field-no-label-demo" className="w-full max-w-xs">
      <BarField
        type="search"
        aria-label="搜索组件"
        icon={<Search />}
        placeholder="搜索组件…"
        suffix={
          <kbd className="grid h-5 min-w-5 place-items-center rounded-sm border border-edge bg-background px-1 font-mono text-[11px] text-muted-foreground">
            /
          </kbd>
        }
      />
    </div>
  )
}
