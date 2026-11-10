"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { useCaretRestore } from "@/registry/hooks/use-caret-restore"
import { useControllableState } from "@/registry/hooks/use-controllable-state"

import { DEFAULT_LABELS, PHONE_LENGTH } from "./config"
import {
  PhoneInputContext,
  PhoneInputSendButton,
  phoneInputControlVariants,
  useSendCode,
} from "./phone-input-parts"
import type { PhoneInputProps } from "./types"
import {
  digitsOf,
  formatPhone,
  isValidPhone,
  maskPhone,
  sanitizePhone,
} from "./utils"

/**
 * 中国大陆手机号输入：边输边按 3-4-4 分隔，光标不乱跳；粘贴、自动填充带区号或横线的号码也能整理。
 * 值是 11 位纯数字，表单提交的也是它。条内右侧可以放「获取验证码」。
 */
function PhoneInput({
  value: valueProp,
  defaultValue = "",
  onValueChange,
  label,
  size = "default",
  action,
  error,
  labels: labelsProp,
  className,
  id: idProp,
  name,
  form,
  required,
  disabled,
  readOnly,
  placeholder,
  "aria-invalid": ariaInvalid,
  "aria-describedby": describedByProp,
  onFocus,
  onBlur,
  ref,
  ...props
}: PhoneInputProps) {
  const labels = { ...DEFAULT_LABELS, ...labelsProp }
  const autoId = React.useId()
  const id = idProp ?? autoId
  const errorId = `${id}-error`
  const inputRef = React.useRef<HTMLInputElement>(null)
  React.useImperativeHandle(ref, () => inputRef.current as HTMLInputElement)

  const [value, setValue] = useControllableState({
    prop: valueProp,
    defaultProp: digitsOf(defaultValue).slice(0, PHONE_LENGTH),
    onChange: onValueChange,
  })
  const text = formatPhone(value)
  const [touched, setTouched] = React.useState(false)

  // 整理后要恢复的光标位置；每次都是新对象，保证文本没变（敲了非法字符）时也会重设光标
  const setCaret = useCaretRestore(inputRef)

  const commit = (raw: string, rawCaret: number) => {
    const next = sanitizePhone(raw, rawCaret)
    setValue(next.digits)
    setCaret({ position: next.caret })
  }

  const valid = isValidPhone(value)
  const ownMessage =
    value === ""
      ? required
        ? labels.required
        : ""
      : valid
        ? ""
        : labels.invalid
  // 浏览器的表单校验也拦住：号码不完整时提交会被挡下
  React.useEffect(() => {
    inputRef.current?.setCustomValidity(ownMessage)
  }, [ownMessage])

  const errorMessage = error || (touched && value !== "" ? ownMessage : "")
  const invalid =
    Boolean(errorMessage) || ariaInvalid === true || ariaInvalid === "true"
  const describedBy =
    [describedByProp, errorMessage ? errorId : undefined]
      .filter(Boolean)
      .join(" ") || undefined

  // 非受控时表单重置回到初始值；reset 事件在表单清空之前触发，等一帧再覆盖
  const controlled = valueProp !== undefined
  const resetRef = React.useRef(() => {})
  React.useEffect(() => {
    resetRef.current = () => {
      setValue(digitsOf(defaultValue).slice(0, PHONE_LENGTH))
      setTouched(false)
    }
  })
  React.useEffect(() => {
    const element = inputRef.current?.form
    if (!element || controlled) return
    const reset = () => window.setTimeout(() => resetRef.current())
    element.addEventListener("reset", reset)
    return () => element.removeEventListener("reset", reset)
  }, [controlled])

  return (
    <div
      data-slot="phone-input"
      data-size={size}
      data-invalid={invalid ? "" : undefined}
      data-disabled={disabled ? "" : undefined}
      // 容器查询：窄于 20rem 时缩小间距和按钮内边距，并把标签挪到条上方，号码不被挤掉
      className={cn(
        "@container/phone-input in-data-[slot=grid-toolbar]:h-full flex w-full flex-col gap-1.5",
        className,
      )}
    >
      {/* 窄于 20rem 时条内放不下「标签 + 号码」：标签挪到条上方显示，条内那份只留给读屏。
          这一份只负责看和点（点它聚焦输入框）：不能用关联到输入框的 label，否则可访问名称会把标签念两遍；
          名称只来自条内的 label */}
      {label && (
        <span
          aria-hidden="true"
          onClick={() => document.getElementById(id)?.focus()}
          data-slot="phone-input-label-above"
          className="hidden text-xs text-muted-foreground @max-[20rem]/phone-input:block in-data-[slot=grid-toolbar]:hidden!"
        >
          {label}
        </span>
      )}
      <div
        data-slot="phone-input-control"
        className={cn(
          phoneInputControlVariants({ size }),
          "@max-[20rem]/phone-input:gap-2",
          invalid
            ? "border-destructive ring-3 ring-destructive/20 dark:border-destructive/50 dark:ring-destructive/40"
            : "border-edge focus-within:border-foreground/25 focus-within:bg-background hover:not-focus-within:bg-muted dark:focus-within:bg-input/30",
          disabled && "cursor-not-allowed opacity-50",
          readOnly && "bg-muted/30",
          // 条内有按钮时右边不留内边距，按钮自己贴边
          action && "overflow-hidden",
        )}
        // 点到条内空白处（标签与号码之间）也聚焦输入框
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) {
            event.preventDefault()
            inputRef.current?.focus()
          }
        }}
      >
        {label && (
          <label
            data-slot="phone-input-label"
            htmlFor={id}
            className="shrink-0 text-muted-foreground max-md:text-sm @max-[20rem]/phone-input:sr-only in-data-[slot=grid-toolbar]:not-sr-only! in-data-[slot=grid-toolbar]:whitespace-nowrap!"
          >
            {label}
          </label>
        )}
        <input
          {...props}
          ref={inputRef}
          id={id}
          data-slot="phone-input-input"
          // tel + numeric：iOS 弹纯数字键盘，自动填充也认得这是电话号码
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          spellCheck={false}
          value={text}
          placeholder={placeholder ?? labels.placeholder}
          disabled={disabled}
          readOnly={readOnly}
          required={required}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className={cn(
            "h-full min-w-0 flex-1 bg-transparent font-medium tabular-nums outline-none placeholder:font-normal placeholder:text-muted-foreground disabled:cursor-not-allowed",
            // 有条内标签时号码靠右，与方条开关、金额输入的「左标签右数值」一致
            label && "text-right @max-[20rem]/phone-input:text-left",
          )}
          onChange={(event) => {
            const input = event.currentTarget
            commit(input.value, input.selectionStart ?? input.value.length)
          }}
          onKeyDown={(event) => {
            props.onKeyDown?.(event)
            const input = event.currentTarget
            const { selectionStart: start, selectionEnd: end } = input
            if (
              event.defaultPrevented ||
              readOnly ||
              start === null ||
              start !== end
            )
              return
            // 光标紧贴分隔空格时，退格 / 删除越过空格去删旁边的数字，否则删了空格又长回来
            const current = input.value
            if (event.key === "Backspace" && current[start - 1] === " ") {
              event.preventDefault()
              commit(
                current.slice(0, start - 2) + current.slice(start),
                start - 2,
              )
            } else if (event.key === "Delete" && current[start] === " ") {
              event.preventDefault()
              commit(current.slice(0, start) + current.slice(start + 2), start)
            }
          }}
          onFocus={onFocus}
          onBlur={(event) => {
            setTouched(true)
            onBlur?.(event)
          }}
        />
        {action && (
          <PhoneInputContext.Provider value={{ valid }}>
            {action}
          </PhoneInputContext.Provider>
        )}
      </div>
      {errorMessage && (
        <p
          id={errorId}
          data-slot="phone-input-error"
          className="text-xs text-destructive"
        >
          {errorMessage}
        </p>
      )}
      {name && (
        <input
          type="hidden"
          data-slot="phone-input-value"
          name={name}
          form={form}
          value={value}
          disabled={disabled}
        />
      )}
    </div>
  )
}

export {
  PhoneInput,
  PhoneInputSendButton,
  formatPhone,
  isValidPhone,
  maskPhone,
  phoneInputControlVariants,
  useSendCode,
}
export type {
  PhoneInputProps,
  PhoneInputSendButtonProps,
  PhoneInputSize,
} from "./types"
