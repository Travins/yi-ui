"use client"
import { RotateCcw, Search } from "lucide-react"
import { BarField } from "@/registry/ui/bar-field/bar-field"
import { BarSelect } from "@/registry/ui/bar-select/bar-select"
import {
  GridToolbar,
  GridToolbarItem,
} from "@/registry/ui/grid-toolbar/grid-toolbar"
import { Button } from "@/components/ui/button"

/**
 * 窄容器：搜索格 `fullOnNarrow` 独占第一行，两个下拉带 `grow` 在第二行平分，
 * 最右边是直接放进格子的 `Button`，自动成为方形的按钮格。容器宽于 40rem 时所有格同排。
 */
export default function GridToolbarNarrowDemo() {
  return (
    <div data-slot="grid-toolbar-narrow-demo" className="w-full max-w-xs">
      <GridToolbar aria-label="项目筛选">
        <GridToolbarItem grow fullOnNarrow>
          <BarField
            aria-label="搜索"
            icon={<Search />}
            type="search"
            placeholder="搜索项目…"
          />
        </GridToolbarItem>
        <GridToolbarItem grow className="basis-24">
          <BarSelect
            aria-label="状态"
            placeholder="状态"
            options={[
              { value: "active", label: "进行中" },
              { value: "done", label: "已完成" },
            ]}
          />
        </GridToolbarItem>
        <GridToolbarItem grow className="basis-24">
          <BarSelect
            aria-label="负责人"
            placeholder="负责人"
            options={[
              { value: "lin", label: "林小满" },
              { value: "chen", label: "陈青" },
            ]}
          />
        </GridToolbarItem>
        <GridToolbarItem>
          <Button variant="ghost" size="icon-lg" aria-label="重置筛选">
            <RotateCcw />
          </Button>
        </GridToolbarItem>
      </GridToolbar>
    </div>
  )
}
