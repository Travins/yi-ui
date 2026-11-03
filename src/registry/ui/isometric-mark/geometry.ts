/**
 * 等轴测挤出的纯几何计算：只依赖数学，不碰 React，方便单测与复用。
 *
 * 坐标约定：平面 logo 的坐标 (x, y)，y 向下；挤出方向为 z（向上）。
 * 投影：X = (x - y)·cos30°，Y = (x + y)·sin30° - z。
 * 在这个投影下，观察者位于 (+x, +y, +z) 一侧，朝向 (1, 1) 的墙面可见。
 */

/** 平面坐标点 `[x, y]` */
type IsometricPoint = readonly [number, number]

/** 一个平面形状：一圈外轮廓加若干个孔，孔会被挤成通孔。 */
type IsometricShape = {
  outer: readonly IsometricPoint[]
  holes?: readonly (readonly IsometricPoint[])[]
  /** 这块形状的色调（任意 CSS 颜色）：顶面淡淡着色、线条取同色；不传为单色线稿 */
  tone?: string
}

/** 墙面底边在屏幕上的两个端点（z = 0），顶边由当前高度决定。 */
type IsometricWall = {
  x0: number
  y0: number
  x1: number
  y1: number
  tone?: string
}

type IsometricModel = {
  viewBox: { x: number; y: number; width: number; height: number }
  /** 线宽、斜纹、虚线等“一个像素”对应的 viewBox 长度，随图形尺寸等比缩放 */
  unit: number
  /** 实际使用的挤出高度（props 未传时为自动值） */
  depth: number
  /** 顶面路径（z = depth），外轮廓与孔都在其中，需配合 evenodd */
  top: string
  /** 按形状拆开的顶面，带各自的色调 */
  tops: { d: string; tone?: string }[]
  /** 可见侧墙，按从远到近排好序 */
  walls: IsometricWall[]
  /** 背景辅助线路径（z = 0） */
  guides: string
  /** 地面网格路径（z = 0），与辅助线同方向 */
  floor: string
  /** 只有第一个方向的地面横线 */
  floorLines: string
  /** 地面格点（两组格线的交点） */
  floorDots: string
  /** 棋盘格：隔一格填一格 */
  floorCells: string
  /** 挤出高度 1 在屏幕上对应的竖直长度（随俯仰角变化，标准等轴测为 1） */
  heightScale: number
}

const COS30 = Math.cos(Math.PI / 6)
const SIN30 = 0.5
const EPSILON = 1e-6
/** 自动挤出高度占图形平面尺寸的比例 */
const AUTO_DEPTH_RATIO = 0.12

const fmt = (n: number) => String(Math.round(n * 100) / 100)

/** 标准等轴测的俯仰角：视线与地面成 arctan(1/√2) ≈ 35.26° */
const ISOMETRIC_ELEVATION = (Math.atan(1 / Math.SQRT2) * 180) / Math.PI

/**
 * 投影系数：水平方位固定 45°（两条地面轴左右对称），俯仰角可调。
 * 地面方向的竖直压缩 ky = sinE·√2·cos30°，高度方向 kz = cosE·√2·cos30°；
 * 俯仰角取 35.26° 时 ky = 0.5、kz = 1，正好是标准等轴测。
 * 俯仰角越大越接近俯视（地面越“方”、厚度越薄），越小越接近平视（地面越扁、厚度越高）。
 */
let KY = SIN30
let KZ = 1

function setElevation(degrees: number) {
  const e = (Math.min(Math.max(degrees, 5), 85) * Math.PI) / 180
  KY = Math.sin(e) * Math.SQRT2 * COS30
  KZ = Math.cos(e) * Math.SQRT2 * COS30
}

function project(x: number, y: number, z = 0): [number, number] {
  return [(x - y) * COS30, (x + y) * KY - z * KZ]
}

/** 去掉首尾重复的闭合点，统一成不含重复端点的环。 */
function cleanRing(ring: readonly IsometricPoint[]): IsometricPoint[] {
  const points = [...ring]
  const first = points[0]
  const last = points[points.length - 1]
  if (
    points.length > 1 &&
    first &&
    last &&
    first[0] === last[0] &&
    first[1] === last[1]
  ) {
    points.pop()
  }
  return points
}

