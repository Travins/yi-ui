"use client"

import { Search } from "lucide-react"
import { BarField } from "@/registry/ui/bar-field/bar-field"

const kbd = (
  <kbd className="grid h-5 min-w-5 place-items-center rounded-sm border border-edge bg-background px-1 font-mono text-[11px] text-muted-foreground">
    /
  </kbd>
)

export default function BarFieldSearchDemo() {
  return (
    <div data-slot="bar-field-search-demo" className="w-full max-w-sm space-y-4 rounded-xl border border-edge bg-background p-4 shadow-xs">
      <BarField
        type="search"
        label="搜索"
        icon={<Search />}
        placeholder="组件名称"
        defaultValue="网格布局"
      />
      <BarField
        type="search"
        aria-label="搜索组件"
        icon={<Search />}
        placeholder="搜索组件…"
        suffix={kbd}
      />
    </div>
  )
}
