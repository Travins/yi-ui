import { parseHex, rgbToHex } from "@/registry/lib/color"

type ColorVision = "normal" | "protanopia" | "deuteranopia" | "tritanopia"
type Lab = { l: number; a: number; b: number }
// Machado、Oliveira、Fernandes 2009，作者发布表的 severity 1.0：
// https://www.inf.ufrgs.br/~oliveira/pubs_files/CVD_Simulation/CVD_Simulation.html
const matrices = {
  protanopia: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  deuteranopia: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
  tritanopia: [
    [1.255528, -0.076749, -0.178779],
    [-0.078411, 0.930809, 0.147602],
    [0.004733, 0.691367, 0.3039],
  ],
}
function linear(v: number) {
  v /= 255
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
}
function channels(hex: string) {
  const rgb = parseHex(hex)
  if (!rgb) throw new TypeError("无效的 HEX 颜色")
  return [rgb.r, rgb.g, rgb.b].map(linear)
}
function simulateColorVision(
  hex: string,
  type: Exclude<ColorVision, "normal">,
) {
  const rgb = channels(hex)
  const [r, g, b] = matrices[type].map((row) => {
    const v = Math.max(
      0,
      Math.min(
        1,
        row.reduce((s, c, i) => s + c * rgb[i], 0),
      ),
    )
    return 255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055)
  })
  return rgbToHex({ r, g, b, a: 1 })
}
function hexToLab(hex: string): Lab {
  const [r, g, b] = channels(hex)
  const f = (v: number) =>
    v > (6 / 29) ** 3 ? Math.cbrt(v) : v / (3 * (6 / 29) ** 2) + 4 / 29
  const x = f((0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047)
  const y = f(0.2126729 * r + 0.7151522 * g + 0.072175 * b)
  const z = f((0.0193339 * r + 0.119192 * g + 0.9503041 * b) / 1.08883)
  return { l: 116 * y - 16, a: 500 * (x - y), b: 200 * (y - z) }
}
function deltaE2000(p: Lab, q: Lab) {
  const rad = Math.PI / 180,
    cos = (v: number) => Math.cos(v * rad),
    sin = (v: number) => Math.sin(v * rad)
  const c = (Math.hypot(p.a, p.b) + Math.hypot(q.a, q.b)) / 2
  const g = 0.5 * (1 - Math.sqrt(c ** 7 / (c ** 7 + 25 ** 7)))
  const a1 = (1 + g) * p.a,
    a2 = (1 + g) * q.a
  const c1 = Math.hypot(a1, p.b),
    c2 = Math.hypot(a2, q.b)
  const hue = (a: number, b: number) =>
    a === 0 && b === 0 ? 0 : (Math.atan2(b, a) / rad + 360) % 360
  const h1 = hue(a1, p.b),
    h2 = hue(a2, q.b)
  const dl = q.l - p.l,
    dc = c2 - c1
  let dh = h2 - h1
  if (c1 * c2 === 0) dh = 0
  else if (dh > 180) dh -= 360
  else if (dh < -180) dh += 360
  const dH = 2 * Math.sqrt(c1 * c2) * sin(dh / 2)
  const L = (p.l + q.l) / 2,
    C = (c1 + c2) / 2
  const H =
    c1 * c2 === 0
      ? h1 + h2
      : Math.abs(h1 - h2) <= 180
        ? (h1 + h2) / 2
        : (h1 + h2 + (h1 + h2 < 360 ? 360 : -360)) / 2
  const T =
    1 -
    0.17 * cos(H - 30) +
    0.24 * cos(2 * H) +
    0.32 * cos(3 * H + 6) -
    0.2 * cos(4 * H - 63)
  const sl = 1 + (0.015 * (L - 50) ** 2) / Math.sqrt(20 + (L - 50) ** 2),
    sc = 1 + 0.045 * C,
    sh = 1 + 0.015 * C * T
  const rt =
    -2 *
    Math.sqrt(C ** 7 / (C ** 7 + 25 ** 7)) *
    sin(60 * Math.exp(-(((H - 275) / 25) ** 2)))
  return Math.sqrt(
    (dl / sl) ** 2 +
      (dc / sc) ** 2 +
      (dH / sh) ** 2 +
      rt * (dc / sc) * (dH / sh),
  )
}
function findColorConflicts(
  colors: string[],
  {
    threshold = 10,
    visions = ["normal", "protanopia", "deuteranopia", "tritanopia"],
  }: { threshold?: number; visions?: ColorVision[] } = {},
) {
  const result: {
    a: number
    b: number
    vision: ColorVision
    deltaE: number
  }[] = []
  for (const vision of visions) {
    const labs = colors.map((c) =>
      hexToLab(vision === "normal" ? c : simulateColorVision(c, vision)),
    )
    for (let a = 0; a < labs.length; a++)
      for (let b = a + 1; b < labs.length; b++) {
        const deltaE = deltaE2000(labs[a], labs[b])
        if (deltaE < threshold) result.push({ a, b, vision, deltaE })
      }
  }
  return result
}
export { simulateColorVision, hexToLab, deltaE2000, findColorConflicts }
export type { ColorVision, Lab }
