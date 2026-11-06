"use client"

import * as React from "react"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { formatLabel, type Auth05Labels } from "./config"
import { Auth05CodeInput } from "./form-parts"
import {
  formatRecoveryCode,
  isRecoveryComplete,
  maskPhone,
  recoveryCapacity,
  recoveryDropped,
  recoveryOverflow,
  resolveRecoveryRule,
} from "./mask"
import type { Auth05Props } from "./types"
import { useAsyncAction } from "./use-auth-form"

type PanelBase = {
  labels: Auth05Labels
  /** 请求进行中时通知父级，用于锁定「其他验证方式」，避免结果落在已卸载的面板上。 */
  onBusyChange: (busy: boolean) => void
}

function useBusy(busy: boolean, onBusyChange: (busy: boolean) => void) {
  React.useEffect(() => {
    onBusyChange(busy)
    return () => onBusyChange(false)
  }, [busy, onBusyChange])
}

type PasskeyStatus = "idle" | "waiting" | "cancelled" | "error"

/** 通行密钥：WebAuthn 由接入方在 onPasskey 里实现，这里只按回调结果显示状态。 */
function Auth05PasskeyPanel({
  labels,
  onBusyChange,
  supported,
  onPasskey,
  onDone,
  suggestion,
}: PanelBase & {
  /** `null` 表示尚未检测（服务端渲染和水合期间）。 */
  supported: boolean | null
  onPasskey?: () => Promise<void>
  onDone: () => void
  suggestion?: { name: string; onSelect: () => void }
}) {
  const [status, setStatus] = React.useState<PasskeyStatus>("idle")
  const [message, setMessage] = React.useState("")
  const lock = React.useRef(false)
  // 忙状态在事件里同步通知父级（不经过 effect），列表在同一次渲染里就被锁住；卸载时兜底解锁
  React.useEffect(() => () => onBusyChange(false), [onBusyChange])

  async function start() {
    if (lock.current || supported === false) return
    lock.current = true
    onBusyChange(true)
    setStatus("waiting")
    setMessage("")
    try {
      if (!onPasskey) throw new Error(labels.failed)
      await onPasskey()
      onDone()
    } catch (caught) {
      // 用户关闭系统弹窗、超时或拒绝时，WebAuthn 统一抛 NotAllowedError，不算故障。
      if ((caught as { name?: string } | null)?.name === "NotAllowedError") {
        setStatus("cancelled")
      } else {
        setStatus("error")
        setMessage(caught instanceof Error ? caught.message : labels.failed)
      }
    } finally {
      lock.current = false
      onBusyChange(false)
    }
  }

  const waiting = status === "waiting"
  // 状态文字放在始终存在的 aria-live 容器里，变化时才会被播报
  const liveText =
    supported === false
      ? labels.passkeyUnsupported
      : waiting
        ? labels.passkeyWaiting
        : status === "cancelled"
          ? labels.passkeyCancelled
          : ""

  return (
    <div data-slot="auth-05-passkey" data-status={status} className="space-y-4">
      <p className="text-sm leading-7 text-muted-foreground">
        {labels.passkeyDescription}
      </p>
      <p
        aria-live="polite"
        data-slot="auth-05-passkey-status"
        className="min-h-5 text-sm text-muted-foreground"
      >
        {liveText}
      </p>
      {status === "error" && message && (
        <p role="alert" className="text-xs text-destructive">
          {message}
        </p>
      )}
      <Button
        type="button"
        size="lg"
        className="w-full"
        disabled={waiting || supported === false}
        aria-busy={waiting || undefined}
        onClick={() => void start()}
      >
        {waiting ? (
          <>
            <Loader2
              aria-hidden
              className="animate-spin motion-reduce:animate-none"
            />
            {labels.passkeyWaitingButton}
          </>
        ) : (
          labels.passkeyAction
        )}
      </Button>
      {supported === false && suggestion && (
        <Button
          type="button"
          size="lg"
          variant="outline"
          className="w-full"
          onClick={suggestion.onSelect}
        >
          {formatLabel(labels.passkeySuggest, { method: suggestion.name })}
        </Button>
      )}
    </div>
  )
}

