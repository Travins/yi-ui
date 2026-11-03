// 纯函数，不依赖 React：服务端组件也可以直接调用

/** 光点飞行速度（像素/秒）：各段耗时由路径长度换算，同一张图里节奏才一致 */
const FLOW_BEAM_SPEED = 110
/** 连线上“流动”虚线纹理的前进速度（像素/秒）：比光点慢得多，只是常驻连接的呼吸感 */
const FLOW_LINE_SPEED = 14
/** 等宽字 10px 下的字符宽度，用来估算文字宽度（中文按全角 10px 计） */
const LATIN_ADVANCE = 6
const CJK_ADVANCE = 10
type FlowPoint = readonly [number, number]
type FlowRoute = { d: string; length: number }

function round(value: number) {
  return Math.round(value * 100) / 100
}

/**
 * 把折线变成圆角路径，并返回近似长度。
 * 长度要提前知道：光点的出现和到达时间都靠它换算，不用在浏览器里量。
 * 建议在组件外调用，每次渲染重新计算没有意义。
 */
function flowRoute(points: readonly FlowPoint[], radius = 6): FlowRoute {
  const first = points[0]
  if (!first) throw new TypeError("路径至少需要一个点")
  let d = `M${first[0]} ${first[1]}`
  let length = 0
  for (let index = 1; index < points.length; index += 1) {
    const [px, py] = points[index - 1]!
    const [cx, cy] = points[index]!
    const next = points[index + 1]
    const incoming = Math.hypot(cx - px, cy - py)
    length += incoming
    if (!next) {
      d += ` L${cx} ${cy}`
      continue
    }
    const [nx, ny] = next
    const outgoing = Math.hypot(nx - cx, ny - cy)
    const corner = Math.min(radius, incoming / 2, outgoing / 2)
    const inX = (cx - px) / incoming
    const inY = (cy - py) / incoming
    const outX = (nx - cx) / outgoing
    const outY = (ny - cy) / outgoing
    d += ` L${round(cx - inX * corner)} ${round(cy - inY * corner)}`
    d += ` Q${cx} ${cy} ${round(cx + outX * corner)} ${round(cy + outY * corner)}`
    // 二次贝塞尔拐角比两条直角边短约 0.4 倍半径
    length -= 0.4 * corner
  }
  return { d, length: round(length) }
}

/** 光点从 `at` 出发后到达终点的时刻，用来点亮目标节点。 */
function flowArrival(at: number, { length }: FlowRoute) {
  return at + length / FLOW_BEAM_SPEED
}

/**
 * 估算一段文字的宽度（设计像素），用来给图标 + 文字居中、摆放光标。
 * 不量真实字形，按“拉丁字符 6px、中文 10px”（10px 字号）线性换算，混排时请留一点余量。
 */
function flowTextWidth(text: string, fontSize = 10) {
  let width = 0
  for (const char of text)
    width += char.charCodeAt(0) > 0xff ? CJK_ADVANCE : LATIN_ADVANCE
  return (width * fontSize) / 10
}

export {
  FLOW_BEAM_SPEED,
  FLOW_LINE_SPEED,
  flowArrival,
  flowRoute,
  flowTextWidth,
}
export type { FlowPoint, FlowRoute }