function signedArea(ring: readonly IsometricPoint[]) {
  let sum = 0
  for (let i = 0; i < ring.length; i++) {
    const [x0, y0] = ring[i]!
    const [x1, y1] = ring[(i + 1) % ring.length]!
    sum += x0 * y1 - x1 * y0
  }
  return sum / 2
}

/** 外轮廓取正面积、孔取负面积，这样所有环的“实体外侧”法线公式一致。 */
function orient(ring: IsometricPoint[], positive: boolean) {
  return signedArea(ring) > 0 === positive ? ring : [...ring].reverse()
}

function ringPath(ring: readonly IsometricPoint[], z: number) {
  return (
    ring
      .map(([x, y], i) => {
        const [px, py] = project(x, y, z)
        return `${i === 0 ? "M" : "L"}${fmt(px)} ${fmt(py)}`
      })
      .join("") + "Z"
  )
}

type Segment = {
  /** 平面坐标，用于排序 */
  px: number
  py: number
  qx: number
  qy: number
  tone?: string
}

/** 排序键：沿观察方向的“深度”，越大越靠近观察者。 */
const depthOf = (s: Segment) => (s.px + s.py + s.qx + s.qy) / 4

/**
 * 判断两面墙的前后关系：-1 表示 a 在 b 后面（先画 a），1 相反，0 表示互不遮挡。
 * 墙在屏幕上只有 X = x - y 方向的范围，范围不重叠就不会互相遮挡；
 * 重叠区间内两线段不相交，因此取区间中点比较 x + y 即可。
 */
function compareSegments(a: Segment, b: Segment) {
  const ua0 = a.px - a.py
  const ua1 = a.qx - a.qy
  const ub0 = b.px - b.py
  const ub1 = b.qx - b.qy
  const lo = Math.max(Math.min(ua0, ua1), Math.min(ub0, ub1))
  const hi = Math.min(Math.max(ua0, ua1), Math.max(ub0, ub1))
  if (hi - lo < EPSILON) return 0

  const u = (lo + hi) / 2
  const depthAt = (s: Segment, u0: number, u1: number) => {
    const t = (u - u0) / (u1 - u0)
    return s.px + s.py + t * (s.qx + s.qy - s.px - s.py)
  }
  const diff = depthAt(a, ua0, ua1) - depthAt(b, ub0, ub1)
  if (Math.abs(diff) < EPSILON) return 0
  return diff < 0 ? -1 : 1
}

/**
 * 画家算法的顺序：先按“谁挡住谁”做拓扑排序，凹多边形也能排对；
 * 理论上不会出现环，真遇到时退回按深度最小者优先，保证一定有结果。
 * 顺序只取决于平面形状，与挤出高度无关，所以按下动画时不用重排。
 */
function sortBackToFront(segments: Segment[]) {
  type OrderingNode = {
    segment: Segment
    after: OrderingNode[]
    blockers: number
    done: boolean
  }
  const nodes = segments.map((segment): OrderingNode => ({
    segment,
    after: [],
    blockers: 0,
    done: false,
  }))
  for (const [i, node] of nodes.entries()) {
    for (let j = i + 1; j < nodes.length; j++) {
      // j 由同一数组的长度约束。
      const other = nodes[j]!
      const order = compareSegments(node.segment, other.segment)
      if (order < 0) {
        node.after.push(other)
        other.blockers++
      } else if (order > 0) {
        other.after.push(node)
        node.blockers++
      }
    }
  }
  const sorted: Segment[] = []
  for (let k = 0; k < nodes.length; k++) {
    let pick: OrderingNode | undefined
    for (const node of nodes) {
      if (node.done || node.blockers > 0) continue
      if (!pick || depthOf(node.segment) < depthOf(pick.segment)) pick = node
    }
    if (!pick) {
      for (const node of nodes) {
        if (node.done) continue
        if (!pick || depthOf(node.segment) < depthOf(pick.segment)) pick = node
      }
    }
    if (!pick) break
    pick.done = true
    sorted.push(pick.segment)
    for (const next of pick.after) next.blockers--
  }
  return sorted
}

