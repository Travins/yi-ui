"use client"
import * as React from "react"
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Minus,
  Inbox,
  SearchX,
  AlertCircle,
} from "lucide-react"
import { flexRender } from "@tanstack/react-table"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Empty,
  EmptyTitle,
  EmptyMedia,
  EmptyHeader,
  EmptyDescription,
} from "@/components/ui/empty"
import { DataTableCell } from "./data-table-cell"
import type { DataTableController } from "./use-data-table"
import type { DataTableProps, DataTableMeta } from "./types"

type DataTableGridProps<T> = {
  state: DataTableController<T>
  virtualization: DataTableProps<T>["virtualization"]
  rowActions: DataTableProps<T>["rowActions"]
  loading: DataTableProps<T>["loading"]
  error: DataTableProps<T>["error"]
  onRetry: DataTableProps<T>["onRetry"]
}

/** 桌面表格主体：表头、表体、加载 / 错误 / 空状态与虚拟滚动 */
function DataTableGrid<T>({
  state,
  virtualization,
  rowActions,
  loading,
  error,
  onRetry,
}: DataTableGridProps<T>) {
  "use no memo"
  const {
    labels,
    table,
    rows,
    items,
    shown,
    virtualizer,
    displayData,
    pagination,
    count,
    span,
    pinned,
    hasFilter,
    listLabel,
    density,
    scrolled,
    setScrolled,
    scrollRef,
    commitCell,
    clearFilters,
  } = state
  return (
    <div
      ref={scrollRef}
      data-slot="data-table-scroll"
      data-scrolled={scrolled}
      onScroll={(event) => setScrolled(event.currentTarget.scrollLeft > 0)}
      className="relative hidden w-full max-w-full min-w-0 overflow-auto border-t border-edge @min-[40rem]:block"
      style={{
        height: virtualization ? (virtualization.height ?? 480) : undefined,
        maxHeight: virtualization ? undefined : 600,
      }}
    >
      <table
        aria-label={listLabel}
        aria-rowcount={count + 1}
        // 最后一行不画虚线，底边由分页栏的实线收口，避免虚线 + 实线叠成两道
        className="table-fixed border-separate border-spacing-0 text-sm [&>tbody>tr:last-child>td]:border-b-0"
        style={
          {
            width: "100%",
            minWidth: table.getTotalSize() + 40 + (rowActions ? 64 : 0),
            "--data-table-row-height": density + "px",
          } as React.CSSProperties
        }
      >
        <colgroup>
          <col style={{ width: 40 }} />
          {table.getVisibleLeafColumns().map((column) => (
            <col
              key={column.id}
              style={{
                width:
                  column.id === table.getVisibleLeafColumns()[0]?.id
                    ? undefined
                    : column.getSize(),
              }}
            />
          ))}
          {rowActions && <col style={{ width: 64 }} />}
        </colgroup>
        <thead className="sticky top-0 z-20 bg-muted/50 [&_th]:border-b [&_th]:border-edge">
          <tr>
            <th className="sticky left-0 z-30 w-12 bg-muted/50 px-3">
              <span className="relative flex size-4">
                <Checkbox
                  className={
                    table.getIsSomePageRowsSelected()
                      ? "border-primary bg-primary dark:bg-primary [&_[data-slot=checkbox-indicator]]:invisible"
                      : undefined
                  }
                  aria-label={labels.selectPage}
                  checked={table.getIsAllPageRowsSelected()}
                  indeterminate={table.getIsSomePageRowsSelected()}
                  onCheckedChange={(value) =>
                    table.toggleAllPageRowsSelected(!!value)
                  }
                />
                {table.getIsSomePageRowsSelected() && (
                  <Minus
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 size-4 text-primary-foreground"
                  />
                )}
              </span>
            </th>
            {table.getHeaderGroups()[0]?.headers.map((header, i, all) => (
              <th
                key={header.id}
                aria-sort={
                  header.column.getIsSorted() === "asc"
                    ? "ascending"
                    : header.column.getIsSorted() === "desc"
                      ? "descending"
                      : "none"
                }
                className={cn(
                  "relative bg-muted/50 px-3 text-left",
                  // 与表体一致：操作列前的分隔线画在最后一个数据列的右边
                  rowActions &&
                    i === all.length - 1 &&
                    "border-r [border-right-style:dashed] border-edge",
                  header.id === pinned && "sticky left-10 z-30",
                  header.id === pinned &&
                    scrolled &&
                    "shadow-[4px_0_6px_-4px_var(--border)]",
                )}
                style={{
                  width: header.index === 0 ? undefined : header.getSize(),
                  minWidth: header.index === 0 ? undefined : header.getSize(),
                }}
              >
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start px-0",
                    (header.column.columnDef.meta as DataTableMeta<T>)
                      ?.align === "right" && "justify-end",
                  )}
                  disabled={!header.column.getCanSort()}
                  onClick={header.column.getToggleSortingHandler()}
                >
                  {flexRender(
                    header.column.columnDef.header,
                    header.getContext(),
                  )}{" "}
                  {header.column.getCanSort() &&
                    (header.column.getIsSorted() === "asc" ? (
                      <ArrowUp aria-hidden="true" className="size-3.5" />
                    ) : header.column.getIsSorted() === "desc" ? (
                      <ArrowDown aria-hidden="true" className="size-3.5" />
                    ) : (
                      <ArrowUpDown
                        aria-hidden="true"
                        className="size-3.5 text-muted-foreground"
                      />
                    ))}
                </Button>
                <div
                  role="separator"
                  aria-label={String(header.column.columnDef.header)}
                  aria-orientation="vertical"
                  aria-valuenow={header.getSize()}
                  aria-valuemin={80}
                  aria-valuemax={600}
                  tabIndex={0}
                  onMouseDown={header.getResizeHandler()}
                  onKeyDown={(event) => {
                    if (["ArrowLeft", "ArrowRight"].includes(event.key)) {
                      event.preventDefault()
                      table.setColumnSizing((old) => ({
                        ...old,
                        [header.id]: Math.max(
                          80,
                          Math.min(
                            600,
                            header.getSize() +
                              (event.key === "ArrowRight" ? 16 : -16),
                          ),
                        ),
                      }))
                    }
                  }}
                  className="absolute inset-y-0 right-0 w-2 cursor-col-resize select-none focus-visible:bg-primary focus-visible:outline-2 pointer-coarse:hidden"
                />
              </th>
            ))}
            {rowActions && (
              <th className="w-16 bg-muted text-center text-xs font-medium">
                {labels.actions}
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: pagination.pageSize }, (_, i) => (
              <tr key={i}>
                {Array.from({ length: span }, (_, j) => (
                  <td key={j} className="p-3">
                    {j === 0 ? (
                      <span className="font-mono text-muted-foreground">–</span>
                    ) : (
                      <Skeleton className="h-4 w-full" />
                    )}
                  </td>
                ))}
              </tr>
            ))
          ) : error ? (
            <tr>
              <td colSpan={span}>
                <Empty className="sticky left-0 min-h-60 w-[100cqw] max-w-full bg-dots">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <AlertCircle aria-hidden="true" />
                    </EmptyMedia>
                    <EmptyTitle>{error}</EmptyTitle>
                    <EmptyDescription>
                      {labels.errorDescription}
                    </EmptyDescription>
                  </EmptyHeader>
                  {onRetry && <Button onClick={onRetry}>{labels.retry}</Button>}
                </Empty>
              </td>
            </tr>
          ) : !rows.length ? (
            <tr>
              <td colSpan={span}>
                <Empty className="sticky left-0 min-h-60 w-[100cqw] max-w-full bg-dots">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      {hasFilter ? (
                        <SearchX aria-hidden="true" />
                      ) : (
                        <Inbox aria-hidden="true" />
                      )}
                    </EmptyMedia>
                    <EmptyTitle>
                      {hasFilter ? labels.noResults : labels.empty}
                    </EmptyTitle>
                    <EmptyDescription>
                      {hasFilter
                        ? labels.noResultsDescription
                        : labels.emptyDescription}
                    </EmptyDescription>
                  </EmptyHeader>
                  {hasFilter && (
                    <Button variant="outline" onClick={clearFilters}>
                      {labels.clearFilters}
                    </Button>
                  )}
                </Empty>
              </td>
            </tr>
          ) : (
            <>
              {!!virtualization && items.length > 0 && (
                <tr aria-hidden="true">
                  <td colSpan={span} style={{ height: items[0]?.start }} />
                </tr>
              )}
              {shown.map(({ row, index }) => (
                <tr
                  key={row.id}
                  data-row-id={row.id}
                  onKeyDown={(event) => {
                    if (
                      (event.shiftKey && event.key === "F10") ||
                      event.key === "ContextMenu"
                    ) {
                      const trigger =
                        event.currentTarget.querySelector<HTMLButtonElement>(
                          '[data-slot="data-table-row-actions"] button',
                        )
                      if (trigger) {
                        event.preventDefault()
                        trigger.click()
                      }
                    }
                  }}
                  aria-rowindex={
                    virtualization
                      ? index + 2
                      : pagination.pageIndex * pagination.pageSize + index + 2
                  }
                  className="group/row"
                  data-state={row.getIsSelected() ? "selected" : undefined}
                >
                  <td
                    className={cn(
                      "group/number sticky left-0 z-10 w-10 border-r border-b border-dashed border-edge px-3",
                      row.getIsSelected()
                        ? "bg-primary/[0.04]"
                        : "bg-background",
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "pointer-events-none absolute inset-0",
                        row.getIsSelected()
                          ? "border-l-2 border-primary bg-hatch"
                          : "group-focus-within/number:bg-dots group-hover/row:bg-dots",
                      )}
                    />
                    <span
                      aria-hidden="true"
                      className={cn(
                        "absolute inset-0 flex items-center justify-center font-mono text-[10px] text-muted-foreground group-focus-within/number:opacity-0 group-hover/row:opacity-0",
                        row.getIsSelected() && "opacity-0",
                      )}
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <Checkbox
                      className={cn(
                        "relative opacity-0 group-focus-within/number:opacity-100 group-hover/row:opacity-100",
                        row.getIsSelected() && "opacity-100",
                      )}
                      aria-label={labels.selectRow + " " + (index + 1)}
                      checked={row.getIsSelected()}
                      onCheckedChange={(value) => row.toggleSelected(!!value)}
                    />
                  </td>
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      style={{
                        height: Number(density),
                        width:
                          cell.column.id ===
                          table.getVisibleLeafColumns()[0]?.id
                            ? undefined
                            : cell.column.getSize(),
                        maxWidth:
                          cell.column.id ===
                          table.getVisibleLeafColumns()[0]?.id
                            ? undefined
                            : cell.column.getSize(),
                        textAlign: (
                          cell.column.columnDef.meta as DataTableMeta<T>
                        )?.align,
                      }}
                      className={cn(
                        "border-r border-b border-dashed border-edge px-3 py-0",
                        (cell.column.columnDef.meta as DataTableMeta<T>)
                          ?.align === "right" && "font-mono tabular-nums",
                        row.getIsSelected()
                          ? "bg-primary/[0.04]"
                          : "bg-background",
                        cell.column.id === pinned && "sticky left-10 z-10",
                        cell.column.id === pinned &&
                          scrolled &&
                          "shadow-[4px_0_6px_-4px_var(--border)]",
                      )}
                    >
                      <DataTableCell
                        value={cell.getValue()}
                        row={row.original}
                        meta={cell.column.columnDef.meta as DataTableMeta<T>}
                        title={String(cell.column.columnDef.header)}
                        labels={labels}
                        cellKey={cell.column.id}
                        rowHeight={Number(density)}
                        onCommit={(value) =>
                          commitCell(row.id, cell.column.id, value)
                        }
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                        {(cell.column.columnDef.meta as DataTableMeta<T>)
                          ?.bar && (
                          <span
                            aria-hidden="true"
                            className="mt-2 block h-0.5 bg-edge"
                          >
                            <span
                              className="block h-full bg-primary/70"
                              style={{
                                width:
                                  Math.max(
                                    0,
                                    Math.min(
                                      100,
                                      (Number(cell.getValue()) /
                                        Math.max(
                                          1,
                                          (
                                            cell.column.columnDef
                                              .meta as DataTableMeta<T>
                                          )?.max ??
                                            Math.max(
                                              ...displayData.map(
                                                (row) =>
                                                  Number(
                                                    (
                                                      row as Record<
                                                        string,
                                                        unknown
                                                      >
                                                    )[cell.column.id],
                                                  ) || 0,
                                              ),
                                            ),
                                        )) *
                                        100,
                                    ),
                                  ) + "%",
                              }}
                            />
                          </span>
                        )}
                      </DataTableCell>
                    </td>
                  ))}
                  {rowActions && (
                    <td className="w-16 border-b border-dashed border-edge text-center">
                      {/* 左侧分隔线由前一格的 border-r 提供（表头同理），这里不再画 */}
                      {/* 操作按钮常驻显示（淡色），悬停行时加深 */}
                      {rowActions(row.original)}
                    </td>
                  )}
                </tr>
              ))}
              {/* 分页模式下最后一页不足一页时用空白补齐高度，翻页时分页条不会上下跳 */}
              {!virtualization &&
                table.getPageCount() > 1 &&
                rows.length < pagination.pageSize && (
                  <tr aria-hidden="true" data-slot="data-table-filler">
                    <td
                      colSpan={span}
                      style={{
                        height:
                          (pagination.pageSize - rows.length) * Number(density),
                      }}
                    />
                  </tr>
                )}
              {!!virtualization && items.length > 0 && (
                <tr aria-hidden="true">
                  <td
                    colSpan={span}
                    style={{
                      height:
                        virtualizer.getTotalSize() - (items.at(-1)?.end ?? 0),
                    }}
                  />
                </tr>
              )}
            </>
          )}
        </tbody>
      </table>
    </div>
  )
}

export { DataTableGrid }
