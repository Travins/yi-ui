import {
  FlowBeam,
  FlowDiagram,
  FlowEdge,
  FlowNode,
  FlowSpinner,
  FlowStatusDot,
  flowArrival,
  flowRoute,
} from "@/registry/ui/flow-diagram/flow-diagram"

// 每个模型一种颜色：请求被路由到谁，光点、连线和节点就是谁的颜色
const MODELS = [
  { y: 36, label: "轻量模型", description: "简单问答", tone: "cyan" },
  { y: 100, label: "推理模型", description: "复杂推理", tone: "violet" },
  { y: 164, label: "长文本模型", description: "超长文档", tone: "amber" },
] as const

const TO_ROUTER = flowRoute([
  [72, 100],
  [112, 100],
])
// 时间轴（秒）：三个请求依次进来，每个被路由到不同的模型
const ROUND = 1.7
const PROCESS = 0.7
const RUNS = MODELS.map((model, i) => {
  const { y } = model
  const route = flowRoute(
    y === 100
      ? [
          [176, 100],
          [212, 100],
        ]
      : [
          [176, y === 36 ? 90 : 110],
          [194, y === 36 ? 90 : 110],
          [194, y],
          [212, y],
        ],
  )
  const requestAt = 0.5 + i * ROUND
  const routedAt = flowArrival(requestAt, TO_ROUTER) + 0.2
  const arriveAt = flowArrival(routedAt, route)
  return {
    ...model,
    route,
    requestAt,
    routedAt,
    arriveAt,
    doneAt: arriveAt + PROCESS,
  }
})
const REST = Math.max(...RUNS.map(({ doneAt }) => doneAt)) + 0.8
const EXIT = REST + 0.8
const DURATION = EXIT + 0.8

/** 多模型路由：请求经路由器分流到不同的模型，每个模型一种颜色。 */
export default function FlowDiagramRouterDemo() {
  return (
    <FlowDiagram
      background={
        // 自定义底纹：中心一圈淡紫，呼应路由到的多个模型
        <div className="size-full bg-radial from-(--flow-violet)/12 to-transparent to-70%" />
      }
      width={320}
      height={200}
      duration={DURATION}
      exit={EXIT}
      rest={REST}
      className="w-full max-w-md"
    >
      {/* 入口的线只画一次，三个请求的光点都走这条线，所以光点都不带底线 */}
      <FlowEdge route={TO_ROUTER} at={0.1} />
      {RUNS.map(({ tone, requestAt }, i) => (
        <FlowBeam
          key={`request-${i}`}
          route={TO_ROUTER}
          at={requestAt}
          base={false}
          tone={tone}
        />
      ))}
      {/* 路由器到各模型的连线是常驻的，光点沿着它们走 */}
      {RUNS.map(({ tone, route, routedAt }, i) => (
        <FlowBeam key={`route-${i}`} route={route} at={routedAt} tone={tone} />
      ))}

      <FlowNode x={40} y={100} width={64} litAt={0.2} label="请求" />
      <FlowNode
        x={144}
        y={100}
        width={64}
        height={36}
        shape="box"
        litAt={RUNS.at(0)?.routedAt}
        label="路由"
        description="按任务分流"
      />

      {RUNS.map(({ y, label, description, tone, arriveAt, doneAt }) => (
        <FlowNode
          key={label}
          x={266}
          y={y}
          width={92}
          height={34}
          shape="box"
          tone={tone}
          litAt={arriveAt}
          label={label}
          description={description}
        >
          {/* 处理中转圈，处理完换成状态点；两者都继承节点的颜色 */}
          <FlowSpinner x={230} y={y} size={10} at={arriveAt} until={doneAt} />
          <FlowStatusDot x={230} y={y} at={doneAt} />
        </FlowNode>
      ))}
    </FlowDiagram>
  )
}
