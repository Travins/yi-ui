"use client"

import {
  Check,
  ClipboardList,
  Code,
  Monitor,
  Rocket,
  Server,
  Terminal,
} from "lucide-react"

import { cn } from "@/lib/utils"
import {
  FlowBeam,
  FlowDiagram,
  FlowDiamond,
  FlowLabel,
  FlowNode,
  FlowReveal,
  FlowTypedText,
  flowArrival,
  flowRoute,
} from "@/registry/ui/flow-diagram/flow-diagram"

// 时间轴（秒）：按「需求 → 分叉 → 汇合 → 命令 → 代码 → 上线」依次推进
const DURATION = 9
const EXIT = 8.2
const REST = 8

const TITLE = "需求：任务看板"
const TITLE_AT = 0.3
const TITLE_INTERVAL = 0.12
const COMMAND = "pnpm build"
const COMMAND_INTERVAL = 0.1

// 色调表达分工：前端蓝、后端紫、构建与产物琥珀、上线绿；需求与分叉点保持中性
const TO_SPLIT = flowRoute([
  [108, 34],
  [108, 41],
])
const TO_BRANCHES = [
  flowRoute([
    [102, 47],
    [56, 47],
    [56, 61],
  ]),
  flowRoute([
    [114, 47],
    [160, 47],
    [160, 61],
  ]),
] as const
const TO_MERGE = [
  flowRoute([
    [56, 81],
    [56, 95],
    [102, 95],
  ]),
  flowRoute([
    [160, 81],
    [160, 95],
    [114, 95],
  ]),
] as const
const TO_INPUT = flowRoute([
  [108, 101],
  [108, 109],
])
const TO_CODE = flowRoute([
  [108, 133],
  [108, 149],
  [56, 149],
  [56, 159],
])
const TO_RESULT = flowRoute([
  [92, 169],
  [124, 169],
])

const SPLIT_AT = TITLE_AT + 7 * TITLE_INTERVAL + 0.3
const BRANCH_AT = SPLIT_AT + 0.3
const MERGE_AT = flowArrival(BRANCH_AT, TO_BRANCHES[0]) + 0.4
const INPUT_AT = flowArrival(MERGE_AT, TO_MERGE[0]) + 0.2
const COMMAND_AT = flowArrival(INPUT_AT, TO_INPUT) + 0.1
const CODE_AT = COMMAND_AT + COMMAND.length * COMMAND_INTERVAL + 0.3
const RESULT_BEAM_AT = flowArrival(CODE_AT, TO_CODE) + 0.1
const RESULT_AT = flowArrival(RESULT_BEAM_AT, TO_RESULT)

const BRANCHES = [
  { x: 56, label: "前端 UI", icon: Monitor, tone: "blue" },
  { x: 160, label: "后端 API", icon: Server, tone: "violet" },
] as const

/** 全栈开发：需求分出前后端两条分支，汇合后敲命令，再流向代码和上线。 */
function FlowDiagramFullstackDemo({ className }: { className?: string }) {
  return (
    <FlowDiagram
      className={cn("h-56 w-full max-w-md", className)}
      duration={DURATION}
      exit={EXIT}
      rest={REST}
    >
      <FlowBeam route={TO_SPLIT} at={SPLIT_AT} />
      {TO_BRANCHES.map((path, i) => (
        <FlowBeam
          key={`branch-${i}`}
          route={path}
          at={BRANCH_AT}
          tone={i === 0 ? BRANCHES[0].tone : BRANCHES[1].tone}
        />
      ))}
      {TO_MERGE.map((path, i) => (
        <FlowBeam
          key={`merge-${i}`}
          route={path}
          at={MERGE_AT}
          tone={i === 0 ? BRANCHES[0].tone : BRANCHES[1].tone}
        />
      ))}
      <FlowBeam route={TO_INPUT} at={INPUT_AT} tone="amber" />
      <FlowBeam route={TO_CODE} at={CODE_AT} tone="amber" />
      <FlowBeam route={TO_RESULT} at={RESULT_BEAM_AT} tone="green" />

      <FlowNode x={108} y={23} width={148} height={22}>
        <ClipboardList
          x={42}
          y={17}
          width={12}
          height={12}
          strokeWidth={1.5}
          aria-hidden="true"
          className="text-primary"
        />
        <FlowTypedText
          text={TITLE}
          at={TITLE_AT}
          interval={TITLE_INTERVAL}
          x={60}
          y={23}
        />
      </FlowNode>

      <FlowDiamond x={108} y={47} litAt={flowArrival(SPLIT_AT, TO_SPLIT)} />

      {BRANCHES.map(({ x, label, icon, tone }, i) => (
        <FlowNode
          key={label}
          x={x}
          y={71}
          width={76}
          icon={icon}
          label={label}
          tone={tone}
          litAt={flowArrival(
            BRANCH_AT,
            i === 0 ? TO_BRANCHES[0] : TO_BRANCHES[1],
          )}
        />
      ))}

      <FlowDiamond x={108} y={95} litAt={flowArrival(MERGE_AT, TO_MERGE[0])} />

      <FlowNode
        x={108}
        y={121}
        width={164}
        height={24}
        radius={4}
        tone="amber"
        litAt={flowArrival(INPUT_AT, TO_INPUT)}
      >
        <Terminal
          x={34}
          y={115}
          width={12}
          height={12}
          strokeWidth={1.5}
          aria-hidden="true"
          className="text-(--flow-tone)"
        />
        <FlowTypedText
          text={COMMAND}
          at={COMMAND_AT}
          interval={COMMAND_INTERVAL}
          x={52}
          y={121}
        />
      </FlowNode>

      <FlowNode
        x={56}
        y={169}
        width={72}
        icon={Code}
        label="代码"
        tone="amber"
        litAt={flowArrival(CODE_AT, TO_CODE)}
      />

      <FlowNode x={160} y={169} width={72} tone="green" litAt={RESULT_AT}>
        <Rocket
          x={134}
          y={163}
          width={12}
          height={12}
          strokeWidth={1.5}
          aria-hidden="true"
          className="text-(--flow-tone)"
        />
        <FlowLabel x={150} y={169} anchor="start">
          上线
        </FlowLabel>
        <FlowReveal at={RESULT_AT}>
          <Check
            x={174}
            y={163}
            width={12}
            height={12}
            strokeWidth={2}
            aria-hidden="true"
            className="text-(--flow-tone)"
          />
        </FlowReveal>
      </FlowNode>
    </FlowDiagram>
  )
}

export default FlowDiagramFullstackDemo
