"use client"

import { Search } from "lucide-react"
import { BarField } from "@/registry/ui/bar-field/bar-field"

export default function BarFieldSearchDemo() {
  return (
    <div data-slot="bar-field-search-demo" className="w-full max-w-sm">
      <BarField
        type="search"
        label="搜索"
        icon={<Search />}
        placeholder="组件名称"
        defaultValue="网格布局"
      />
    </div>
  )
}
