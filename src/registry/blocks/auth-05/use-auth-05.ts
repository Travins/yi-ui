"use client"

import * as React from "react"

import { useControllableState } from "@/registry/hooks/use-controllable-state"
import { DEFAULT_LABELS } from "./config"
import type { Auth05Method, Auth05Props } from "./types"

const ALL_METHODS: readonly Auth05Method[] = [
  "passkey",
  "totp",
  "sms",
  "recovery",
]

// 服务端和水合阶段拿不到浏览器能力，快照是 null（未知）；水合完成后 React 自动换成真实值，不会产生不匹配。
const subscribeNothing = () => () => {}
const detectPasskey = (): boolean =>
  typeof window.PublicKeyCredential !== "undefined"
const unknownPasskey = (): null => null

/**
 * 登录第二步的全部状态与逻辑，整页版 Auth05 和嵌入版 Auth05Panel 共用，两者只是排版不同。
 * `rootProps` 是没被消费的其余 props（className 和 div 原生属性），由调用方展开到根元素上。
 */
function useAuth05({
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
  recoveryCode,
  showRememberDevice = true,
  headingLevel,
  brand,
  labels: labelsProp,
  method: methodProp,
  defaultMethod,
  onMethodChange,
  rememberDevice: rememberProp,
  defaultRememberDevice = false,
  onRememberDeviceChange,
  ...rootProps
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
  const length = Math.max(1, Math.min(12, Math.floor(codeLength) || 6))

  // 切换方式或验证成功后把焦点交给新内容的标题，读屏和键盘用户从这里继续
  React.useEffect(() => {
    if (previous.current.active !== active || previous.current.done !== done)
      titleRef.current?.focus()
    previous.current = { active, done }
  }, [active, done])

  function complete() {
    setDone(active)
    // 不显示开关时，受控值也不应传出去：后端并不支持记住设备
    onSuccess?.({
      method: active,
      rememberDevice: showRememberDevice ? remember : false,
    })
  }

  return {
    account,
    labels,
    brand,
    helpHref,
    showRememberDevice,
    headingLevel,
    recoveryCode,
    resendSeconds,
    codeLength: length,
    method: active,
    others,
    setMethod,
    remember,
    setRemember,
    done,
    busy,
    setBusy,
    supported,
    titleRef,
    complete,
    onPasskey,
    onSendCode,
    onVerify,
    onSwitchAccount,
    rootProps,
  }
}

type Auth05State = ReturnType<typeof useAuth05>

export { useAuth05 }
export type { Auth05State }
