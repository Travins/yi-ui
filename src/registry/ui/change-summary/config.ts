import type { Trend } from "@/registry/lib/data-display"

/** 好坏：与涨跌方向分开表达。错误率下降是 `good` 加 `down`。 */
type ChangeTone = "good" | "bad" | "neutral"

/** 方向；不传时按 `tone` 推断：good 向上、bad 向下、neutral 持平。 */
type ChangeDirection = Trend

/**
 * 一行变化。只含字符串，可以直接 JSON 序列化，
 * 方便放进接口返回值或聊天消息的数据块里传输。
 */
type ChangeSummaryChange = {
  /** 指标名，如「错误率」 */
  label: string
  /** 一句话描述变化，如「下降 0.3 个百分点，至 1.2%」 */
  change: string
  /** 好坏：`good` 好转、`bad` 恶化、`neutral` 没有好坏之分 */
  tone: ChangeTone
  /** 方向；不传时按 `tone` 推断 */
  direction?: ChangeDirection
}

type ChangeSummaryLabels = {
  /** 没有传 `title` 时的默认标题 */
  title: string
  up: string
  down: string
  flat: string
  good: string
  bad: string
  neutral: string
  /**
   * 读屏文字模板，放在每行变化文字前面，`{direction}` 和 `{tone}` 会被替换成上面的方向与好坏文字。
   * 英文可以写成 `"{direction}, {tone}: "`
   */
  mark: string
}

const DEFAULT_LABELS: ChangeSummaryLabels = {
  title: "改动摘要",
  up: "上升",
  down: "下降",
  flat: "持平",
  good: "好转",
  bad: "恶化",
  neutral: "中性",
  mark: "{direction}，{tone}：",
}

const TONE_DIRECTIONS: Record<ChangeTone, ChangeDirection> = {
  good: "up",
  bad: "down",
  neutral: "flat",
}

export { DEFAULT_LABELS, TONE_DIRECTIONS }
export type {
  ChangeDirection,
  ChangeSummaryChange,
  ChangeSummaryLabels,
  ChangeTone,
}
