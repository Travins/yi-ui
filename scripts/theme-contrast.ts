/**
 * 校验每个颜色主题在亮 / 暗模式下的关键对比度（WCAG 2.x 相对亮度公式）：
 *  - primary-foreground / primary         ≥ 3（按钮文字统一白字，14px 中粗字按 AA 大字 / UI 组件标准）
 *  - foreground / background              ≥ 4.5（正文）
 *  - muted-foreground / background        ≥ 4.5（次要文字）
 *  - primary / background                 ≥ 3  （主色作为文字 / 图形，如链接按钮、进度条）
 *  - destructive / primary 的色差 ΔE      ≥ 8  （危险色与主色不撞色，仅彩色主题检查）
 * 任一项不达标时退出码为 1。运行：pnpm tsx scripts/theme-contrast.ts
 */
import { COLOR_THEMES, formatThemeLabel } from "../src/lib/themes"

type Rgb = [number, number, number]

/** 解析 oklch(L C H) 或 oklch(L C H / A%)；带透明度时叠加到 backdrop 上。 */
function parseOklch(value: string, backdrop?: Rgb): Rgb {
  const match = value.match(
    /^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+)%)?\s*\)$/,
  )
  if (!match) throw new Error(`无法解析颜色：${value}`)
  const [l, c, h] = [Number(match[1]), Number(match[2]), Number(match[3])]
  const alpha = match[4] === undefined ? 1 : Number(match[4]) / 100
  const rgb = oklchToSrgb(l, c, h)
  if (alpha === 1 || !backdrop) return rgb
  return rgb.map(
    (channel, index) => channel * alpha + backdrop[index]! * (1 - alpha),
  ) as Rgb
}

/** oklch → sRGB（0–1），超出色域的通道裁剪。 */
function oklchToSrgb(l: number, c: number, h: number): Rgb {
  const rad = (h * Math.PI) / 180
  const a = c * Math.cos(rad)
  const b = c * Math.sin(rad)
  const l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s_ = (l - 0.0894841775 * a - 1.291485548 * b) ** 3
  const linear = [
    4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
    -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
    -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_,
  ]
  return linear.map((v) => {
    const encoded = v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055
    return Math.min(1, Math.max(0, encoded))
  }) as Rgb
}

function luminance(rgb: Rgb): number {
  const [r = 0, g = 0, b = 0] = rgb.map((v) =>
    v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4,
  )
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast(a: Rgb, b: Rgb): number {
  const [x, y] = [luminance(a), luminance(b)]
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}

/** sRGB 欧氏距离的粗略色差（仅用来判断“看起来是不是同一种红”）。 */
function colorDistance(a: Rgb, b: Rgb): number {
  return Math.hypot(...a.map((v, i) => (v - b[i]!) * 100)) / 1.7
}

const MIN = {
  primaryText: 3,
  text: 4.5,
  muted: 4.5,
  graphic: 3,
  destructive: 8,
}

const rows: string[] = []
let failures = 0

function cell(value: number, min: number): string {
  const ok = value >= min
  if (!ok) failures += 1
  return `${value.toFixed(2)}${ok ? "" : " ✗"}`
}

for (const theme of COLOR_THEMES) {
  for (const mode of ["light", "dark"] as const) {
    const vars = theme.cssVars[mode]
    const background = parseOklch(vars.background)
    const primary = parseOklch(vars.primary)
    const primaryText = contrast(
      parseOklch(vars["primary-foreground"]),
      primary,
    )
    const text = contrast(parseOklch(vars.foreground), background)
    const muted = contrast(parseOklch(vars["muted-foreground"]), background)
    const mutedOnMuted = contrast(
      parseOklch(vars["muted-foreground"]),
      parseOklch(vars.muted),
    )
    const graphic = contrast(primary, background)
    const destructiveGap = colorDistance(parseOklch(vars.destructive), primary)
    rows.push(
      [
        formatThemeLabel(theme),
        mode === "light" ? "亮" : "暗",
        cell(primaryText, MIN.primaryText),
        cell(text, MIN.text),
        cell(muted, MIN.muted),
        mutedOnMuted.toFixed(2),
        cell(graphic, MIN.graphic),
        theme.group === "color" ? cell(destructiveGap, MIN.destructive) : "—",
      ].join(" | "),
    )
  }
}

console.log(
  [
    "| 主题 | 模式 | primary-fg / primary | fg / bg | muted-fg / bg | muted-fg / muted | primary / bg | 危险色 vs 主色 ΔE |",
    "|---|---|---|---|---|---|---|---|",
    ...rows.map((row) => `| ${row} |`),
  ].join("\n"),
)

if (failures > 0) {
  console.error(`\n有 ${failures} 项未达标`)
  process.exitCode = 1
} else {
  console.log("\n全部达标")
}
