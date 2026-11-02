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
test("模拟后不取整：阈值附近的判定与浮点结果一致（#23）", () => {
  // 期望值来自独立的浮点实现（同一矩阵与 CIEDE2000，已用 Sharma 数据校验）；
  // 四组都是先取整成 HEX 再算色差时，会落到阈值 10 另一侧的颜色对
  const cases = [
    ["#6d3d4e", "#ea2566", "protanopia", 9.86904],
    ["#4ad929", "#96d959", "tritanopia", 9.981975],
    ["#603a8f", "#782ea2", "tritanopia", 10.092677],
    ["#4b094d", "#513180", "deuteranopia", 10.004754],
  ] as const
  for (const [a, b, vision, expected] of cases) {
    const [hit] = findColorConflicts([a, b], {
      threshold: Infinity,
      visions: [vision],
    })
    assert.ok(Math.abs(hit.deltaE - expected) < 1e-5, `${a} ${b} ${vision}`)
    assert.equal(
      findColorConflicts([a, b], { visions: [vision] }).length > 0,
      expected < 10,
    )
    const rounded = deltaE2000(
      hexToLab(simulateColorVision(a, vision)),
      hexToLab(simulateColorVision(b, vision)),
    )
    assert.notEqual(rounded < 10, expected < 10)
  }
})
