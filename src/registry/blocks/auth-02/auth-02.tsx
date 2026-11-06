"use client"

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react"
import { Check, Smartphone } from "lucide-react"
import { encode } from "uqr"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useControllableState } from "@/registry/hooks/use-controllable-state"
import {
  GridContainer,
  GridSection,
  GridColumns,
} from "@/registry/ui/grid-layout/grid-layout"
import { SegmentedControl } from "@/registry/ui/segmented-control/segmented-control"
import { resolveLabels, type Auth02Labels } from "./config"
import { CodeSignIn, PasswordSignIn, type SignInValues } from "./sign-in-form"
import { Auth02QrCode } from "./qr-code"

type Auth02Status = "pending" | "scanned" | "expired" | "confirmed" | "error"
type Auth02Provider = {
  id: string
  label: string
  icon?: ReactNode
  description?: string
}
type Auth02Code = { value: string; expiresAt?: number }
const DEFAULT_PROVIDERS: Auth02Provider[] = [
  { id: "app", label: "App 扫码", icon: <Smartphone aria-hidden /> },
]
const unavailable = async () => {
  throw new Error("请先接入认证服务")
}

/** 扫码优先登录；认证和服务端状态订阅由调用方负责。 */
function Auth02({
  brand = { name: "工作空间" },
  providers = DEFAULT_PROVIDERS,
  status: statusProp,
  defaultStatus = "pending",
  onStatusChange,
  onRequestCode,
  onConfirmed,
  onSignIn = unavailable,
  onSendCode = unavailable,
  labels,
  termsHref = "#",
  privacyHref = "#",
  className,
  ...props
}: Omit<ComponentProps<"div">, "onError"> & {
  /** 品牌名称与标志 */
  brand?: { name: string; logo?: ReactNode }
  /** 可配置扫码提供方，至少一项 */
  providers?: readonly Auth02Provider[]
  /** 受控扫码状态 */
  status?: Auth02Status
  /** 初始扫码状态 @default "pending" */
  defaultStatus?: Auth02Status
  onStatusChange?: (status: Auth02Status) => void
  /** 生成二维码；时间戳为毫秒，抛出的错误向用户展示 */
  onRequestCode: (providerId: string) => Promise<Auth02Code>
  /** 确认成功后的异步动作 */
  onConfirmed?: () => Promise<void>
  onSignIn?: (values: SignInValues) => Promise<void>
  onSendCode?: (phone: string) => Promise<void>
  labels?: Partial<Auth02Labels>
  termsHref?: string
  privacyHref?: string
}) {
  const text = resolveLabels(labels)
  const [status, setStatus] = useControllableState({
    prop: statusProp,
    defaultProp: defaultStatus,
    onChange: onStatusChange,
  })
  const [providerId, setProviderId] = useState(providers[0]?.id ?? "")
  const provider =
    providers.find((item) => item.id === providerId) ?? providers[0]
  const [view, setView] = useState<"qr" | "code" | "password">("qr")
  const [code, setCode] = useState<Auth02Code>()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [seconds, setSeconds] = useState<number>()
  const sequence = useRef(0)
  const requestRef = useRef(onRequestCode)
  useEffect(() => {
    requestRef.current = onRequestCode
  }, [onRequestCode])
  const fallbackRef = useRef(text.requestFailed)
  useEffect(() => {
    fallbackRef.current = text.requestFailed
  }, [text.requestFailed])
  const request = useCallback(
    async (id: string, reset = true) => {
      const ticket = ++sequence.current
      setLoading(true)
      setError("")
      setCode(undefined)
      if (reset) setStatus("pending")
      try {
        const next = await requestRef.current(id)
        if (!next.value) throw new Error(fallbackRef.current)
        encode(next.value, { border: 4, ecc: "M" })
        if (ticket !== sequence.current) return
        setCode(next)
      } catch (caught) {
        if (ticket !== sequence.current) return
        setError(caught instanceof Error ? caught.message : fallbackRef.current)
        setStatus("error")
      } finally {
        if (ticket === sequence.current) setLoading(false)
      }
    },
    [setStatus],
  )
  const invalidate = useCallback(() => {
    sequence.current++
  }, [])
  const activeProviderId = provider?.id
  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeProviderId) void request(activeProviderId, false)
    }, 0)
    return () => {
      clearTimeout(timer)
      // 清理时使正在等待的异步结果失效。
      invalidate()
    }
  }, [activeProviderId, request, invalidate]) // 提供方变化使旧请求失效
  useEffect(() => {
    if (!code?.expiresAt || !["pending", "scanned"].includes(status)) return
    const tick = () => {
      const remaining = Math.max(
        0,
        Math.ceil((code.expiresAt! - Date.now()) / 1000),
      )
      setSeconds(remaining)
      if (!remaining) setStatus("expired")
    }
    tick()
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [code, status, setStatus])
  const confirmedRef = useRef(onConfirmed)
  useEffect(() => {
    confirmedRef.current = onConfirmed
  }, [onConfirmed])
  useEffect(() => {
    if (status !== "confirmed") return
    let active = true
    Promise.resolve()
      .then(() => confirmedRef.current?.())
      .catch((caught) => {
        if (active) {
          setError(
            caught instanceof Error ? caught.message : fallbackRef.current,
          )
          setStatus("error")
        }
      })
    return () => {
      active = false
    }
  }, [status, setStatus])
  return (
    <div
      data-slot="auth-02"
      data-state={status}
      className={cn(
        "w-full overflow-x-clip bg-background py-8 text-foreground md:py-16",
        className,
      )}
      {...props}
    >
      <GridContainer className="max-w-4xl">
        <GridSection topLine className="space-y-3 px-4 py-6 sm:px-6">
          <div className="flex items-center gap-2 text-sm font-medium">
            {brand.logo}
            {brand.name}
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {text.title}
          </h1>
          <p className="text-sm leading-7 text-muted-foreground md:hidden">
            {text.mobileHint}
          </p>
          {/* 手机上通常扫不了自己屏幕上的码：短信入口提到最前面，桌面仍放在底部的备用入口里 */}
          {view === "qr" ? (
            <Button
              size="lg"
              className="w-full md:hidden"
              onClick={() => setView("code")}
            >
              {text.sms}
            </Button>
          ) : null}
        </GridSection>
        {view === "qr" ? (
          <GridSection>
            <GridColumns className="sm:grid-cols-1 sm:divide-x-0 sm:divide-y md:grid-cols-2 md:divide-x md:divide-y-0">
              <div className="flex flex-col items-center gap-4 px-4 py-8">
                <div
                  data-slot="auth-02-code-region"
                  aria-busy={loading}
                  className="relative flex size-64 max-w-full items-center justify-center"
                >
                  {loading ? (
                    <p role="status">{text.loading}</p>
                  ) : status === "scanned" || status === "confirmed" ? (
                    <div className="flex flex-col items-center gap-4 text-center">
                      {status === "confirmed" ? (
                        <Check aria-hidden className="size-12" />
                      ) : (
                        <Smartphone aria-hidden className="size-12" />
                      )}
                      <p>{text[status]}</p>
                    </div>
                  ) : status === "error" ? (
                    <p className="px-4 text-center text-destructive">
                      {error || text.error}
                    </p>
                  ) : code ? (
                    <Auth02QrCode value={code.value} label={text.qrLabel} />
                  ) : null}
                  {status === "expired" && !loading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-background/95">
                      <p>{text.expired}</p>
                      <Button
                        size="lg"
                        onClick={() => provider && void request(provider.id)}
                      >
                        {text.refresh}
                      </Button>
                    </div>
                  )}
                </div>
                <p
                  aria-live="polite"
                  className="text-center text-sm text-muted-foreground"
                >
                  {loading
                    ? text.loading
                    : status === "error"
                      ? error || text.error
                      : text[status]}
                </p>
                {status === "pending" &&
                  seconds !== undefined &&
                  code?.expiresAt && (
                    <p className="font-mono text-xs text-muted-foreground">
                      {text.remaining.replace("{seconds}", String(seconds))}
                    </p>
                  )}
                {(status === "scanned" || status === "error") && (
                  <Button
                    size="lg"
                    variant="outline"
                    disabled={loading}
                    onClick={() => provider && void request(provider.id)}
                  >
                    {status === "error" ? text.retry : text.rescan}
                  </Button>
                )}
              </div>
              <div className="flex min-w-0 flex-col justify-center gap-6 px-4 py-8 sm:px-6">
                {providers.length > 1 && (
                  <SegmentedControl
                    aria-label={text.providerLabel}
                    size="lg"
                    value={provider?.id}
                    options={providers.map((item) => ({
                      value: item.id,
                      label: item.label,
                      icon: item.icon,
                    }))}
                    onValueChange={(id) => {
                      setProviderId(id)
                      setStatus("pending")
                    }}
                  />
                )}
                <div>
                  <h2 className="font-medium">{provider?.label}</h2>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">
                    {provider?.description}
                  </p>
                </div>
                <ol className="space-y-5">
                  {[text.stepOpen, text.stepScan, text.stepConfirm].map(
                    (step, i) => (
                      <li key={i} className="flex items-center gap-4">
                        <span className="flex size-8 shrink-0 items-center justify-center border border-edge font-mono text-sm">
                          {i + 1}
                        </span>
                        {step}
                      </li>
                    ),
                  )}
                </ol>
              </div>
            </GridColumns>
          </GridSection>
        ) : (
          <GridSection className="px-4 py-8">
            <div className="mx-auto max-w-md space-y-6">
              <h2 className="text-xl font-medium">
                {view === "code" ? text.sms : text.password}
              </h2>
              {view === "code" ? (
                <CodeSignIn
                  onSignIn={onSignIn}
                  onSendCode={onSendCode}
                  labels={labels}
                />
              ) : (
                <PasswordSignIn onSignIn={onSignIn} labels={labels} />
              )}
              <Button
                size="lg"
                variant="outline"
                className="w-full"
                onClick={() => setView("qr")}
              >
                {text.back}
              </Button>
            </div>
          </GridSection>
        )}
        <GridSection className="space-y-4 px-4 py-5 sm:px-6">
          <div className="flex flex-wrap gap-2">
            <Button
              size="lg"
              variant="outline"
              className={cn(view === "qr" && "max-md:hidden")}
              onClick={() => setView("code")}
            >
              {text.sms}
            </Button>
            <Button
              size="lg"
              variant="ghost"
              onClick={() => setView("password")}
            >
              {text.password}
            </Button>
          </div>
          <p className="text-xs leading-6 text-muted-foreground">
            {text.termsPrefix}{" "}
            <a className="underline" href={termsHref}>
              {text.termsOfService}
            </a>{" "}
            {text.termsConjunction}{" "}
            <a className="underline" href={privacyHref}>
              {text.privacyPolicy}
            </a>
          </p>
        </GridSection>
      </GridContainer>
    </div>
  )
}
export { Auth02 }
export type {
  Auth02Status,
  Auth02Provider,
  Auth02Code,
  Auth02Labels,
  SignInValues,
}
