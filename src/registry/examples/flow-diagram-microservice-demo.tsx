import {
  FLOW_BEAM_SPEED,
  FlowBeam,
  FlowDiagram,
  FlowDiamond,
  FlowLabel,
  FlowNode,
  FlowReveal,
  FlowSpinner,
  FlowStatusDot,
  flowArrival,
  flowRoute,
} from "@/registry/ui/flow-diagram/flow-diagram"

// 每项服务的耗时：动画里 40ms 对应 1 秒，慢的服务让汇合点多等一会儿；
// 每项服务一种颜色，从扇出的光点、节点到返回的光点都用它，一眼就能追到哪条线是谁的
const SERVICES = [
  { y: 40, label: "用户服务", ms: 12, tone: "blue" },
  { y: 110, label: "订单服务", ms: 64, tone: "violet" },
  { y: 180, label: "库存服务", ms: 28, tone: "amber" },
] as const
const MS_PER_SECOND = 40

const TO_SPLIT = flowRoute([
  [68, 110],
  [92, 110],
])
const fanOut = ({ y }: { y: number }) =>
  flowRoute(
    y === 110
      ? [
          [104, 110],
          [126, 110],
        ]
      : [
          [98, y === 40 ? 104 : 116],
          [98, y],
          [126, y],
        ],
  )

const fanIn = ({ y }: { y: number }) =>
  flowRoute(
    y === 110
      ? [
          [194, 110],
          [232, 110],
        ]
      : [
          [194, y],
          [238, y],
          [238, y === 40 ? 104 : 116],
        ],
  )

const TO_REPLY = flowRoute([
  [244, 110],
  [256, 110],
])

// 时间轴（秒）：请求扇出，三条线同时到达；各服务按自己的耗时返回，汇合点等最慢的那个
const SPLIT_AT = 0.5
const ARRIVE = 1.9
// 长短不一的路径反推出发时刻，让三束光点同时到达
const RUNS = SERVICES.map((service) => {
  const out = fanOut(service)
  return {
    ...service,
    out,
    incoming: fanIn(service),
    outAt: ARRIVE - out.length / FLOW_BEAM_SPEED,
    doneAt: ARRIVE + service.ms / MS_PER_SECOND,
  }
})
const MERGED = Math.max(
  ...RUNS.map(({ doneAt, incoming }) => flowArrival(doneAt, incoming)),
)
const REPLY_AT = MERGED + 0.15
const REPLIED = flowArrival(REPLY_AT, TO_REPLY)
// 总耗时 = 最慢的服务 + 网关与汇合的 2ms 开销
const TOTAL = Math.max(...SERVICES.map(({ ms }) => ms)) + 2

const REST = REPLIED + 0.7
const EXIT = REST + 0.8
const DURATION = EXIT + 0.8

/** 微服务请求链路：网关扇出到多个服务并行处理，耗时各异，最后汇合成一个响应。 */
export default function FlowDiagramMicroserviceDemo() {
  return (
    <FlowDiagram
      width={320}
      height={220}
      duration={DURATION}
      exit={EXIT}
      rest={REST}
      className="w-full max-w-md"
    >
      <FlowBeam route={TO_SPLIT} at={SPLIT_AT} />
      {RUNS.map(({ out: route, outAt, tone }, i) => (
        <FlowBeam key={`out-${i}`} route={route} at={outAt} tone={tone} />
      ))}
      {RUNS.map(({ incoming: route, doneAt, tone }, i) => (
        <FlowBeam key={`in-${i}`} route={route} at={doneAt} tone={tone} />
      ))}
      <FlowBeam route={TO_REPLY} at={REPLY_AT} tone="green" />

      <FlowNode x={40} y={110} width={56} litAt={0.2}>
        <FlowLabel x={40} y={110}>
          网关
        </FlowLabel>
      </FlowNode>
      <FlowDiamond x={98} y={110} litAt={flowArrival(SPLIT_AT, TO_SPLIT)} />

      {RUNS.map(({ y, label, ms, tone, doneAt }) => (
        <g key={label}>
          {/* 节点的色调会传给里面的加载圈和状态点，不用再各写一遍 */}
          <FlowNode x={160} y={y} width={68} tone={tone} litAt={ARRIVE}>
            <FlowSpinner x={138} y={y} size={9} at={ARRIVE} until={doneAt} />
            <FlowStatusDot x={138} y={y} at={doneAt} />
            <FlowLabel x={165} y={y}>
              {label}
            </FlowLabel>
          </FlowNode>
          <FlowReveal at={doneAt}>
            <FlowLabel
              x={213}
              y={y - 9}
              className="fill-muted-foreground text-[9px]"
            >
              {ms}ms
            </FlowLabel>
          </FlowReveal>
        </g>
      ))}

      <FlowDiamond x={238} y={110} tone="green" litAt={MERGED} />
      <FlowNode x={284} y={110} width={56} tone="green" litAt={REPLIED}>
        <FlowLabel x={284} y={110}>
          响应
        </FlowLabel>
      </FlowNode>
      <FlowReveal at={REPLIED}>
        <FlowLabel x={284} y={130} tone="green" className="text-[9px]">
          {TOTAL}ms
        </FlowLabel>
      </FlowReveal>
    </FlowDiagram>
  )
}
