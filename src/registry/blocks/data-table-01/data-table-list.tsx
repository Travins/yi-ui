"use client"
import * as React from "react"
import { Inbox } from "lucide-react"
import { flexRender } from "@tanstack/react-table"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import { MOBILE_LIST_BATCH } from "./config"
import type { DataTableController } from "./use-data-table"
import type { DataTableProps } from "./types"

type DataTableListProps<T> = {
  state: DataTableController<T>
  virtualization: DataTableProps<T>["virtualization"]
  rowActions: DataTableProps<T>["rowActions"]
  statusFilter: DataTableProps<T>["statusFilter"]
  loading: DataTableProps<T>["loading"]
  error: DataTableProps<T>["error"]
  onRetry: DataTableProps<T>["onRetry"]
}

/** 窄屏卡片列表：一行一张卡片，点击打开详情，长按进入选择 */
function DataTableList<T>({
  state,
  virtualization,
  rowActions,
  statusFilter,
  loading,
  error,
  onRetry,
}: DataTableListProps<T>) {
  "use no memo"
  const {
    labels,
    rows,
    pagination,
    hasFilter,
    listLabel,
    listLimit,
    setListLimit,
    setDetailId,
    clearFilters,
  } = state
  const longPress = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  return (
    <ul
      data-slot="data-table-list"
      aria-label={listLabel}
      className="border-t border-edge @min-[40rem]:hidden"
    >
      {loading ? (
        Array.from({ length: pagination.pageSize }, (_, index) => (
          <li
            key={index}
            className="flex gap-4 border-b border-dashed border-edge p-4"
          >
            <span className="font-mono">–</span>
            <Skeleton className="h-10 flex-1" />
          </li>
        ))
      ) : !rows.length || error ? (
        <li className="bg-dots p-10 text-center">
          <Inbox aria-hidden="true" className="mx-auto mb-3 size-6" />
          <p>{error || (hasFilter ? labels.noResults : labels.empty)}</p>
          {(error ? onRetry : hasFilter) && (
            <Button variant="outline" onClick={error ? onRetry : clearFilters}>
              {error ? labels.retry : labels.clearFilters}
            </Button>
          )}
        </li>
      ) : (
        (virtualization ? rows.slice(0, listLimit) : rows).map((row, index) => {
          const cells = row.getAllCells()
          const name = cells[0]
          const status = cells.find(
            (cell) => cell.column.id === statusFilter?.columnId,
          )
          const rest = cells
            .filter((cell) => cell !== name && cell !== status)
            .slice(0, 3)
          return (
            <li
              key={row.id}
              className={cn(
                "group/row flex border-b border-dashed border-edge last:border-b-0",
                row.getIsSelected() && "bg-primary/[0.04]",
              )}
            >
              <div
                className={cn(
                  "group/number relative flex w-10 shrink-0 items-center justify-center border-r border-dashed border-edge",
                  row.getIsSelected()
                    ? "bg-hatch"
                    : "focus-within:bg-dots hover:bg-dots",
                )}
                onPointerDown={() => {
                  longPress.current = setTimeout(
                    () => row.toggleSelected(true),
                    500,
                  )
                }}
                onPointerUp={() => {
                  if (longPress.current) clearTimeout(longPress.current)
                }}
                onPointerCancel={() => {
                  if (longPress.current) clearTimeout(longPress.current)
                }}
                onPointerLeave={() => {
                  if (longPress.current) clearTimeout(longPress.current)
                }}
              >
                {row.getIsSelected() && (
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-y-0 left-0 w-0.5 bg-primary"
                  />
                )}
                <span
                  aria-hidden="true"
                  className={cn(
                    "font-mono text-[10px] text-muted-foreground group-focus-within/number:opacity-0 group-hover/number:opacity-0",
                    row.getIsSelected() && "opacity-0",
                  )}
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                <Checkbox
                  aria-label={labels.selectRow + " " + (index + 1)}
                  checked={row.getIsSelected()}
                  onCheckedChange={(value) => row.toggleSelected(!!value)}
                  className={cn(
                    "absolute opacity-0 group-focus-within/number:opacity-100 group-hover/number:opacity-100",
                    row.getIsSelected() && "opacity-100",
                  )}
                />
              </div>
              <button
                type="button"
                className="min-w-0 flex-1 p-3 text-left focus-visible:outline-2 focus-visible:outline-ring"
                onClick={() => setDetailId(row.id)}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate font-medium">
                    {String(name?.getValue() ?? "")}
                  </span>
                  <span className="shrink-0 text-xs">
                    {status &&
                      flexRender(
                        status.column.columnDef.cell,
                        status.getContext(),
                      )}
                  </span>
                </span>
                <span className="mt-2 flex items-center gap-3 font-mono text-[10px] text-muted-foreground">
                  {rest.map((cell, index) => (
                    <span
                      key={cell.id}
                      className={index === rest.length - 1 ? "ml-auto" : ""}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </span>
                  ))}
                </span>
              </button>
              {rowActions && (
                <div className="flex shrink-0 items-center pr-2">
                  {rowActions(row.original)}
                </div>
              )}
            </li>
          )
        })
      )}
      {virtualization && !loading && !error && rows.length > listLimit && (
        <li className="p-4">
          <Button
            variant="outline"
            size="lg"
            className="w-full"
            onClick={() => setListLimit((limit) => limit + MOBILE_LIST_BATCH)}
          >
            {labels.showMore(rows.length - listLimit)}
          </Button>
        </li>
      )}
    </ul>
  )
}

export { DataTableList }
