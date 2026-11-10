"use client"
import { cn } from "@/lib/utils"
import { DataTableToolbar } from "./data-table-toolbar"
import { DataTablePagination } from "./data-table-pagination"
import { DataTableGrid } from "./data-table-grid"
import { DataTableList } from "./data-table-list"
import { DataTableDetail } from "./data-table-detail"
import { DataTableBulkBar } from "./data-table-bulk-bar"
import { useDataTable } from "./use-data-table"
import type { DataTableProps } from "./types"

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
  const state = useDataTable({
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
  })
  const {
    labels,
    table,
    count,
    displayData,
    density,
    setDensity,
    containerRef,
  } = state
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
      <DataTableGrid
        state={state}
        virtualization={virtualization}
        rowActions={rowActions}
        loading={loading}
        error={error}
        onRetry={onRetry}
      />
      <DataTableList
        state={state}
        virtualization={virtualization}
        rowActions={rowActions}
        statusFilter={statusFilter}
        loading={loading}
        error={error}
        onRetry={onRetry}
      />
      <DataTableDetail state={state} />
      <DataTableBulkBar
        state={state}
        data={data}
        rowCount={rowCount}
        bulkActions={bulkActions}
        onSelectAll={onSelectAll}
      />
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
