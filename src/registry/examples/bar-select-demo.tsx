"use client"

import * as React from "react"
import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { BarSelect } from "@/registry/ui/bar-select/bar-select"

const owners = [
  { value: "lin", label: "林小满", count: 22 },
  { value: "chen", label: "陈青", count: 21 },
  { value: "zhou", label: "周远", count: 8, group: "已离职" },
]
const statuses = [
  {
    value: "ready",
    label: "已就绪",
    icon: <span className="size-2 rounded-full bg-(--flow-green)" />,
  },
  {
    value: "pending",
    label: "待处理",
    icon: <span className="size-2 rounded-full bg-(--flow-amber)" />,
  },
]

export default function BarSelectDemo() {
  const [status, setStatus] = React.useState<string | null>("ready")
  const [selected, setSelected] = React.useState(["lin", "chen"])
  const [exported, setExported] = React.useState(false)
  const count = owners
    .filter((owner) => !selected.length || selected.includes(owner.value))
    .reduce((sum, owner) => sum + owner.count, 0)
  const total =
    status === "pending"
      ? Math.floor(count / 3)
      : status
        ? count
        : count + Math.floor(count / 3)
  return (
    <section
      data-slot="bar-select-demo"
      className="w-full max-w-sm rounded-xl border border-edge bg-background p-4 shadow-xs"
    >
      <h3 className="text-sm font-medium">导出数据集</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        选择范围，生成一份可归档的数据副本。
      </p>
      <div
        className="my-5 flex flex-col gap-3"
        onChangeCapture={() => setExported(false)}
      >
        <BarSelect
          label="状态"
          value={status}
          onValueChange={(value) => {
            setStatus(value)
            setExported(false)
          }}
          options={statuses}
        />
        <BarSelect
          multiple
          label="负责人"
          value={selected}
          onValueChange={(value) => {
            setSelected(value)
            setExported(false)
          }}
          options={owners}
        />
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-dashed border-edge pt-4">
        <p role="status" className="text-xs text-muted-foreground">
          {exported ? `已导出 ${total} 条` : `将导出 ${total} 条`}
        </p>
        <Button
          onClick={() => {
            const file = new Blob(
              [
                "负责人,状态\n" +
                  Array.from({ length: total }, (_, index) => {
                    const available = owners.filter(
                      (owner) =>
                        !selected.length || selected.includes(owner.value),
                    )
                    const owner = available[index % available.length]
                    return `${owner?.label ?? "未分配"},${statuses.find((item) => item.value === status)?.label ?? "全部"}`
                  }).join("\n"),
              ],
              { type: "text/csv;charset=utf-8" },
            )
            const url = URL.createObjectURL(file)
            const link = document.createElement("a")
            link.href = url
            link.download = "数据集.csv"
            link.click()
            URL.revokeObjectURL(url)
            setExported(true)
          }}
        >
          <Download />
          导出
        </Button>
      </div>
    </section>
  )
}
