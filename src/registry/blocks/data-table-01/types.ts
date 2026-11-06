import type * as React from "react"
import type {
  Table,
  ColumnDef,
  SortingState,
  PaginationState,
  ColumnFiltersState,
  RowSelectionState,
} from "@tanstack/react-table"

type DataTableMeta<T> = {
  detailCell?: (value: unknown, row: T) => React.ReactNode
  bar?: boolean
  max?: number
  align?: "left" | "center" | "right"
  editable?: "text" | "number"
  validate?: (value: unknown, row: T) => string | undefined
  hideOnMobile?: boolean
  pinned?: boolean
  width?: number
}
type DataTableColumn<T> = ColumnDef<T, unknown> & { meta?: DataTableMeta<T> }
type DataTableLabels = {
  sort: string
  ascending: string
  descending: string
  detailDescription: string
  emptyDescription: string
  noResultsDescription: string
  errorDescription: string
  items: string
  page: string
  editDescription: (value: string, column: string) => string
  actions: string
  rowTotal: (count: number) => string
  /** 虚拟滚动模式下窄屏列表的「显示更多」 */
  showMore: (rest: number) => string
  search: string
  /** 列表（桌面 table、手机 ul）的读屏名称；`ariaLabel` 优先 */
  dataset: string
  /** 行操作按钮的读屏名称模板，`{name}` 替换为行名称 */
  rowActions: string
  /** 搜索框的读屏名称（未传 searchLabel 时使用） */
  searchField: string
  status: string
  columns: string
  reset: string
  density: string
  compact: string
  standard: string
  comfortable: string
  selected: string
  selectAllCompact: string
  selectAll: string
  clear: string
  retry: string
  empty: string
  noResults: string
  clearFilters: string
  /** 状态筛选未选时的占位（statusFilter 里没有空值选项时使用） */
  all: string
  first: string
  previous: string
  next: string
  last: string
  total: string
  perPage: string
  jump: string
  /** 跳页输入框的读屏名称 */
  jumpInput: string
  /** 窄容器里「当前页 / 总页数」入口的读屏说明 */
  jumpTrigger: string
  cancel: string
  save: string
  saveError: string
  saving: string
  saved: string
  nextCell: string
  editAgain: string
  selectPage: string
  selectRow: string
}
type DataTableHandle = {
  startEditing: (rowId: string, columnId: string) => void
  openDetails: (rowId: string) => void
}
type DataTableProps<T> = Omit<React.ComponentProps<"div">, "onChange"> & {
  apiRef?: React.Ref<DataTableHandle>
  /**
   * 列表的读屏名称，用于桌面 table 与手机 ul；不传时取 `labels.dataset`（默认「数据列表」）
   */
  ariaLabel?: string
  columns: DataTableColumn<T>[]
  data: T[]
  getRowId: (row: T) => string
  mode?: "client" | "manual"
  rowCount?: number
  loading?: boolean
  error?: string | null
  onRetry?: () => void
  /**
   * 外部筛选是否生效。服务端分页时筛选状态通常放在页面里（比如 `toolbar` 插槽里的下拉），
   * 表格感知不到；传 true 后无结果的空状态会显示「没有符合条件的结果」和「清除筛选」
   * @default false
   */
  filtered?: boolean
  /** 点「清除筛选」时调用：表格先清掉自己的搜索和列筛选，再调用它，用来重置外部筛选 */
  onClearFilters?: () => void
  sorting?: SortingState
  defaultSorting?: SortingState
  onSortingChange?: (value: SortingState) => void
  pagination?: PaginationState
  defaultPagination?: PaginationState
  onPaginationChange?: (value: PaginationState) => void
  globalFilter?: string
  defaultGlobalFilter?: string
  onGlobalFilterChange?: (value: string) => void
  columnFilters?: ColumnFiltersState
  defaultColumnFilters?: ColumnFiltersState
  onColumnFiltersChange?: (value: ColumnFiltersState) => void
  rowSelection?: RowSelectionState
  defaultRowSelection?: RowSelectionState
  onRowSelectionChange?: (value: RowSelectionState) => void
  onSelectAll?: () => void
  bulkActions?: (selected: T[]) => React.ReactNode
  rowActions?: (row: T) => React.ReactNode
  /** 搜索框条内标签，默认不显示；传入如「搜索」时显示在图标前 */
  searchLabel?: React.ReactNode
  onCellCommit?: (change: {
    rowId: string
    columnId: string
    value: unknown
    row: T
  }) => void | Promise<void>
  virtualization?: false | { estimateRowHeight?: number; height?: number }
  header?: React.ReactNode
  counts?: Record<string, number>
  /** 工具栏插槽：工具栏是网格工具栏，每个控件包一层 `GridToolbarItem` 成为一格 */
  toolbar?: React.ReactNode | ((table: Table<T>) => React.ReactNode)
  statusFilter?: {
    columnId: string
    /** tone：状态色点的颜色，填 CSS 颜色或主题变量，如 "var(--flow-green)" */
    options: { value: string; label: string; tone?: string }[]
  }
  labels?: Partial<DataTableLabels>
}
export type {
  DataTableHandle,
  DataTableProps,
  DataTableColumn,
  DataTableMeta,
  DataTableLabels,
}
