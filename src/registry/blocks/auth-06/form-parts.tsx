"use client"

import * as React from "react"
import { ChevronLeft, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import { BarField, type BarFieldProps } from "@/registry/ui/bar-field/bar-field"
import type { Auth06Labels } from "./config"

/** 带显示 / 隐藏切换的密码方条；切换键与条同高，放在条内右侧。 */
function Auth06PasswordField({
  labels,
  ...props
}: Omit<BarFieldProps, "type" | "suffix"> & { labels: Auth06Labels }) {
  const [visible, setVisible] = React.useState(false)
  return (
    <BarField
      {...props}
      type={visible ? "text" : "password"}
      suffix={
        <Button
          type="button"
          variant="ghost"
          size="icon-lg"
          aria-label={visible ? labels.hidePassword : labels.showPassword}
          aria-pressed={visible}
          onClick={() => setVisible((value) => !value)}
          className="text-muted-foreground hover:text-foreground"
        >
          {visible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
        </Button>
      }
    />
  )
}

/** 协议勾选：错误文字用 role="alert" 播报，并通过 aria-describedby 关联到复选框。 */
function Auth06Agreement({
  id,
  labels,
  checked,
  error,
  disabled,
  links,
  onCheckedChange,
}: {
  id: string
  labels: Auth06Labels
  checked: boolean
  error?: string
  disabled?: boolean
  links?: { terms?: string; privacy?: string }
  onCheckedChange: (checked: boolean) => void
}) {
  const errorId = `${id}-error`
  const link = (href: string | undefined, text: string) =>
    href ? (
      <a href={href} className="text-foreground underline underline-offset-4">
        {text}
      </a>
    ) : (
      text
    )
  return (
    <div data-slot="auth-06-agreement" className="space-y-1.5">
      <div className="flex items-start gap-3 text-xs leading-6 text-muted-foreground">
        <Checkbox
          id={id}
          checked={checked}
          disabled={disabled}
          onCheckedChange={(value) => onCheckedChange(value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="mt-1"
        />
        <p>
          <label htmlFor={id}>{labels.agreement}</label>
          {link(links?.terms, labels.terms)}
          {labels.and}
          {link(links?.privacy, labels.privacy)}
        </p>
      </div>
      {error && (
        <p role="alert" id={errorId} className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}

/** 表单级错误（提交失败的原因），出现时读屏立即朗读。 */
function Auth06FormError({ id, message }: { id: string; message: string }) {
  if (!message) return null
  return (
    <p
      id={id}
      role="alert"
      data-slot="auth-06-form-error"
      className="mb-5 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
    >
      {message}
    </p>
  )
}

/** 每步底部的按钮行：左「上一步」，右侧次要操作 + 主按钮，同一档高度。 */
function Auth06Actions({
  labels,
  onBack,
  disabled,
  children,
}: {
  labels: Auth06Labels
  onBack?: () => void
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <div
      data-slot="auth-06-actions"
      className="mt-8 flex items-center gap-2 border-t border-dashed border-edge pt-5"
    >
      {onBack && (
        <Button
          type="button"
          variant="ghost"
          size="lg"
          disabled={disabled}
          onClick={onBack}
          className="-ml-2.5 text-muted-foreground"
        >
          <ChevronLeft aria-hidden="true" />
          {labels.back}
        </Button>
      )}
      <div className="ml-auto flex items-center gap-2">{children}</div>
    </div>
  )
}

/** 按钮文字在几种状态间切换时叠放全部候选，按钮宽度取最长的一个，不跳动。 */
function Auth06ButtonLabel({
  current,
  options,
}: {
  current: string
  options: string[]
}) {
  return (
    <span data-slot="auth-06-button-label" className="grid">
      {options.map((option) => (
        <span
          key={option}
          className={cn(
            "col-start-1 row-start-1",
            option !== current && "invisible",
          )}
        >
          {option}
        </span>
      ))}
    </span>
  )
}

export {
  Auth06Actions,
  Auth06ButtonLabel,
  Auth06Agreement,
  Auth06FormError,
  Auth06PasswordField,
}