/** 验证器 App（totp）与短信共用：6 位数字，满位自动提交；短信多一步「发送」和倒计时。 */
function Auth05CodePanel({
  labels,
  onBusyChange,
  kind,
  length,
  phone,
  resendSeconds,
  onSendCode,
  onVerify,
  onDone,
}: PanelBase & {
  kind: "totp" | "sms"
  length: number
  phone?: string
  resendSeconds: number
  onSendCode?: () => Promise<void>
  onVerify?: Auth05Props["onVerify"]
  onDone: () => void
}) {
  const id = React.useId()
  const [code, setCode] = React.useState("")
  const [sent, setSent] = React.useState(false)
  const [deadline, setDeadline] = React.useState(0)
  const [remaining, setRemaining] = React.useState(0)
  const sending = useAsyncAction(labels.failed)
  const verifying = useAsyncAction(labels.failed)
  const pending = sending.pending || verifying.pending
  useBusy(pending, onBusyChange)
  const masked = phone ? maskPhone(phone) : ""

  React.useEffect(() => {
    if (!deadline) return
    const tick = () =>
      setRemaining(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)))
    tick()
    const timer = window.setInterval(tick, 250)
    return () => window.clearInterval(timer)
  }, [deadline])

  async function send() {
    if (pending || remaining > 0) return
    const ok = await sending.run(async () => {
      if (!onSendCode) throw new Error(labels.failed)
      await onSendCode()
    })
    if (!ok) return
    setSent(true)
    setCode("")
    verifying.setError("")
    const seconds = Math.max(0, resendSeconds)
    setRemaining(seconds)
    // 仅在发送成功的事件回调中读取时间，不参与服务端渲染。
    setDeadline(Date.now() + seconds * 1000)
  }

  async function verify(value: string) {
    if (pending || value.length !== length) return
    const ok = await verifying.run(async () => {
      if (!onVerify) throw new Error(labels.failed)
      await onVerify({ method: kind, code: value })
    })
    if (ok) onDone()
  }

  const showCode = kind === "totp" || sent
  const description =
    kind === "totp"
      ? formatLabel(labels.totpDescription, { length })
      : formatLabel(labels.smsDescription, { phone: masked })

  return (
    <form
      noValidate
      data-slot={`auth-05-${kind}`}
      onSubmit={(event) => {
        event.preventDefault()
        void verify(code)
      }}
      className="space-y-4"
    >
      <p className="text-sm leading-7 text-muted-foreground">{description}</p>
      {kind === "sms" && (
        <>
          <Button
            type="button"
            size="lg"
            variant={sent ? "outline" : "default"}
            className="w-full"
            disabled={pending || remaining > 0}
            onClick={() => void send()}
          >
            {sending.pending
              ? labels.smsSending
              : remaining > 0
                ? formatLabel(labels.smsCountdown, { seconds: remaining })
                : sent
                  ? labels.smsResend
                  : labels.smsSend}
          </Button>
          <p
            aria-live="polite"
            className="min-h-5 font-mono text-xs text-muted-foreground"
          >
            {sent ? formatLabel(labels.smsSent, { phone: masked }) : ""}
          </p>
          {sending.error && (
            <p role="alert" className="text-xs text-destructive">
              {sending.error}
            </p>
          )}
        </>
      )}
      {showCode && (
        <>
          <div className="space-y-2">
            <Auth05CodeInput
              length={length}
              value={code}
              label={formatLabel(labels.code, { length })}
              disabled={pending}
              error={!!verifying.error}
              describedBy={verifying.error ? `${id}-error` : undefined}
              onChange={(value) => {
                setCode(value)
                verifying.setError("")
              }}
              onComplete={(value) => void verify(value)}
            />
            {verifying.error && (
              <p
                role="alert"
                id={`${id}-error`}
                className="text-xs text-destructive"
              >
                {verifying.error}
              </p>
            )}
          </div>
          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={pending || code.length !== length}
          >
            {verifying.pending ? labels.verifying : labels.verify}
          </Button>
        </>
      )}
    </form>
  )
}

/**
 * 恢复码：默认输入时自动转大写并插入短横线（XXXX-XXXX），格式可通过 recoveryCode 配置，也可以完全不格式化。
 * 内容不会被悄悄改掉：不格式化时超过 maxLength 保留原样并报错、禁止提交；
 * 有掩码时多出的字符会被丢掉，并给出一条会被读屏播报的提示。
 */
