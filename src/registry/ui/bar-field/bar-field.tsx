"use client"

import * as React from "react"
import { cva } from "class-variance-authority"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useControllableState } from "@/registry/hooks/use-controllable-state"

// 方条统一承载工具栏适配：去掉外框和底色，聚焦环画在格子内侧。
const barFieldVariants = cva(
  "flex w-full min-w-0 cursor-text items-center gap-3 rounded-md border bg-muted/60 px-3 transition-colors in-data-[slot=grid-toolbar]:h-full! in-data-[slot=grid-toolbar]:rounded-none in-data-[slot=grid-toolbar]:border-0 in-data-[slot=grid-toolbar]:bg-transparent in-data-[slot=grid-toolbar]:focus-within:ring-3 in-data-[slot=grid-toolbar]:focus-within:ring-ring/50 in-data-[slot=grid-toolbar]:focus-within:ring-inset",
  {
    variants: {
      size: {
        sm: "h-7 text-base pointer-coarse:h-9 md:text-xs",
        default: "h-8 text-base pointer-coarse:h-10 md:text-sm",
        lg: "h-9 text-base pointer-coarse:h-11 md:text-sm",
      },
    },
    defaultVariants: { size: "default" },
  },
)

type BarFieldProps = Omit<
  React.ComponentProps<"input">,
  "size" | "value" | "defaultValue"
> & {
  /** 条内标签；省略时请提供 aria-label 或 aria-labelledby */
  label?: React.ReactNode
  /** 前置装饰图标 */
  icon?: React.ReactNode
  /** 后缀单位、快捷键或按钮；按钮尺寸应与字段一致 */
  suffix?: React.ReactNode
  /** 条下方右侧操作 */
  footerAction?: React.ReactNode
  /** 高度档 @default "default" */
  size?: "sm" | "default" | "lg"
  /** 外部校验错误 */
  error?: string
  /** 条下方说明 */
  description?: React.ReactNode
  /** 受控字符串 */
  value?: string
  /** 初始字符串 @default "" */
  defaultValue?: string
  /** 字符串变化回调 */
  onValueChange?: (value: string) => void
  /** 输入节点引用 */
  inputRef?: React.Ref<HTMLInputElement>
  /**
   * 有内容时显示清除键；清除只触发 `onValueChange("")`，不触发原生 `onChange`
   * @default type === "search"
   */
  clearable?: boolean
  /** 清除键的读屏名称 @default "清除" */
  clearLabel?: string
}

