import { test } from "node:test"
import assert from "node:assert/strict"
import {
  parseHex,
  rgbToHex,
  rgbToHsv,
  hsvToRgb,
  hsvToHsl,
  hslToHsv,
} from "../src/registry/lib/color"
test("HEX 简写、大小写与透明度", () => {
  for (const [a, b] of [
    ["abc", "#aabbcc"],
    ["#ABCD", "#aabbccdd"],
    ["ABCDEF", "#abcdef"],
    ["#ABCDEF80", "#abcdef80"],
  ] as const)
    assert.equal(rgbToHex(parseHex(a)!, b.length === 9), b)
})
test("非法输入", () => {
  for (const s of ["", "#12", "#12345", "#ggg", "#123456789", "rgb(0,0,0)"])
    assert.equal(parseHex(s), null)
})
test("灰度与黑色保留色相", () => {
  for (const s of ["#888", "#000", "#fff"])
    assert.equal(rgbToHsv(parseHex(s)!, 217).h, 217)
})
test("往返精度", () => {
  for (let h = 0; h < 360; h += 13)
    for (const s of [0.1, 0.5, 1])
      for (const v of [0.1, 0.6, 1]) {
        const a = { h, s, v, a: 0.4 }
        const b = rgbToHsv(hsvToRgb(a))
        for (const k of ["h", "s", "v"] as const)
          assert.ok(Math.abs(a[k] - b[k]) < 1e-9)
        const c = hslToHsv(hsvToHsl(a))
        assert.ok(Math.abs(c.s - s) < 1e-9)
        assert.ok(Math.abs(c.v - v) < 1e-9)
      }
})
test("alpha 边界", () => {
  assert.equal(rgbToHex({ r: 255, g: 0, b: 0, a: -1 }, true), "#ff000000")
  assert.equal(rgbToHex({ r: 255, g: 0, b: 0, a: 2 }, true), "#ff0000ff")
})

test("关闭 alpha 时只接受 3/6 位 HEX", () => {
  assert.equal(parseHex("#aabbccdd", { alpha: false }), null)
  assert.equal(parseHex("#abcd", { alpha: false }), null)
  assert.equal(rgbToHex(parseHex("#abc", { alpha: false })!), "#aabbcc")
  assert.ok(parseHex("#aabbcc", { alpha: false }))
})
