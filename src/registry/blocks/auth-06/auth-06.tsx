"use client"

import * as React from "react"
import { motion, useReducedMotion } from "motion/react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useControllableState } from "@/registry/hooks/use-controllable-state"
import {
  GridContainer,
  GridSection,
  GridSeparator,
} from "@/registry/ui/grid-layout/grid-layout"
import { DEFAULT_LABELS, DEFAULT_TEAM_SIZES } from "./config"
import { Auth06DonePanel } from "./done-panel"
import { Auth06FormError } from "./form-parts"
import { Auth06Progress } from "./progress"
import {
  createAccountSchema,
  createIdentitySchema,
  createProfileSchema,
  fieldErrors,
} from "./schemas"
import {
  Auth06AccountForm,
  Auth06IdentityForm,
  Auth06ProfileForm,
} from "./step-forms"
import type {
  Auth06Draft,
  Auth06Errors,
  Auth06Props,
  Auth06Step,
  Auth06Values,
} from "./types"
import { useAsyncAction } from "./use-auth-form"

/** 多步注册向导：账号 → 资料 → 实名（可跳过），最后统一提交；真实注册由回调接入。 */
function Auth06({
  regions,
  onSubmit,
  onCheckEmail,
  onSuccess,
  onSignIn,
  identityStep = "optional",
  teamSizes = DEFAULT_TEAM_SIZES,
  agreementLinks,
  brand,
  labels: labelsProp,
  step: stepProp,
  defaultStep = "account",
  onStepChange,
  className,
  ...props
}: Auth06Props) {
  const labels = { ...DEFAULT_LABELS, ...labelsProp }
  const [rawStep, setStep] = useControllableState<Auth06Step>({
    prop: stepProp,
    defaultProp: defaultStep,
    onChange: onStepChange,
  })
  // 关闭实名时，外部传入的 identity 按资料步处理
  const step =
    rawStep === "identity" && identityStep === "off" ? "profile" : rawStep
  const order: Auth06Step[] =
    identityStep === "off"
      ? ["account", "profile"]
      : ["account", "profile", "identity"]
  const [draft, setDraft] = React.useState<Auth06Draft>(() => ({
    email: "",
    password: "",
    agreed: false,
    name: "",
    phone: "",
    region: null,
    regionPath: [],
    teamSize: teamSizes[0]?.value ?? "",
    realName: "",
    idNumber: "",
  }))
  const [errors, setErrors] = React.useState<Auth06Errors>({})
  const [submitted, setSubmitted] = React.useState<Auth06Values | null>(null)
  const [submitKind, setSubmitKind] = React.useState<
    "identity" | "skip" | null
  >(null)
  // 真实姓名默认取第 2 步的姓名，用户改过之后不再覆盖
  const realNameEdited = React.useRef(false)
  const checking = useAsyncAction(labels.failed)
  const submitting = useAsyncAction(labels.failed)
  const pending = checking.pending || submitting.pending
  const titleRef = React.useRef<HTMLHeadingElement>(null)
  const previousStep = React.useRef(step)
  const focusTarget = React.useRef<string | null>(null)
  const reduced = useReducedMotion()
  const id = React.useId()
  const formErrorId = `${id}-form-error`

  React.useEffect(() => {
    if (previousStep.current !== step) titleRef.current?.focus()
    previousStep.current = step
  }, [step])
  // 校验失败后等错误渲染完，再把焦点交给第一个出错的字段
  React.useEffect(() => {
    if (!focusTarget.current) return
    document.getElementById(`${id}-${focusTarget.current}`)?.focus()
    focusTarget.current = null
  })

  function update(patch: Partial<Auth06Draft>) {
    if ("realName" in patch) realNameEdited.current = true
    setDraft((current) => ({ ...current, ...patch }))
    setErrors((current) => {
      const next = { ...current }
      for (const key of Object.keys(patch) as (keyof Auth06Draft)[])
        delete next[key]
      // 地区的值和路径一起变
      if ("region" in patch) delete next.regionPath
      return next
    })
    if ("email" in patch) checking.setError("")
    submitting.setError("")
  }

  function fail(next: Auth06Errors) {
    setErrors(next)
    focusTarget.current = Object.keys(next)[0] ?? null
  }

  function goTo(next: Auth06Step) {
    submitting.setError("")
    if (next === "identity" && !realNameEdited.current)
      setDraft((current) => ({ ...current, realName: current.name }))
    setStep(next)
  }

  async function submitAll(withIdentity: boolean) {
    if (pending) return
    if (withIdentity) {
      const result = createIdentitySchema(labels).safeParse(draft)
      if (!result.success) return fail(fieldErrors(result.error))
    }
    const values: Auth06Values = {
      email: draft.email.trim(),
      password: draft.password,
      name: draft.name.trim(),
      phone: draft.phone,
      region: { code: draft.region ?? "", path: draft.regionPath },
      teamSize: draft.teamSize,
      ...(withIdentity && {
        identity: {
          realName: draft.realName.trim(),
          idNumber: draft.idNumber,
        },
      }),
    }
    setSubmitKind(withIdentity ? "identity" : "skip")
    const ok = await submitting.run(() => onSubmit(values))
    setSubmitKind(null)
    if (ok) {
      setSubmitted(values)
      setStep("done")
    }
  }

  async function nextFromAccount() {
    if (pending) return
    const result = createAccountSchema(labels).safeParse(draft)
    if (!result.success) return fail(fieldErrors(result.error))
    const email = draft.email.trim()
    if (onCheckEmail && !(await checking.run(() => onCheckEmail(email)))) {
      focusTarget.current = "email"
      return
    }
    goTo("profile")
  }

  function nextFromProfile() {
    if (pending) return
    const result = createProfileSchema(labels).safeParse({
      ...draft,
      region: draft.region ?? "",
    })
    if (!result.success) return fail(fieldErrors(result.error))
    if (identityStep === "off") void submitAll(false)
    else goTo("identity")
  }

  const titles = {
    account: [labels.accountTitle, labels.accountDescription],
    profile: [labels.profileTitle, labels.profileDescription],
    identity: [labels.identityTitle, labels.identityDescription],
    done: [labels.doneTitle, labels.doneDescription],
  } satisfies Record<Auth06Step, string[]>
  const shortTitles = {
    account: labels.accountStep,
    profile: labels.profileStep,
    identity: labels.identityStep,
  }
  const skippedIdentity =
    step === "done" && identityStep !== "off" && !submitted?.identity
  const index = step === "done" ? order.length - 1 : order.indexOf(step)
  const shared = {
    id,
    labels,
    draft,
    errors,
    pending,
    update,
    describedBy: submitting.error ? formErrorId : undefined,
  }

  return (
    <div
      data-slot="auth-06"
      data-step={step}
      data-state={pending ? "pending" : step === "done" ? "success" : "idle"}
      className={cn(
        "w-full overflow-x-clip bg-background text-foreground",
        className,
      )}
      {...props}
    >
      <GridContainer className="max-w-4xl">
        <GridSection
          topLine
          className="grid divide-y divide-dashed divide-edge lg:grid-cols-[15rem_minmax(0,1fr)] lg:divide-x lg:divide-y-0"
        >
          <aside
            data-slot="auth-06-sidebar"
            className="flex flex-col gap-6 px-4 py-6 sm:px-6 lg:gap-10 lg:py-8"
          >
            <div>
              {brand && (
                <div className="mb-6 flex items-center gap-2 text-sm font-medium lg:mb-8">
                  {brand.logo}
                  {brand.name}
                </div>
              )}
              <h1 className="text-2xl font-semibold tracking-tight">
                {labels.title}
              </h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {labels.description}
              </p>
            </div>
            <Auth06Progress
              labels={labels}
              items={order.map((item) => ({
                title: shortTitles[item as keyof typeof shortTitles],
                description:
                  item !== "identity" || identityStep !== "optional"
                    ? undefined
                    : skippedIdentity
                      ? labels.skipped
                      : labels.optional,
                // 跳过实名后，结果页里这一步保持未完成
                skipped: item === "identity" && skippedIdentity,
              }))}
              index={index}
              done={step === "done"}
              locked={pending || step === "done"}
              onSelect={(target) => goTo(order[target] ?? "account")}
            />
          </aside>
          <div className="min-w-0 px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
            <motion.div
              key={step}
              data-slot="auth-06-step"
              initial={false}
              animate={
                reduced
                  ? { opacity: 1, y: 0 }
                  : { opacity: [0.7, 1], y: [4, 0] }
              }
              transition={{ duration: reduced ? 0 : 0.18 }}
            >
              <h2
                ref={titleRef}
                tabIndex={-1}
                className="text-lg font-medium tracking-tight outline-none focus-visible:underline"
              >
                {titles[step][0]}
              </h2>
              <p className="mt-1.5 mb-6 text-sm leading-6 text-muted-foreground">
                {titles[step][1]}
              </p>
              <Auth06FormError id={formErrorId} message={submitting.error} />
              {step === "account" ? (
                <Auth06AccountForm
                  {...shared}
                  errors={{ ...errors, email: errors.email || checking.error }}
                  checking={checking.pending}
                  agreementLinks={agreementLinks}
                  onNext={() => void nextFromAccount()}
                />
              ) : step === "profile" ? (
                <Auth06ProfileForm
                  {...shared}
                  regions={regions}
                  teamSizes={teamSizes}
                  last={identityStep === "off"}
                  submitting={submitting.pending}
                  onBack={() => goTo("account")}
                  onNext={nextFromProfile}
                />
              ) : step === "identity" ? (
                <Auth06IdentityForm
                  {...shared}
                  mode={identityStep === "required" ? "required" : "optional"}
                  submitting={submitKind}
                  onBack={() => goTo("profile")}
                  onSubmit={(withIdentity) => void submitAll(withIdentity)}
                />
              ) : (
                <Auth06DonePanel
                  labels={labels}
                  identity={
                    identityStep === "off"
                      ? "off"
                      : submitted?.identity
                        ? "submitted"
                        : "pending"
                  }
                  onEnter={() => submitted && onSuccess?.(submitted)}
                />
              )}
            </motion.div>
          </div>
        </GridSection>
        {onSignIn && step !== "done" && (
          <>
            <GridSeparator />
            <GridSection className="px-4 py-4 text-center sm:px-6">
              <Button type="button" variant="link" size="lg" onClick={onSignIn}>
                {labels.signIn}
              </Button>
            </GridSection>
          </>
        )}
      </GridContainer>
    </div>
  )
}

export { Auth06 }
export type {
  Auth06IdentityMode,
  Auth06Props,
  Auth06Region,
  Auth06Step,
  Auth06TeamSize,
  Auth06Values,
} from "./types"
export type { Auth06Labels } from "./config"
