import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import {
  deltaE2000,
  hexToLab,
  simulateColorVision,
  findColorConflicts,
} from "../src/registry/lib/color-vision"
// Sharma、Wu、Dalal 2005 官方测试集：
// https://hajim.rochester.edu/ece/sites/gsharma/ciede2000/dataNprograms/ciede2000testdata.txt
const rows = readFileSync(
  new URL("./color-vision-fixtures.txt", import.meta.url),
  "utf8",
)
  .trim()
  .split(/\r?\n/)
test("Sharma 34 组 CIEDE2000 数据", () => {
  assert.equal(rows.length, 34)
  for (const row of rows) {
    const [l, a, b, L, A, B, expected] = row.trim().split(/\s+/).map(Number)
    assert.ok(
      Math.abs(deltaE2000({ l, a, b }, { l: L, a: A, b: B }) - expected) < 1e-4,
      row,
    )
  }
})
test("模拟保留黑白、原色已知输出", () => {
  for (const v of ["protanopia", "deuteranopia", "tritanopia"] as const) {
    assert.equal(simulateColorVision("#ffffff", v), "#ffffff")
    assert.equal(simulateColorVision("#000000", v), "#000000")
  }
  assert.equal(simulateColorVision("#ff0000", "protanopia"), "#6d5f00")
  assert.equal(simulateColorVision("#ff0000", "deuteranopia"), "#a39000")
  assert.equal(simulateColorVision("#0000ff", "tritanopia"), "#006b96")
  assert.ok(Math.abs(hexToLab("#ffffff").l - 100) < 0.001)
  assert.throws(() => hexToLab("wrong"), TypeError)
})
test("冲突包含全部视角、索引无重复、严格阈值", () => {
  assert.equal(findColorConflicts(["#123456", "#123456"]).length, 4)
  assert.deepEqual(findColorConflicts(["#000000", "#ffffff"]), [])
  assert.deepEqual(
    findColorConflicts(["#000000", "#000000"], { threshold: 0 }),
    [],
  )
  assert.deepEqual(
    findColorConflicts(["#000000", "#000000"], { visions: ["normal"] }),
    [{ a: 0, b: 1, vision: "normal", deltaE: 0 }],
  )
})
