"use client"

import * as React from "react"
import { NumberField } from "@base-ui/react/number-field"
import { cva } from "class-variance-authority"
import { Loader2, Minus, Plus } from "lucide-react"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

import type { NumberStepperLabels, NumberStepperProps } from "./types"
import { useNumberStepper } from "./use-number-stepper"

const DEFAULT_LABELS: NumberStepperLabels = {
  decrement: "减少",
  increment: "增加",
  input: "数量",
  pending: "正在保存数量",
  commitError: "保存失败，请重试",
}

const numberStepperControlVariants = cva(
  "flex min-w-0 items-center rounded-md border border-edge bg-muted/60 text-sm transition-colors not-aria-invalid:has-[[data-slot=number-stepper-input]:focus]:border-foreground/25 not-aria-invalid:has-[[data-slot=number-stepper-input]:focus]:bg-background dark:not-aria-invalid:has-[[data-slot=number-stepper-input]:focus]:bg-input/30 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 in-data-[slot=grid-toolbar]:h-full! in-data-[slot=grid-toolbar]:rounded-none in-data-[slot=grid-toolbar]:border-0 in-data-[slot=grid-toolbar]:bg-transparent! in-data-[slot=grid-toolbar]:aria-invalid:ring-inset in-data-[slot=grid-toolbar]:has-[[data-slot=number-stepper-input]:focus]:ring-3 in-data-[slot=grid-toolbar]:has-[[data-slot=number-stepper-input]:focus]:ring-ring/50 in-data-[slot=grid-toolbar]:has-[[data-slot=number-stepper-input]:focus]:ring-inset",
  {
    variants: {
      size: {
        sm: "h-7 pointer-coarse:h-9",
        default: "h-8 pointer-coarse:h-10",
        lg: "h-9 pointer-coarse:h-11",
      },
    },
    defaultVariants: { size: "default" },
  },
)

