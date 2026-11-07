import type { ChartMetricProps } from "@/registry/ui/chart-card/chart-card"
import type { ChangeSummaryChange } from "@/registry/ui/change-summary/change-summary"
import type {
  MiniChartProps,
  MiniRingProps,
} from "@/registry/ui/mini-chart/mini-chart"

type AgentChatMode = "embedded" | "floating"

/** 图表块的公共字段：卡片标题、说明与读屏名称。 */
type ChatChartBase = {
  title: string
  description?: string
  /** 读屏名称，说清楚这张图表示什么 */
  label: string
}

/**
 * 助手回答里的图表块，以 `data-chart` 数据块的形式出现在消息里。
 * 内容必须能被 JSON 序列化（不放函数），这样既能来自流式接口，也能随历史消息保存。
 */
type ChatChart =
  | (ChatChartBase & {
      /** 走势 / 分布：面积、折线、阶梯线或柱图，上方可带一行指标 */
      kind: "series"
      type?: MiniChartProps["type"]
      data: { label: string; value: number }[]
      seriesLabel: string
      tone?: MiniChartProps["tone"]
      format?: MiniChartProps["format"]
      highlight?: MiniChartProps["highlight"]
      metrics?: {
        label: string
        value: string
        tone?: ChartMetricProps["tone"]
      }[]
    })
  | (ChatChartBase & {
      /** 几项占用率并排：每项一个进度环 */
      kind: "rings"
      items: {
        label: string
        value: number
        max?: number
        /** 环中央的文字，如「90%」 */
        display: string
        tone?: MiniRingProps["tone"]
      }[]
    })

/**
 * 助手回答里的改动摘要块，以 `data-changes` 数据块的形式出现在消息里，渲染成 `ChangeSummary`。
 * 只含字符串，可以直接 JSON 序列化。
 */
type ChatChanges = {
  /** 卡片标题；不传时用 ChangeSummary 的默认标题「改动摘要」 */
  title?: string
  /** 右上角的周期文字，如「本周」 */
  period?: string
  changes: ChangeSummaryChange[]
}

/** 用户点「重试」时交给 `onRetryTool` 的信息。 */
type ToolRetryEvent = {
  messageId: string
  toolCallId: string
  toolName: string
  input: unknown
}

/**
 * `onRetryTool` 的返回值：
 * - 返回 `{ output }`：区块把这次调用改成「已完成」并显示 output；
 * - 抛出 Error：区块把这次调用改成「失败」并显示 `Error.message`；
 * - 返回 `undefined`：区块不改消息，由你自己通过 transport / `setMessages` 更新。
 */
type ToolRetryResult = { output: unknown } | undefined

export type {
  AgentChatMode,
  ChatChanges,
  ChatChart,
  ToolRetryEvent,
  ToolRetryResult,
}
