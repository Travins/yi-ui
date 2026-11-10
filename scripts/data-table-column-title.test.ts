import assert from "node:assert/strict"
import test from "node:test"

import { columnTitle } from "../src/registry/blocks/data-table-01/column-title"

type Arg = Parameters<typeof columnTitle>[0]
const column = (id: string, columnDef: object) => ({ id, columnDef }) as Arg

test("列头是字符串时直接用", () => {
  assert.equal(columnTitle(column("name", { header: "姓名" })), "姓名")
})

test("列头是函数时用 meta.title，不输出函数源码", () => {
  const custom = column("score", { header: () => "分数", meta: { title: "得分" } })
  assert.equal(columnTitle(custom), "得分")
})

test("列头是函数且没有 meta.title 时退回列 id", () => {
  assert.equal(columnTitle(column("score", { header: () => "分数" })), "score")
})

test("没有列头时退回列 id", () => {
  assert.equal(columnTitle(column("actions", {})), "actions")
})
