"use client"
import * as React from "react"
import { flexRender } from "@tanstack/react-table"
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { columnTitle } from "./column-title"
import { DataTableCell } from "./data-table-cell"
import type { DataTableController } from "./use-data-table"
import type { DataTableMeta } from "./types"

type DataTableDetailProps<T> = {
  state: DataTableController<T>
}

/** 行详情抽屉：宽屏从右侧滑出，窄屏从底部升起，可就地编辑字段 */
function DataTableDetail<T>({ state }: DataTableDetailProps<T>) {
  "use no memo"
  const { labels, detail, desktop, setDetailId, commitCell } = state
  return (
    <Sheet
      open={!!detail}
      onOpenChange={(open) => {
        if (!open) setDetailId(null)
      }}
    >
      <SheetContent
        side={desktop ? "right" : "bottom"}
        className="max-h-[85dvh] overflow-auto p-6 sm:max-h-none"
      >
        <SheetTitle>
          {String(detail?.getAllCells()[0]?.getValue() ?? "")}
        </SheetTitle>
        <SheetDescription>{labels.detailDescription}</SheetDescription>
        <div className="divide-y divide-dashed divide-edge">
          {detail?.getAllCells().map((cell) => (
            <div key={cell.id} className="py-3">
              <p className="mb-1 text-xs text-muted-foreground">
                {columnTitle(cell.column)}
              </p>
              <DataTableCell
                value={cell.getValue()}
                row={detail.original}
                meta={cell.column.columnDef.meta as DataTableMeta<T>}
                title={columnTitle(cell.column)}
                labels={labels}
                cellKey={cell.column.id}
                rowHeight={52}
                onCommit={(value) =>
                  commitCell(detail.id, cell.column.id, value)
                }
              >
                {(cell.column.columnDef.meta as DataTableMeta<T>)?.detailCell?.(
                  cell.getValue(),
                  detail.original,
                ) ?? flexRender(cell.column.columnDef.cell, cell.getContext())}
              </DataTableCell>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  )
}

export { DataTableDetail }
