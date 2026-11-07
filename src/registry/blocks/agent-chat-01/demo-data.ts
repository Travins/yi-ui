import type { UIMessage } from "ai"
import { Activity, CalendarDays, Database, Layers, Server } from "lucide-react"

const initialMessages: UIMessage[] = [
  {
    id: "welcome-question",
    role: "user",
    parts: [{ type: "text", text: "这个工作区可以帮我做什么？" }],
  },
  {
    id: "welcome-answer",
    role: "assistant",
    parts: [
      {
        type: "reasoning",
        text: "根据工作区提供的三个演示场景，整理可以验证的问题方向。",
        state: "done",
      },
      {
        type: "dynamic-tool",
        toolName: "读取工作区摘要",
        toolCallId: "welcome-tool",
        state: "output-available",
        input: { scope: "demo" },
        output: {
          areas: ["应用监控", "模型部署", "前端工程"],
          mode: "离线演示",
        },
      },
      {
        type: "text",
        text: "我已经准备好了。你可以从以下问题开始：\n\n- 为什么 API 可用率下降了？\n- 帮我检查 vLLM 推理服务的显存占用。\n- pnpm install 在 CI 里失败。\n- 这周数据有什么变化？\n- 排查 orders 服务的慢查询。\n\n点击左侧的场景，或直接输入问题。我会逐步展示检查过程、工具结果与参考来源。",
      },
    ],
  },
]
const scenarios = [
  {
    icon: Activity,
    label: "应用监控",
    question: "为什么 API 可用率下降了？",
    description: "关联错误、上游与最近一次发布",
  },
  {
    icon: Server,
    label: "模型部署",
    question: "帮我检查 vLLM 推理服务的显存占用",
    description: "查看 GPU、KV cache 与并发配置",
  },
  {
    icon: Layers,
    label: "前端工程",
    question: "pnpm install 在 CI 里失败",
    description: "从构建日志定位依赖安装问题",
  },
  {
    icon: CalendarDays,
    label: "周报摘要",
    question: "这周数据有什么变化？",
    description: "连续调用多个工具，结尾附改动摘要",
  },
  {
    icon: Database,
    label: "慢查询排查",
    question: "排查 orders 服务的慢查询",
    description: "有一次工具调用失败，可以点「重试」",
  },
]

export { initialMessages, scenarios }
