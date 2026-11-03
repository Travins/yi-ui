import { Check } from "lucide-react"

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
  type FlowPoint,
} from "@/registry/ui/flow-diagram/flow-diagram"

const SERVERS = [
  { y: 34, label: "GitHub", tool: "search_issues" },
  { y: 95, label: "文件系统", tool: "read_file" },
  { y: 156, label: "数据库", tool: "run_query" },
] as const

// 请求和结果走同一条线，所以返回的路径只是把端点倒过来
const reversed = (points: readonly FlowPoint[]) => [...points].reverse()

const TO_CLIENT_POINTS = [
  [68, 95],
  [122, 95],
] as const
const TO_SPLIT_POINTS = [
  [174, 95],
  [188, 95],
] as const
const serverPoints = ({ y }: { y: number }) =>
  y === 95
    ? ([
        [200, 95],
        [210, 95],
      ] as const)
    : ([
        [194, y === 34 ? 89 : 101],
        [194, y],
        [210, y],
      ] as const)

const TO_CLIENT = flowRoute(TO_CLIENT_POINTS)
const BACK_TO_AGENT = flowRoute(reversed(TO_CLIENT_POINTS))
const TO_SPLIT = flowRoute(TO_SPLIT_POINTS)
const BACK_TO_CLIENT = flowRoute(reversed(TO_SPLIT_POINTS))
const SERVER_ROUTES = SERVERS.map((server) => ({
  outgoing: flowRoute(serverPoints(server)),
  incoming: flowRoute(reversed(serverPoints(server))),
}))
const DATABASE = 2
const DATABASE_OUT = flowRoute(serverPoints(SERVERS[2]))
const DATABASE_BACK = flowRoute(reversed(serverPoints(SERVERS[2])))

// 时间轴（秒）：先 tools/list 向三个服务器发现能力，再 tools/call 调用其中一个并把结果带回
const LIST_AT = 0.5
const CLIENT_AT = flowArrival(LIST_AT, TO_CLIENT)
const SPLIT_AT = CLIENT_AT + 0.15
const SPLIT_LIT = flowArrival(SPLIT_AT, TO_SPLIT)
const DISCOVER = SPLIT_LIT + 0.1 + 0.8
// 路径长短不一，反推出发时刻让三束光点同时到达
const discoveries = SERVER_ROUTES.map(({ outgoing }) => ({
  route: outgoing,
  at: DISCOVER - outgoing.length / FLOW_BEAM_SPEED,
}))
const REPORT_AT = DISCOVER + 0.3
const REPORTED = Math.max(
  ...SERVER_ROUTES.map(({ incoming }) => flowArrival(REPORT_AT, incoming)),
)
const CALL_AT = REPORTED + 0.4
const CALL_CLIENT_AT = flowArrival(CALL_AT, TO_CLIENT) + 0.1
const CALL_SPLIT_AT = flowArrival(CALL_CLIENT_AT, TO_SPLIT) + 0.1
const RUN_AT = flowArrival(CALL_SPLIT_AT, DATABASE_OUT)
const RUN_END = RUN_AT + 0.8
const RESULT_AT = RUN_END + 0.1
const RESULT_SPLIT_AT = flowArrival(RESULT_AT, DATABASE_BACK) + 0.1
const RESULT_CLIENT_AT = flowArrival(RESULT_SPLIT_AT, BACK_TO_CLIENT) + 0.1
const ANSWER_AT = flowArrival(RESULT_CLIENT_AT, BACK_TO_AGENT)

const REST = ANSWER_AT + 0.7
const EXIT = REST + 0.8
const DURATION = EXIT + 0.8

/** MCP 工具调用：Agent 经由客户端先发现能力，再调用某个工具，结果沿原路返回。 */
export default function FlowDiagramMcpDemo() {
  return (
    <FlowDiagram
      background="none"
      width={320}
      height={190}
      duration={DURATION}
      exit={EXIT}
      rest={REST}
      className="w-full max-w-md"
    >
      <FlowBeam route={TO_CLIENT} at={LIST_AT} />
      <FlowBeam route={TO_SPLIT} at={SPLIT_AT} />
      {discoveries.map(({ route, at }, i) => (
        <FlowBeam key={`list-${i}`} route={route} at={at} />
      ))}
      {SERVER_ROUTES.map(({ incoming: route }, i) => (
        <FlowBeam
          key={`report-${i}`}
          route={route}
          at={REPORT_AT}
          base={false}
        />
      ))}
      <FlowBeam route={TO_CLIENT} at={CALL_AT} base={false} />
      <FlowBeam route={TO_SPLIT} at={CALL_CLIENT_AT} base={false} />
      <FlowBeam route={DATABASE_OUT} at={CALL_SPLIT_AT} base={false} />
      <FlowBeam route={DATABASE_BACK} at={RESULT_AT} base={false} />
      <FlowBeam route={BACK_TO_CLIENT} at={RESULT_SPLIT_AT} base={false} />
      <FlowBeam route={BACK_TO_AGENT} at={RESULT_CLIENT_AT} base={false} />

      <FlowNode x={38} y={95} width={60} litAt={0.2}>
        <FlowLabel x={50} y={95}>
          Agent
        </FlowLabel>
        <FlowReveal at={ANSWER_AT}>
          <Check
            x={15}
            y={89}
            width={12}
            height={12}
            strokeWidth={2}
            className="text-primary"
          />
        </FlowReveal>
      </FlowNode>
      <FlowReveal at={LIST_AT}>
        <FlowLabel x={95} y={81} className="fill-muted-foreground text-[9px]">
          JSON-RPC
        </FlowLabel>
      </FlowReveal>

      <FlowNode x={148} y={95} width={52} litAt={CLIENT_AT}>
        <FlowLabel x={148} y={95}>
          MCP
        </FlowLabel>
      </FlowNode>
      <FlowDiamond x={194} y={95} litAt={SPLIT_LIT} />

      {SERVERS.map(({ y, label, tool }, i) => (
        <FlowNode
          key={label}
          x={256}
          y={y}
          width={92}
          height={30}
          radius={5}
          litAt={DISCOVER}
        >
          <FlowLabel x={263} y={y - 6}>
            {label}
          </FlowLabel>
          <FlowLabel
            x={263}
            y={y + 7}
            className="fill-muted-foreground text-[9px]"
          >
            {tool}
          </FlowLabel>
          {i === DATABASE ? (
            <>
              <FlowSpinner
                x={223}
                y={y}
                size={10}
                at={RUN_AT}
                until={RUN_END}
              />
              <FlowStatusDot x={223} y={y} at={RUN_END} />
            </>
          ) : (
            <FlowStatusDot x={223} y={y} at={DISCOVER} tone="primary" />
          )}
        </FlowNode>
      ))}
    </FlowDiagram>
  )
}
