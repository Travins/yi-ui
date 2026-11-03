"use client"

import {
  Bot,
  Database,
  Globe,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Terminal,
  Wrench,
} from "lucide-react"

import { cn } from "@/lib/utils"
import {
  FlowBeam,
  FlowDiagram,
  FlowNode,
  FlowSpinner,
  FlowStatusDot,
  flowArrival,
  flowRoute,
  type FlowPoint,
} from "@/registry/ui/flow-diagram/flow-diagram"

// 色调表达角色：三个入口蓝、Agent 紫、三类能力各一种颜色、返回的结果绿
const CLIENTS = [
  { y: 46, label: "Web", icon: Globe, requestAt: 0.3 },
  { y: 115, label: "App", icon: Smartphone, requestAt: 0.7 },
  { y: 184, label: "CLI", icon: Terminal, requestAt: 1.1 },
] as const
const TOOLS = [
  {
    y: 44,
    label: "知识库",
    description: "向量检索",
    icon: Database,
    tone: "cyan",
    work: 0.5,
  },
  {
    y: 115,
    label: "工具",
    description: "MCP 调用",
    icon: Wrench,
    tone: "amber",
    work: 0.9,
  },
  {
    y: 186,
    label: "大模型",
    description: "流式推理",
    icon: Sparkles,
    tone: "rose",
    work: 1.4,
  },
] as const

const reversed = (points: readonly FlowPoint[]) => [...points].reverse()

// 入口 → 网关：上下两个先横向再汇到中线，中间的直接进网关
const clientPoints = ({ y }: { y: number }) =>
  y === 115
    ? ([
        [62, 115],
        [85, 115],
      ] as const)
    : ([
        [62, y],
        [74, y],
        [74, 115],
        [85, 115],
      ] as const)

const TO_AGENT = flowRoute([
  [131, 115],
  [150, 115],
])
const BACK_TO_GATEWAY = flowRoute([
  [150, 115],
  [131, 115],
])
// Agent → 三类能力：中间直连，上下两路先贴着 Agent 出来再分开
const toolPoints = ({ y }: { y: number }) =>
  y === 115
    ? ([
        [222, 115],
        [270, 115],
      ] as const)
    : ([
        [222, y === 44 ? 103 : 127],
        [246, y === 44 ? 103 : 127],
        [246, y],
        [270, y],
      ] as const)
const REQUESTS = CLIENTS.map((client) => {
  const route = flowRoute(clientPoints(client))
  const at = client.requestAt
  return { ...client, route, at, forwardAt: flowArrival(at, route) + 0.1 }
})
const GATEWAY_AT = Math.min(
  ...REQUESTS.map(({ at, route }) => flowArrival(at, route)),
)
const FIRST_AT = Math.min(...REQUESTS.map(({ forwardAt }) => forwardAt))
const FIRST = REQUESTS.findIndex(({ forwardAt }) => forwardAt === FIRST_AT)
const AGENT_AT = flowArrival(FIRST_AT, TO_AGENT)
const DISPATCH_AT = AGENT_AT + 0.2
const RUNS = TOOLS.map((tool) => {
  const points = toolPoints(tool)
  const outgoing = flowRoute(points)
  const incoming = flowRoute(reversed(points))
  const arriveAt = flowArrival(DISPATCH_AT, outgoing)
  return { ...tool, outgoing, incoming, arriveAt, doneAt: arriveAt + tool.work }
})
const MERGED_AT = Math.max(
  ...RUNS.map(({ doneAt, incoming }) => flowArrival(doneAt, incoming)),
)
const REPLY_AT = MERGED_AT + 0.2
const GATEWAY_BACK_AT = flowArrival(REPLY_AT, BACK_TO_GATEWAY) + 0.05
const RESPONSES = CLIENTS.map((client, i) => ({
  route: flowRoute(reversed(clientPoints(client))),
  at: GATEWAY_BACK_AT + i * 0.12,
}))
const DELIVERED_AT = RESPONSES.map(({ at, route }) => flowArrival(at, route))

