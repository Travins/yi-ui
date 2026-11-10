"use client"
import { X } from "lucide-react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { Button } from "@/components/ui/button"
import type { DataTableController } from "./use-data-table"
import type { DataTableProps } from "./types"

type DataTableBulkBarProps<T> = {
  state: DataTableController<T>
  data: DataTableProps<T>["data"]
  rowCount: DataTableProps<T>["rowCount"]
  bulkActions: DataTableProps<T>["bulkActions"]
  onSelectAll: DataTableProps<T>["onSelectAll"]
}

/** 选中行后浮在表格底部的批量操作条 */
function DataTableBulkBar<T>({
  state,
  data,
  rowCount,
  bulkActions,
  onSelectAll,
}: DataTableBulkBarProps<T>) {
  "use no memo"
  const { labels, table, selected, setRowSelection } = state
  const reducedMotion = useReducedMotion()
  return (
    <AnimatePresence>
      {selected > 0 && (
        <motion.div
          role="toolbar"
          aria-label="批量操作"
          initial={{ opacity: 0, y: reducedMotion ? 0 : 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: reducedMotion ? 0 : 12 }}
          transition={{ duration: 0.18 }}
          // 高度 2.75rem，用负的上边距抵消占位：浮在表格底部，不把分页栏往下推
          className="sticky bottom-4 z-40 mx-auto -mt-14 mb-3 flex h-11 w-fit max-w-[calc(100%-2rem)] flex-nowrap items-center gap-1 rounded-lg bg-foreground p-1 pl-3 text-sm whitespace-nowrap text-background shadow-lg"
        >
          <span aria-live="polite" className="shrink-0 font-mono">
            {labels.selected} {selected}
            <span className="hidden @min-[40rem]:inline">
              {" "}
              / {rowCount ?? data.length}
            </span>
          </span>
          {selected < (rowCount ?? data.length) && (
            <Button
              variant="ghost"
              className="shrink-0 px-2 font-normal text-background/70 hover:bg-background/15 hover:text-background"
              onClick={() =>
                onSelectAll ? onSelectAll() : table.toggleAllRowsSelected(true)
              }
            >
              <span className="hidden @min-[40rem]:inline">
                {labels.selectAll} {rowCount ?? data.length} {labels.items}
              </span>
              <span className="@min-[40rem]:hidden">
                {labels.selectAllCompact} {rowCount ?? data.length}
              </span>
            </Button>
          )}
          <span aria-hidden="true" className="mx-1 h-5 w-px bg-background/20" />
          {/* 反色操作坞：覆盖按钮配色保持对比；窄容器只留图标（文字放在 data-label 里） */}
          <div className="flex shrink-0 gap-1 [&_[data-label]]:hidden @min-[40rem]:[&_[data-label]]:inline [&_button]:text-background [&_button:hover]:bg-background/15 [&_button:hover]:text-background">
            {bulkActions?.(
              table.getSelectedRowModel().rows.map((row) => row.original),
            )}
          </div>
          <span aria-hidden="true" className="mx-1 h-5 w-px bg-background/20" />
          <Button
            size="icon"
            variant="ghost"
            aria-label={labels.clear}
            className="shrink-0 text-background/70 hover:bg-background/15 hover:text-background"
            onClick={() => setRowSelection({})}
          >
            <X />
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export { DataTableBulkBar }