/** 带边界、长按步进和异步回滚的方条数量选择。 */
function NumberStepper({
  value: valueProp,
  defaultValue = null,
  onValueChange,
  onValueCommit,
  onCommitError,
  min = 0,
  max,
  step = 1,
  smallStep = step === "any" ? 1 : step,
  largeStep = step === "any" ? 10 : step * 10,
  allowWheelScrub = false,
  locale = "zh-CN",
  label,
  unit,
  size = "default",
  disabled = false,
  readOnly = false,
  error,
  labels: labelsProp,
  className,
  id: idProp,
  "aria-label": ariaLabel,
  "aria-labelledby": labelledBy,
  "aria-invalid": ariaInvalid,
  "aria-describedby": describedBy,
  ...props
}: NumberStepperProps) {
  const labels = { ...DEFAULT_LABELS, ...labelsProp }
  const autoId = React.useId()
  const id = idProp ?? autoId
  const inputRef = React.useRef<HTMLInputElement>(null)
  // 最近一次是按哪个键改的数：保存时让那个按钮转圈，数字照常显示，用户看得到自己改成了几
  // 点加减按钮时 Base UI 会把焦点移到中间的输入框；指针带来的焦点隐藏光标，按任意键后恢复。
  const [pointerFocus, setPointerFocus] = React.useState(false)
  const [lastAction, setLastAction] = React.useState<"decrement" | "increment">(
    "increment",
  )
  const { value, pending, commitError, change, commit, reset } =
    useNumberStepper({
      value: valueProp,
      defaultValue,
      onValueChange,
      onValueCommit,
      onCommitError,
    })
  const resetRef = React.useRef(reset)
  React.useEffect(() => {
    resetRef.current = reset
  })
  React.useEffect(() => {
    const form = inputRef.current?.form
    if (!form || valueProp !== undefined) return
    let timer: ReturnType<typeof setTimeout> | undefined
    const onReset = (event: Event) => {
      timer = setTimeout(() => {
        if (!event.defaultPrevented) {
          // 先结束手动编辑，让 NumberField 恢复文本同步；reset 会取消这次失焦提交。
          inputRef.current?.blur()
          resetRef.current()
        }
      })
    }
    form.addEventListener("reset", onReset)
    return () => {
      clearTimeout(timer)
      form.removeEventListener("reset", onReset)
    }
  }, [valueProp, props.form])

  const message =
    error ||
    (commitError?.cause instanceof Error
      ? commitError.cause.message || labels.commitError
      : commitError
        ? labels.commitError
        : null)
  const invalid =
    Boolean(message) ||
    (ariaInvalid !== undefined &&
      ariaInvalid !== false &&
      ariaInvalid !== "false")
  const errorId = `${id}-error`
  const description =
    [describedBy, unit != null ? `${id}-unit` : undefined, message ? errorId : undefined].filter(Boolean).join(" ") ||
    undefined
  const buttonSize =
    size === "sm" ? "icon-sm" : size === "lg" ? "icon-lg" : "icon"
  const buttonClass = buttonVariants({
    variant: "ghost",
    size: buttonSize,
    // 按下时只缩小图标给一点触感，按钮底色和尺寸不动；减少动态效果时不缩。
    // 按钮留在方条边框里面、撑满框内高度：不用负边距伸到边线上，否则按下时的底色和下沉会盖住边框（出错时的红边尤其明显）
    className:
      "h-full pointer-coarse:h-full shrink-0 touch-manipulation self-stretch focus-visible:ring-inset [&_svg]:transition-transform [&_svg]:duration-100 [&_svg]:ease-out active:[&_svg]:scale-[0.8] motion-reduce:[&_svg]:transition-none motion-reduce:active:[&_svg]:scale-100 rounded-none border-0 border-edge text-muted-foreground transition-colors active:not-aria-[haspopup]:translate-y-0 aria-disabled:pointer-events-none aria-disabled:opacity-40 disabled:opacity-40",
  })

  function handleCommit(next: number | null) {
    if (disabled || readOnly || pending) return
    // NumberField 只在步进时 snap，直接输入失焦时在这里按 min 对齐。
    const snapped =
      next === null || step === "any" || step <= 0
        ? next
        : Number((min + Math.round((next - min) / step) * step).toPrecision(15))
    commit(
      snapped === null
        ? null
        : Math.min(max ?? Infinity, Math.max(min, snapped)),
    )
  }

  return (
    <NumberField.Root
      {...props}
      id={id}
      data-slot="number-stepper"
      data-size={size}
      data-invalid={invalid ? "" : undefined}
      data-disabled={disabled ? "" : undefined}
      data-readonly={readOnly || pending ? "" : undefined}
      aria-busy={pending || undefined}
      className={cn(
        "inline-flex max-w-full flex-col gap-1.5 align-middle",
        // 只在有标签时建容器：容器查询会让无标签的自适应宽度塌成 0
        label && "@container/number-stepper w-full",
        // 工具栏的格子按内容定宽，这里取消容器查询（否则宽度塌成 0），标签始终留在条内
        "in-data-[slot=grid-toolbar]:h-full in-data-[slot=grid-toolbar]:w-full in-data-[slot=grid-toolbar]:[container-type:normal]",
        className,
      )}
      value={value}
      min={min}
      max={max}
      step={step}
      smallStep={smallStep}
      largeStep={largeStep}
      snapOnStep
      locale={locale}
      allowWheelScrub={allowWheelScrub}
      disabled={disabled}
      readOnly={readOnly || pending}
      onValueChange={change}
      onValueCommitted={handleCommit}
    >
      {label && (
        // 容器窄于 20rem 时标签挪到条上方（与方条文本框同一规则），条内的标签只留给读屏；
        // 这一份不关联输入框，否则可访问名称会把标签念两遍，点它时手动聚焦
        <span
          onClick={() => document.getElementById(id)?.focus()}
          aria-hidden="true"
          data-slot="number-stepper-label-above"
          className="hidden text-xs text-muted-foreground @max-[20rem]/number-stepper:block"
        >
          {label}
        </span>
      )}
      <NumberField.Group
        data-slot="number-stepper-control"
        data-pointer-focus={pointerFocus ? "" : undefined}
        aria-invalid={invalid || undefined}
        onPointerDown={(event) => {
          if ((event.target as Element).closest("button")) setPointerFocus(true)
        }}
        // 用捕获阶段：方向键会被 Base UI 在输入框上处理掉，冒泡阶段收不到
        onKeyDownCapture={() => setPointerFocus(false)}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget))
            setPointerFocus(false)
        }}
        className={cn(
          numberStepperControlVariants({ size }),
          disabled && "cursor-not-allowed opacity-50",
        )}
      >
        {label && (
          <label
            data-slot="number-stepper-label"
            htmlFor={id}
            className="mr-auto min-w-0 truncate px-3 text-muted-foreground @max-[20rem]/number-stepper:sr-only"
          >
            {label}
          </label>
        )}
        <NumberField.Decrement
          data-slot="number-stepper-decrement"
          onPointerDown={() => setLastAction("decrement")}
          aria-label={labels.decrement}
          disabled={pending || readOnly || (value !== null && value <= min)}
          className={cn(
            buttonClass,
            "border-r border-edge first:rounded-l-[calc(var(--radius-md)-1px)] in-data-[slot=grid-toolbar]:rounded-none! in-data-[slot=grid-toolbar]:border-dashed",
          )}
        >
          {pending && lastAction === "decrement" ? (
            <Loader2
              data-slot="number-stepper-spinner"
              aria-hidden="true"
              className="motion-safe:animate-spin"
            />
          ) : (
            <Minus aria-hidden="true" />
          )}
        </NumberField.Decrement>
        <div className="relative flex min-w-0 shrink items-center justify-center gap-1 px-2 in-data-[slot=grid-toolbar]:flex-1 @max-[20rem]/number-stepper:flex-1">
          <NumberField.Input
            ref={inputRef}
            data-slot="number-stepper-input"
            role="spinbutton"
            aria-roledescription={undefined}
            aria-valuemin={min}
            aria-valuemax={max}
            aria-valuenow={value ?? undefined}
            aria-label={ariaLabel ?? (label ? undefined : labels.input)}
            aria-labelledby={labelledBy}
            aria-invalid={invalid || undefined}
            aria-describedby={description}
            inputMode="numeric"
            form={props.form}
            className={cn(
              "min-h-0 w-16 min-w-0 bg-transparent px-0 text-center text-sm font-medium tabular-nums outline-none in-data-pointer-focus:caret-transparent pointer-coarse:text-base",
              pending && "text-muted-foreground",
            )}
            onKeyDown={(event) => {
              if (["ArrowDown", "PageDown", "Home"].includes(event.key))
                setLastAction("decrement")
              else if (["ArrowUp", "PageUp", "End"].includes(event.key))
                setLastAction("increment")
              if (
                event.key === "Enter" &&
                !event.nativeEvent.isComposing &&
                !disabled &&
                !readOnly &&
                !pending
              ) {
                event.preventDefault()
                event.currentTarget.blur()
              }
            }}
          />
          {unit != null && <span data-slot="number-stepper-unit" aria-hidden="true" className="shrink-0 text-xs text-muted-foreground">{unit}</span>}
        </div>
        <NumberField.Increment
          data-slot="number-stepper-increment"
          onPointerDown={() => setLastAction("increment")}
          aria-label={labels.increment}
          disabled={
            pending ||
            readOnly ||
            (value !== null && max !== undefined && value >= max)
          }
          className={cn(
            buttonClass,
            "rounded-r-[calc(var(--radius-md)-1px)] border-l border-edge in-data-[slot=grid-toolbar]:rounded-none! in-data-[slot=grid-toolbar]:border-dashed",
          )}
        >
          {pending && lastAction === "increment" ? (
            <Loader2
              data-slot="number-stepper-spinner"
              aria-hidden="true"
              className="motion-safe:animate-spin"
            />
          ) : (
            <Plus aria-hidden="true" />
          )}
        </NumberField.Increment>
      </NumberField.Group>
      {unit != null && <span id={`${id}-unit`} className="sr-only">{unit}</span>}
      {message && (
        <p
          id={errorId}
          data-slot="number-stepper-error"
          role="alert"
          className="text-xs text-destructive"
        >
          {message}
        </p>
      )}
      <span role="status" className="sr-only">
        {pending ? labels.pending : ""}
      </span>
    </NumberField.Root>
  )
}

export { NumberStepper, numberStepperControlVariants }
export type {
  NumberStepperLabels,
  NumberStepperProps,
  NumberStepperSize,
} from "./types"
