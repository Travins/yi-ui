"use client"

import * as React from "react"
import { motion, useReducedMotion } from "motion/react"
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useControllableState } from "@/registry/hooks/use-controllable-state"
import {
  GridColumns,
  GridContainer,
  GridSection,
} from "@/registry/ui/grid-layout/grid-layout"
import { DEFAULT_LABELS } from "./config"
import { Auth04Panel } from "./org-panel"
import { createEmailSchema, createSlugSchema } from "./schemas"
import { Auth04EmailStep, Auth04PasswordStep, Auth04SsoStep } from "./steps"
import type { Auth04Props, Auth04Resolution, Auth04Step } from "./types"
import { useAsyncAction } from "./use-auth-form"

type SsoResolution = Extract<Auth04Resolution, { kind: "sso" }>

/** 企业 SSO 登录：先识别工作邮箱所属组织，再决定走企业身份还是账号密码。 */
function Auth04({
  onResolveDomain,
  onResolveOrg,
  onSsoSignIn,
  onPasswordSignIn,
  onSuccess,
  onAlternative,
  supportHref = "#",
  brand,
  labels: labelsProp,
  step: stepProp,
  defaultStep = "email",
  onStepChange,
  className,
  ...props
}: Auth04Props) {
  const text = { ...DEFAULT_LABELS, ...labelsProp }
  const [step, setStep] = useControllableState<Auth04Step>({
    prop: stepProp,
    defaultProp: defaultStep,
    onChange: onStepChange,
  })
  const [email, setEmail] = React.useState("")
  const [emailError, setEmailError] = React.useState("")
  // 邮箱经域名识别确认过；经组织标识进入时没有邮箱
  const [identified, setIdentified] = React.useState(false)
  const [orgOpen, setOrgOpen] = React.useState(false)
  const [slug, setSlug] = React.useState("")
  const [slugError, setSlugError] = React.useState("")
  const [resolved, setResolved] = React.useState<SsoResolution | null>(null)
  const [providerId, setProviderId] = React.useState("")
  const [redirected, setRedirected] = React.useState(false)
  const [password, setPassword] = React.useState("")
  const [passwordError, setPasswordError] = React.useState("")
  const [success, setSuccess] = React.useState(false)
  const resolving = useAsyncAction(text.failed)
  const orgResolving = useAsyncAction(text.failed)
  const sso = useAsyncAction(text.failed)
  const signing = useAsyncAction(text.failed)
  const titleRef = React.useRef<HTMLHeadingElement>(null)
  const slugRef = React.useRef<HTMLInputElement>(null)
  const retryRef = React.useRef<HTMLButtonElement>(null)
  const reduced = useReducedMotion()
  const id = React.useId()
  // 受控进入 sso 但还没有识别结果时，退回第一步
  const view: Auth04Step = step === "sso" && !resolved ? "email" : step
  const provider =
    resolved?.providers.find((item) => item.id === providerId) ??
    resolved?.providers[0]
  const previous = React.useRef({ view, success })
  React.useEffect(() => {
    if (previous.current.view !== view || previous.current.success !== success)
      titleRef.current?.focus()
    previous.current = { view, success }
  }, [view, success])
  React.useEffect(() => {
    if (sso.error) retryRef.current?.focus()
  }, [sso.error])
  React.useEffect(() => {
    if (orgOpen) slugRef.current?.focus()
  }, [orgOpen])

  function apply(result: Auth04Resolution, fromOrg: boolean) {
    sso.setError("")
    signing.setError("")
    setRedirected(false)
    setPassword("")
    setPasswordError("")
    if (result.kind === "sso" && result.providers.length > 0) {
      setResolved(result)
      setProviderId(result.providers[0]?.id ?? "")
      setIdentified(!fromOrg)
      setStep("sso")
    } else if (fromOrg) {
      // 组织标识只能走企业身份；普通账号需要邮箱，回到邮箱入口
      setSlugError(text.orgNoSso)
    } else {
      setResolved(null)
      setIdentified(true)
      setStep("password")
    }
  }
  async function submitEmail() {
    if (resolving.pending || orgResolving.pending) return
    const parsed = createEmailSchema(text).safeParse(email)
    if (!parsed.success) {
      setEmailError(parsed.error.issues[0]?.message ?? text.emailError)
      return
    }
    setEmail(parsed.data)
    const result = await resolving.run(() => onResolveDomain(parsed.data))
    if (result.ok) apply(result.value, false)
  }
  async function submitOrg() {
    if (!onResolveOrg || resolving.pending || orgResolving.pending) return
    const parsed = createSlugSchema(text).safeParse(slug)
    if (!parsed.success) {
      setSlugError(parsed.error.issues[0]?.message ?? text.orgError)
      return
    }
    setSlug(parsed.data)
    const result = await orgResolving.run(() => onResolveOrg(parsed.data))
    if (result.ok) apply(result.value, true)
  }
  async function signInSso(target: string) {
    if (sso.pending || redirected) return
    setProviderId(target)
    const result = await sso.run(() =>
      onSsoSignIn({ email: identified ? email : "", providerId: target }),
    )
    if (result.ok) setRedirected(true)
  }
  async function submitPassword() {
    if (signing.pending) return
    if (!identified) {
      const parsed = createEmailSchema(text).safeParse(email)
      if (!parsed.success) {
        setEmailError(parsed.error.issues[0]?.message ?? text.emailError)
        return
      }
    }
    if (!password) {
      setPasswordError(text.passwordRequired)
      return
    }
    const result = await signing.run(() =>
      onPasswordSignIn({ email: email.trim(), password }),
    )
    if (result.ok) {
      setSuccess(true)
      onSuccess?.()
    }
  }
  function changeEmail() {
    setStep("email")
    setPassword("")
    setPasswordError("")
    setEmailError("")
    signing.setError("")
    sso.setError("")
    setRedirected(false)
  }

  const titles = {
    email: text.emailTitle,
    sso: text.ssoTitle,
    password: text.passwordTitle,
  }
  return (
    <div
      data-slot="auth-04"
      data-step={view}
      data-state={success ? "success" : "idle"}
      className={cn(
        "w-full overflow-x-clip bg-background text-foreground",
        className,
      )}
      {...props}
    >
      <GridContainer className="max-w-4xl">
        <GridSection topLine className="px-4 py-6 sm:px-6">
          {brand && (
            <div className="mb-6 flex items-center gap-2 text-sm font-medium">
              {brand.logo}
              {brand.name}
            </div>
          )}
          <h1 className="text-2xl font-semibold tracking-tight">
            {text.title}
          </h1>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            {text.description}
          </p>
        </GridSection>
        <GridSection>
          <div className="grid md:grid-cols-[minmax(0,1fr)_18rem] md:divide-x md:divide-dashed md:divide-edge">
            <div className="px-4 py-8 sm:px-6">
              <motion.div
                key={success ? "success" : view}
                data-slot="auth-04-step"
                initial={false}
                animate={
                  reduced
                    ? { opacity: 1, y: 0 }
                    : { opacity: [0.7, 1], y: [4, 0] }
                }
                transition={{ duration: reduced ? 0 : 0.18 }}
                className="mx-auto max-w-md md:mx-0 md:max-w-none"
              >
                <h2
                  ref={titleRef}
                  tabIndex={-1}
                  className="mb-5 text-lg font-medium outline-none focus-visible:underline"
                >
                  {success ? text.success : titles[view]}
                </h2>
                {success ? (
                  <p role="status" className="text-sm text-muted-foreground">
                    {text.successDescription}
                  </p>
                ) : view === "email" ? (
                  <Auth04EmailStep
                    id={id}
                    text={text}
                    email={email}
                    emailError={emailError || resolving.error}
                    resolving={resolving.pending}
                    orgEnabled={!!onResolveOrg}
                    orgOpen={orgOpen}
                    slug={slug}
                    slugError={slugError || orgResolving.error}
                    orgResolving={orgResolving.pending}
                    slugRef={slugRef}
                    onEmailChange={(value) => {
                      setEmail(value)
                      setEmailError("")
                      resolving.setError("")
                    }}
                    onSubmit={() => void submitEmail()}
                    onToggleOrg={() => setOrgOpen((open) => !open)}
                    onSlugChange={(value) => {
                      setSlug(value)
                      setSlugError("")
                      orgResolving.setError("")
                    }}
                    onSubmitOrg={() => void submitOrg()}
                  />
                ) : view === "sso" && resolved ? (
                  <Auth04SsoStep
                    text={text}
                    org={resolved.org}
                    providers={resolved.providers}
                    activeId={provider?.id ?? ""}
                    pending={sso.pending}
                    redirected={redirected}
                    error={sso.error}
                    retryRef={retryRef}
                    onSignIn={(target) => void signInSso(target)}
                    onRetry={() => void signInSso(provider?.id ?? "")}
                    onUsePassword={() => {
                      sso.setError("")
                      setStep("password")
                    }}
                    onChangeEmail={changeEmail}
                  />
                ) : (
                  <Auth04PasswordStep
                    id={id}
                    text={text}
                    email={email}
                    identified={identified}
                    emailError={emailError}
                    password={password}
                    passwordError={passwordError}
                    error={signing.error}
                    pending={signing.pending}
                    onEmailChange={(value) => {
                      setEmail(value)
                      setEmailError("")
                    }}
                    onPasswordChange={(value) => {
                      setPassword(value)
                      setPasswordError("")
                      signing.setError("")
                    }}
                    onSubmit={() => void submitPassword()}
                    onChangeEmail={changeEmail}
                  />
                )}
              </motion.div>
            </div>
            <Auth04Panel
              step={view}
              org={resolved?.org}
              provider={provider}
              text={text}
              className="max-md:order-first max-md:border-b max-md:border-dashed max-md:border-edge"
            />
          </div>
        </GridSection>
        <GridSection>
          <GridColumns>
            <div className="flex justify-center px-4 py-2">
              <Button
                type="button"
                variant="link"
                size="lg"
                onClick={() => onAlternative?.("personal")}
              >
                {text.personal}
              </Button>
            </div>
            <div className="flex justify-center px-4 py-2">
              <a
                href={supportHref}
                className={buttonVariants({ variant: "link", size: "lg" })}
              >
                {text.support}
              </a>
            </div>
          </GridColumns>
        </GridSection>
      </GridContainer>
    </div>
  )
}

export { Auth04 }
export type {
  Auth04Props,
  Auth04Step,
  Auth04Provider,
  Auth04Org,
  Auth04Resolution,
} from "./types"
export type { Auth04Labels } from "./config"