const REST = Math.max(...DELIVERED_AT) + 0.8
const EXIT = REST + 0.8
const DURATION = EXIT + 0.8

/**
 * AI 应用全链路：多端请求经网关进入 Agent，Agent 并行调度知识库、工具与大模型，
 * 三路结果汇总后原路返回。专为封面和缩略图设计：多色、多路并行、静帧也完整。
 */
export default function FlowDiagramShowcaseDemo({
  className,
  speed,
}: {
  className?: string
  speed?: number
}) {
  return (
    <FlowDiagram
      background="grid"
      width={360}
      height={230}
      fit="contain"
      duration={DURATION}
      exit={EXIT}
      rest={REST}
      speed={speed}
      className={cn(
        "aspect-[360/230] w-full max-w-xl p-3 max-sm:-mx-3 max-sm:w-[calc(100%+1.5rem)] max-sm:max-w-none max-sm:p-0",
        className,
      )}
    >
      {/* 请求：三个入口错开出发，进网关前汇成一路 */}
      {REQUESTS.map(({ route, at }, i) => (
        <FlowBeam key={`request-${i}`} route={route} at={at} tone="blue" />
      ))}
      {/* 网关 → Agent：共用一条线，只有最早的一束带底线 */}
      {REQUESTS.map(({ forwardAt: at }, i) => (
        <FlowBeam
          key={`forward-${i}`}
          route={TO_AGENT}
          at={at}
          base={i === FIRST}
          tone="violet"
        />
      ))}
      {/* Agent 到各能力的线是常驻连接，画好后持续流动 */}
      {RUNS.map(({ outgoing: route, tone }, i) => (
        <FlowBeam
          key={`dispatch-${i}`}
          route={route}
          at={DISPATCH_AT}
          tone={tone}
          flow
        />
      ))}
      {RUNS.map(({ incoming: route, doneAt, tone }, i) => (
        <FlowBeam
          key={`result-${i}`}
          route={route}
          at={doneAt}
          tone={tone}
          base={false}
        />
      ))}
      <FlowBeam
        route={BACK_TO_GATEWAY}
        at={REPLY_AT}
        tone="green"
        base={false}
      />
      {RESPONSES.map(({ route, at }, i) => (
        <FlowBeam
          key={`response-${i}`}
          route={route}
          at={at}
          tone="green"
          base={false}
        />
      ))}

      {REQUESTS.map(({ y, label, icon, at }, i) => (
        <FlowNode
          key={label}
          x={34}
          y={y}
          width={56}
          icon={icon}
          label={label}
          tone="blue"
          litAt={at - 0.1}
        >
          {/* 结果送达后亮起绿色状态点 */}
          <FlowStatusDot x={57} y={y} at={DELIVERED_AT[i]} tone="green" />
        </FlowNode>
      ))}

      <FlowNode
        x={108}
        y={115}
        width={46}
        icon={ShieldCheck}
        label="网关"
        litAt={GATEWAY_AT}
      />

      <FlowNode
        x={186}
        y={115}
        width={72}
        height={40}
        shape="box"
        icon={Bot}
        label="Agent"
        description="编排"
        tone="violet"
        litAt={AGENT_AT}
      >
        {/* 等三路结果期间转圈，汇总完成后换成绿色状态点 */}
        <FlowSpinner x={215} y={103} size={9} at={AGENT_AT} until={MERGED_AT} />
        <FlowStatusDot x={215} y={103} at={MERGED_AT} tone="green" />
      </FlowNode>

      {RUNS.map(({ y, label, description, icon, tone, arriveAt, doneAt }) => (
        <FlowNode
          key={label}
          x={312}
          y={y}
          width={84}
          height={32}
          shape="box"
          icon={icon}
          label={label}
          description={description}
          tone={tone}
          litAt={arriveAt}
        >
          <FlowSpinner
            x={343}
            y={y - 6}
            size={9}
            at={arriveAt}
            until={doneAt}
          />
          <FlowStatusDot x={343} y={y - 6} at={doneAt} tone="green" />
        </FlowNode>
      ))}
    </FlowDiagram>
  )
}
