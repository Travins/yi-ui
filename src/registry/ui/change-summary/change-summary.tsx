import * as React from "react"
import { ArrowDown, ArrowUp, Minus } from "lucide-react"

import { cn } from "@/lib/utils"
import { toneColor, type DataTone } from "@/registry/lib/data-display"

import {
  DEFAULT_LABELS,
  TONE_DIRECTIONS,
  type ChangeDirection,
  type ChangeSummaryChange,
  type ChangeSummaryLabels,
  type ChangeTone,
} from "./config"

// 好坏用固定的「绿 / 玫红」，不跟涨跌配色约定（`convention`）走：
// 约定只改涨跌色，而这里的颜色表达的是「好」和「坏」，错误率下降永远是好事。
const TONE_COLORS: Record<ChangeTone, DataTone> = {
  good: "green",
  bad: "rose",
  neutral: "muted",
}

const DIRECTION_ICONS = {
  up: ArrowUp,
  down: ArrowDown,
  flat: Minus,
} as const

// 入场动画：纯 CSS，服务端直接输出最终状态，没有脚本也完整显示。
// 前 12 行每行晚 50ms 依次淡入，之后的行与第 12 行同时出现；系统开启「减少动态效果」时不播放。
const STAGGER = Array.from(
  { length: 12 },
  (_, i) =>
    `[data-slot="change-summary-item"]:nth-child(${i + 1}){animation-delay:${i * 50}ms}`,
).join("\n")

const MOTION_CSS = `@media (prefers-reduced-motion: no-preference) {
@keyframes change-summary-in { from { opacity: 0; transform: translateY(4px) } }
[data-slot="change-summary-item"] { animation: change-summary-in 0.3s cubic-bezier(0.22, 1, 0.36, 1) both }
${STAGGER}
[data-slot="change-summary-item"]:nth-child(n+13) { animation-delay: 550ms }
}`

type ChangeSummaryProps = Omit<React.ComponentProps<"div">, "title"> & {
  /**
   * 标题；不传时用 `labels.title`（默认「改动摘要」）。
   * 只有传了 `changes`、`title`、`icon`、`period` 之一时才渲染默认头部与列表，否则只渲染外壳，内容全部由 `children` 组合
   */
  title?: React.ReactNode
  /** 标题前的图标，放一个 lucide 图标即可 */
  icon?: React.ReactNode
  /** 右侧的周期文字，如「本周」 */
  period?: React.ReactNode
  /** 变化列表；是纯数据，可以来自接口或聊天消息 */
  changes?: ChangeSummaryChange[]
  /** 覆盖默认文案（标题、读屏文字） */
  labels?: Partial<ChangeSummaryLabels>
}

/**
 * 改动摘要卡片：一个标题、一个周期，下面逐行列出指标的变化。
 * 两种写法：传 `changes` 数组一步到位；或者不传，用 `ChangeSummaryHeader`、`ChangeSummaryList`、
 * `ChangeSummaryItem` 自由组合。
 */
function ChangeSummary({
  className,
  title,
  icon,
  period,
  changes,
  labels,
  children,
  ...props
}: ChangeSummaryProps) {
  const text = { ...DEFAULT_LABELS, ...labels }
  const auto = changes !== undefined || title || icon || period
  return (
    <div
      data-slot="change-summary"
      className={cn(
        "@container flex w-full min-w-0 flex-col rounded-xl border border-edge bg-background text-sm text-card-foreground shadow-xs",
        className,
      )}
      {...props}
    >
      <ChangeSummaryMotion />
      {auto ? (
        <>
          <ChangeSummaryHeader>
            {icon ? <ChangeSummaryIcon>{icon}</ChangeSummaryIcon> : null}
            <ChangeSummaryTitle>{title ?? text.title}</ChangeSummaryTitle>
            {period ? <ChangeSummaryPeriod>{period}</ChangeSummaryPeriod> : null}
          </ChangeSummaryHeader>
          {changes && changes.length > 0 ? (
            <ChangeSummaryList>
              {changes.map((item, index) => (
                <ChangeSummaryItem key={`${item.label}-${index}`} {...item} labels={labels} />
              ))}
            </ChangeSummaryList>
          ) : null}
        </>
      ) : null}
      {children}
    </div>
  )
}

/** 样式由 React 19 按 `href` 去重并提升到 `<head>`，同一页放多少张卡片都只有一份。 */
function ChangeSummaryMotion() {
  return React.createElement(
    "style",
    { href: "change-summary-motion", precedence: "default" },
    MOTION_CSS,
  )
}

