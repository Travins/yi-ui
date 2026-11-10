import type { Column } from "@tanstack/react-table"

import type { DataTableMeta } from "./types"

/**
 * 列的文字名称，用在列显示菜单、排序菜单、详情抽屉和读屏名称这些只能放文字的地方。
 * `header` 是字符串时直接用；是函数（自定义列头）时不能转成字符串（会得到函数源码），
 * 改取 `meta.title`，再没有就退回列 id。
 */
function columnTitle<T>(column: Column<T, unknown>) {
  const { header, meta } = column.columnDef
  if (typeof header === "string" && header) return header
  return (meta as DataTableMeta<T> | undefined)?.title ?? column.id
}

export { columnTitle }
