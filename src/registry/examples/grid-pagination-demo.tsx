"use client"
import * as React from "react"
import { GridPagination } from "@/registry/ui/grid-pagination/grid-pagination"
const TOTAL = 128
const names = [
  "林小满",
  "陈青",
  "周远",
  "许知夏",
  "陆川",
  "沈禾",
  "顾南",
  "唐悦",
]
export default function GridPaginationDemo() {
  const [page, setPage] = React.useState(7)
  const [pageSize, setPageSize] = React.useState(5)
  return (
    <section
      data-slot="grid-pagination-demo"
      className="w-full max-w-3xl overflow-hidden rounded-xl border border-edge bg-background shadow-xs"
    >
      <header className="flex justify-between border-b border-edge px-4 py-3">
        <h3 className="text-sm font-medium">成员列表</h3>
        <span className="text-xs text-muted-foreground">共 128 位成员</span>
      </header>
      <div aria-live="polite">
        {Array.from(
          { length: Math.min(pageSize, TOTAL - (page - 1) * pageSize) },
          (_, index) => {
            const id = (page - 1) * pageSize + index
            return (
              <div
                key={id}
                className="flex items-center gap-3 border-b border-dashed border-edge px-4 py-3 last:border-b-0"
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs text-primary">
                  {(names[id % names.length] ?? "").slice(0, 1)}
                </span>
                <span className="flex-1 text-sm">
                  {names[id % names.length]}
                </span>
                <span className="font-mono text-xs text-muted-foreground">
                  成员 {String(id + 1).padStart(3, "0")}
                </span>
              </div>
            )
          },
        )}
      </div>
      <div className="border-t border-edge">
        <GridPagination
          bordered={false}
          defaultPage={7}
          page={page}
          onPageChange={setPage}
          pageCount={Math.ceil(TOTAL / pageSize)}
          total={TOTAL}
          pageSize={pageSize}
          pageSizes={[5, 10, 20]}
          onPageSizeChange={(size) => {
            setPageSize(size)
            setPage(1)
          }}
        />
      </div>
    </section>
  )
}
