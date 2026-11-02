"use client"
import * as React from "react"
import { BarSelect } from "@/registry/ui/bar-select/bar-select"
const options = [
  { value: "lin", label: "林小满", count: 22 },
  { value: "chen", label: "陈青", count: 21 },
  { value: "zhou", label: "周远", count: 21, group: "已离职" },
]
export default function BarSelectDemo() {
  return (
    <div data-slot="bar-select-demo" className="w-full max-w-sm rounded-xl border border-edge bg-background p-4 shadow-xs">
      <BarSelect label="负责人" defaultValue="lin" options={options} />
    </div>
  )
}