function BarField({
  label,
  icon,
  suffix,
  footerAction,
  size = "default",
  error,
  description,
  value: valueProp,
  defaultValue = "",
  onValueChange,
  inputRef,
  clearable: clearableProp,
  clearLabel = "清除",
  ref,
  className,
  id: idProp,
  onChange,
  disabled,
  readOnly,
  "aria-describedby": describedBy,
  "aria-invalid": ariaInvalid,
  ...props
}: BarFieldProps) {
  const autoId = React.useId()
  const id = idProp ?? autoId
  const localRef = React.useRef<HTMLInputElement>(null)
  React.useImperativeHandle(inputRef, () => localRef.current!)
  React.useImperativeHandle(ref, () => localRef.current!)
  const [value, setValue] = useControllableState({
    prop: valueProp,
    defaultProp: defaultValue,
    onChange: onValueChange,
  })
  React.useEffect(() => {
    const form = localRef.current?.form
    if (!form || valueProp !== undefined) return
    const reset = () => {
      window.setTimeout(() => setValue(defaultValue))
    }
    form.addEventListener("reset", reset)
    return () => form.removeEventListener("reset", reset)
  }, [valueProp, defaultValue, setValue, props.form])
  const invalid =
    Boolean(error) || ariaInvalid === true || ariaInvalid === "true"
  return (
    <div
      data-slot="bar-field"
      data-size={size}
      className={cn(
        "@container/bar-field flex w-full flex-col gap-1.5",
        // 放进网格工具栏：铺满整格
        "in-data-[slot=grid-toolbar]:h-full",
        className,
      )}
    >
      {/* 窄于 20rem 时标签挪到条上方显示。这一份只负责看和点（点它聚焦输入框）：
          不能用关联到输入框的 label，否则可访问名称会把标签念两遍；名称只来自条内的 label */}
      {label && (
        <span
          onClick={() => document.getElementById(id)?.focus()}
          aria-hidden="true"
          data-slot="bar-field-label-above"
          className="hidden text-xs text-muted-foreground in-data-[slot=grid-toolbar]:hidden! @max-[20rem]/bar-field:block"
        >
          {label}
        </span>
      )}
      <div
        data-slot="bar-field-control"
        className={cn(
          barFieldVariants({ size }),
          invalid
            ? "border-destructive ring-3 ring-destructive/20 dark:border-destructive/50 dark:ring-destructive/40"
            : "border-edge focus-within:border-foreground/25 focus-within:bg-background hover:not-focus-within:bg-muted dark:focus-within:bg-input/30",
          disabled && "cursor-not-allowed opacity-50",
          readOnly && "bg-muted/30",
        )}
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) {
            event.preventDefault()
            localRef.current?.focus()
          }
        }}
      >
        {label && (
          <label
            htmlFor={id}
            data-slot="bar-field-label"
            className="shrink-0 text-muted-foreground in-data-[slot=grid-toolbar]:not-sr-only! in-data-[slot=grid-toolbar]:whitespace-nowrap! max-md:text-sm @max-[20rem]/bar-field:sr-only"
          >
            {label}
          </label>
        )}
        {icon && (
          <span
            aria-hidden="true"
            data-slot="bar-field-icon"
            className="shrink-0 text-muted-foreground [&_svg]:size-4"
          >
            {icon}
          </span>
        )}
        <input
          {...props}
          ref={localRef}
          id={id}
          disabled={disabled}
          readOnly={readOnly}
          value={value}
          aria-invalid={invalid || undefined}
          aria-describedby={
            [
              describedBy,
              error && `${id}-error`,
              description && `${id}-description`,
            ]
              .filter(Boolean)
              .join(" ") || undefined
          }
          data-slot="bar-field-input"
          className={cn(
            "h-full min-w-0 flex-1 bg-transparent font-medium outline-none placeholder:font-normal placeholder:text-muted-foreground disabled:cursor-not-allowed",
            // 隐藏浏览器自带的搜索清除钮，统一用上面的自绘清除键
            "[&::-webkit-search-cancel-button]:appearance-none",
            // 有标签时值靠右（方条惯例）；带前置图标的是搜索类输入，文字紧跟图标从左写起
            label && !icon && "text-right @max-[20rem]/bar-field:text-left",
          )}
          onChange={(event) => {
            setValue(event.target.value)
            onChange?.(event)
          }}
        />
        {/* 自绘清除键：与方条下拉的清除键同一档，替代浏览器自带的搜索清除钮 */}
        {(clearableProp ?? props.type === "search") &&
          value !== "" &&
          !disabled &&
          !readOnly && (
            <Button
              type="button"
              size="icon-xs"
              variant="ghost"
              data-slot="bar-field-clear"
              aria-label={clearLabel}
              className="-mx-1.5 shrink-0 text-muted-foreground hover:text-foreground"
              onClick={() => {
                setValue("")
                localRef.current?.focus()
              }}
            >
              <X className="size-3.5" />
            </Button>
          )}
        {suffix && (
          <span
            data-slot="bar-field-suffix"
            className="-mr-3 flex shrink-0 items-center self-stretch pr-2 text-muted-foreground [&_button]:max-h-full [&_button]:rounded-none [&_button]:focus-visible:ring-inset"
          >
            {suffix}
          </span>
        )}
      </div>
      {(error || description || footerAction) && (
        <div
          data-slot="bar-field-footer"
          className="flex items-start justify-between gap-3 text-xs"
        >
          <div>
            {error && (
              <p
                id={`${id}-error`}
                data-slot="bar-field-error"
                className="text-destructive"
              >
                {error}
              </p>
            )}
            {description && (
              <p id={`${id}-description`} className="text-muted-foreground">
                {description}
              </p>
            )}
          </div>
          {footerAction}
        </div>
      )}
    </div>
  )
}
export { BarField, barFieldVariants }
export type { BarFieldProps }
