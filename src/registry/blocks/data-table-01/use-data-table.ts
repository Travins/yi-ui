"use client"
import * as React from "react"
import {
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  useReactTable,
  type VisibilityState,
} from "@tanstack/react-table"
import { useVirtualizer } from "@tanstack/react-virtual"
import { useControllableState } from "@/registry/hooks/use-controllable-state"
import { DATA_TABLE_LABELS, MOBILE_LIST_BATCH } from "./config"
import type { DataTableProps, DataTableMeta } from "./types"

/** 默认值由 DataTable 的参数解构补齐，这里按已补齐的形态接收 */
type UseDataTableOptions<T> = Pick<
  DataTableProps<T>,
  | "apiRef"
  | "columns"
  | "data"
  | "getRowId"
  | "rowCount"
  | "ariaLabel"
  | "sorting"
  | "onSortingChange"
  | "pagination"
  | "onPaginationChange"
  | "globalFilter"
  | "onGlobalFilterChange"
  | "columnFilters"
  | "onColumnFiltersChange"
  | "rowSelection"
  | "onRowSelectionChange"
  | "onCellCommit"
  | "rowActions"
  | "virtualization"
  | "onClearFilters"
  | "labels"
> &
  Required<
    Pick<
      DataTableProps<T>,
      | "mode"
      | "filtered"
      | "defaultSorting"
      | "defaultPagination"
      | "defaultGlobalFilter"
      | "defaultColumnFilters"
      | "defaultRowSelection"
    >
  >

/** 状态与 TanStack Table 的装配：结果分发给表格、卡片列表、详情抽屉和批量操作条 */
function useDataTable<T>({
  apiRef,
  columns,
  data,
  getRowId,
  mode,
  rowCount,
  filtered,
  ariaLabel,
  sorting: sortingProp,
  defaultSorting,
  onSortingChange,
  pagination: paginationProp,
  defaultPagination,
  onPaginationChange,
  globalFilter: filterProp,
  defaultGlobalFilter,
  onGlobalFilterChange,
  columnFilters: filtersProp,
  defaultColumnFilters,
  onColumnFiltersChange,
  rowSelection: selectionProp,
  defaultRowSelection,
  onRowSelectionChange,
  onCellCommit,
  rowActions,
  virtualization,
  onClearFilters,
  labels: overrides,
}: UseDataTableOptions<T>) {
  "use no memo"
  // Table v8 的稳定可变对象不能交由 React Compiler 缓存读取。
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
  return {
    labels,
    table,
    rows,
    items,
    shown,
    virtualizer,
    displayData,
    pagination,
    selected,
    count,
    span,
    pinned,
    detail,
    hasFilter,
    listLabel,
    density,
    setDensity,
    listLimit,
    setListLimit,
    setDetailId,
    scrolled,
    setScrolled,
    desktop,
    scrollRef,
    containerRef,
    commitCell,
    clearFilters,
    setRowSelection,
  }
}

/** 钩子返回的整包状态，子组件按需取用 */
type DataTableController<T> = ReturnType<typeof useDataTable<T>>

export { useDataTable }
export type { DataTableController }