function Auth05RecoveryPanel({
  labels,
  onBusyChange,
  onVerify,
  onDone,
  recoveryCode,
}: PanelBase & {
  onVerify?: Auth05Props["onVerify"]
  onDone: () => void
  recoveryCode?: Auth05Props["recoveryCode"]
}) {
  const rule = resolveRecoveryRule(recoveryCode)
  const masked = rule.format !== false
  const id = React.useId()
  const [code, setCode] = React.useState("")
  const complete = isRecoveryComplete(code, rule)
  // 超长是从当前值直接算出来的：删回范围内错误自然消失，不用另外清除
  const overflow = recoveryOverflow(code, rule)
  const [notice, setNotice] = React.useState("")
  const placeholder =
    recoveryCode?.placeholder ??
    formatLabel(labels.recoveryPlaceholder, { format: rule.format || "" })
  const [localError, setLocalError] = React.useState("")
  const verifying = useAsyncAction(labels.failed)
  useBusy(verifying.pending, onBusyChange)
  const overflowError = overflow
    ? formatLabel(labels.recoveryTooLong, overflow)
    : ""
  const error = overflowError || localError || verifying.error
  const inputRef = React.useRef<HTMLInputElement>(null)

  async function submit() {
    if (verifying.pending) return
    if (overflow) {
      // 回车提交时按钮虽然禁用也可能走到这里：拦下并把焦点还给输入框
      inputRef.current?.focus()
      return
    }
    if (!complete) {
      setLocalError(
        masked
          ? formatLabel(labels.recoveryError, { format: rule.format as string })
          : labels.recoveryEmpty,
      )
      return
    }
    const ok = await verifying.run(async () => {
      if (!onVerify) throw new Error(labels.failed)
      // 不格式化时只去掉首尾空白，其余原样提交
      await onVerify({ method: "recovery", code: code.trim() })
    })
    if (ok) onDone()
  }

  return (
    <form
      noValidate
      data-slot="auth-05-recovery"
      onSubmit={(event) => {
        event.preventDefault()
        void submit()
      }}
      className="space-y-4"
    >
      <p className="text-sm leading-7 text-muted-foreground">
        {labels.recoveryDescription}
      </p>
      <div className="space-y-2">
        <label
          htmlFor={`${id}-input`}
          className="text-xs text-muted-foreground"
        >
          {labels.recoveryLabel}
        </label>
        <Input
          ref={inputRef}
          id={`${id}-input`}
          value={code}
          onChange={(event) => {
            const raw = event.target.value
            setCode(formatRecoveryCode(raw, rule))
            // 有掩码时多出来的字符不会进入输入框，要让用户知道；下一次输入重新计算，没有多出就清除
            const dropped = recoveryDropped(raw, rule)
            setNotice(
              dropped > 0 && rule.format !== false
                ? formatLabel(labels.recoveryTrimmed, {
                    count: recoveryCapacity(rule.format),
                  })
                : "",
            )
            setLocalError("")
            verifying.setError("")
          }}
          placeholder={placeholder}
          autoComplete="off"
          autoCapitalize={rule.uppercase ? "characters" : "off"}
          autoCorrect="off"
          spellCheck={false}
          disabled={verifying.pending}
          aria-invalid={error ? true : undefined}
          aria-describedby={`${id}-note${notice ? ` ${id}-notice` : ""}${error ? ` ${id}-error` : ""}`}
          className={cn(
            "h-9 font-mono focus-visible:border-foreground/25 focus-visible:bg-background focus-visible:ring-0 aria-invalid:focus-visible:ring-3 pointer-coarse:h-11",
            masked && "tracking-widest",
          )}
        />
        <p id={`${id}-note`} className="text-xs text-muted-foreground">
          {labels.recoveryNote}
        </p>
        {/* 常驻的播报区：内容变化时读屏才会播报；没有内容时不占位 */}
        <p
          id={`${id}-notice`}
          role="status"
          data-slot="auth-05-recovery-notice"
          className="text-xs text-muted-foreground empty:hidden"
        >
          {notice}
        </p>
        {error && (
          <p
            role="alert"
            id={`${id}-error`}
            className="text-xs text-destructive"
          >
            {error}
          </p>
        )}
      </div>
      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={verifying.pending || !complete}
      >
        {verifying.pending ? labels.verifying : labels.verify}
      </Button>
    </form>
  )
}

export { Auth05CodePanel, Auth05PasskeyPanel, Auth05RecoveryPanel }
