"use client"

import { Steps } from "@/registry/ui/steps/steps"
import { formatLabel, type Auth06Labels } from "./config"

type ProgressItem = {
  title: string
  description?: string
  /** 已跳过：完成后仍显示为未完成 */
  skipped?: boolean
}

/**
 * 步骤栏：`lg` 起是纵向步骤（已完成的可以点回去），以下收成一行「步骤 2 / 3 · 资料」加细进度条。
 * 两种形态只显示一种，另一种 display: none，读屏也只读到一份。
 */
function Auth06Progress({
  labels,
  items,
  index,
  done,
  locked,
  onSelect,
}: {
  labels: Auth06Labels
  items: ProgressItem[]
  /** 当前步骤序号，从 0 开始 */
  index: number
  done: boolean
  /** 提交中或已完成时不允许点回去 */
  locked: boolean
  onSelect: (index: number) => void
}) {
  const total = items.length
  const ratio = done ? 1 : (index + 1) / total
  return (
    <div data-slot="auth-06-progress">
      <div data-slot="auth-06-progress-compact" className="lg:hidden">
        <p
          aria-live="polite"
          className="text-sm text-muted-foreground tabular-nums"
        >
          {done
            ? labels.progressDone
            : formatLabel(labels.progress, {
                current: index + 1,
                total,
                title: items[index]?.title ?? "",
              })}
        </p>
        <div
          aria-hidden="true"
          className="mt-2 h-1 overflow-hidden rounded-full bg-muted"
        >
          <div
            data-slot="auth-06-progress-bar"
            className="h-full rounded-full bg-primary transition-[width] duration-300 motion-reduce:transition-none"
            style={{ width: `${ratio * 100}%` }}
          />
        </div>
      </div>
      <Steps
        // 圆点自带 6px 内边距，向左让出，与上方标题左对齐
        className="-ml-1.5 hidden lg:block"
        orientation="vertical"
        items={items.map(({ skipped, ...item }) => ({
          ...item,
          status: done ? (skipped ? "wait" : "finish") : undefined,
        }))}
        value={index}
        clickable={locked ? "none" : "completed"}
        labels={{ list: labels.steps }}
        onValueChange={onSelect}
      />
    </div>
  )
}

export { Auth06Progress }
