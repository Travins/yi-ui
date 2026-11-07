"use client"
import { Button } from "@/components/ui/button"
import { BarSelect } from "@/registry/ui/bar-select/bar-select"
import {
  GridToolbar,
  GridToolbarItem,
} from "@/registry/ui/grid-toolbar/grid-toolbar"
import { SegmentedControl } from "@/registry/ui/segmented-control/segmented-control"
import { List, LayoutGrid, Download } from "lucide-react"
export default function GridToolbarGroupsDemo() {
  return (
    <div data-slot="grid-toolbar-groups-demo" className="w-full max-w-xl">
      <GridToolbar aria-label="列表操作">
        <GridToolbarItem>
          <SegmentedControl
            iconOnly
            aria-label="视图"
            defaultValue="list"
            options={[
              { value: "list", label: "列表", icon: <List /> },
              { value: "grid", label: "网格", icon: <LayoutGrid /> },
            ]}
          />
        </GridToolbarItem>
        <GridToolbarItem grow>
          <BarSelect
            label="排序"
            clearable={false}
            defaultValue="updated"
            options={[
              { value: "updated", label: "最近更新" },
              { value: "name", label: "名称" },
            ]}
          />
        </GridToolbarItem>
        <GridToolbarItem separator="solid">
          <Button
            size="lg"
            variant="ghost"
            onClick={() => {
              const link = document.createElement("a")
              link.href =
                "data:text/csv;charset=utf-8,名称%2C更新时间%0A示例项目%2C2026-10-01"
              link.download = "项目.csv"
              link.click()
            }}
          >
            <Download />
            导出
          </Button>
        </GridToolbarItem>
      </GridToolbar>
    </div>
  )
}
