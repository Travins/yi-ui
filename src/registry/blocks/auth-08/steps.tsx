"use client"

import * as React from "react"
import { ExternalLink, Mail } from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { BarField } from "@/registry/ui/bar-field/bar-field"
import { Ripple } from "@/registry/ui/ripple/ripple"
import { formatLabel, type Auth08Labels } from "./config"
import {
  Auth08CodeInput,
  Auth08Divider,
  Auth08DomainSuggestions,
} from "./form-parts"
import type { Auth08MailProvider } from "./types"

type TitleRef = React.Ref<HTMLHeadingElement>

const titleClass =
  "text-2xl font-semibold tracking-tight outline-none focus-visible:underline focus-visible:underline-offset-4"

function Auth08EmailStep({
  labels,
  titleRef,
  inputRef,
  email,
  error,
  pending,
  suggestions,
  submitLabel,
  submitDisabled,
  onEmailChange,
  onPick,
  onSubmit,
}: {
  labels: Auth08Labels
  titleRef: TitleRef
  inputRef: React.Ref<HTMLInputElement>
  email: string
  error: string
  pending: boolean
  suggestions: string[]
  submitLabel: string
  submitDisabled: boolean
  onEmailChange: (value: string) => void
  onPick: (value: string) => void
  onSubmit: () => void
}) {
  const id = React.useId()
  const errorId = `${id}-error`
  return (
    <div data-slot="auth-08-email" className="space-y-6">
      <div>
        <h1 ref={titleRef} tabIndex={-1} className={titleClass}>
          {labels.title}
        </h1>
        <p className="mt-2 text-sm leading-7 text-balance text-muted-foreground">
          {labels.description}
        </p>
      </div>
      <form
        noValidate
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault()
          onSubmit()
        }}
      >
        <div className="space-y-2">
          <BarField
            inputRef={inputRef}
            label={labels.email}
            type="email"
            name="email"
            autoComplete="email"
            inputMode="email"
            autoCapitalize="none"
            spellCheck={false}
            placeholder={labels.emailPlaceholder}
            size="lg"
            required
            value={email}
            onValueChange={onEmailChange}
            disabled={pending}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
          />
          {/* 错误不走 BarField 的 error：这里要 role="alert" 让读屏立即播报 */}
          {error && (
            <p
              role="alert"
              id={errorId}
              data-slot="auth-08-email-error"
              className="text-xs text-destructive"
            >
              {error}
            </p>
          )}
          <Auth08DomainSuggestions
            label={labels.suggestions}
            local={email.slice(0, email.indexOf("@"))}
            domains={suggestions}
            disabled={pending}
            onPick={onPick}
          />
        </div>
        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={submitDisabled}
        >
          {submitLabel}
        </Button>
      </form>
    </div>
  )
}

function Auth08SentStep({
  labels,
  titleRef,
  email,
  provider,
  showCode,
  codeLength,
  code,
  codeError,
  verifying,
  resendError,
  resendNotice,
  resendLabel,
  resendDisabled,
  pending,
  onCodeChange,
  onCodeComplete,
  onChangeEmail,
  onResend,
}: {
  labels: Auth08Labels
  titleRef: TitleRef
  email: string
  provider?: Auth08MailProvider
  showCode: boolean
  codeLength: number
  code: string
  codeError: string
  verifying: boolean
  resendError: string
  resendNotice: boolean
  resendLabel: string
  resendDisabled: boolean
  pending: boolean
  onCodeChange: (value: string) => void
  onCodeComplete: (value: string) => void
  onChangeEmail: () => void
  onResend: () => void
}) {
  const id = React.useId()
  const [before, after = ""] = labels.sentTo.split("{email}")
  return (
    <div data-slot="auth-08-sent" className="space-y-6">
      <div className="flex flex-col items-center text-center">
        {/* 以邮件图标为圆心向外扩散，表达「已发出」；纯装饰，状态由标题和文字说明 */}
        <Ripple
          size={120}
          rings={3}
          ringGap={28}
          baseSize={44}
          duration={3.5}
          background="dots"
          tone="primary"
          className="h-30 w-56 max-w-full"
        >
          <span className="absolute top-1/2 left-1/2 flex size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-edge bg-background text-primary [&_svg]:size-5">
            <Mail />
          </span>
        </Ripple>
        <h1 ref={titleRef} tabIndex={-1} className={cn("mt-4", titleClass)}>
          {labels.sentTitle}
        </h1>
        <p className="mt-2 text-sm leading-7 text-muted-foreground">
          {before}
          <span
            data-slot="auth-08-sent-email"
            className="font-mono break-all text-foreground"
          >
            {email}
          </span>
          {after} {/* 例外：行内文字链接，高度跟随文字，不占按钮的三档高度 */}
          <Button
            type="button"
            variant="link"
            size="sm"
            disabled={pending}
            className="h-auto px-0 align-baseline text-sm pointer-coarse:h-auto"
            onClick={onChangeEmail}
          >
            {labels.changeEmail}
          </Button>
        </p>
      </div>
      {provider && (
        <a
          href={provider.url}
          target="_blank"
          rel="noreferrer"
          data-slot="auth-08-open-mail"
          className={buttonVariants({ size: "lg", className: "w-full" })}
        >
          {formatLabel(labels.openMail, { name: provider.name })}
          <ExternalLink aria-hidden="true" />
          <span className="sr-only">{labels.newTab}</span>
        </a>
      )}
      {showCode && (
        <div className="space-y-4">
          <Auth08Divider>
            {provider ? labels.codeDivider : labels.codeDividerSolo}
          </Auth08Divider>
          <div className="space-y-2">
            <Auth08CodeInput
              length={codeLength}
              value={code}
              label={formatLabel(labels.code, { length: codeLength })}
              disabled={pending}
              error={!!codeError}
              describedBy={codeError ? `${id}-code-error` : undefined}
              onChange={onCodeChange}
              onComplete={onCodeComplete}
            />
            {codeError ? (
              <p
                role="alert"
                id={`${id}-code-error`}
                data-slot="auth-08-code-error"
                className="text-xs text-destructive"
              >
                {codeError}
              </p>
            ) : (
              // 验证中格子已禁用，视觉上足够；这里只给读屏播报
              <p aria-live="polite" className="sr-only">
                {verifying ? labels.verifying : ""}
              </p>
            )}
          </div>
        </div>
      )}
      <div className="-mt-2 space-y-2 text-center">
        {/* 宽度占满：文案在「重新发送 / 倒计时 / 发送中」之间切换时位置不跳 */}
        <Button
          type="button"
          variant="link"
          className="w-full"
          disabled={resendDisabled}
          onClick={onResend}
        >
          {resendLabel}
        </Button>
        {resendError ? (
          <p
            role="alert"
            data-slot="auth-08-resend-error"
            className="text-xs text-destructive"
          >
            {resendError}
          </p>
        ) : (
          <p
            role="status"
            className="text-xs text-muted-foreground empty:hidden"
          >
            {resendNotice ? labels.resent : ""}
          </p>
        )}
        <p className="text-xs leading-5 text-muted-foreground">{labels.hint}</p>
      </div>
    </div>
  )
}

export { Auth08EmailStep, Auth08SentStep }
