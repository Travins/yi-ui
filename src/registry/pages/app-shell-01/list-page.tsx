"use client"

import { PlusIcon } from "lucide-react"
import * as React from "react"

import { Button } from "@/components/ui/button"
import { DataTable } from "@/registry/blocks/data-table-01/data-table"
import type { DataTableColumn } from "@/registry/blocks/data-table-01/types"
import { BarSelect } from "@/registry/ui/bar-select/bar-select"
import { GridToolbarItem } from "@/registry/ui/grid-toolbar/grid-toolbar"

import { formatLabel, useAppShellLabels } from "./config"
import { PageFrame } from "./page-header"
import { listEvents } from "./sample-data"

const getRowId = (row: (typeof listEvents)[number]) => row.id
const applications = [
  ...new Set(
    listEvents.flatMap((row) => (row.app === undefined ? [] : [row.app])),
  ),
]

/**
 * 通用列表页示例：标题栏 + 可选的数据摘要 + 数据表格区块。其余导航项在演示里都显示它。
 * summary 插槽放在表格上方，通常是该页自己的指标与图表（见 page-summaries.tsx）。
 */
function ListPage({
  title,
  description,
  section,
  summary,
}: {
  title: string
  description?: string
  section?: string
  summary?: React.ReactNode
}) {
  const text = useAppShellLabels()
  const statuses = [
    { value: "ok", label: text.eventOk, tone: "var(--flow-green)" },
    { value: "warning", label: text.eventWarning, tone: "var(--flow-amber)" },
    { value: "error", label: text.eventError, tone: "var(--flow-rose)" },
  ]
  const columns: DataTableColumn<(typeof listEvents)[number]>[] = [
    {
      accessorKey: "app",
      header: text.columnApp,
      size: 150,
      filterFn: (row, id, values: string[]) =>
        !values.length || values.includes(row.getValue(id)),
      meta: { pinned: true },
    },
    { accessorKey: "target", header: text.columnTarget, size: 240 },
    {
      accessorKey: "status",
      header: text.columnStatus,
      size: 100,
      cell: ({ getValue }) => {
        const status = statuses.find((item) => item.value === getValue())!
        return (
          <span className="inline-flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="size-1.5 rounded-full"
              style={{ backgroundColor: status.tone }}
            />
            {status.label}
          </span>
        )
      },
    },
    {
      accessorKey: "latencyMs",
      header: text.columnLatency,
      size: 110,
      cell: ({ getValue }) => `${getValue()} ms`,
      meta: { align: "right" },
    },
    {
      accessorKey: "time",
      header: text.columnTime,
      size: 120,
      meta: { hideOnMobile: true },
    },
  ]

  return (
    <PageFrame
      data-slot="app-shell-list-page"
      section={section}
      title={title}
      description={description}
      actions={
        <Button>
          <PlusIcon data-icon="inline-start" />
          {text.createAction}
        </Button>
      }
      className="[&>[data-slot=app-shell-page-content]]:gap-0 [&>[data-slot=app-shell-page-content]]:p-0"
    >
      {/* 摘要按所在区域的宽度排版：右侧挂着 aside 时主区域变窄，图表会自动改为单列 */}
      {summary ? (
        <div
          data-slot="app-shell-list-summary"
          className="@container border-b border-edge p-4 empty:hidden @lg/main:p-6"
        >
          {summary}
        </div>
      ) : null}
      <DataTable
        aria-label={formatLabel(text.listCaption, { title })}
        // 外壳内容区没有底边线，翻页条下方补一条横线，网格才闭合
        className="border-b border-edge"
        columns={columns}
        data={listEvents}
        getRowId={getRowId}
        defaultPagination={{ pageIndex: 0, pageSize: 10 }}
        labels={{ search: text.searchEvents, searchField: text.searchEvents }}
        statusFilter={{ columnId: "status", options: statuses }}
        toolbar={(table) => (
          <GridToolbarItem className="w-40">
            <BarSelect
              multiple
              aria-label={text.columnApp}
              placeholder={text.allApplications}
              options={applications.map((app) => ({ value: app, label: app }))}
              value={
                (table.getColumn("app")?.getFilterValue() as string[]) ?? []
              }
              onValueChange={(values) => {
                table
                  .getColumn("app")
                  ?.setFilterValue(values.length ? values : undefined)
                table.setPageIndex(0)
              }}
            />
          </GridToolbarItem>
        )}
      />
    </PageFrame>
  )
}

export { ListPage }
