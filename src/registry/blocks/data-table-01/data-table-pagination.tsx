"use client"
import type { Table } from "@tanstack/react-table"
import { GridPagination } from "@/registry/ui/grid-pagination/grid-pagination"
import type { DataTableLabels } from "./types"
function DataTablePagination<T>({
  table,
  labels,
  virtual,
  count,
}: {
  table: Table<T>
  labels: DataTableLabels
  virtual: boolean
  count: number
}) {
  "use no memo"
  const { pageIndex, pageSize } = table.getState().pagination
  return (
    // 翻页贴在表格底部：先隔一条点阵小带，再是翻页行；左右与底边沿用表格外框
    <div data-slot="data-table-pagination" className="border-t border-edge">
      <div
        aria-hidden="true"
        data-slot="data-table-pagination-band"
        className="h-4 border-b border-edge bg-dots"
      />
      {virtual ? (
        <p className="flex h-9 items-center px-3 font-mono text-xs text-muted-foreground tabular-nums pointer-coarse:h-11">
          {labels.rowTotal(count)}
        </p>
      ) : (
        <GridPagination
          bordered={false}
          page={pageIndex + 1}
          pageCount={table.getPageCount()}
          total={count}
          pageSize={pageSize}
          pageSizes={[10, 20, 50, 100]}
          jumper
          siblings={1}
          labels={{
            first: labels.first,
            previous: labels.previous,
            next: labels.next,
            last: labels.last,
            perPage: labels.perPage,
            jump: labels.jump,
            jumpInput: labels.jumpInput,
            jumpTrigger: labels.jumpTrigger,
          }}
          onPageChange={(page) => table.setPageIndex(page - 1)}
          onPageSizeChange={(size) => {
            table.setPageSize(size)
            table.setPageIndex(0)
          }}
        />
      )}
    </div>
  )
}
export { DataTablePagination }