function buildIsometricModel(
  shapes: readonly IsometricShape[],
  depthOption?: number,
  guideMode: "box" | "edges" = "box",
  elevation: number = ISOMETRIC_ELEVATION,
): IsometricModel {
  setElevation(elevation)
  const rings: {
    ring: IsometricPoint[]
    hole: boolean
    shape: number
    tone?: string
  }[] = []
  shapes.forEach((shape, index) => {
    const tone = shape.tone
    rings.push({
      ring: orient(cleanRing(shape.outer), true),
      hole: false,
      shape: index,
      tone,
    })
    for (const hole of shape.holes ?? []) {
      rings.push({
        ring: orient(cleanRing(hole), false),
        hole: true,
        shape: index,
        tone,
      })
    }
  })

  // 平面包围盒，用于自动高度与辅助线
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const { ring } of rings) {
    for (const [x, y] of ring) {
      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x)
      maxY = Math.max(maxY, y)
    }
  }
  if (!rings.length) {
    minX = minY = maxX = maxY = 0
  }
  const planSize = Math.max(maxX - minX, maxY - minY, 1)
  const depth = Math.max(depthOption ?? planSize * AUTO_DEPTH_RATIO, 0)

  // 背面剔除：法线 (ey, -ex) 与观察方向 (1, 1) 同侧才可见；
  // 法线与观察方向垂直的墙在屏幕上是一条竖线，面积为零，也不画。
  const segments: Segment[] = []
  for (const { ring, tone } of rings) {
    for (let i = 0; i < ring.length; i++) {
      const [px, py] = ring[i]!
      const [qx, qy] = ring[(i + 1) % ring.length]!
      if (qy - py - (qx - px) > EPSILON) segments.push({ px, py, qx, qy, tone })
    }
  }
  const walls = sortBackToFront(segments).map((s) => {
    const [x0, y0] = project(s.px, s.py)
    const [x1, y1] = project(s.qx, s.qy)
    return { x0, y0, x1, y1, tone: s.tone }
  })

  // 投影后的包围盒：顶面在 z = depth（最高），底边在 z = 0（最低）
  let bx0 = Infinity
  let by0 = Infinity
  let bx1 = -Infinity
  let by1 = -Infinity
  for (const { ring } of rings) {
    for (const [x, y] of ring) {
      const [px, py] = project(x, y)
      bx0 = Math.min(bx0, px)
      bx1 = Math.max(bx1, px)
      by0 = Math.min(by0, py - depth * KZ)
      by1 = Math.max(by1, py)
    }
  }
  if (!rings.length) {
    bx0 = by0 = bx1 = by1 = 0
  }
  const size = Math.max(bx1 - bx0, by1 - by0, 1)
  const margin = size * 0.02

  // 辅助线：
  // - "box"：包围盒四条边沿两条等轴测轴延长（横平竖直的图形最合适）；
  // - "edges"：沿图形自己的主方向——按边长统计各方向，取最长的两个，每个方向画两条外侧切线并延长。
  //   斜向的图形（如一组斜杠）辅助线会贴着它的长边与齐平的端点。
  const reach = planSize * 1.2
  const line = (x0: number, y0: number, x1: number, y1: number) => {
    const [ax, ay] = project(x0, y0)
    const [bx, by] = project(x1, y1)
    return `M${fmt(ax)} ${fmt(ay)}L${fmt(bx)} ${fmt(by)}`
  }
  const weights = new Map<number, { ux: number; uy: number; length: number }>()
  for (const { ring } of rings) {
    for (let i = 0; i < ring.length; i++) {
      const [px, py] = ring[i]!
      const [qx, qy] = ring[(i + 1) % ring.length]!
      const length = Math.hypot(qx - px, qy - py)
      if (length < EPSILON) continue
      // 方向取 [0°, 180°)，按 0.5° 分桶，避免浮点误差把同一方向拆开
      let angle = (Math.atan2(qy - py, qx - px) * 180) / Math.PI
      angle = ((angle % 180) + 180) % 180
      const key = Math.round(angle * 2) % 360
      const entry = weights.get(key)
      if (entry) entry.length += length
      else {
        const r = (key / 2) * (Math.PI / 180)
        weights.set(key, { ux: Math.cos(r), uy: Math.sin(r), length })
      }
    }
  }
  const directions =
    guideMode === "edges"
      ? [...weights.values()].sort((a, b) => b.length - a.length).slice(0, 2)
      : [
          { ux: 1, uy: 0, length: 0 },
          { ux: 0, uy: 1, length: 0 },
        ]
  const points = rings.flatMap(({ ring }) => ring)
  // 地面网格：与辅助线同两个方向、同一个平面（z = 0），目标是图形的每条边都落在格线上。
  // 每个方向单独算：所有顶点在法线方向上的距离若有足够大的公约数（如标志左端切口
  // 0 / 78 / 156 / 416 的公约数 26），就按它等距铺；否则每条边各画一条线，外侧按平均间距延伸。
  const floorTarget = planSize / 10
  const floorReach = planSize * 0.9
  const approxGcd = (a: number, b: number): number => {
    const tolerance = planSize / 400
    while (b > tolerance) [a, b] = [b, a % b]
    return a
  }
  // 每个方向算出一组格线位置（法线方向上的绝对偏移），地面的各种材质都由这两组格线组合而成
  const families = directions.map(({ ux, uy }) => {
    const nx = -uy
    const ny = ux
    let lo = Infinity
    let hi = -Infinity
    let a0 = Infinity
    let a1 = -Infinity
    for (const [x, y] of points) {
      lo = Math.min(lo, x * nx + y * ny)
      hi = Math.max(hi, x * nx + y * ny)
      a0 = Math.min(a0, x * ux + y * uy)
      a1 = Math.max(a1, x * ux + y * uy)
    }
    const span = hi - lo
    const offsets = [...new Set(points.map(([x, y]) => x * nx + y * ny - lo))]
      .sort((p, q) => p - q)
      .filter((d, i, all) => i === 0 || d - all[i - 1]! > planSize / 400)
    let g = 0
    for (const d of offsets) g = approxGcd(g, d)
    let ds: number[]
    let step: number
    if (span > EPSILON && g >= span / 24) {
      // 所有边的间距有公约数：按公约数等距铺，图形里的每条边都落在格线上；
      // 公约数太大（格子太稀）时再等分，等分后边依然在格线上
      step = g / Math.max(1, Math.round(g / floorTarget))
      ds = []
      for (let d = 0; d <= span + EPSILON; d += step) ds.push(d)
    } else {
      // 没有合适的公约数：每条边各画一条格线（像构造图那样），外侧按平均间距延伸
      ds = offsets
      step = offsets.length > 1 ? span / (offsets.length - 1) : floorTarget
    }
    const all = [...ds]
    for (let d = -step; d >= -floorReach; d -= step) all.push(d)
    for (let d = span + step; d <= span + floorReach; d += step) all.push(d)
    all.sort((p, q) => p - q)
    return {
      ux,
      uy,
      nx,
      ny,
      offsets: all.map((d) => lo + d),
      t0: a0 - floorReach,
      t1: a1 + floorReach,
    }
  })
  const lineOf = (f: (typeof families)[number], off: number) =>
    line(
      off * f.nx + f.t0 * f.ux,
      off * f.ny + f.t0 * f.uy,
      off * f.nx + f.t1 * f.ux,
      off * f.ny + f.t1 * f.uy,
    )
  const floor = families
    .flatMap((f) => f.offsets.map((off) => lineOf(f, off)))
    .join("")
  const firstFamily = families[0]
  const floorLines = firstFamily
    ? firstFamily.offsets.map((off) => lineOf(firstFamily, off)).join("")
    : ""
  // 两组格线的交点：解 n1·p = d1、n2·p = d2
  const cross = (d1: number, d2: number): [number, number] | null => {
    const [f1, f2] = families
    if (!f1 || !f2) return null
    const det = f1.nx * f2.ny - f1.ny * f2.nx
    if (Math.abs(det) < EPSILON) return null
    return [(d1 * f2.ny - f1.ny * d2) / det, (f1.nx * d2 - d1 * f2.nx) / det]
  }
  let floorDots = ""
  let floorCells = ""
  const [f1, f2] = families
  if (families.length === 2 && f1 && f2) {
    const r = planSize / 130
    f1.offsets.forEach((d1) => {
      f2.offsets.forEach((d2) => {
        const p = cross(d1, d2)
        if (!p) return
        const [x, y] = project(p[0], p[1])
        floorDots += `M${fmt(x - r)} ${fmt(y)}a${fmt(r)} ${fmt(r)} 0 1 0 ${fmt(r * 2)} 0a${fmt(r)} ${fmt(r)} 0 1 0 ${fmt(-r * 2)} 0`
      })
    })
    for (let i = 0; i < f1.offsets.length - 1; i++) {
      for (let j = 0; j < f2.offsets.length - 1; j++) {
        if ((i + j) % 2) continue
        const x0 = f1.offsets[i]!
        const x1 = f1.offsets[i + 1]!
        const y0 = f2.offsets[j]!
        const y1 = f2.offsets[j + 1]!
        const corners = [
          cross(x0, y0),
          cross(x1, y0),
          cross(x1, y1),
          cross(x0, y1),
        ]
        if (corners.some((c) => !c)) continue
        floorCells +=
          corners
            .map((c, k) => {
              const [x, y] = project(c![0], c![1])
              return `${k ? "L" : "M"}${fmt(x)} ${fmt(y)}`
            })
            .join("") + "Z"
      }
    }
  }

  const guides = directions
    .flatMap(({ ux, uy }) => {
      const nx = -uy
      const ny = ux
      let lo = Infinity
      let hi = -Infinity
      let a0 = Infinity
      let a1 = -Infinity
      for (const [x, y] of points) {
        const d = x * nx + y * ny
        const t = x * ux + y * uy
        lo = Math.min(lo, d)
        hi = Math.max(hi, d)
        a0 = Math.min(a0, t)
        a1 = Math.max(a1, t)
      }
      return [lo, hi].map((d) => {
        const t0 = a0 - reach
        const t1 = a1 + reach
        return line(
          d * nx + t0 * ux,
          d * ny + t0 * uy,
          d * nx + t1 * ux,
          d * ny + t1 * uy,
        )
      })
    })
    .join("")

  const viewBox = {
    x: bx0 - margin,
    y: by0 - margin,
    width: bx1 - bx0 + margin * 2,
    height: by1 - by0 + margin * 2,
  }
  return {
    viewBox,
    unit: size / 500,
    depth,
    top: rings.map(({ ring }) => ringPath(ring, depth)).join(""),
    tops: shapes.map((shape, index) => ({
      d: rings
        .filter((r) => r.shape === index)
        .map(({ ring }) => ringPath(ring, depth))
        .join(""),
      tone: shape.tone,
    })),
    walls,
    guides,
    floor,
    floorLines,
    floorDots,
    floorCells,
    heightScale: KZ,
  }
}

