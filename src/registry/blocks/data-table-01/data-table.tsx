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
  X,
} from "lucide-react"
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  useReactTable,
  type VisibilityState,
} from "@tanstack/react-table"
import { useVirtualizer } from "@tanstack/react-virtual"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Empty,
  EmptyTitle,
  EmptyMedia,
  EmptyHeader,
  EmptyDescription,
} from "@/components/ui/empty"
import { useControllableState } from "@/registry/hooks/use-controllable-state"
import { DataTableCell } from "./data-table-cell"
import { DataTableToolbar } from "./data-table-toolbar"
import { DataTablePagination } from "./data-table-pagination"
import { DATA_TABLE_LABELS } from "./config"
import type { DataTableProps, DataTableMeta } from "./types"

/** 虚拟滚动模式下窄屏卡片列表每批显示的条数 */
const MOBILE_LIST_BATCH = 30

function DataTable<T>({
  apiRef,
  columns,
  data,
  getRowId,
  mode = "client",
  rowCount,
  loading,
  error,
  onRetry,
  filtered = false,
  onClearFilters,
  ariaLabel,
  sorting: sortingProp,
  defaultSorting = [],
  onSortingChange,
  pagination: paginationProp,
  defaultPagination = { pageIndex: 0, pageSize: 10 },
  onPaginationChange,
  globalFilter: filterProp,
  defaultGlobalFilter = "",
  onGlobalFilterChange,
  columnFilters: filtersProp,
  defaultColumnFilters = [],
  onColumnFiltersChange,
  rowSelection: selectionProp,
  defaultRowSelection = {},
  onRowSelectionChange,
  onSelectAll,
  bulkActions,
  rowActions,
  onCellCommit,
  searchLabel,
  virtualization = false,
  toolbar,
  header,
  counts,
  statusFilter,
  labels: overrides,
  className,
  ...props
}: DataTableProps<T>) {
  "use no memo"
  // Table v8 的稳定可变对象不能交由 React Compiler 缓存读取。
  const reducedMotion = useReducedMotion()
  const labels = { ...DATA_TABLE_LABELS, ...overrides }
  const [sorting, setSorting] = useControllableState({
    prop: sortingProp,
    defaultProp: defaultSorting,
    onChange: onSortingChange,
  })
  const [pagination, setPagination] = useControllableState({
    prop: paginationProp,
    defaultProp: defaultPagination,
    onChange: onPaginationChange,
  })
  const [globalFilter, setGlobalFilter] = useControllableState({
    prop: filterProp,
    defaultProp: defaultGlobalFilter,
    onChange: onGlobalFilterChange,
  })
  const [columnFilters, setColumnFilters] = useControllableState({
    prop: filtersProp,
    defaultProp: defaultColumnFilters,
    onChange: onColumnFiltersChange,
  })
  const [rowSelection, setRowSelection] = useControllableState({
    prop: selectionProp,
    defaultProp: defaultRowSelection,
    onChange: onRowSelectionChange,
  })
  const [visibility, setVisibility] = React.useState<VisibilityState>({})
  const [density, setDensity] = React.useState("52")
  // 虚拟滚动模式下，窄屏卡片列表分批显示：一次铺开上万行会让页面（含预渲染的 HTML）过大
  const [listLimit, setListLimit] = React.useState(MOBILE_LIST_BATCH)
  const [detailId, setDetailId] = React.useState<string | null>(null)
  const longPress = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const [scrolled, setScrolled] = React.useState(false)
  const [patches, setPatches] = React.useState<
    Record<string, Record<string, unknown>>
  >({})
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)
  React.useImperativeHandle(apiRef, () => ({
    startEditing(rowId, columnId) {
      if ((containerRef.current?.getBoundingClientRect().width ?? 0) < 640) {
        setDetailId(rowId)
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            const cell = Array.from(
              document.querySelectorAll<HTMLElement>(
                '[data-slot="sheet-content"] [data-column]',
              ),
            ).find((node) => node.dataset.column === columnId)
            cell?.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }))
          }),
        )
        return
      }
      const row = Array.from(
        containerRef.current?.querySelectorAll<HTMLElement>("[data-row-id]") ??
          [],
      ).find((node) => node.dataset.rowId === rowId)
      const cell = Array.from(
        row?.querySelectorAll<HTMLElement>("[data-column]") ?? [],
      ).find((node) => node.dataset.column === columnId)
      // 菜单关闭并恢复焦点后再启动已有的单元格编辑流程。
      requestAnimationFrame(() =>
        cell?.dispatchEvent(new MouseEvent("dblclick", { bubbles: true })),
      )
    },
    openDetails: setDetailId,
  }))
  const [desktop, setDesktop] = React.useState(false)
  React.useEffect(() => {
    const query = window.matchMedia("(min-width: 640px)")
    const update = () => setDesktop(query.matches)
    update()
    query.addEventListener("change", update)
    return () => query.removeEventListener("change", update)
  }, [])
  const touchedVisibility = React.useRef(false)
  React.useEffect(() => {
    const observer = new ResizeObserver(([entry]) => {
      if (!entry || touchedVisibility.current) return
      setVisibility(
        Object.fromEntries(
          columns.map((column) => [
            column.id ??
              ("accessorKey" in column ? String(column.accessorKey) : ""),
            !(column.meta?.hideOnMobile && entry.contentRect.width < 640),
          ]),
        ),
      )
    })
    if (containerRef.current) observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [columns])
  const displayData = React.useMemo(
    () => data.map((row) => ({ ...row, ...patches[getRowId(row)] })),
    [data, patches, getRowId],
  )
  const sizedColumns = React.useMemo(
    () =>
      columns.map((column) => ({
        ...column,
        size: column.meta?.width ?? column.size,
      })),
    [columns],
  )
  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table v8 返回可变实例，组件已用 "use no memo" 退出编译器优化
  const table = useReactTable({
    data: displayData,
    columns: sizedColumns,
    getRowId,
    state: {
      sorting,
      pagination,
      globalFilter,
      columnFilters,
      rowSelection,
      columnVisibility: visibility,
    },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: (updater) => {
      touchedVisibility.current = true
      setVisibility(updater)
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: virtualization ? undefined : getPaginationRowModel(),
    manualSorting: mode === "manual",
    manualFiltering: mode === "manual",
    manualPagination: mode === "manual",
    rowCount: mode === "manual" ? rowCount : undefined,
    autoResetPageIndex: false,
    columnResizeMode: "onChange",
    defaultColumn: { size: 160, minSize: 80, maxSize: 600 },
  })
  const rows = table.getRowModel().rows
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () =>
      (virtualization && virtualization.estimateRowHeight) || Number(density),
    overscan: 8,
    enabled: !!virtualization,
  })
  const items = virtualizer.getVirtualItems()
  const shown = virtualization
    ? items.flatMap((item) => {
        const row = rows[item.index]
        return row ? [{ row, index: item.index }] : []
      })
    : rows.map((row, index) => ({ row, index }))
  const selected = Object.values(rowSelection).filter(Boolean).length
  const count =
    mode === "manual" && rowCount !== undefined
      ? rowCount
      : table.getFilteredRowModel().rows.length
  const span = table.getVisibleLeafColumns().length + 1 + Number(!!rowActions)
  const pinned = table
    .getVisibleLeafColumns()
    .find((column) => (column.columnDef.meta as DataTableMeta<T>)?.pinned)?.id
  async function commitCell(rowId: string, columnId: string, value: unknown) {
    const row = rows.find((row) => row.id === rowId)!
    const column = table.getColumn(columnId)!
    const key =
      "accessorKey" in column.columnDef
        ? String(column.columnDef.accessorKey)
        : columnId
    const previous =
      patches[rowId]?.[key] ?? (row.original as Record<string, unknown>)[key]
    setPatches((old) => ({ ...old, [rowId]: { ...old[rowId], [key]: value } }))
    try {
      await onCellCommit?.({ rowId, columnId, value, row: row.original })
    } catch (reason) {
      setPatches((old) => ({
        ...old,
        [rowId]: { ...old[rowId], [key]: previous },
      }))
      throw reason
    }
  }
  const detail = rows.find((row) => row.id === detailId)
  // 外部筛选（工具栏插槽里的、页面持有的）表格看不到，由 filtered 告知
  const hasFilter = !!(globalFilter || columnFilters.length || filtered)
  const listLabel = ariaLabel ?? labels.dataset
  function clearFilters() {
    // 先重置表格自己的搜索、列筛选和页码，再通知外部：回调里触发的副作用不会和旧的内部状态交错
    setGlobalFilter("")
    setColumnFilters([])
    table.setPageIndex(0)
    onClearFilters?.()
  }
  return (
    <div
      ref={containerRef}
      data-slot="data-table"
      className={cn(
        "@container w-full min-w-0 bg-background text-foreground",
        className,
      )}
      {...props}
    >
      {header}
      <DataTableToolbar
        table={table}
        labels={labels}
        density={density}
        onDensityChange={setDensity}
        statusFilter={statusFilter}
        searchLabel={searchLabel}
        counts={
          mode === "manual"
            ? counts
            : statusFilter
              ? Object.fromEntries(
                  statusFilter.options.map((option) => [
                    option.value,
                    option.value
                      ? displayData.filter(
                          (row) =>
                            String(
                              (row as Record<string, unknown>)[
                                statusFilter.columnId
                              ],
                            ) === option.value,
                        ).length
                      : displayData.length,
                  ]),
                )
              : undefined
        }
      >
        {typeof toolbar === "function" ? toolbar(table) : toolbar}
      </DataTableToolbar>
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
                        <span className="font-mono text-muted-foreground">
                          –
                        </span>
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
                    {onRetry && (
                      <Button onClick={onRetry}>{labels.retry}</Button>
                    )}
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
                            (pagination.pageSize - rows.length) *
                            Number(density),
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
              <Button
                variant="outline"
                onClick={error ? onRetry : clearFilters}
              >
                {error ? labels.retry : labels.clearFilters}
              </Button>
            )}
          </li>
        ) : (
          (virtualization ? rows.slice(0, listLimit) : rows).map(
            (row, index) => {
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
            },
          )
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
                  {String(cell.column.columnDef.header)}
                </p>
                <DataTableCell
                  value={cell.getValue()}
                  row={detail.original}
                  meta={cell.column.columnDef.meta as DataTableMeta<T>}
                  title={String(cell.column.columnDef.header)}
                  labels={labels}
                  cellKey={cell.column.id}
                  rowHeight={52}
                  onCommit={(value) =>
                    commitCell(detail.id, cell.column.id, value)
                  }
                >
                  {(
                    cell.column.columnDef.meta as DataTableMeta<T>
                  )?.detailCell?.(cell.getValue(), detail.original) ??
                    flexRender(cell.column.columnDef.cell, cell.getContext())}
                </DataTableCell>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>
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
                  onSelectAll
                    ? onSelectAll()
                    : table.toggleAllRowsSelected(true)
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
            <span
              aria-hidden="true"
              className="mx-1 h-5 w-px bg-background/20"
            />
            {/* 反色操作坞：覆盖按钮配色保持对比；窄容器只留图标（文字放在 data-label 里） */}
            <div className="flex shrink-0 gap-1 [&_[data-label]]:hidden @min-[40rem]:[&_[data-label]]:inline [&_button]:text-background [&_button:hover]:bg-background/15 [&_button:hover]:text-background">
              {bulkActions?.(
                table.getSelectedRowModel().rows.map((row) => row.original),
              )}
            </div>
            <span
              aria-hidden="true"
              className="mx-1 h-5 w-px bg-background/20"
            />
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
      <DataTablePagination
        table={table}
        labels={labels}
        virtual={!!virtualization}
        count={count}
      />
    </div>
  )
}
export { DataTable }
export type { DataTableProps, DataTableColumn, DataTableLabels } from "./types"
