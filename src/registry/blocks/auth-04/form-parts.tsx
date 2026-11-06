"use client"

import * as React from "react"
import {
  Building2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  ShieldCheck,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import type { Auth04Provider } from "./types"

/** 输入框统一取 lg 档：桌面 36px，触屏 44px，与同一表单里的 lg 按钮等高。 */
const INPUT_CLASS = "h-9 pointer-coarse:h-11"

/** 带标签、提示和错误文字的输入框；错误通过 aria-describedby 关联。 */
function Auth04Field({
  label,
  hint,
  error,
  trailing,
  className,
  id,
  ...props
}: Omit<React.ComponentProps<"input">, "size"> & {
  id: string
  label: string
  hint?: string
  error?: string
  /** 输入框内最右侧的元素，例如显示密码按钮 */
  trailing?: React.ReactNode
}) {
  const describedBy =
    [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") ||
    undefined
  return (
    <div data-slot="auth-04-field" className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          {...props}
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(INPUT_CLASS, trailing && "pr-11", className)}
        />
        {trailing && (
          <span className="absolute inset-y-0 right-0.5 flex items-center">
            {trailing}
          </span>
        )}
      </div>
      {hint && (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}

/** 带显示/隐藏切换的密码框。 */
function Auth04PasswordField({
  showLabel,
  hideLabel,
  ...props
}: Omit<React.ComponentProps<typeof Auth04Field>, "type" | "trailing"> & {
  showLabel: string
  hideLabel: string
}) {
  const [visible, setVisible] = React.useState(false)
  return (
    <Auth04Field
      {...props}
      type={visible ? "text" : "password"}
      trailing={
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={visible ? hideLabel : showLabel}
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

/** 表单级错误，出现时读屏立即朗读。 */
function Auth04Error({
  children,
  id,
}: {
  children: React.ReactNode
  id?: string
}) {
  return (
    <p
      id={id}
      data-slot="auth-04-error"
      role="alert"
      className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
    >
      {children}
    </p>
  )
}

/** 提供方默认图标：按协议区分，调用方可用 `icon` 覆盖。 */
function providerIcon(provider: Auth04Provider) {
  if (provider.icon) return provider.icon
  if (provider.protocol === "oidc") return <KeyRound aria-hidden="true" />
  if (provider.protocol === "directory") return <Building2 aria-hidden="true" />
  return <ShieldCheck aria-hidden="true" />
}

/** 提供方登录按钮；进行中显示转圈，宽度不变。 */
function Auth04ProviderButton({
  provider,
  text,
  primary,
  pending,
  disabled,
  onClick,
}: {
  provider: Auth04Provider
  text: string
  primary: boolean
  pending: boolean
  disabled: boolean
  onClick: () => void
}) {
  return (
    <Button
      type="button"
      size="lg"
      variant={primary ? "default" : "outline"}
      data-slot="auth-04-provider"
      data-provider={provider.id}
      className="w-full"
      disabled={disabled}
      onClick={onClick}
    >
      {pending ? (
        <Loader2 aria-hidden="true" className="animate-spin" />
      ) : (
        providerIcon(provider)
      )}
      {text}
    </Button>
  )
}

export {
  Auth04Error,
  Auth04Field,
  Auth04PasswordField,
  Auth04ProviderButton,
  providerIcon,
}
