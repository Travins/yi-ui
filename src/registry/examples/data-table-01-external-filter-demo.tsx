"use client"
import * as React from "react"
import type { PaginationState } from "@tanstack/react-table"
import { DataTable } from "@/registry/blocks/data-table-01/data-table"
import {
  datasets,
  columns,
  getRowId,
} from "@/registry/blocks/data-table-01/page"
import { BarSelect } from "@/registry/ui/bar-select/bar-select"
import { GridToolbarItem } from "@/registry/ui/grid-toolbar/grid-toolbar"

const owners = ["林小满", "陈青", "周远"]
const statuses = ["进行中", "已归档", "待审核"]
// 窄容器里这两格在第二行平分；宽容器里各占固定宽度
const itemClass = "basis-28 grow @min-[40rem]:w-36 @min-[40rem]:flex-none"

/**
 * 外部筛选：筛选状态放在页面里（服务端分页的常见写法），通过 toolbar 插槽放进工具栏。
 * 示例数据里负责人和状态是一一对应的，选「林小满 + 已归档」会得到空结果，
 * 此时空状态的「清除筛选」会重置这两个外部筛选。
 */
export default function ExternalFilterDemo() {
  const [owner, setOwner] = React.useState<string | null>(null)
  const [status, setStatus] = React.useState<string | null>(null)
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })
  const [globalFilter, setGlobalFilter] = React.useState("")
  const matched = datasets.filter(
    (row) =>
      (!owner || row.owner === owner) &&
      (!status || row.status === status) &&
      row.name.includes(globalFilter),
  )
  const reset = (change: () => void) => {
    change()
    setPagination((previous) => ({ ...previous, pageIndex: 0 }))
  }
  return (
    <div data-slot="data-table-external-filter-demo" className="w-full">
      <DataTable
        mode="manual"
        columns={columns}
        getRowId={getRowId}
        data={matched.slice(
          pagination.pageIndex * pagination.pageSize,
          (pagination.pageIndex + 1) * pagination.pageSize,
        )}
        rowCount={matched.length}
        pagination={pagination}
        onPaginationChange={setPagination}
        globalFilter={globalFilter}
        onGlobalFilterChange={setGlobalFilter}
        // 外部筛选生效时告诉表格，空状态才会显示「清除筛选」
        filtered={!!owner || !!status}
        onClearFilters={() => {
          setOwner(null)
          setStatus(null)
        }}
        toolbar={
          <>
            <GridToolbarItem className={itemClass}>
              <BarSelect
                aria-label="负责人"
                placeholder="全部负责人"
                contentClassName="[&_*]:text-xs"
                value={owner}
                options={owners.map((value) => ({ value, label: value }))}
                onValueChange={(value) => reset(() => setOwner(value))}
              />
            </GridToolbarItem>
            <GridToolbarItem className={itemClass}>
              <BarSelect
                aria-label="状态"
                placeholder="全部状态"
                contentClassName="[&_*]:text-xs"
                value={status}
                options={statuses.map((value) => ({ value, label: value }))}
                onValueChange={(value) => reset(() => setStatus(value))}
              />
            </GridToolbarItem>
          </>
        }
      />
    </div>
  )
}
