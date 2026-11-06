"use client"

import { Eye, EyeOff, Loader2 } from "lucide-react"
import { useState, type ComponentProps, type ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { BarField } from "@/registry/ui/bar-field/bar-field"
import { cn } from "@/lib/utils"

import { resolveLabels, type Auth02Labels } from "./config"

/**
 * 方条输入框：标签在条内左侧，值靠右；错误文字在条下方，通过 aria-describedby 关联，读屏会一并读出。
 * 高度取 lg 档（36px，触屏 44px），与区块里 size="lg" 的按钮等高。
 */
function TextField({
  id,
  label,
  error,
  footerAction,
  trailing,
  className,
  value,
  defaultValue,
  ...props
}: Omit<ComponentProps<"input">, "id" | "size"> & {
  id: string
  label: string
  error?: string
  /** 条下方右侧的操作，例如「忘记密码？」；有错误文字时错误在左、操作在右 */
  footerAction?: ReactNode
  /** 条内最右侧的元素，例如显示/隐藏密码按钮 */
  trailing?: ReactNode
}) {
  return (
    <BarField
      {...props}
      value={value === undefined ? undefined : String(value)}
      defaultValue={
        defaultValue === undefined ? undefined : String(defaultValue)
      }
      id={id}
      label={label}
      error={error}
      footerAction={footerAction}
      suffix={trailing}
      size="lg"
      className={cn(className)}
    />
  )
}

/** 带显示/隐藏切换的密码框。 */
function PasswordField({
  labels,
  ...props
}: Omit<ComponentProps<typeof TextField>, "type" | "trailing"> & {
  labels?: Partial<Auth02Labels>
}) {
  const text = resolveLabels(labels)
  const [visible, setVisible] = useState(false)
  return (
    <TextField
      {...props}
      type={visible ? "text" : "password"}
      trailing={
        <Button
          type="button"
          variant="ghost"
          size="icon-lg"
          onClick={() => setVisible((value) => !value)}
          aria-label={visible ? text.hidePassword : text.showPassword}
          aria-pressed={visible}
          // 按钮比条内边距大，向右让出 8px，图标视觉上仍与条的右缘留足间距
          className="shrink-0 text-muted-foreground hover:text-foreground"
        >
          {visible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
        </Button>
      }
    />
  )
}

/** 表单级错误（接口返回的失败原因等），出现时读屏会立即朗读。 */
function FormError({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <p
      data-slot="auth-02-form-error"
      role="alert"
      className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
    >
      {message}
    </p>
  )
}

/** 提交按钮：pending 时显示转圈并禁用。 */
function SubmitButton({
  pending,
  pendingText,
  children,
}: {
  pending: boolean
  pendingText: string
  children: ReactNode
}) {
  return (
    <Button
      data-slot="auth-02-submit-button"
      type="submit"
      size="lg"
      className="w-full"
      disabled={pending}
    >
      {pending ? (
        <>
          <Loader2 aria-hidden="true" className="animate-spin" />
          {pendingText}
        </>
      ) : (
        children
      )}
    </Button>
  )
}

/** 视图头部：标题 + 说明。每个视图只有一个 h1。 */
function ViewHeading({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div data-slot="auth-02-view-heading" className="flex flex-col gap-1">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  )
}

/** 文字链接样式的按钮，用于视图切换。 */
function LinkButton({ className, ...props }: ComponentProps<"button">) {
  return (
    <button
      data-slot="auth-02-link-button"
      type="button"
      className={cn(
        "rounded-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        className,
      )}
      {...props}
    />
  )
}

export {
  FormError,
  LinkButton,
  PasswordField,
  SubmitButton,
  TextField,
  ViewHeading,
}
