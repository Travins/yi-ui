"use client"

import * as React from "react"
import { Building2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatLabel, type Auth04Labels } from "./config"
import {
  Auth04Error,
  Auth04Field,
  Auth04PasswordField,
  Auth04ProviderButton,
} from "./form-parts"
import type { Auth04Org, Auth04Provider } from "./types"

/** 例外：行内文字链接，高度跟随文字，不占按钮的三档高度。 */
const INLINE_LINK = "h-auto px-0 pointer-coarse:h-auto"

function Auth04EmailStep({
  id,
  text,
  email,
  emailError,
  resolving,
  orgEnabled,
  orgOpen,
  slug,
  slugError,
  orgResolving,
  slugRef,
  onEmailChange,
  onSubmit,
  onToggleOrg,
  onSlugChange,
  onSubmitOrg,
}: {
  id: string
  text: Auth04Labels
  email: string
  emailError: string
  resolving: boolean
  orgEnabled: boolean
  orgOpen: boolean
  slug: string
  slugError: string
  orgResolving: boolean
  slugRef: React.Ref<HTMLInputElement>
  onEmailChange: (value: string) => void
  onSubmit: () => void
  onToggleOrg: () => void
  onSlugChange: (value: string) => void
  onSubmitOrg: () => void
}) {
  const busy = resolving || orgResolving
  return (
    <div data-slot="auth-04-email-step" className="space-y-6">
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          onSubmit()
        }}
        className="space-y-5"
      >
        <Auth04Field
          id={`${id}-email`}
          label={text.email}
          type="email"
          name="email"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          placeholder={text.emailPlaceholder}
          value={email}
          error={emailError}
          disabled={busy}
          onChange={(event) => onEmailChange(event.target.value)}
        />
        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          {resolving && <Loader2 aria-hidden="true" className="animate-spin" />}
          {resolving ? text.resolving : text.continue}
        </Button>
      </form>
      {orgEnabled && (
        <div className="space-y-4 border-t border-dashed border-edge pt-4">
          <Button
            type="button"
            variant="link"
            size="sm"
            className={INLINE_LINK}
            aria-expanded={orgOpen}
            aria-controls={`${id}-org`}
            disabled={busy}
            onClick={onToggleOrg}
          >
            {text.orgToggle}
          </Button>
          {orgOpen && (
            <form
              id={`${id}-org`}
              noValidate
              onSubmit={(event) => {
                event.preventDefault()
                onSubmitOrg()
              }}
              className="space-y-5"
            >
              <Auth04Field
                id={`${id}-slug`}
                label={text.orgSlug}
                hint={text.orgHint}
                name="organization"
                autoComplete="organization"
                autoCapitalize="none"
                spellCheck={false}
                value={slug}
                error={slugError}
                disabled={busy}
                ref={slugRef}
                onChange={(event) => onSlugChange(event.target.value)}
              />
              <Button
                type="submit"
                size="lg"
                variant="outline"
                className="w-full"
                disabled={busy}
              >
                {orgResolving && (
                  <Loader2 aria-hidden="true" className="animate-spin" />
                )}
                {orgResolving ? text.resolving : text.continue}
              </Button>
            </form>
          )}
        </div>
      )}
    </div>
  )
}

