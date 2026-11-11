"use client"

import * as React from "react"
import { useAnimate, useReducedMotion } from "motion/react"
import { Check, Loader2, LockKeyhole, TimerOff } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useControllableState } from "@/registry/hooks/use-controllable-state"
import { GlyphField } from "@/registry/ui/glyph-field/glyph-field"
import { Greeting } from "@/registry/ui/greeting/greeting"
import {
  GridContainer,
  GridCrosshair,
  GridSection,
} from "@/registry/ui/grid-layout/grid-layout"
import { DEFAULT_LABELS, formatLabel } from "./config"
import { Auth07Clock, Auth07PasswordField, Auth07PinField } from "./form-parts"
import type { Auth07Method, Auth07Props } from "./types"
import { useUnlockAttempts } from "./use-auth-form"

const ALL_METHODS: Auth07Method[] = ["password", "pin"]

/** 锁屏与重新验证：已登录用户用密码或 PIN 解锁，连续失败会暂时锁定。真实认证由回调接入。 */
function Auth07({
  user,
  onUnlock,
  onSuccess,
  onSwitchAccount,
  onSignOut,
  reason = "locked",
  methods: methodsProp = ALL_METHODS,
  method: methodProp,
  defaultMethod,
  onMethodChange,
  pinLength = 6,
  maxAttempts = 5,
  lockSeconds = 30,
  timeZone,
  locale = "zh-CN",
  labels: labelsProp,
  className,
  ...props
}: Auth07Props) {
  const labels = { ...DEFAULT_LABELS, ...labelsProp }
  // 去掉未知值和重复项，保留调用方给的顺序：第一项就是默认方式
  const validMethods = methodsProp.filter(
    (item, index) =>
      ALL_METHODS.includes(item) && methodsProp.indexOf(item) === index,
  )
  const methods = validMethods.length ? validMethods : ALL_METHODS
  const [methodState, setMethod] = useControllableState<Auth07Method>({
    prop: methodProp,
    defaultProp: defaultMethod ?? methods[0]!,
    onChange: onMethodChange,
  })
  // 受控值不在可用列表里时退回第一项，避免显示一个不能用的输入
  const method = methods.includes(methodState) ? methodState : methods[0]!
  const length = Math.max(4, Math.min(8, Math.floor(pinLength) || 6))
  const attempts = useUnlockAttempts({
    maxAttempts: Math.max(1, Math.floor(maxAttempts) || 5),
    lockSeconds: Math.max(1, Math.floor(lockSeconds) || 30),
  })
  const [password, setPassword] = React.useState("")
  const [pin, setPin] = React.useState("")
  const [capsLock, setCapsLock] = React.useState(false)
  const [unlocked, setUnlocked] = React.useState(false)
  const [failCount, setFailCount] = React.useState(0)
  const passwordRef = React.useRef<HTMLInputElement>(null)
  const pinRef = React.useRef<HTMLInputElement>(null)
  const successRef = React.useRef<HTMLHeadingElement>(null)
  const [fieldScope, animate] = useAnimate<HTMLDivElement>()
  const reduced = useReducedMotion()
  const id = React.useId()
  const messageId = `${id}-message`
  const disabled = attempts.pending || attempts.locked

  // 打开、切换方式、失败重试与锁定结束后，焦点都回到当前方式的输入
  React.useEffect(() => {
    if (unlocked || attempts.locked) return
    ;(method === "pin" ? pinRef : passwordRef).current?.focus()
  }, [method, failCount, attempts.locked, unlocked])
  React.useEffect(() => {
    if (unlocked) successRef.current?.focus()
  }, [unlocked])
  React.useEffect(() => {
    if (!failCount || reduced || !fieldScope.current) return
    void animate(
      fieldScope.current,
      { x: [0, -8, 8, -5, 5, -2, 0] },
      { duration: 0.32, ease: "easeOut" },
    )
  }, [failCount, reduced, animate, fieldScope])

  async function submit(currentMethod: Auth07Method, secret: string) {
    if (disabled || unlocked) return
    if (currentMethod === "pin" ? secret.length !== length : !secret) {
      ;(currentMethod === "pin" ? pinRef : passwordRef).current?.focus()
      return
    }
    const ok = await attempts.run(() =>
      onUnlock({ method: currentMethod, secret }),
    )
    setPassword("")
    setPin("")
    if (ok) {
      setUnlocked(true)
      onSuccess?.({ method: currentMethod })
    } else {
      setFailCount((count) => count + 1)
    }
  }

  function switchMethod(next: Auth07Method) {
    setMethod(next)
    attempts.clearFailure()
    setCapsLock(false)
  }

  const failure = attempts.failure
  const errorText =
    failure && !attempts.locked
      ? formatLabel(labels.attempts, {
          message:
            failure.message ||
            (method === "pin" ? labels.wrongPin : labels.wrongPassword),
          count: failure.remaining,
        })
      : ""
  const state = unlocked
    ? "unlocked"
    : attempts.locked
      ? "locked"
      : attempts.pending
        ? "pending"
        : errorText
          ? "error"
          : "idle"
  const otherMethod = methods.find((item) => item !== method)
  const ReasonIcon = reason === "expired" ? TimerOff : LockKeyhole

  return (
    <div
      data-slot="auth-07"
      data-method={method}
      data-state={state}
      data-reason={reason}
      className={cn(
        "relative isolate flex min-h-svh w-full flex-col overflow-hidden bg-background text-foreground",
        className,
      )}
      {...props}
    >
      {/* 背景字符场：中间留白，只在四周低对比度地流动 */}
      <GlyphField
        aria-hidden="true"
        glyphs="hex"
        fade="center"
        density={0.5}
        fontSize={13}
        speed={0.015}
        className="absolute inset-0 min-h-0 opacity-50"
      />
      <GridContainer className="relative flex max-w-sm flex-1 flex-col justify-center py-12">
        <GridSection
          topLine
          crosshair
          data-slot="auth-07-panel"
          className="bg-background"
        >
          {/* 上沿是本行自己画的 screen-line-top，十字要比默认位置下移 1px 才压在线上 */}
          <GridCrosshair position="top-left" className="-top-[5px]" />
          <GridCrosshair position="top-right" className="-top-[5px]" />
          <div className="px-4 pt-10 pb-8 sm:px-6">
            <Auth07Clock
              timeZone={timeZone}
              locale={locale}
              label={labels.clock}
            />
          </div>
          <div className="flex flex-col items-center gap-3 border-t border-dashed border-edge px-4 pt-7 text-center sm:px-6">
            <Avatar data-slot="auth-07-avatar" className="size-14">
              {user.avatar ? <AvatarImage src={user.avatar} alt="" /> : null}
              <AvatarFallback className="text-lg font-medium text-foreground">
                {Array.from(user.name.trim())[0] ?? ""}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col items-center gap-1">
              <h1 className="text-lg font-medium tracking-tight">
                <Greeting name={user.name} suffix="" />
              </h1>
              {/* 解锁后原因已不成立，只留问候 */}
              {unlocked ? null : (
                <p
                  data-slot="auth-07-reason"
                  className="flex items-center gap-1.5 text-sm text-muted-foreground"
                >
                  <ReasonIcon aria-hidden="true" className="size-3.5" />
                  {reason === "expired" ? labels.expired : labels.locked}
                </p>
              )}
            </div>
          </div>
          <div className="px-4 pt-6 pb-7 sm:px-6">
            {unlocked ? (
              <div
                data-slot="auth-07-success"
                className="flex flex-col items-center gap-2 py-2 text-center"
              >
                <span className="flex size-10 items-center justify-center rounded-full border border-edge bg-primary/10 text-primary">
                  <Check aria-hidden="true" className="size-5" />
                </span>
                <h2
                  ref={successRef}
                  tabIndex={-1}
                  className="font-medium outline-none"
                >
                  {labels.unlocked}
                </h2>
                <p role="status" className="text-sm text-muted-foreground">
                  {formatLabel(labels.unlockedDescription, { name: user.name })}
                </p>
              </div>
            ) : (
              <form
                noValidate
                aria-label={labels.form}
                data-slot="auth-07-form"
                onSubmit={(event) => {
                  event.preventDefault()
                  void submit(method, method === "pin" ? pin : password)
                }}
                className="flex flex-col gap-2"
              >
                {/* 给密码管理器识别账号用，不显示 */}
                {method === "password" ? (
                  <input
                    type="text"
                    name="username"
                    autoComplete="username"
                    value={user.email ?? user.name}
                    readOnly
                    hidden
                  />
                ) : null}
                <div ref={fieldScope} data-slot="auth-07-field">
                  {method === "pin" ? (
                    <Auth07PinField
                      inputRef={pinRef}
                      length={length}
                      value={pin}
                      onChange={(value) => {
                        setPin(value)
                        attempts.clearFailure()
                      }}
                      onComplete={(value) => void submit("pin", value)}
                      label={formatLabel(labels.pin, { length })}
                      invalid={!!errorText}
                      describedBy={messageId}
                      disabled={disabled}
                    />
                  ) : (
                    <Auth07PasswordField
                      inputRef={passwordRef}
                      label={labels.password}
                      value={password}
                      onValueChange={(value) => {
                        setPassword(value)
                        attempts.clearFailure()
                      }}
                      onCapsLockChange={setCapsLock}
                      showLabel={labels.showPassword}
                      hideLabel={labels.hidePassword}
                      invalid={!!errorText}
                      describedBy={messageId}
                      disabled={disabled}
                    />
                  )}
                </div>
                {/* 预留一行，错误、倒计时、大写锁定提示出现时按钮不跳动 */}
                <div
                  data-slot="auth-07-message"
                  className="flex min-h-5 flex-col gap-1 text-xs leading-5"
                >
                  {attempts.locked ? (
                    <>
                      {/* 倒计时只给眼睛看；读屏在锁定开始时播报一次 */}
                      <p
                        id={messageId}
                        data-slot="auth-07-lockout"
                        className="text-destructive tabular-nums"
                      >
                        {formatLabel(labels.lockedOut, {
                          seconds: attempts.remaining,
                        })}
                      </p>
                      <p role="alert" className="sr-only">
                        {formatLabel(labels.lockedOut, {
                          seconds: attempts.lockTotal,
                        })}
                      </p>
                    </>
                  ) : errorText ? (
                    <p
                      id={messageId}
                      role="alert"
                      data-slot="auth-07-error"
                      className="text-destructive"
                    >
                      {errorText}
                    </p>
                  ) : null}
                  {method === "password" && capsLock && !attempts.locked ? (
                    <p
                      role="status"
                      data-slot="auth-07-caps-lock"
                      className="text-muted-foreground"
                    >
                      {labels.capsLock}
                    </p>
                  ) : null}
                </div>
                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                  disabled={disabled}
                >
                  {attempts.pending ? (
                    <>
                      <Loader2 aria-hidden="true" className="animate-spin" />
                      {labels.unlocking}
                    </>
                  ) : (
                    labels.unlock
                  )}
                </Button>
                {otherMethod ? (
                  <Button
                    type="button"
                    variant="link"
                    size="lg"
                    data-slot="auth-07-switch-method"
                    disabled={attempts.pending}
                    className="self-center text-muted-foreground hover:text-foreground"
                    onClick={() => switchMethod(otherMethod)}
                  >
                    {otherMethod === "pin" ? labels.usePin : labels.usePassword}
                  </Button>
                ) : null}
              </form>
            )}
          </div>
        </GridSection>
        {(onSwitchAccount || onSignOut) && !unlocked ? (
          <div
            data-slot="auth-07-footer"
            className="flex items-center justify-center gap-2 pt-4 text-sm"
          >
            {onSwitchAccount ? (
              <Button
                type="button"
                variant="link"
                size="lg"
                className="text-muted-foreground hover:text-foreground"
                onClick={onSwitchAccount}
              >
                {labels.switchAccount}
              </Button>
            ) : null}
            {onSwitchAccount && onSignOut ? (
              <span
                aria-hidden="true"
                className="size-1 rounded-full bg-edge"
              />
            ) : null}
            {onSignOut ? (
              <Button
                type="button"
                variant="link"
                size="lg"
                className="text-muted-foreground hover:text-foreground"
                onClick={onSignOut}
              >
                {labels.signOut}
              </Button>
            ) : null}
          </div>
        ) : null}
      </GridContainer>
    </div>
  )
}

export { Auth07 }
export type {
  Auth07Method,
  Auth07Props,
  Auth07Reason,
  Auth07User,
} from "./types"
export type { Auth07Labels } from "./config"