/** 头部：图标、标题、周期排成一行，下方一条细线。 */
function ChangeSummaryHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="change-summary-header"
      className={cn(
        "flex items-center gap-2 border-b border-edge px-4 py-3",
        className,
      )}
      {...props}
    />
  )
}

/** 标题前的图标，装饰性，不进读屏。 */
function ChangeSummaryIcon({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="change-summary-icon"
      aria-hidden="true"
      className={cn(
        "flex shrink-0 text-muted-foreground [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    />
  )
}

/** 标题，渲染成 `h3`；页面的标题层级不同时，直接用 `<ChangeSummaryTitle>` 的位置换成自己的标题元素。 */
function ChangeSummaryTitle({
  className,
  ...props
}: React.ComponentProps<"h3">) {
  return (
    <h3
      data-slot="change-summary-title"
      className={cn("min-w-0 truncate text-sm leading-5 font-medium", className)}
      {...props}
    />
  )
}

/** 右侧的周期文字，如「本周」。 */
function ChangeSummaryPeriod({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="change-summary-period"
      className={cn(
        "ml-auto shrink-0 text-xs text-muted-foreground tabular-nums",
        className,
      )}
      {...props}
    />
  )
}

/** 变化列表：`dl`，每一行是 `ChangeSummaryItem`；行与行之间用细线分隔。 */
function ChangeSummaryList({
  className,
  ...props
}: React.ComponentProps<"dl">) {
  return (
    <dl
      data-slot="change-summary-list"
      className={cn("m-0 flex flex-col divide-y divide-edge", className)}
      {...props}
    />
  )
}

type ChangeSummaryItemProps = Omit<React.ComponentProps<"div">, "children"> &
  ChangeSummaryChange & {
    /** 覆盖读屏文字（上升 / 下降 / 持平、好转 / 恶化 / 中性） */
    labels?: Partial<ChangeSummaryLabels>
  }

/**
 * 一行变化：`dt` 是指标名，`dd` 是趋势标记加一句话。
 * 方向和好坏分开：标记的箭头表示方向，颜色表示好坏；读屏会念出「方向，好坏：」，不只靠颜色。
 * 窄于 24rem 时指标名在上、变化在下；更宽时左右分布。
 */
function ChangeSummaryItem({
  className,
  label,
  change,
  tone,
  direction,
  labels,
  ...props
}: ChangeSummaryItemProps) {
  const text = { ...DEFAULT_LABELS, ...labels }
  const resolved = direction ?? TONE_DIRECTIONS[tone]
  const Icon = DIRECTION_ICONS[resolved]
  const mark = text.mark
    .replace("{direction}", text[resolved])
    .replace("{tone}", text[tone])
  return (
    <div
      data-slot="change-summary-item"
      data-tone={tone}
      data-direction={resolved}
      className={cn(
        "flex min-w-0 flex-col gap-1 px-4 py-3 @sm:flex-row @sm:items-baseline @sm:justify-between @sm:gap-4",
        className,
      )}
      {...props}
    >
      <dt
        data-slot="change-summary-label"
        className="min-w-0 text-[13px] leading-5 text-muted-foreground"
      >
        {label}
      </dt>
      <dd
        data-slot="change-summary-change"
        className="m-0 flex min-w-0 items-start gap-2 leading-5 @sm:max-w-[65%] @sm:justify-end @sm:text-right"
      >
        <span
          data-slot="change-summary-mark"
          aria-hidden="true"
          style={{ "--change-tone": toneColor(TONE_COLORS[tone]) } as React.CSSProperties}
          className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--change-tone)_14%,transparent)] text-[color:var(--change-tone)] @sm:order-2"
        >
          <Icon className="size-3.5" />
        </span>
        <span className="sr-only">{mark}</span>
        <span className="min-w-0 wrap-break-word text-foreground">{change}</span>
      </dd>
    </div>
  )
}

export {
  ChangeSummary,
  ChangeSummaryHeader,
  ChangeSummaryIcon,
  ChangeSummaryItem,
  ChangeSummaryList,
  ChangeSummaryPeriod,
  ChangeSummaryTitle,
}
export type {
  ChangeDirection,
  ChangeSummaryChange,
  ChangeSummaryItemProps,
  ChangeSummaryLabels,
  ChangeSummaryProps,
  ChangeTone,
}
