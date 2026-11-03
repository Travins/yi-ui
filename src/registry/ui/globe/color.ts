import {
  FLOW_TONES,
  type FlowTone,
  type FlowToneName,
} from "@/registry/lib/flow-tone"

/** cobe 接受的颜色：三个 0–1 的分量。 */
type GlobeRgb = [number, number, number]

let probe: CanvasRenderingContext2D | null | undefined

function probeContext() {
  if (probe === undefined) {
    const canvas = document.createElement("canvas")
    canvas.width = canvas.height = 1
    probe = canvas.getContext("2d", { willReadFrequently: true })
  }
  return probe
}

/** 色调名换成 CSS 颜色：内置名走 `--flow-*` 变量，其余原样当作 CSS 颜色。 */
function toneToCss(tone: FlowTone): string {
  return Object.hasOwn(FLOW_TONES, tone)
    ? FLOW_TONES[tone as FlowToneName]
    : tone
}

/**
 * 在 `scope` 元素的上下文里解析一个 CSS 颜色（可以含 `var()`、`oklch()`、`color-mix()`），
 * 返回 sRGB 分量。必须从元素本身解析：局部的 `.dark` / `data-theme-scope` 只改变该元素内的变量。
 * 解析失败时回落到中灰，避免 WebGL 拿到 NaN。
 */
function resolveColor(scope: Element, css: string): GlobeRgb {
  const ctx = probeContext()
  const swatch = document.createElement("span")
  swatch.style.color = css
  swatch.style.display = "none"
  scope.append(swatch)
  const computed = getComputedStyle(swatch).color
  swatch.remove()
  if (!ctx) return [0.5, 0.5, 0.5]
  // 先填一个已知色，若 fillStyle 不认识 computed，会保留它，据此判断解析是否成功
  ctx.clearRect(0, 0, 1, 1)
  ctx.fillStyle = "rgba(0, 0, 0, 0)"
  ctx.fillStyle = computed
  ctx.fillRect(0, 0, 1, 1)
  const [r = 0, g = 0, b = 0, a] = ctx.getImageData(0, 0, 1, 1).data
  if (a === 0) return [0.5, 0.5, 0.5]
  return [r / 255, g / 255, b / 255]
}

/** 简单的相对亮度，用来判断当前上下文是亮色还是暗色。 */
function luminance([r, g, b]: GlobeRgb) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export { luminance, resolveColor, toneToCss }
export type { GlobeRgb }
