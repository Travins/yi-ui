"use client"

import * as React from "react"
import { OTPInputContext } from "input-otp"
import { Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { InputOTP, InputOTPGroup } from "@/components/ui/input-otp"
import { cn } from "@/lib/utils"
import { useNow } from "@/registry/hooks/use-now"
import { BarField } from "@/registry/ui/bar-field/bar-field"
import { LocalTime } from "@/registry/ui/local-time/local-time"

function subscribeNothing() {
  return () => {}
}

/** 浏览器时区；服务端与水合期间为 null，挂载后才读取，首屏 HTML 因此不带任何时区信息。 */
function useBrowserTimeZone() {
  return React.useSyncExternalStore(
    subscribeNothing,
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    () => null,
  )
}

const dateFormatters = new Map<string, Intl.DateTimeFormat>()
function formatDate(now: number, locale: string, timeZone: string) {
  const key = `${locale}|${timeZone}`
  let formatter = dateFormatters.get(key)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, {
      timeZone,
      month: "long",
      day: "numeric",
      weekday: "long",
    })
    dateFormatters.set(key, formatter)
  }
  return formatter.format(now)
}

/** 大号时:分与日期星期；挂载前用同尺寸的占位，不读取当前时间。 */
function Auth07Clock({
  timeZone: timeZoneProp,
  locale,
  label,
}: {
  timeZone?: string
  locale: string
  label: string
}) {
  const browserZone = useBrowserTimeZone()
  const timeZone = timeZoneProp ?? browserZone
  const now = useNow(60_000)
  const date = now !== null && timeZone ? formatDate(now, locale, timeZone) : ""
  return (
    <div
      data-slot="auth-07-clock"
      data-ready={date ? "" : undefined}
      role="group"
      aria-label={label}
      className="flex flex-col items-center gap-1.5"
    >
      <p className="text-5xl leading-none font-light tracking-tight tabular-nums sm:text-7xl">
        {timeZone ? (
          <LocalTime
            timeZone={timeZone}
            locale={locale}
            showSeconds={false}
            showDifference={false}
          />
        ) : (
          <span
            data-slot="auth-07-clock-placeholder"
            aria-hidden="true"
            className="text-muted-foreground"
          >
            --:--
          </span>
        )}
      </p>
      {/* 日期行固定一行高度，挂载前后不跳动 */}
      <p className="h-5 text-sm text-muted-foreground">{date}</p>
    </div>
  )
}

/** 方条密码框：显示/隐藏切换，按键时检测大写锁定。 */
function Auth07PasswordField({
  inputRef,
  label,
  value,
  onValueChange,
  onCapsLockChange,
  showLabel,
  hideLabel,
  invalid,
  describedBy,
  disabled,
}: {
  inputRef: React.Ref<HTMLInputElement>
  label: string
  value: string
  onValueChange: (value: string) => void
  onCapsLockChange: (on: boolean) => void
  showLabel: string
  hideLabel: string
  invalid: boolean
  describedBy?: string
  disabled: boolean
}) {
  const [visible, setVisible] = React.useState(false)
  const detect = (event: React.KeyboardEvent<HTMLInputElement>) => {
    // 合成事件（自动填充等）没有修饰键状态，跳过
    if (typeof event.getModifierState === "function")
      onCapsLockChange(event.getModifierState("CapsLock"))
  }
  return (
    <BarField
      inputRef={inputRef}
      name="password"
      type={visible ? "text" : "password"}
      autoComplete="current-password"
      label={label}
      size="lg"
      value={value}
      onValueChange={onValueChange}
      onKeyDown={detect}
      onKeyUp={detect}
      onBlur={() => onCapsLockChange(false)}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      disabled={disabled}
      suffix={
        <Button
          type="button"
          variant="ghost"
          size="icon-lg"
          disabled={disabled}
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? hideLabel : showLabel}
          aria-pressed={visible}
          className="shrink-0 text-muted-foreground hover:text-foreground"
        >
          {visible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
        </Button>
      }
    />
  )
}

/** PIN 的一格：只显示圆点，不显示数字。 */
function Auth07PinSlot({
  index,
  invalid,
}: {
  index: number
  invalid: boolean
}) {
  const context = React.useContext(OTPInputContext)
  const slot = context?.slots[index]
  return (
    <div
      data-slot="auth-07-pin-slot"
      data-active={slot?.isActive || undefined}
      data-filled={slot?.char ? "" : undefined}
      aria-invalid={invalid || undefined}
      className={cn(
        "relative flex h-9 min-w-0 flex-1 items-center justify-center border-y border-r border-edge bg-muted/60 transition-colors first:rounded-l-md first:border-l last:rounded-r-md pointer-coarse:h-11",
        "data-active:z-10 data-active:border-foreground/25 data-active:bg-background",
        "aria-invalid:border-destructive",
      )}
    >
      {slot?.char ? (
        <span
          aria-hidden="true"
          className="size-2.5 rounded-full bg-foreground"
        />
      ) : null}
      {slot?.hasFakeCaret ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
        >
          <span className="h-4 w-px animate-caret-blink bg-foreground duration-1000" />
        </span>
      ) : null}
    </div>
  )
}

/** 数字 PIN：输满自动提交，格子里只显示圆点。 */
function Auth07PinField({
  inputRef,
  length,
  value,
  onChange,
  onComplete,
  label,
  invalid,
  describedBy,
  disabled,
}: {
  inputRef: React.Ref<HTMLInputElement>
  length: number
  value: string
  onChange: (value: string) => void
  onComplete: (value: string) => void
  label: string
  invalid: boolean
  describedBy?: string
  disabled: boolean
}) {
  return (
    <div data-slot="auth-07-pin">
      <InputOTP
        ref={inputRef}
        maxLength={length}
        value={value}
        onChange={onChange}
        onComplete={onComplete}
        pattern="^[0-9]*$"
        inputMode="numeric"
        autoComplete="off"
        aria-label={label}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        disabled={disabled}
        containerClassName="w-full"
      >
        <InputOTPGroup className="w-full rounded-md">
          {Array.from({ length }, (_, index) => (
            <Auth07PinSlot key={index} index={index} invalid={invalid} />
          ))}
        </InputOTPGroup>
      </InputOTP>
    </div>
  )
}

export { Auth07Clock, Auth07PasswordField, Auth07PinField }