/** 高度为 h 时一面墙的路径：底边固定在 z = 0，顶边抬到 z = h。 */
function wallPath(
  { x0, y0, x1, y1 }: IsometricWall,
  height: number,
  heightScale = 1,
) {
  const h = height * heightScale
  return `M${fmt(x0)} ${fmt(y0 - h)}L${fmt(x1)} ${fmt(y1 - h)}L${fmt(x1)} ${fmt(y1)}L${fmt(x0)} ${fmt(y0)}Z`
}

/**
 * 投影前把平面形状绕包围盒中心旋转 `degrees` 度（y 向下坐标系里顺时针为正）。
 * 建议取 90 的整数倍：这样图形的横竖边始终沿等轴测斜轴，仍是一块平放的板；
 * 其他角度（如 -45°）会让顶面看起来像一堵立着的墙。
 */
function rotateShapes(
  shapes: readonly IsometricShape[],
  degrees: number,
): IsometricShape[] {
  if (!degrees) return shapes.map((s) => ({ ...s }))
  const all = shapes.flatMap((s) => [...s.outer, ...(s.holes ?? []).flat()])
  const xs = all.map(([x]) => x)
  const ys = all.map(([, y]) => y)
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2
  const r = (degrees * Math.PI) / 180
  const cos = Math.cos(r)
  const sin = Math.sin(r)
  const turn = (ring: readonly IsometricPoint[]): IsometricPoint[] =>
    ring.map(([x, y]) => [
      cx + (x - cx) * cos - (y - cy) * sin,
      cy + (x - cx) * sin + (y - cy) * cos,
    ])
  return shapes.map((s) => ({
    outer: turn(s.outer),
    holes: s.holes?.map(turn),
    tone: s.tone,
  }))
}

export { buildIsometricModel, ISOMETRIC_ELEVATION, rotateShapes, wallPath }
export type { IsometricModel, IsometricPoint, IsometricShape, IsometricWall }
