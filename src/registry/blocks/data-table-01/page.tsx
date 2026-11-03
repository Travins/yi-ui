"use client"
import * as React from "react"
import {
  Plus,
  Upload,
  Eye,
  Pencil,
  Copy,
  Archive,
  Download,
  Trash2,
} from "lucide-react"
import { DataTableRowActions } from "@/registry/blocks/data-table-01/data-table-row-actions"
import type { DataTableHandle } from "@/registry/blocks/data-table-01/types"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog"
import { BarSelect } from "@/registry/ui/bar-select/bar-select"
import { GridToolbarItem } from "@/registry/ui/grid-toolbar/grid-toolbar"
import { Button } from "@/components/ui/button"
import {
  GridContainer,
  GridSection,
  GridSeparator,
} from "@/registry/ui/grid-layout/grid-layout"
import { numberFormat } from "@/registry/blocks/data-table-01/config"
import { DataTable } from "@/registry/blocks/data-table-01/data-table"
import type { DataTableColumn } from "@/registry/blocks/data-table-01/types"
type Dataset = {
  code: string
  id: string
  name: string
  owner: string
  status: string
  samples: number
  updatedAt: string
}
const datasets: Dataset[] = Array.from({ length: 666 }, (_, i) => ({
  code: "DS-" + String(i + 1).padStart(4, "0"),
  id: String(i + 1),
  name:
    ["城市声景", "植物图谱", "手写字迹", "街道影像"][i % 4] +
    " " +
    String(i + 1).padStart(2, "0"),
  owner: ["林小满", "陈青", "周远"][i % 3] ?? "林小满",
  status: ["进行中", "已归档", "待审核"][i % 3] ?? "进行中",
  samples: 1200 + i * 137,
  updatedAt: new Date(
    Date.UTC(2026, 9, 31, 0) - (i < 6 ? (i + 1) * 3600000 : (i - 4) * 86400000),
  ).toISOString(),
}))
const columns: DataTableColumn<Dataset>[] = [
  {
    accessorKey: "name",
    header: "名称",
    size: 240,
    cell: ({ row, getValue }) => (
      <span>
        <span className="font-medium">{String(getValue())}</span>
        <span className="mt-1 block font-mono text-[10px] text-muted-foreground">
          {row.original.code}
        </span>
      </span>
    ),
    meta: {
      pinned: true,
      editable: "text",
      validate: (value) => (String(value).trim() ? undefined : "请输入名称"),
    },
  },
  {
    accessorKey: "owner",
    filterFn: (row, columnId, values: string[]) =>
      !values.length || values.includes(String(row.getValue(columnId))),
    header: "负责人",
    size: 140,
    cell: ({ getValue }) => (
      <span className="inline-flex items-center gap-2">
        <span className="flex size-5 items-center justify-center rounded-sm border border-edge bg-muted text-[10px]">
          {String(getValue()).slice(0, 1)}
        </span>
        {String(getValue())}
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: "状态",
    size: 140,
    cell: ({ getValue }) => (
      <span className="inline-flex items-center gap-1.5 text-xs">
        <span
          className={
            String(getValue()) === "进行中"
              ? "size-1.5 rounded-full bg-(--flow-green)"
              : String(getValue()) === "待审核"
                ? "size-1.5 rounded-full bg-(--flow-amber)"
                : "size-1.5 rounded-full bg-muted-foreground"
          }
        />
        {String(getValue())}
      </span>
    ),
  },
  {
    accessorKey: "samples",
    header: "样本数",
    cell: ({ getValue }) => numberFormat.format(Number(getValue())),
    size: 140,
    meta: {
      bar: true,
      align: "right",
      editable: "number",
      validate: (value) =>
        Number.isFinite(value) && Number(value) >= 0
          ? undefined
          : "样本数不能小于零",
    },
  },
  {
    accessorKey: "updatedAt",
    cell: ({ getValue }) => <RelativeDate value={String(getValue())} />,
    header: "更新时间",
    size: 180,
    meta: {
      hideOnMobile: true,
      detailCell: (value) => <RelativeDate value={String(value)} exact />,
    },
  },
]
// 全表共用一个分钟级时钟：新挂载的单元格（翻页、排序）直接读到当前时间，不会先显示日期再跳成「几小时前」；
// 只有首次水合时用 null，与预渲染的日期一致
let clock = 0
let clockTimer: ReturnType<typeof setInterval> | undefined
const clockListeners = new Set<() => void>()
function subscribeClock(listener: () => void) {
  clockListeners.add(listener)
  if (clockListeners.size === 1)
    clockTimer = setInterval(() => {
      clock = Date.now()
      clockListeners.forEach((notify) => notify())
    }, 60000)
  return () => {
    clockListeners.delete(listener)
    if (!clockListeners.size) clearInterval(clockTimer)
  }
}
function getClock() {
  if (!clock) clock = Date.now()
  return clock
}
function RelativeDate({
  value,
  exact = false,
}: {
  value: string
  exact?: boolean
}) {
  const now = React.useSyncExternalStore(subscribeClock, getClock, () => null)
  const date = new Date(value)
  const days = now === null ? 100 : (now - date.getTime()) / 86400000
  const relative = new Intl.RelativeTimeFormat("zh-CN", { numeric: "auto" })
  const text =
    days > 7
      ? value.slice(5, 10)
      : days < 1
        ? relative.format(-Math.max(1, Math.floor(days * 24)), "hour")
        : relative.format(-Math.floor(days), "day")
  return (
    <time
      data-slot="data-table-date"
      dateTime={value}
      title={new Intl.DateTimeFormat("zh-CN", {
        dateStyle: "full",
        timeStyle: "long",
        timeZone: "Asia/Shanghai",
      }).format(date)}
      className="font-mono text-xs text-muted-foreground"
    >
      {exact
        ? new Intl.DateTimeFormat("sv-SE", {
            timeZone: "Asia/Shanghai",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          }).format(date) +
          "（" +
          text +
          "）"
        : text}
    </time>
  )
}
const getRowId = (row: Dataset) => row.id
function DataTablePage() {
  const apiRef = React.useRef<DataTableHandle>(null)
  const [deleting, setDeleting] = React.useState<Dataset[]>([])
  const [data, setData] = React.useState(datasets)
  const [selection, setSelection] = React.useState<Record<string, boolean>>({})
  const [notice, setNotice] = React.useState("")
  function exportRows(rows: Dataset[]) {
    const url = URL.createObjectURL(
      new Blob(
        [
          "\ufeff名称,负责人,状态,样本数,更新时间\n" +
            rows
              .map((row) =>
                [
                  row.name,
                  row.owner,
                  row.status,
                  row.samples,
                  row.updatedAt,
                ].join(","),
              )
              .join("\n"),
        ],
        { type: "text/csv;charset=utf-8" },
      ),
    )
    const link = document.createElement("a")
    link.href = url
    link.download = "数据集.csv"
    link.click()
    URL.revokeObjectURL(url)
    setNotice("已导出 " + rows.length + " 条")
  }
  return (
    // 线条网格外框：竖线容器 + 全屏横线；表格贴着两条竖线铺满，工具栏和分页用 --data-table-gutter 与竖线留出间距
    <main
      data-slot="data-table-page"
      className="@container w-full min-w-0 overflow-x-clip bg-background py-6 [--data-table-gutter:1rem] [--grid-width:72rem] sm:py-10 sm:[--data-table-gutter:1.5rem]"
    >
      <GridContainer>
        <GridSection
          topLine
          className="flex flex-col items-start justify-between gap-4 px-4 py-6 sm:px-6 @min-[40rem]:flex-row @min-[40rem]:items-end"
        >
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">数据集</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              整理、审核与维护团队的数据资源。
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setNotice("请选择 CSV 文件导入")}
            >
              <Upload />
              导入
            </Button>
            <Button
              onClick={() => {
                const first = datasets[0]
                if (!first) return
                const id = String(
                  Math.max(0, ...data.map((row) => Number(row.id))) + 1,
                )
                setData((previous) => [
                  {
                    ...first,
                    id,
                    code: "DS-" + id.padStart(4, "0"),
                    name: "新建数据集",
                  },
                  ...previous,
                ])
                setNotice("已新建数据集")
              }}
            >
              <Plus />
              新建数据集
            </Button>
          </div>
        </GridSection>
        <GridSeparator label={"DATASETS / " + data.length} />
        <GridSection>
          <DataTable
            apiRef={apiRef}
            toolbar={(table) => (
              // 工具栏是网格工具栏：插槽里每个控件包一层 GridToolbarItem 成为一格
              <GridToolbarItem className="hidden w-40 @min-[64rem]:flex">
                <BarSelect
                  multiple
                  aria-label="负责人"
                  placeholder="全部负责人"
                  contentClassName="[&_[data-slot=combobox-item]]:text-xs [&_*]:text-xs"
                  value={
                    (table.getColumn("owner")?.getFilterValue() as string[]) ??
                    []
                  }
                  options={["林小满", "陈青", "周远"].map((owner) => ({
                    value: owner,
                    label: owner,
                    count: data.filter((row) => row.owner === owner).length,
                  }))}
                  onValueChange={(values) => {
                    table
                      .getColumn("owner")
                      ?.setFilterValue(values.length ? values : undefined)
                    table.setPageIndex(0)
                  }}
                />
              </GridToolbarItem>
            )}
            rowActions={(row) => (
              <DataTableRowActions
                label={row.name}
                actions={[
                  {
                    label: "查看详情",
                    icon: <Eye />,
                    onSelect: () => apiRef.current?.openDetails(row.id),
                  },
                  {
                    label: "编辑名称",
                    icon: <Pencil />,
                    onSelect: () =>
                      apiRef.current?.startEditing(row.id, "name"),
                  },
                  {
                    label: "复制编号",
                    icon: <Copy />,
                    shortcut: row.code,
                    onSelect: () => {
                      void navigator.clipboard.writeText(row.code).then(
                        () => setNotice("已复制"),
                        () => setNotice("复制失败"),
                      )
                    },
                  },
                  "separator",
                  {
                    label: "导出 CSV",
                    icon: <Download />,
                    onSelect: () => exportRows([row]),
                  },
                  {
                    label: "归档",
                    icon: <Archive />,
                    onSelect: () =>
                      setData((previous) =>
                        previous.map((item) =>
                          item.id === row.id
                            ? { ...item, status: "已归档" }
                            : item,
                        ),
                      ),
                  },
                  "separator",
                  {
                    label: "删除…",
                    icon: <Trash2 />,
                    destructive: true,
                    onSelect: () => setDeleting([row]),
                  },
                ]}
              />
            )}
            columns={columns}
            data={data}
            rowCount={data.length}
            rowSelection={selection}
            onRowSelectionChange={setSelection}
            onSelectAll={() =>
              setSelection(
                Object.fromEntries(data.map((row) => [row.id, true])),
              )
            }
            bulkActions={(rows) => (
              <>
                <Button
                  variant="ghost"
                  size="default"
                  aria-label="导出"
                  onClick={() => exportRows(rows)}
                >
                  <Download />
                  <span data-label>导出</span>
                </Button>
                <Button
                  variant="ghost"
                  size="default"
                  aria-label="归档"
                  onClick={() =>
                    setData((previous) =>
                      previous.map((row) =>
                        selection[row.id] ? { ...row, status: "已归档" } : row,
                      ),
                    )
                  }
                >
                  <Archive />
                  <span data-label>归档</span>
                </Button>
                {/* 反色坞里删除用红色文字区分，混入背景色保证亮暗模式都清楚 */}
                <Button
                  variant="ghost"
                  size="default"
                  aria-label="删除"
                  className="text-[color-mix(in_oklab,var(--destructive)_75%,var(--background))]!"
                  onClick={() => setDeleting(rows)}
                >
                  <Trash2 />
                  <span data-label>删除</span>
                </Button>
              </>
            )}
            onCellCommit={async ({ rowId, columnId, value }) => {
              // 模拟请求：等待 600ms；重名由“服务端”拒绝，演示保存失败与回滚
              await new Promise((resolve) => setTimeout(resolve, 600))
              if (
                columnId === "name" &&
                data.some(
                  (row) =>
                    row.id !== rowId && row.name === String(value).trim(),
                )
              )
                throw new Error("已有同名数据集")
              setData((previous) =>
                previous.map((row) =>
                  row.id === rowId ? { ...row, [columnId]: value } : row,
                ),
              )
            }}

            getRowId={getRowId}
            statusFilter={{
              columnId: "status",
              options: [
                { value: "", label: "全部状态" },
                { value: "进行中", label: "进行中", tone: "var(--flow-green)" },
                { value: "待审核", label: "待审核", tone: "var(--flow-amber)" },
                {
                  value: "已归档",
                  label: "已归档",
                  tone: "var(--muted-foreground)",
                },
              ],
            }}
          />
        </GridSection>
      </GridContainer>
      <AlertDialog
        open={deleting.length > 0}
        onOpenChange={(open) => {
          if (!open) setDeleting([])
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除数据集？</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting.length === 1
                ? "将删除 1 个数据集：「" +
                  deleting[0]?.name +
                  "」，此操作无法撤销。"
                : "将删除 " + deleting.length + " 个数据集，此操作无法撤销。"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel size="default">取消</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              size="default"
              onClick={() => {
                const ids = new Set(deleting.map((row) => row.id))
                setData((previous) =>
                  previous.filter((row) => !ids.has(row.id)),
                )
                setSelection({})
                setDeleting([])
                setNotice("已删除数据集")
              }}
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <p role="status" className="sr-only">
        {notice}
      </p>
    </main>
  )
}
export default DataTablePage
export { datasets, columns, getRowId }
export type { Dataset }
