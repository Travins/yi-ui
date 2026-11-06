"use client"

import {
  Check,
  ChevronRight,
  Fingerprint,
  LifeBuoy,
  MessageSquareText,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react"
import { motion, useReducedMotion } from "motion/react"
import * as React from "react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ToggleSwitch } from "@/registry/ui/toggle-switch/toggle-switch"
import type { Auth05Labels } from "./config"
import { describeAccount } from "./mask"
import {
  Auth05CodePanel,
  Auth05PasskeyPanel,
  Auth05RecoveryPanel,
} from "./panels"
import type { Auth05State } from "./use-auth-05"
import type { Auth05Method } from "./types"

const METHOD_ICONS: Record<Auth05Method, LucideIcon> = {
  passkey: Fingerprint,
  totp: ShieldCheck,
  sms: MessageSquareText,
  recovery: LifeBuoy,
}

/** 方式名称、说明、标题都按 `<method>Name` 这类键从 labels 取，使用者可以逐项覆盖。 */
function methodText(labels: Auth05Labels, method: Auth05Method) {
  return {
    name: labels[`${method}Name`],
    hint: labels[`${method}Hint`],
    title: labels[`${method}Title`],
  }
}

/** 品牌（可选）、标题和说明。外面的容器由整页版和嵌入版各自决定。 */
function Auth05Intro({
  auth,
  defaultLevel,
}: {
  auth: Auth05State
  /** 使用者没传 headingLevel 时的级别：整页版 1，嵌入版 2 */
  defaultLevel: 1 | 2 | 3
}) {
  const { brand, labels } = auth
  const Heading = `h${auth.headingLevel ?? defaultLevel}` as const
  return (
    <>
      {brand && (
        <div className="mb-6 flex items-center gap-2 text-sm font-medium">
          {brand.logo}
          {brand.name}
        </div>
      )}
      <Heading className="text-2xl font-semibold tracking-tight">
        {labels.title}
      </Heading>
      <p className="mt-2 text-sm leading-7 text-muted-foreground">
        {labels.description}
      </p>
    </>
  )
}

/** 账号摘要的内容：头像、账号文字、切换账号按钮。 */
function Auth05AccountContent({ auth }: { auth: Auth05State }) {
  const { account, labels, onSwitchAccount } = auth
  const { primary, secondary, masked, initial } = describeAccount(account)
  return (
    <>
      <Avatar size="sm">
        {account.avatar && <AvatarImage src={account.avatar} alt="" />}
        <AvatarFallback>{initial}</AvatarFallback>
      </Avatar>
      <p
        className={cn(
          "min-w-44 flex-1 truncate text-sm",
          masked && "font-mono",
        )}
      >
        <span className="sr-only">{labels.accountLabel}：</span>
        {primary}
        {secondary && (
          <span className="ms-1.5 text-xs text-muted-foreground">
            {secondary}
          </span>
        )}
      </p>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="text-muted-foreground"
        onClick={() => onSwitchAccount?.()}
      >
        {labels.accountSwitch}
      </Button>
    </>
  )
}

/** 当前方式的面板（含标题和成功状态）。切换方式或成功时整块淡入。 */
function Auth05MethodBody({ auth }: { auth: Auth05State }) {
  const {
    labels,
    method,
    done,
    others,
    titleRef,
    setBusy,
    setMethod,
    supported,
    complete,
  } = auth
  const reduced = useReducedMotion()
  const text = methodText(labels, method)
  const suggestedMethod = others[0]
  return (
    <motion.div
      key={done ? "success" : method}
      data-slot="auth-05-panel"
      initial={false}
      animate={
        reduced ? { opacity: 1, y: 0 } : { opacity: [0.7, 1], y: [4, 0] }
      }
      transition={{ duration: reduced ? 0 : 0.18 }}
    >
      <h2
        ref={titleRef}
        tabIndex={-1}
        className="mb-4 flex items-center gap-2 text-lg font-medium outline-none focus-visible:underline"
      >
        {done && (
          <Check
            aria-hidden
            className="size-5 rounded-full bg-primary p-1 text-primary-foreground"
          />
        )}
        {done ? labels.success : text.title}
      </h2>
      {done ? (
        <p className="text-sm leading-7 text-muted-foreground">
          {labels.successDescription}
        </p>
      ) : method === "passkey" ? (
        <Auth05PasskeyPanel
          labels={labels}
          onBusyChange={setBusy}
          supported={supported}
          onPasskey={auth.onPasskey}
          onDone={complete}
          suggestion={
            suggestedMethod
              ? {
                  name: methodText(labels, suggestedMethod).name,
                  onSelect: () => setMethod(suggestedMethod),
                }
              : undefined
          }
        />
      ) : method === "recovery" ? (
        <Auth05RecoveryPanel
          labels={labels}
          onBusyChange={setBusy}
          onVerify={auth.onVerify}
          onDone={complete}
          recoveryCode={auth.recoveryCode}
        />
      ) : (
        <Auth05CodePanel
          labels={labels}
          onBusyChange={setBusy}
          kind={method}
          length={auth.codeLength}
          phone={auth.account.phone}
          resendSeconds={auth.resendSeconds}
          onSendCode={auth.onSendCode}
          onVerify={auth.onVerify}
          onDone={complete}
        />
      )}
    </motion.div>
  )
}

/** 「其他验证方式」列表。外层的边框、内边距由调用方通过 className 给。 */
function Auth05Alternatives({
  auth,
  className,
}: {
  auth: Auth05State
  className?: string
}) {
  const { labels, others, busy, setMethod } = auth
  const alternativesId = React.useId()
  return (
    <nav
      data-slot="auth-05-alternatives"
      aria-labelledby={alternativesId}
      className={className}
    >
      <h2
        id={alternativesId}
        className="mb-3 text-xs font-medium text-muted-foreground"
      >
        {labels.alternatives}
      </h2>
      <ul className="space-y-1.5">
        {others.map((item) => {
          const Icon = METHOD_ICONS[item]
          const info = methodText(labels, item)
          return (
            <li key={item}>
              <button
                type="button"
                data-method={item}
                disabled={busy}
                onClick={() => setMethod(item)}
                className="group/alt flex min-h-12 w-full items-center gap-3 rounded-lg border border-edge bg-background px-3 py-2 text-start transition-colors outline-none hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 pointer-coarse:min-h-14"
              >
                <Icon
                  aria-hidden
                  className="size-4 shrink-0 text-muted-foreground"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {info.name}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {info.hint}
                  </span>
                </span>
                <ChevronRight
                  aria-hidden
                  className="size-4 shrink-0 text-muted-foreground transition-transform group-hover/alt:translate-x-0.5 motion-reduce:transition-none"
                />
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

/** 「记住此设备」开关；`showRememberDevice` 为 false 时不渲染。 */
function Auth05RememberDevice({ auth }: { auth: Auth05State }) {
  if (!auth.showRememberDevice) return null
  return (
    <ToggleSwitch
      label={auth.labels.rememberDevice}
      checked={auth.remember}
      onCheckedChange={auth.setRemember}
    />
  )
}

/** 帮助链接；没传 `helpHref` 时不渲染。 */
function Auth05HelpLink({ auth }: { auth: Auth05State }) {
  if (!auth.helpHref) return null
  return (
    <a
      data-slot="auth-05-help"
      href={auth.helpHref}
      className="text-sm text-muted-foreground underline underline-offset-4 outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      {auth.labels.help}
    </a>
  )
}

/** 成功是整块内容被替换，单独用一个常驻的播报区，读屏才会读出来。 */
function Auth05Announcer({ auth }: { auth: Auth05State }) {
  return (
    <p data-slot="auth-05-announcer" className="sr-only" aria-live="polite">
      {auth.done ? auth.labels.successAnnounce : ""}
    </p>
  )
}

export {
  Auth05AccountContent,
  Auth05Alternatives,
  Auth05Announcer,
  Auth05HelpLink,
  Auth05Intro,
  Auth05MethodBody,
  Auth05RememberDevice,
}