function Auth04SsoStep({
  text,
  org,
  providers,
  activeId,
  pending,
  redirected,
  error,
  retryRef,
  onSignIn,
  onRetry,
  onUsePassword,
  onChangeEmail,
}: {
  text: Auth04Labels
  org: Auth04Org
  providers: Auth04Provider[]
  activeId: string
  pending: boolean
  redirected: boolean
  error: string
  retryRef: React.Ref<HTMLButtonElement>
  onSignIn: (providerId: string) => void
  onRetry: () => void
  onUsePassword: () => void
  onChangeEmail: () => void
}) {
  const busy = pending || redirected
  return (
    <div data-slot="auth-04-sso-step" className="space-y-5">
      {/* 宽屏右栏的组织面板已显示组织名和域名，这张卡只在窄屏出现，避免重复 */}
      <div
        data-slot="auth-04-org-card"
        className="flex items-center gap-3 rounded-lg border border-edge bg-muted/30 p-3 md:hidden"
      >
        <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md border border-edge bg-background [&_svg]:size-5">
          {org.logo ?? <Building2 aria-hidden="true" />}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{org.name}</p>
          <p className="truncate font-mono text-xs text-muted-foreground">
            {org.domain}
          </p>
        </div>
      </div>
      <p className="text-sm leading-7 text-muted-foreground">
        {formatLabel(text.identified, { org: org.name })}
      </p>
      <div className="space-y-3">
        {providers.map((provider) => (
          <Auth04ProviderButton
            key={provider.id}
            provider={provider}
            primary={providers.length === 1}
            text={formatLabel(text.signInWith, { provider: provider.label })}
            pending={busy && provider.id === activeId}
            disabled={busy}
            onClick={() => onSignIn(provider.id)}
          />
        ))}
      </div>
      {busy && !error && (
        <p role="status" className="text-sm text-muted-foreground">
          {text.redirecting}
        </p>
      )}
      {error && (
        <div className="space-y-3">
          <Auth04Error>{error}</Auth04Error>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              ref={retryRef}
              type="button"
              size="lg"
              variant="outline"
              className="sm:flex-1"
              disabled={busy}
              onClick={onRetry}
            >
              {text.retry}
            </Button>
            <Button
              type="button"
              size="lg"
              variant="ghost"
              className="sm:flex-1"
              disabled={busy}
              onClick={onUsePassword}
            >
              {text.usePassword}
            </Button>
          </div>
        </div>
      )}
      <Button
        type="button"
        variant="link"
        size="sm"
        className={INLINE_LINK}
        disabled={busy}
        onClick={onChangeEmail}
      >
        {text.notThisOrg}
      </Button>
    </div>
  )
}

function Auth04PasswordStep({
  id,
  text,
  email,
  identified,
  emailError,
  password,
  passwordError,
  error,
  pending,
  onEmailChange,
  onPasswordChange,
  onSubmit,
  onChangeEmail,
}: {
  id: string
  text: Auth04Labels
  email: string
  /** 邮箱已由域名识别确认，只读展示；否则（经组织标识进入）显示输入框 */
  identified: boolean
  emailError: string
  password: string
  passwordError: string
  error: string
  pending: boolean
  onEmailChange: (value: string) => void
  onPasswordChange: (value: string) => void
  onSubmit: () => void
  onChangeEmail: () => void
}) {
  return (
    <form
      data-slot="auth-04-password-step"
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
      className="space-y-5"
    >
      {identified ? (
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
          <p className="min-w-0 break-all">
            <span className="text-muted-foreground">{text.signingInAs} </span>
            <span className="font-mono">{email}</span>
          </p>
          <Button
            type="button"
            variant="link"
            size="sm"
            className={INLINE_LINK}
            disabled={pending}
            onClick={onChangeEmail}
          >
            {text.change}
          </Button>
        </div>
      ) : (
        <Auth04Field
          id={`${id}-email`}
          label={text.email}
          type="email"
          name="email"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          placeholder={text.emailPlaceholder}
          value={email}
          error={emailError}
          disabled={pending}
          onChange={(event) => onEmailChange(event.target.value)}
        />
      )}
      <Auth04PasswordField
        id={`${id}-password`}
        label={text.password}
        name="password"
        autoComplete="current-password"
        value={password}
        error={passwordError}
        disabled={pending}
        showLabel={text.showPassword}
        hideLabel={text.hidePassword}
        onChange={(event) => onPasswordChange(event.target.value)}
      />
      {error && <Auth04Error>{error}</Auth04Error>}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending && <Loader2 aria-hidden="true" className="animate-spin" />}
        {pending ? text.signingIn : text.signIn}
      </Button>
    </form>
  )
}

export { Auth04EmailStep, Auth04PasswordStep, Auth04SsoStep }
