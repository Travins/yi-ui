"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

import { DEFAULT_LABELS, KIND_LABELS } from "./config"
import { idNumberInputControlVariants } from "./id-number-input-variants"
import type { IdNumberInputProps } from "./types"
import { useIdNumberInputState } from "./use-id-number-input-state"
import {
  formatIdNumber,
  isValidBankCard,
  isValidIdCard,
  isValidIdCardAtDate,
  isValidUscc,
  maskIdNumber,
  parseIdCard,
  parseIdCardAtDate,
} from "./utils"

/** 三种号码共用方条外观；显示分组与打码不改变表单提交值。 */
function IdNumberInput({
  kind = "idcard",
  value: valueProp,
  defaultValue = "",
  onValueChange,
  label,
  size = "default",
  error,
  allowLegacy15 = false,
  bankcardCheck = "length",
  showParsed = true,
  showLength = false,
  mask = false,
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
  onCompositionStart,
  onCompositionEnd,
  onInvalid,
  ref,
  ...props
}: IdNumberInputProps) {
  const labels = { ...DEFAULT_LABELS, ...KIND_LABELS[kind], ...labelsProp }
  const autoId = React.useId()
  const id = idProp ?? autoId
  const errorId = `${id}-error`
  const hintId = `${id}-hint`
  const inputRef = React.useRef<HTMLInputElement>(null)
  React.useImperativeHandle(ref, () => inputRef.current as HTMLInputElement)
  const {
    today,
    value,
    focused,
    setFocused,
    touched,
    setTouched,
    composingRef,
    draft,
    setDraft,
    setCaret,
    commit,
  } = useIdNumberInputState({
    kind,
    value: valueProp,
    defaultValue,
    onValueChange,
    form,
    inputRef,
  })
  const valid =
    kind === "idcard"
      ? isValidIdCardAtDate(value, { allowLegacy15 }, today)
      : kind === "bankcard"
        ? isValidBankCard(value, { luhn: bankcardCheck === "luhn" })
        : isValidUscc(value)
  const ownMessage =
    value === ""
      ? required
        ? labels.required
        : ""
      : valid
        ? ""
        : labels.invalid
  const errorMessage = error || (touched ? ownMessage : "")
  const invalid =
    Boolean(errorMessage) || ariaInvalid === true || ariaInvalid === "true"
  React.useEffect(() => {
    inputRef.current?.setCustomValidity(
      error ? (typeof error === "string" ? error : labels.invalid) : ownMessage,
    )
  }, [error, labels.invalid, ownMessage])

  const parsed =
    kind === "idcard" && showParsed && valid
      ? parseIdCardAtDate(value, { allowLegacy15 }, today)
      : null
  const hint = parsed
    ? labels.parsed
        .replace(
          "{birthDate}",
          // 数字与「年月日」之间留空格，和全站「第 2 步」「28 / 32 / 36」的排版一致
          parsed.birthDate
            .split("-")
            .map(Number)
            .map((part, i) => `${part} ${"年月日"[i]}`)
            .join(" "),
        )
        .replace("{gender}", labels[parsed.gender])
    : kind === "bankcard" && showLength && value
      ? labels.length.replace(
          "{length}",
          new Intl.NumberFormat("zh-CN").format(value.length),
        )
      : ""
  // 打码时也不在提示中暴露出生日期。
  const visibleHint =
    hint && !(mask && !focused && kind === "idcard") && !errorMessage
      ? hint
      : ""
  const describedBy =
    [
      describedByProp,
      visibleHint ? hintId : undefined,
      errorMessage ? errorId : undefined,
    ]
      .filter(Boolean)
      .join(" ") || undefined

  return (
    <div
      data-slot="id-number-input"
      data-kind={kind}
      data-size={size}
      data-invalid={invalid ? "" : undefined}
      data-disabled={disabled ? "" : undefined}
      className={cn(
        "@container/id-number-input in-data-[slot=grid-toolbar]:h-full flex w-full min-w-0 flex-col gap-1.5",
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
          data-slot="id-number-input-label-above"
          className="hidden text-xs text-muted-foreground @max-[20rem]/id-number-input:block in-data-[slot=grid-toolbar]:hidden!"
        >
          {label}
        </span>
      )}
      <div
        data-slot="id-number-input-control"
        className={cn(
          idNumberInputControlVariants({ size }),
          "@max-[24rem]/id-number-input:gap-2 @max-[24rem]/id-number-input:px-2.5",
          invalid
            ? "border-destructive ring-3 ring-destructive/20 dark:border-destructive/50 dark:ring-destructive/40"
            : "border-edge focus-within:border-foreground/25 focus-within:bg-background hover:not-focus-within:bg-muted dark:focus-within:bg-input/30",
          disabled && "cursor-not-allowed opacity-50",
          readOnly && "bg-muted/30",
        )}
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) {
            event.preventDefault()
            inputRef.current?.focus()
          }
        }}
      >
        {label && (
          <label
            data-slot="id-number-input-label"
            htmlFor={id}
            className="shrink-0 text-muted-foreground max-md:text-sm @max-[20rem]/id-number-input:sr-only in-data-[slot=grid-toolbar]:not-sr-only! in-data-[slot=grid-toolbar]:whitespace-nowrap!"
          >
            {label}
          </label>
        )}
        <input
          {...props}
          ref={inputRef}
          id={id}
          form={form}
          data-slot="id-number-input-input"
          type="text"
          inputMode={kind === "bankcard" ? "numeric" : "text"}
          autoCapitalize={kind === "bankcard" ? "off" : "characters"}
          autoComplete={props.autoComplete ?? "off"}
          spellCheck={false}
          value={
            draft ??
            (mask && !focused
              ? maskIdNumber(kind, value)
              : formatIdNumber(kind, value))
          }
          placeholder={placeholder ?? labels.placeholder}
          disabled={disabled}
          readOnly={readOnly}
          required={required}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className={cn(
            "h-full min-w-0 flex-1 bg-transparent font-medium tabular-nums outline-none placeholder:font-normal placeholder:text-muted-foreground disabled:cursor-not-allowed",
            label && "text-right @max-[20rem]/id-number-input:text-left",
          )}
          onChange={(event) => {
            const input = event.currentTarget
            if (composingRef.current) {
              setDraft(input.value)
              return
            }
            commit(input.value, input.selectionStart ?? input.value.length)
          }}
          onCompositionStart={(event) => {
            composingRef.current = true
            setDraft(event.currentTarget.value)
            onCompositionStart?.(event)
          }}
          onCompositionEnd={(event) => {
            composingRef.current = false
            setDraft(null)
            commit(
              event.currentTarget.value,
              event.currentTarget.selectionStart ??
                event.currentTarget.value.length,
            )
            onCompositionEnd?.(event)
          }}
          onKeyDown={(event) => {
            props.onKeyDown?.(event)
            const input = event.currentTarget
            const { selectionStart: start, selectionEnd: end } = input
            if (
              event.defaultPrevented ||
              readOnly ||
              composingRef.current ||
              event.nativeEvent.isComposing ||
              start === null ||
              start !== end
            )
              return
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
          onFocus={(event) => {
            setFocused(true)
            if (mask) setCaret({ position: formatIdNumber(kind, value).length })
            onFocus?.(event)
          }}
          onBlur={(event) => {
            setFocused(false)
            setTouched(true)
            onBlur?.(event)
          }}
          onInvalid={(event) => {
            setTouched(true)
            onInvalid?.(event)
          }}
        />
      </div>
      {visibleHint && (
        <p
          id={hintId}
          data-slot="id-number-input-hint"
          className="text-xs text-muted-foreground"
          aria-live="polite"
        >
          {visibleHint}
        </p>
      )}
      {errorMessage && (
        <p
          id={errorId}
          data-slot="id-number-input-error"
          className="text-xs text-destructive"
          aria-live="polite"
        >
          {errorMessage}
        </p>
      )}
      {name && (
        <input
          type="hidden"
          data-slot="id-number-input-value"
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
  IdNumberInput,
  formatIdNumber,
  idNumberInputControlVariants,
  isValidBankCard,
  isValidIdCard,
  isValidUscc,
  maskIdNumber,
  parseIdCard,
}
export type {
  IdNumberInputProps,
  IdNumberInputSize,
  IdNumberKind,
} from "./types"
export type { IdNumberInputLabels } from "./config"
export type { IdCardOptions, ParsedIdCard } from "./utils"
