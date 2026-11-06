"use client"

import * as React from "react"
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

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useControllableState } from "@/registry/hooks/use-controllable-state"
import {
  GridContainer,
  GridSection,
} from "@/registry/ui/grid-layout/grid-layout"
import { ToggleSwitch } from "@/registry/ui/toggle-switch/toggle-switch"
import { DEFAULT_LABELS, type Auth05Labels } from "./config"
import { maskEmail } from "./mask"
import {
  Auth05CodePanel,
  Auth05PasskeyPanel,
  Auth05RecoveryPanel,
} from "./panels"
import type { Auth05Method, Auth05Props } from "./types"

const ALL_METHODS: readonly Auth05Method[] = [
  "passkey",
  "totp",
  "sms",
  "recovery",
]

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

// 服务端和水合阶段拿不到浏览器能力，快照是 null（未知）；水合完成后 React 自动换成真实值，不会产生不匹配。
const subscribeNothing = () => () => {}
const detectPasskey = (): boolean =>
  typeof window.PublicKeyCredential !== "undefined"
const unknownPasskey = (): null => null

/** 登录第二步：账号已通过第一步认证，这里再完成一次通行密钥、验证码或恢复码验证。真实认证由回调接入。 */
function Auth05({
  account,
  methods: methodsProp,
  onPasskey,
  onSendCode,
  onVerify,
  onSuccess,
  onSwitchAccount,
  helpHref,
  passkeySupported,
  codeLength = 6,
  resendSeconds = 60,
  brand,
  labels: labelsProp,
  method: methodProp,
  defaultMethod,
  onMethodChange,
  rememberDevice: rememberProp,
  defaultRememberDevice = false,
  onRememberDeviceChange,
  className,
  ...props
}: Auth05Props) {
  const labels = { ...DEFAULT_LABELS, ...labelsProp }
  const methods = React.useMemo(() => {
    const list = (methodsProp ?? ALL_METHODS).filter(
      (item, index, all) =>
        ALL_METHODS.includes(item) && all.indexOf(item) === index,
    )
    return list.length > 0 ? list : ALL_METHODS
  }, [methodsProp])
  const first: Auth05Method = methods[0] ?? "passkey"
  const [method, setMethod] = useControllableState<Auth05Method>({
    prop: methodProp,
    defaultProp: defaultMethod ?? first,
    onChange: onMethodChange,
  })
  // 当前方式不在可用列表里时退回第一项，避免出现空面板
  const active = methods.includes(method) ? method : first
  const others = methods.filter((item) => item !== active)
  const [remember, setRemember] = useControllableState<boolean>({
    prop: rememberProp,
    defaultProp: defaultRememberDevice,
    onChange: onRememberDeviceChange,
  })
  const [done, setDone] = React.useState<Auth05Method | null>(null)
  const [busy, setBusy] = React.useState(false)
  const detected = React.useSyncExternalStore(
    subscribeNothing,
    detectPasskey,
    unknownPasskey,
  )
  const supported = passkeySupported ?? detected
  const titleRef = React.useRef<HTMLHeadingElement>(null)
  const previous = React.useRef({ active, done })
  const reduced = useReducedMotion()
  const alternativesId = React.useId()
  const length = Math.max(1, Math.min(12, Math.floor(codeLength) || 6))

  // 切换方式或验证成功后把焦点交给新内容的标题，读屏和键盘用户从这里继续
  React.useEffect(() => {
    if (previous.current.active !== active || previous.current.done !== done)
      titleRef.current?.focus()
    previous.current = { active, done }
  }, [active, done])

  function complete() {
    setDone(active)
    onSuccess?.({ method: active, rememberDevice: remember })
  }

  const text = methodText(labels, active)
  const suggestedMethod = others[0]
  const initial = account.email.trim().charAt(0).toUpperCase()

  return (
    <div
      data-slot="auth-05"
      data-method={active}
      data-state={done ? "success" : "idle"}
      className={cn(
        "w-full overflow-x-clip bg-background text-foreground",
        className,
      )}
      {...props}
    >
      <GridContainer className="max-w-3xl">
        <GridSection topLine className="px-4 py-8 sm:px-6">
          {brand && (
            <div className="mb-6 flex items-center gap-2 text-sm font-medium">
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
        {/* 账号摘要放在标题之后：先说明要做什么，再说明是哪个账号 */}
        <GridSection
          data-slot="auth-05-account"
          className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 sm:px-6"
        >
          <Avatar size="sm">
            {account.avatar && <AvatarImage src={account.avatar} alt="" />}
            <AvatarFallback>{initial}</AvatarFallback>
          </Avatar>
          <p className="min-w-44 flex-1 truncate font-mono text-sm">
            <span className="sr-only">{labels.accountLabel}：</span>
            {maskEmail(account.email)}
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
        </GridSection>
        <GridSection
          className={cn(
            "grid",
            !done && others.length > 0 && "md:grid-cols-[minmax(0,1fr)_17rem]",
          )}
        >
          <div className="px-4 py-8 sm:px-6">
            <motion.div
              key={done ? "success" : active}
              data-slot="auth-05-panel"
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
              ) : active === "passkey" ? (
                <Auth05PasskeyPanel
                  labels={labels}
                  onBusyChange={setBusy}
                  supported={supported}
                  onPasskey={onPasskey}
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
              ) : active === "recovery" ? (
                <Auth05RecoveryPanel
                  labels={labels}
                  onBusyChange={setBusy}
                  onVerify={onVerify}
                  onDone={complete}
                />
              ) : (
                <Auth05CodePanel
                  labels={labels}
                  onBusyChange={setBusy}
                  kind={active}
                  length={length}
                  phone={account.phone}
                  resendSeconds={resendSeconds}
                  onSendCode={onSendCode}
                  onVerify={onVerify}
                  onDone={complete}
                />
              )}
            </motion.div>
          </div>
          {!done && others.length > 0 && (
            // 右栏用虚线与主面板分开；窄屏变成面板下方的一块，用上边的虚线分隔
            <nav
              data-slot="auth-05-alternatives"
              aria-labelledby={alternativesId}
              className="border-t border-dashed border-edge px-4 py-6 sm:px-6 md:border-t-0 md:border-l md:px-4 md:py-8"
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
          )}
        </GridSection>
        {!done && (
          <GridSection className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="sm:w-72">
              <ToggleSwitch
                label={labels.rememberDevice}
                checked={remember}
                onCheckedChange={setRemember}
              />
            </div>
            {helpHref && (
              <a
                href={helpHref}
                className="text-sm text-muted-foreground underline underline-offset-4 outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {labels.help}
              </a>
            )}
          </GridSection>
        )}
      </GridContainer>
      {/* 成功是整块内容被替换，单独用一个常驻的播报区，读屏才会读出来 */}
      <p className="sr-only" aria-live="polite">
        {done ? labels.successAnnounce : ""}
      </p>
    </div>
  )
}

export { Auth05 }
export type { Auth05Account, Auth05Method, Auth05Props } from "./types"
export type { Auth05Labels } from "./config"
