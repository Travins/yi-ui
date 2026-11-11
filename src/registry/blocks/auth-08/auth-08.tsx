"use client"

import * as React from "react"
import { CircleCheck } from "lucide-react"
import { motion, useReducedMotion } from "motion/react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useControllableState } from "@/registry/hooks/use-controllable-state"
import {
  GridContainer,
  GridSection,
  GridSeparator,
} from "@/registry/ui/grid-layout/grid-layout"
import {
  DEFAULT_DOMAIN_SUGGESTIONS,
  DEFAULT_LABELS,
  findMailProvider,
  formatLabel,
  matchDomainSuggestions,
} from "./config"
import { createEmailSchema } from "./schemas"
import { Auth08EmailStep, Auth08SentStep } from "./steps"
import type { Auth08MailProvider, Auth08Props, Auth08Step } from "./types"
import { useAsyncAction } from "./use-auth-form"

/** 邮箱免密登录：只填邮箱，靠邮件里的登录链接或验证码登录；真实发信与认证由回调接入。 */
function Auth08({
  onSendLink,
  onVerifyCode,
  onSuccess,
  onAlternative,
  brand,
  codeLength = 6,
  resendSeconds = 60,
  domainSuggestions = DEFAULT_DOMAIN_SUGGESTIONS,
  mailProviders,
  labels: labelsProp,
  step: stepProp,
  defaultStep = "email",
  onStepChange,
  className,
  ...props
}: Auth08Props) {
  const labels = { ...DEFAULT_LABELS, ...labelsProp }
  const [step, setStep] = useControllableState<Auth08Step>({
    prop: stepProp,
    defaultProp: defaultStep,
    onChange: onStepChange,
  })
  const [email, setEmail] = React.useState("")
  const [emailError, setEmailError] = React.useState("")
  const [sentEmail, setSentEmail] = React.useState("")
  const [code, setCode] = React.useState("")
  const [resent, setResent] = React.useState(false)
  const [success, setSuccess] = React.useState(false)
  // 首屏不做入场动画（无 JS 时内容也必须可见），之后每次切换才淡入位移
  const [animate, setAnimate] = React.useState(false)
  const [deadline, setDeadline] = React.useState(0)
  const [remaining, setRemaining] = React.useState(0)
  const sending = useAsyncAction(labels.failed)
  const verifying = useAsyncAction(labels.failed)
  const titleRef = React.useRef<HTMLHeadingElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const reduced = useReducedMotion()
  const length = Math.max(1, Math.min(12, Math.floor(codeLength) || 6))
  const pending = sending.pending || verifying.pending
  // 受控进入 sent 但还没有发过邮件时，退回邮箱状态
  const view: Auth08Step = step === "sent" && !sentEmail ? "email" : step
  const state = success ? "success" : view
  const previous = React.useRef(state)
  React.useEffect(() => {
    if (previous.current !== state) titleRef.current?.focus()
    previous.current = state
  }, [state])
  React.useEffect(() => {
    if (!deadline) return
    const tick = () =>
      setRemaining(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)))
    tick()
    const timer = window.setInterval(tick, 250)
    return () => window.clearInterval(timer)
  }, [deadline])

  const counting = remaining > 0
  const sameAsSent = sentEmail !== "" && normalize(email) === sentEmail

  function go(next: Auth08Step) {
    setAnimate(true)
    setStep(next)
  }
  function normalize(value: string) {
    const parsed = createEmailSchema(labels).safeParse(value)
    return parsed.success ? parsed.data : ""
  }
  async function send(target: string) {
    const ok = await sending.run(() => onSendLink(target))
    if (!ok) return false
    setSentEmail(target)
    setCode("")
    verifying.setError("")
    const seconds = Math.max(0, resendSeconds)
    setRemaining(seconds)
    // 仅在发送成功的事件回调中读取时间，不参与服务端渲染。
    // eslint-disable-next-line react-hooks/purity
    setDeadline(Date.now() + seconds * 1000)
    return true
  }
  async function submitEmail() {
    if (pending) return
    const parsed = createEmailSchema(labels).safeParse(email)
    if (!parsed.success) {
      setEmailError(parsed.error.issues[0]?.message ?? labels.emailError)
      inputRef.current?.focus()
      return
    }
    setEmail(parsed.data)
    // 倒计时内换回同一个邮箱：不重发，直接回到已发送状态
    if (counting && parsed.data === sentEmail) {
      go("sent")
      return
    }
    setResent(false)
    if (await send(parsed.data)) go("sent")
  }
  async function resend() {
    if (pending || counting || !sentEmail) return
    setResent(false)
    if (await send(sentEmail)) setResent(true)
  }
  async function verify(value: string) {
    if (!onVerifyCode || pending || success || value.length !== length) return
    const ok = await verifying.run(() =>
      onVerifyCode({ email: sentEmail, code: value }),
    )
    if (ok) {
      setAnimate(true)
      setSuccess(true)
      onSuccess?.()
    }
  }
  function changeEmail() {
    setCode("")
    setResent(false)
    verifying.setError("")
    sending.setError("")
    go("email")
  }

  return (
    <div
      data-slot="auth-08"
      data-step={view}
      data-state={success ? "success" : "idle"}
      className={cn(
        "w-full overflow-x-clip bg-background text-foreground",
        className,
      )}
      {...props}
    >
      <GridContainer className="max-w-md">
        {brand && (
          <GridSection
            data-slot="auth-08-brand"
            topLine
            className="flex items-center gap-2 px-4 py-4 text-sm font-medium sm:px-6"
          >
            {brand.logo}
            {brand.name}
          </GridSection>
        )}
        <GridSection topLine={!brand} className="px-4 py-8 sm:px-6">
          <motion.div
            key={state}
            data-slot="auth-08-step"
            initial={animate && !reduced ? { opacity: 0, y: 8 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduced ? 0 : 0.22, ease: "easeOut" }}
          >
            {success ? (
              <div className="flex flex-col items-center py-6 text-center">
                <span className="flex size-11 items-center justify-center rounded-full border border-edge bg-muted/50 text-primary [&_svg]:size-5">
                  <CircleCheck aria-hidden="true" />
                </span>
                <h1
                  ref={titleRef}
                  tabIndex={-1}
                  className="mt-4 text-2xl font-semibold tracking-tight outline-none focus-visible:underline focus-visible:underline-offset-4"
                >
                  {labels.success}
                </h1>
                <p role="status" className="mt-2 text-sm text-muted-foreground">
                  {labels.successDescription}
                </p>
              </div>
            ) : view === "email" ? (
              <Auth08EmailStep
                labels={labels}
                titleRef={titleRef}
                inputRef={inputRef}
                email={email}
                error={emailError || sending.error}
                pending={pending}
                suggestions={matchDomainSuggestions(email, domainSuggestions)}
                submitLabel={
                  sending.pending
                    ? labels.sending
                    : counting && sameAsSent
                      ? labels.viewSent
                      : labels.send
                }
                submitDisabled={pending}
                onEmailChange={(value) => {
                  setEmail(value)
                  setEmailError("")
                  sending.setError("")
                }}
                onPick={(value) => {
                  setEmail(value)
                  setEmailError("")
                  sending.setError("")
                  // 键盘按下小按钮时焦点在按钮上，补全后交回输入框，可直接回车提交
                  requestAnimationFrame(() => inputRef.current?.focus())
                }}
                onSubmit={() => void submitEmail()}
              />
            ) : (
              <Auth08SentStep
                labels={labels}
                titleRef={titleRef}
                email={sentEmail}
                provider={findMailProvider(sentEmail, mailProviders)}
                showCode={!!onVerifyCode}
                codeLength={length}
                code={code}
                codeError={verifying.error}
                verifying={verifying.pending}
                resendError={sending.error}
                resendNotice={resent}
                resendLabel={
                  sending.pending
                    ? labels.sending
                    : counting
                      ? formatLabel(labels.countdown, { seconds: remaining })
                      : labels.resend
                }
                resendDisabled={pending || counting}
                pending={pending}
                onCodeChange={(value) => {
                  setCode(value)
                  verifying.setError("")
                }}
                onCodeComplete={(value) => void verify(value)}
                onChangeEmail={changeEmail}
                onResend={() => void resend()}
              />
            )}
          </motion.div>
        </GridSection>
        {onAlternative && !success && (
          <>
            <GridSeparator />
            <GridSection className="px-4 py-4 text-center sm:px-6">
              <Button
                type="button"
                variant="link"
                size="lg"
                onClick={() => onAlternative("password")}
              >
                {labels.alternative}
              </Button>
            </GridSection>
          </>
        )}
      </GridContainer>
    </div>
  )
}

export { Auth08 }
export type { Auth08MailProvider, Auth08Props, Auth08Step }
export type { Auth08Labels } from "./config"
