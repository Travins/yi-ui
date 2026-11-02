"use client"
import * as React from "react"
import { BarSelect } from "@/registry/ui/bar-select/bar-select"
const options = [
  { value: "lin", label: "林小满", count: 22 },
  { value: "chen", label: "陈青", count: 21 },
  { value: "member-1", label: "许知夏", count: 3 },
  { value: "member-2", label: "陆川", count: 6 },
  { value: "member-3", label: "沈禾", count: 9 },
  { value: "member-4", label: "顾南", count: 12 },
  { value: "member-5", label: "唐悦", count: 15 },
  { value: "member-6", label: "宋宁", count: 18 },
  { value: "zhou", label: "周远", count: 21, group: "已离职" },
]
export default function BarSelectDemo() {
  return (
    <div data-slot="bar-select-demo" className="w-full max-w-sm rounded-xl border border-edge bg-background p-4 shadow-xs">
      <BarSelect
        multiple
        label="负责人"
        defaultValue={["lin", "chen"]}
        options={options}
      />
    </div>
  )
}
