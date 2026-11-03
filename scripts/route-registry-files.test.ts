import assert from "node:assert/strict"
import { test } from "node:test"

import { routeItemFiles } from "./route-registry-files"

test("组件和 lib 条目自带的 hook、lib 文件标成 registry:ui", () => {
  const item = {
    type: "registry:ui",
    files: [
      { type: "registry:ui" },
      { type: "registry:hook" },
      { type: "registry:lib" },
    ],
  }
  assert.equal(routeItemFiles(item), true)
  assert.deepEqual(
    item.files.map((file) => file.type),
    ["registry:ui", "registry:ui", "registry:ui"],
  )

  const lib = { type: "registry:lib", files: [{ type: "registry:lib" }] }
  assert.equal(routeItemFiles(lib), true)
  assert.equal(lib.files[0]?.type, "registry:ui")
})

test("区块和页面自己的文件留在应用里", () => {
  for (const type of ["registry:block", "registry:page"]) {
    const item = { type, files: [{ type: "registry:hook" }] }
    assert.equal(routeItemFiles(item), false)
    assert.equal(item.files[0]?.type, "registry:hook")
  }
})
