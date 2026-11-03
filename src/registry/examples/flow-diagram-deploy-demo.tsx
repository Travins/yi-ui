"use client"

import { Fragment, type SVGProps } from "react"
import { Bot, Cpu, MessageSquare, Plug } from "lucide-react"
import { siDeepseek, siQwen } from "simple-icons"

import { cn } from "@/lib/utils"
import {
  FlowBeam,
  FlowDiagram,
  FlowLabel,
  FlowNode,
  flowArrival,
  flowRoute,
  type FlowIcon,
} from "@/registry/ui/flow-diagram/flow-diagram"

// 时间轴（秒）：两轮请求先后流过；REST 落在最后一束光点之后、淡出之前
const DURATION = 7.2
const EXIT = 6.4
const REST = 6.3
const ROUNDS = [
  { intake: 0.4, dispatch: 1.7 },
  { intake: 3.6, dispatch: 4.9 },
] as const

/** 把 simple-icons 的品牌路径包成 FlowNode 能用的图标，颜色跟随节点的色调。 */
function brandIcon(path: string): FlowIcon {
  return function BrandIcon(props: SVGProps<SVGSVGElement>) {
    return (
      <svg viewBox="0 0 24 24" {...props}>
        <path d={path} fill="currentColor" stroke="none" />
      </svg>
    )
  }
}

// 色调表达流向：两个模型用冷色（Qwen 紫、DeepSeek 蓝），推理引擎琥珀，出口在请求到达时点亮成绿色（即「就绪」）
const MODELS = [
  { x: 56, label: "Qwen", icon: brandIcon(siQwen.path), tone: "violet" },
  { x: 160, label: "DeepSeek", icon: brandIcon(siDeepseek.path), tone: "blue" },
] as const
const TARGETS = [
  { x: 34, label: "API", icon: Plug },
  { x: 108, label: "Chat", icon: MessageSquare },
  { x: 182, label: "Agent", icon: Bot },
] as const

// 模型 → 推理引擎：先下行，再在 y=56 汇到中线
const intakeRoute = ({ x }: { x: number }) =>
  flowRoute([
    [x, 34],
    [x, 56],
    [108, 56],
    [108, 76],
  ])

// 推理引擎 → 三个出口：中间直下，两侧先下到 y=132 再横向分开
const dispatchRoute = ({ x }: { x: number }) =>
  flowRoute(
    x === 108
      ? [
          [108, 110],
          [108, 158],
        ]
      : [
          [108, 110],
          [108, 132],
          [x, 132],
          [x, 158],
        ],
  )

/** 大模型部署：模型汇入推理引擎，再分发到 API / Chat / Agent。 */
function FlowDiagramDeployDemo({ className }: { className?: string }) {
  const engineLit = flowArrival(ROUNDS[0].intake, intakeRoute(MODELS[0]))

  return (
    <FlowDiagram
      className={cn("h-56 w-full max-w-md", className)}
      duration={DURATION}
      exit={EXIT}
      rest={REST}
    >
      {ROUNDS.map((round, index) => (
        <Fragment key={round.intake}>
          {MODELS.map((model, i) => (
            <FlowBeam
              key={`in-${i}`}
              route={intakeRoute(model)}
              at={round.intake}
              tone={model.tone}
              base={index === 0}
            />
          ))}
          {TARGETS.map((target, i) => (
            <FlowBeam
              key={`out-${i}`}
              route={dispatchRoute(target)}
              at={round.dispatch}
              tone="green"
              base={index === 0}
              // 出口是常驻的服务连接：线画好后持续流动，只在第一轮设置，避免两层纹理叠加
              flow={index === 0}
            />
          ))}
        </Fragment>
      ))}

      {MODELS.map(({ x, label, icon, tone }) => (
        <FlowNode
          key={label}
          x={x}
          y={24}
          width={80}
          icon={icon}
          label={label}
          tone={tone}
          litAt={0.2}
        />
      ))}

      <FlowNode
        x={108}
        y={93}
        width={124}
        height={34}
        radius={5}
        tone="amber"
        litAt={engineLit}
      >
        <Cpu
          x={54}
          y={87}
          width={12}
          height={12}
          strokeWidth={1.5}
          aria-hidden="true"
          className="text-(--flow-tone)"
        />
        <FlowLabel x={120} y={88}>
          vLLM / SGLang
        </FlowLabel>
        <FlowLabel x={120} y={100} className="fill-muted-foreground text-[9px]">
          推理引擎
        </FlowLabel>
      </FlowNode>

      {TARGETS.map(({ x, label, icon }) => {
        const arrival = flowArrival(ROUNDS[0].dispatch, dispatchRoute({ x }))
        return (
          <FlowNode
            key={label}
            x={x}
            y={168}
            width={56}
            icon={icon}
            label={label}
            tone="green"
            litAt={arrival}
          />
        )
      })}
    </FlowDiagram>
  )
}

export default FlowDiagramDeployDemo
