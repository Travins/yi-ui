/** 颜色计算保留浮点精度，只在格式化输出时取整。 */
type RGB = { r: number; g: number; b: number; a: number }
type HSV = { h: number; s: number; v: number; a: number }
type HSL = { h: number; s: number; l: number; a: number }
function clamp(value: number, max = 1) {
  return Math.min(max, Math.max(0, value))
}
function parseHex(input: string): RGB | null {
  let hex = input.trim().replace(/^#/, "")
  if (!/^(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i.test(hex))
    return null
  if (hex.length < 5) hex = [...hex].map((c) => c + c).join("")
  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16),
    a: hex.length === 8 ? parseInt(hex.slice(6), 16) / 255 : 1,
  }
}
function rgbToHex(rgb: RGB, alpha = false) {
  return (
    "#" +
    [rgb.r, rgb.g, rgb.b, ...(alpha ? [rgb.a * 255] : [])]
      .map((v) => Math.round(clamp(v, 255)).toString(16).padStart(2, "0"))
      .join("")
  )
}
function rgbToHsv({ r, g, b, a }: RGB, hue = 0): HSV {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b),
    d = max - min
  const h = !d
    ? hue
    : ((max === r
        ? (g - b) / d
        : max === g
          ? (b - r) / d + 2
          : (r - g) / d + 4) *
        60 +
        360) %
      360
  return { h, s: max ? d / max : 0, v: max, a }
}
function hsvToRgb({ h, s, v, a }: HSV): RGB {
  h = ((h % 360) + 360) % 360
  s = clamp(s)
  v = clamp(v)
  const c = v * s,
    x = c * (1 - Math.abs(((h / 60) % 2) - 1)),
    m = v - c
  const [r, g, b] =
    h < 60
      ? [c, x, 0]
      : h < 120
        ? [x, c, 0]
        : h < 180
          ? [0, c, x]
          : h < 240
            ? [0, x, c]
            : h < 300
              ? [x, 0, c]
              : [c, 0, x]
  return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255, a: clamp(a) }
}
function hsvToHsl({ h, s, v, a }: HSV): HSL {
  const l = v * (1 - s / 2)
  return { h, s: l === 0 || l === 1 ? 0 : (v - l) / Math.min(l, 1 - l), l, a }
}
function hslToHsv({ h, s, l, a }: HSL): HSV {
  const v = l + s * Math.min(l, 1 - l)
  return { h, s: v ? 2 * (1 - l / v) : 0, v, a }
}
function rgbToHsl(rgb: RGB, hue = 0) {
  return hsvToHsl(rgbToHsv(rgb, hue))
}
function hslToRgb(hsl: HSL) {
  return hsvToRgb(hslToHsv(hsl))
}
export {
  clamp,
  parseHex,
  rgbToHex,
  rgbToHsv,
  hsvToRgb,
  hsvToHsl,
  hslToHsv,
  rgbToHsl,
  hslToRgb,
}
export type { RGB, HSV, HSL }
