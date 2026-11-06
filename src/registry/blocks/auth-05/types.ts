import type * as React from "react"
import type { Auth05Labels } from "./config"

type Auth05Method = "passkey" | "totp" | "sms" | "recovery"

type Auth05Account = {
  /** 邮箱，组件会脱敏后显示。 */
  email: string
  /** 头像图片；没有时显示邮箱首字母。 */
  avatar?: string
  /** 短信验证用的手机号（11 位数字），组件会脱敏后显示。 */
  phone?: string
}

type Auth05Props = Omit<React.ComponentProps<"div">, "onSuccess"> & {
  /** 已通过第一步认证的账号。 */
  account: Auth05Account
  /** 可用的验证方式，顺序即「其他验证方式」列表的顺序。@default ["passkey","totp","sms","recovery"] */
  methods?: readonly Auth05Method[]
  /**
   * 通行密钥验证。在这里调用 WebAuthn；失败时抛出 Error。
   * `name` 为 `NotAllowedError` 的错误会被当作「已取消」，其他错误显示 `message`。
   */
  onPasskey?: () => Promise<void>
  /** 发送短信验证码，失败时抛出 Error。 */
  onSendCode?: () => Promise<void>
  /** 验证验证码或恢复码，失败时抛出 Error。 */
  onVerify?: (values: {
    method: Exclude<Auth05Method, "passkey">
    code: string
  }) => Promise<void>
  /** 验证成功后的通知。 */
  onSuccess?: (values: {
    method: Auth05Method
    rememberDevice: boolean
  }) => void
  /** 点击「切换账号」。 */
  onSwitchAccount?: () => void
  /** 「联系管理员」链接地址；不传时不显示这个入口。 */
  helpHref?: string
  /** 覆盖浏览器能力检测，方便演示和测试；不传时在挂载后检测 `PublicKeyCredential`。 */
  passkeySupported?: boolean
  /** 验证码位数。@default 6 */
  codeLength?: number
  /** 短信重发间隔秒数。@default 60 */
  resendSeconds?: number
  /** 品牌名称和标志。 */
  brand?: { name: string; logo?: React.ReactNode }
  /** 覆盖默认中文文案。 */
  labels?: Partial<Auth05Labels>
  /** 受控的当前验证方式。 */
  method?: Auth05Method
  /** 初始验证方式。@default 第一个可用方式 */
  defaultMethod?: Auth05Method
  /** 验证方式变化通知。 */
  onMethodChange?: (method: Auth05Method) => void
  /** 受控的「记住此设备」。 */
  rememberDevice?: boolean
  /** 初始的「记住此设备」。@default false */
  defaultRememberDevice?: boolean
  onRememberDeviceChange?: (value: boolean) => void
}

export type { Auth05Account, Auth05Method, Auth05Props }
