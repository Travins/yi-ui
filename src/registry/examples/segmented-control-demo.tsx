"use client"

import * as React from "react"
import { LayoutGrid, List, SquareKanban } from "lucide-react"

import { flowToneStyle } from "@/registry/lib/flow-tone"
import { SegmentedControl } from "@/registry/ui/segmented-control/segmented-control"

const VIEW_OPTIONS = [
  { value: "list", label: "列表", icon: <List /> },
  { value: "grid", label: "网格", icon: <LayoutGrid /> },
  { value: "board", label: "看板", icon: <SquareKanban /> },
] as const

/** 固定的素材数据，六条刚好排满三种视图 */
const ASSETS = [
  { name: "品牌手册", meta: "12 页", tone: "blue" },
  { name: "首页插画", meta: "8 层", tone: "violet" },
  { name: "图标集", meta: "48 个", tone: "amber" },
  { name: "字体样本", meta: "6 字重", tone: "green" },
  { name: "动效片段", meta: "2.4 秒", tone: "rose" },
  { name: "素材打包", meta: "320 MB", tone: "cyan" },
] as const

// 看板三栏：每栏两条，素材按下标分配
const COLUMNS = [
  { title: "草稿", tint: "bg-foreground/15" },
  { title: "审核中", tint: "bg-(--flow-amber)" },
  { title: "已发布", tint: "bg-(--flow-green)" },
] as const

function AssetList() {
  return (
    <ul className="flex h-full flex-col justify-between gap-1.5">
      {ASSETS.map((asset) => (
        <li key={asset.name} className="flex min-w-0 items-center gap-2">
          <span
            aria-hidden="true"
            className="size-5 shrink-0 rounded-sm bg-(--flow-tone)/15 ring-1 ring-(--flow-tone)/30 ring-inset"
            style={flowToneStyle(asset.tone)}
          />
          <span className="min-w-0 flex-1 truncate text-xs">{asset.name}</span>
          <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
            {asset.meta}
          </span>
        </li>
      ))}
    </ul>
  )
}

function AssetGrid() {
  return (
    <ul className="grid h-full grid-cols-3 grid-rows-2 gap-1.5">
      {ASSETS.map((asset) => (
        <li key={asset.name} className="flex min-w-0 flex-col gap-1">
          <span
            aria-hidden="true"
            className="min-h-0 flex-1 rounded-sm bg-(--flow-tone)/15 ring-1 ring-(--flow-tone)/30 ring-inset"
            style={flowToneStyle(asset.tone)}
          />
          <span className="truncate text-[11px] text-muted-foreground">
            {asset.name}
          </span>
        </li>
      ))}
    </ul>
  )
}

function AssetBoard() {
  return (
    <ul className="grid h-full grid-cols-3 gap-1.5">
      {COLUMNS.map((column, columnIndex) => (
        <li
          key={column.title}
          className="flex min-w-0 flex-col gap-1.5 rounded-sm bg-muted/40 p-1.5"
        >
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <span
              aria-hidden="true"
              className={`size-1.5 shrink-0 rounded-full ${column.tint}`}
            />
            <span className="truncate">{column.title}</span>
          </span>
          {[0, 1].map((row) => {
            const asset = ASSETS[columnIndex * 2 + row]
            if (!asset) return null
            return (
              <span
                key={asset.name}
                className="truncate rounded-sm border border-edge bg-background px-1.5 py-1 text-[10px]"
              >
                {asset.name}
              </span>
            )
          })}
        </li>
      ))}
    </ul>
  )
}

/**
 * 默认示例：素材库的视图切换。三个带图标的分段驱动下方的预览区，
 * 列表、网格、看板三套排布用的是同一份固定数据。
 */
export default function SegmentedControlDemo() {
  const [view, setView] = React.useState<string>("list")

  return (
    <div className="w-full max-w-sm rounded-xl border border-edge bg-background p-4 shadow-xs">
      <div className="flex items-baseline justify-between gap-2 pb-3">
        <p className="text-sm font-medium">素材库</p>
        <p className="font-mono text-[11px] text-muted-foreground">06 / 128</p>
      </div>
      <SegmentedControl
        aria-label="视图"
        options={VIEW_OPTIONS}
        value={view}
        onValueChange={setView}
      />
      <div className="mt-3 h-44 overflow-hidden rounded-lg border border-edge bg-muted/20 p-2.5">
        {view === "grid" ? (
          <AssetGrid />
        ) : view === "board" ? (
          <AssetBoard />
        ) : (
          <AssetList />
        )}
      </div>
    </div>
  )
}
