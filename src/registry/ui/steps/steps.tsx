"use client"

import { cva } from "class-variance-authority"
import { Check } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useControllableState } from "@/registry/hooks/use-controllable-state"

import { DEFAULT_LABELS } from "./config"
import type { StepStatus, StepsProps } from "./types"

const stepsVariants = cva("@container/steps w-full min-w-0", {
  variants: {
    size: {
      sm: "text-xs [--steps-dot:1.25rem]",
      default: "text-sm [--steps-dot:1.5rem]",
    },
    variant: { default: "", compact: "" },
  },
  defaultVariants: { size: "default", variant: "default" },
})

/** 多步流程的进度与回退导航；前进与业务校验由调用方处理。 */
function Steps({
  items,
  value: valueProp,
  defaultValue = 0,
  onValueChange,
  orientation = "horizontal",
  variant = "default",
  clickable = "completed",
  size = "default",
  labels: labelsProp,
  className,
  ...props
}: StepsProps) {
  const labels = { ...DEFAULT_LABELS, ...labelsProp }
  const [rawValue, setValue] = useControllableState({
    prop: valueProp,
    defaultProp: defaultValue,
    onChange: onValueChange,
  })
  const value = Number.isFinite(rawValue)
    ? Math.min(Math.max(Math.trunc(rawValue), 0), Math.max(items.length - 1, 0))
    : 0
  const resolvedItems = items.map((item, index) => ({
    item,
    status:
      item.status ??
      ((index < value
        ? "finish"
        : index === value
          ? "process"
          : "wait") satisfies StepStatus),
  }))
  const current = resolvedItems[value]
  const statusText = {
    wait: labels.srWait,
    process: labels.srProcess,
    finish: labels.srFinish,
    error: labels.srError,
  }
  const vertical = orientation === "vertical"
  const compact = variant === "compact"
  const auto = orientation === "auto" && !compact
  const summary = labels.compactText
    .replaceAll("{current}", String(items.length ? value + 1 : 0))
    .replaceAll("{total}", String(items.length))

  return (
    <div
      {...props}
      data-slot="steps"
      data-orientation={orientation}
      data-variant={variant}
      data-size={size}
      className={cn(stepsVariants({ size, variant }), className)}
    >
      <div
        data-slot="steps-compact"
        className={cn(
          "min-w-0",
          compact
            ? "block"
            : auto
              ? "block @min-[28rem]/steps:hidden"
              : "hidden",
        )}
      >
        <p
          className="mb-2 flex flex-wrap items-baseline gap-x-1.5 gap-y-1"
          aria-live="polite"
          aria-atomic="true"
        >
          <span className="text-muted-foreground tabular-nums">{summary}</span>
          {current && (
            <>
              <span aria-hidden="true" className="text-muted-foreground">
                ·
              </span>
              <span
                data-slot="steps-title"
                className={cn(
                  "min-w-0 font-medium wrap-anywhere",
                  current.status === "error" && "text-destructive",
                )}
              >
                {current.status === "error" && (
                  <span aria-hidden="true">! </span>
                )}
                {current.item.title}
              </span>
              <span className="sr-only">{statusText[current.status]}</span>
            </>
          )}
        </p>
        <ol aria-label={labels.list} className="flex list-none gap-1.5 p-0">
          {resolvedItems.map(({ item, status }, index) => {
            const canGoBack =
              clickable === "completed" &&
              index < value &&
              status === "finish" &&
              !item.disabled
            const content = (
              <>
                <span className="sr-only">
                  {index + 1}. {item.title} {item.description} —{" "}
                  {statusText[status]}
                  {item.disabled ? ` · ${labels.srDisabled}` : ""}
                </span>
                <span
                  data-slot="steps-progress"
                  aria-hidden="true"
                  className={cn(
                    "block h-1 w-full rounded-full",
                    status === "error"
                      ? "bg-destructive"
                      : status === "finish" || status === "process"
                        ? "bg-primary"
                        : "bg-muted",
                  )}
                />
              </>
            )
            return (
              <li
                key={index}
                data-slot="steps-item"
                data-state={status}
                data-disabled={item.disabled || undefined}
                aria-current={index === value ? "step" : undefined}
                className="min-w-0 flex-1"
              >
                {canGoBack ? (
                  <button
                    type="button"
                    onClick={() => setValue(index)}
                    className={cn(
                      buttonVariants({ variant: "ghost", size: "lg" }),
                      "w-full px-0 motion-reduce:transition-none",
                    )}
                  >
                    {content}
                  </button>
                ) : (
                  <span className="flex min-h-9 items-center pointer-coarse:min-h-11">
                    {content}
                  </span>
                )}
              </li>
            )
          })}
        </ol>
      </div>
      <ol
        aria-label={labels.list}
        className={cn(
          "m-0 list-none p-0",
          vertical ? "flex-col" : "items-start",
          compact ? "hidden" : auto ? "hidden @min-[28rem]/steps:flex" : "flex",
        )}
      >
        {resolvedItems.map(({ item, status }, index) => {
          const canGoBack =
            clickable === "completed" &&
            index < value &&
            status === "finish" &&
            !item.disabled
          const content = (
            <>
              <span
                data-slot="steps-indicator"
                aria-hidden="true"
                className={cn(
                  "relative z-10 flex size-(--steps-dot) shrink-0 items-center justify-center rounded-full border bg-background font-mono text-xs tabular-nums",
                  status === "finish" &&
                    "border-primary bg-primary text-primary-foreground",
                  status === "process" &&
                    "border-2 border-primary bg-background text-primary",
                  status === "wait" && "border-edge text-muted-foreground",
                  status === "error" && "border-destructive text-destructive",
                )}
              >
                {status === "finish" ? (
                  <Check className="size-3" strokeWidth={3} />
                ) : status === "error" ? (
                  "!"
                ) : (
                  index + 1
                )}
              </span>
              <span
                data-slot="steps-title"
                className={cn(
                  "min-w-0 wrap-anywhere whitespace-normal",
                  vertical && "flex-1 text-left",
                  status === "process" && "font-medium text-primary",
                  status === "wait" && "text-muted-foreground",
                  status === "error" && "text-destructive",
                )}
              >
                {item.title}
              </span>
              {item.description != null && (
                <span
                  data-slot="steps-description"
                  className={cn(
                    "min-w-0 text-xs font-normal wrap-anywhere whitespace-normal text-muted-foreground",
                    vertical && "ml-auto max-w-1/2 text-right",
                  )}
                >
                  {item.description}
                </span>
              )}
              <span className="sr-only">
                {statusText[status]}
                {item.disabled ? ` · ${labels.srDisabled}` : ""}
              </span>
            </>
          )
          const contentClass = cn(
            "relative flex w-full min-w-0 gap-2 rounded-lg px-1.5 py-1.5 text-inherit font-normal",
            vertical
              ? "min-h-9 flex-row items-center pointer-coarse:min-h-11"
              : "flex-col items-center text-center",
          )
          return (
            <li
              key={index}
              data-slot="steps-item"
              data-state={status}
              data-disabled={item.disabled || undefined}
              aria-current={index === value ? "step" : undefined}
              className={cn("relative min-w-0", !vertical && "flex-1")}
            >
              {index < items.length - 1 && (
                <span
                  data-slot="steps-separator"
                  aria-hidden="true"
                  className={cn(
                    "pointer-events-none absolute",
                    status === "finish" ? "bg-primary" : "bg-edge",
                    vertical
                      ? "top-[calc(.375rem+var(--steps-dot))] bottom-[calc(-.375rem)] left-[calc(.375rem+var(--steps-dot)/2)] w-px"
                      : "top-[calc(.375rem+var(--steps-dot)/2)] left-[calc(50%+var(--steps-dot)/2+.375rem)] h-px w-[calc(100%-var(--steps-dot)-.75rem)]",
                  )}
                />
              )}
              {canGoBack ? (
                <button
                  type="button"
                  onClick={() => setValue(index)}
                  // 导航内容允许多行，覆盖固定高度；触屏点击区仍至少 44px。
                  className={cn(
                    buttonVariants({ variant: "ghost", size: "lg" }),
                    contentClass,
                    "h-auto justify-start whitespace-normal motion-reduce:transition-none pointer-coarse:h-auto pointer-coarse:min-h-11",
                  )}
                >
                  {content}
                </button>
              ) : (
                <div className={contentClass}>{content}</div>
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}

export { Steps, stepsVariants }
export type { StepItem, StepStatus, StepsProps } from "./types"
export type { StepsLabels } from "./config"
