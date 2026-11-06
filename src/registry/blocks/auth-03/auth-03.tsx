"use client"

import * as React from "react"
import { motion, useReducedMotion } from "motion/react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import { useControllableState } from "@/registry/hooks/use-controllable-state"
import {
  GridContainer,
  GridSection,
  GridSeparator,
} from "@/registry/ui/grid-layout/grid-layout"
import { PhoneInput, maskPhone } from "@/registry/ui/phone-input/phone-input"
import { DEFAULT_LABELS, formatLabel } from "./config"
import { Auth03CodeInput } from "./form-parts"
import { createPhoneSchema } from "./schemas"
import type { Auth03Props, Auth03Step } from "./types"
import { useAsyncAction } from "./use-auth-form"

/** 短信为唯一主任务的两步登录界面；真实认证由回调接入。 */
function Auth03({
  onSendCode,
  onVerify,
  onSuccess,
  onAlternative,
  codeLength = 6,
  resendSeconds = 60,
  requireAgreement = true,
  agreementLinks,
  brand,
  labels: labelsProp,
  step: stepProp,
  defaultStep = "phone",
  onStepChange,
  className,
  ...props
}: Auth03Props) {
  const labels = { ...DEFAULT_LABELS, ...labelsProp }
  const [step, setStep] = useControllableState<Auth03Step>({
    prop: stepProp,
    defaultProp: defaultStep,
    onChange: onStepChange,
  })
  const [phone, setPhone] = React.useState("")
  const [sentPhone, setSentPhone] = React.useState("")
  const [code, setCode] = React.useState("")
  const [agreed, setAgreed] = React.useState(false)
  const [agreementError, setAgreementError] = React.useState(false)
  const [phoneError, setPhoneError] = React.useState("")
  const [success, setSuccess] = React.useState(false)
  const [deadline, setDeadline] = React.useState(0)
  const [remaining, setRemaining] = React.useState(0)
  const sending = useAsyncAction(labels.failed)
  const verifying = useAsyncAction(labels.failed)
  const agreementRef = React.useRef<HTMLButtonElement>(null)
  const titleRef = React.useRef<HTMLHeadingElement>(null)
  const previous = React.useRef({ step, success })
  const reduced = useReducedMotion()
  const id = React.useId()
  const length = Math.max(1, Math.min(12, Math.floor(codeLength) || 6))
  const pending = sending.pending || verifying.pending
  React.useEffect(() => {
    if (previous.current.step !== step || previous.current.success !== success)
      titleRef.current?.focus()
    previous.current = { step, success }
  }, [step, success])
  React.useEffect(() => {
    if (!deadline) return
    const tick = () =>
      setRemaining(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)))
    tick()
    const timer = window.setInterval(tick, 250)
    return () => window.clearInterval(timer)
  }, [deadline])
  async function send() {
    if (pending) return
    if (step === "phone") {
      if (requireAgreement && !agreed) {
        setAgreementError(true)
        agreementRef.current?.focus()
        return
      }
      const result = createPhoneSchema(labels).safeParse(phone)
      if (!result.success) {
        setPhoneError(result.error.issues[0]?.message ?? labels.phoneError)
        return
      }
    }
    const target = step === "code" ? sentPhone || phone : phone
    if (!createPhoneSchema(labels).safeParse(target).success) {
      setStep("phone")
      setPhoneError(labels.phoneError)
      return
    }
    if (remaining > 0 && target === sentPhone) return
    if (await sending.run(() => onSendCode(target))) {
      setSentPhone(target)
      setCode("")
      verifying.setError("")
      const seconds = Math.max(0, resendSeconds)
      setRemaining(seconds)
      // 仅在发送成功的事件回调中读取时间，不参与服务端渲染。
      // eslint-disable-next-line react-hooks/purity
      setDeadline(Date.now() + seconds * 1000)
      setStep("code")
    }
  }
  async function verify(value: string) {
    if (pending || success || value.length !== length) return
    if (!sentPhone) {
      setStep("phone")
      return
    }
    if (
      await verifying.run(() => onVerify({ phone: sentPhone, code: value }))
    ) {
      setSuccess(true)
      onSuccess?.()
    }
  }
  return (
    <div
      data-slot="auth-03"
      data-step={step}
      data-state={success ? "success" : "idle"}
      className={cn(
        "w-full overflow-x-clip bg-background text-foreground",
        className,
      )}
      {...props}
    >
      <GridContainer className="max-w-md">
        <GridSection className="px-4 py-8 sm:px-6">
          {brand && (
            <div className="mb-8 flex items-center gap-2 text-sm font-medium">
              {brand.logo}
              {brand.name}
            </div>
          )}
          <h1 className="text-2xl font-semibold tracking-tight">
            {labels.title}
          </h1>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            {labels.description}
          </p>
        </GridSection>
        <GridSection
          className="grid grid-cols-2 gap-3 px-4 py-3 text-xs sm:px-6"
          aria-label={labels.steps}
        >
          {["phone", "code"].map((item) => (
            <span
              key={item}
              aria-current={step === item ? "step" : undefined}
              className={cn(
                "border-b border-edge pb-2",
                step === item
                  ? "border-primary text-foreground"
                  : "text-muted-foreground",
              )}
            >
              <span
                aria-hidden="true"
                className="mr-1.5 font-mono tabular-nums"
              >
                {item === "phone" ? "01" : "02"}
              </span>
              {item === "phone" ? labels.phoneStep : labels.codeStep}
            </span>
          ))}
        </GridSection>
        <GridSection className="px-4 py-8 sm:px-6">
          <motion.div
            key={success ? "success" : step}
            data-slot="auth-03-step"
            initial={false}
            animate={
              reduced ? { opacity: 1, y: 0 } : { opacity: [0.7, 1], y: [4, 0] }
            }
            transition={{ duration: reduced ? 0 : 0.18 }}
          >
            <h2
              ref={titleRef}
              tabIndex={-1}
              className="mb-5 text-lg font-medium outline-none focus-visible:underline"
            >
              {success
                ? labels.success
                : step === "phone"
                  ? labels.phoneTitle
                  : labels.codeTitle}
            </h2>
            {success ? (
              <p role="status" className="text-sm text-muted-foreground">
                {labels.successDescription}
              </p>
            ) : step === "phone" ? (
              <form
                noValidate
                onSubmit={(event) => {
                  event.preventDefault()
                  void send()
                }}
                className="space-y-5"
              >
                <PhoneInput
                  label={labels.phone}
                  value={phone}
                  onValueChange={(value) => {
                    setPhone(value)
                    setPhoneError("")
                    sending.setError("")
                  }}
                  size="lg"
                  error={phoneError || sending.error}
                  disabled={pending}
                  required
                  labels={{
                    invalid: labels.phoneError,
                    required: labels.phoneError,
                  }}
                />
                <div className="space-y-2">
                  <div className="flex items-start gap-3 text-xs leading-6">
                    <Checkbox
                      ref={agreementRef}
                      id={`${id}-agreement`}
                      checked={agreed}
                      onCheckedChange={(value) => {
                        setAgreed(value)
                        setAgreementError(false)
                      }}
                      aria-invalid={agreementError || undefined}
                      aria-describedby={
                        agreementError ? `${id}-agreement-error` : undefined
                      }
                      className="mt-1"
                    />
                    <div>
                      <label htmlFor={`${id}-agreement`}>
                        {labels.agreement}
                      </label>
                      {agreementLinks?.terms ? (
                        <a
                          href={agreementLinks.terms}
                          className="underline underline-offset-4"
                        >
                          {labels.terms}
                        </a>
                      ) : (
                        labels.terms
                      )}
                      {labels.and}
                      {agreementLinks?.privacy ? (
                        <a
                          href={agreementLinks.privacy}
                          className="underline underline-offset-4"
                        >
                          {labels.privacy}
                        </a>
                      ) : (
                        labels.privacy
                      )}
                    </div>
                  </div>
                  {agreementError && (
                    <p
                      role="alert"
                      id={`${id}-agreement-error`}
                      className="text-xs text-destructive"
                    >
                      {labels.agreementError}
                    </p>
                  )}
                </div>
                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                  disabled={pending || (remaining > 0 && phone === sentPhone)}
                >
                  {sending.pending
                    ? labels.sending
                    : remaining > 0 && phone === sentPhone
                      ? formatLabel(labels.countdown, { seconds: remaining })
                      : labels.send}
                </Button>
              </form>
            ) : (
              <form
                noValidate
                onSubmit={(event) => {
                  event.preventDefault()
                  void verify(code)
                }}
                className="space-y-5"
              >
                {/* 脱敏号码和「修改号码」放在同一行，窄屏放不下时自然换行 */}
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
                  <p className="font-mono text-muted-foreground">
                    {formatLabel(labels.sent, {
                      phone: maskPhone(sentPhone || phone),
                    })}
                  </p>
                  {/* 例外：行内文字链接，高度跟随文字，不占按钮的三档高度 */}
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    disabled={pending}
                    className="h-auto px-0 pointer-coarse:h-auto"
                    onClick={() => {
                      setStep("phone")
                      setCode("")
                      verifying.setError("")
                      sending.setError("")
                    }}
                  >
                    {labels.edit}
                  </Button>
                </div>
                <div className="space-y-2">
                  <Auth03CodeInput
                    length={length}
                    value={code}
                    label={formatLabel(labels.code, { length })}
                    disabled={pending}
                    error={!!verifying.error}
                    describedBy={
                      verifying.error ? `${id}-code-error` : undefined
                    }
                    onChange={(value) => {
                      setCode(value)
                      verifying.setError("")
                    }}
                    onComplete={(value) => void verify(value)}
                  />
                  {verifying.error && (
                    <p
                      role="alert"
                      id={`${id}-code-error`}
                      className="text-xs text-destructive"
                    >
                      {verifying.error}
                    </p>
                  )}
                </div>
                <Button
                  size="lg"
                  type="submit"
                  className="w-full"
                  disabled={pending || code.length !== length}
                >
                  {verifying.pending ? labels.verifying : labels.verify}
                </Button>
                <Button
                  size="lg"
                  type="button"
                  variant="link"
                  className="w-full"
                  disabled={pending || remaining > 0}
                  onClick={() => void send()}
                >
                  {sending.pending
                    ? labels.sending
                    : remaining > 0
                      ? formatLabel(labels.countdown, { seconds: remaining })
                      : labels.resend}
                </Button>
                {sending.error && (
                  <div
                    role="alert"
                    className="space-y-2 text-xs text-destructive"
                  >
                    <p>{sending.error}</p>
                    <p>{labels.limit}</p>
                  </div>
                )}
              </form>
            )}
          </motion.div>
        </GridSection>
        <GridSeparator />
        <GridSection className="px-4 py-5 text-center sm:px-6">
          <Button
            type="button"
            variant="link"
            size="lg"
            onClick={() => onAlternative?.("password")}
          >
            {labels.alternative}
          </Button>
        </GridSection>
      </GridContainer>
    </div>
  )
}
export { Auth03 }
export type { Auth03Props, Auth03Step }
export type { Auth03Labels } from "./config"
