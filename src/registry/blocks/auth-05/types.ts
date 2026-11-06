import type * as React from "react"
import type { Auth05Labels } from "./config"

type Auth05Method = "passkey" | "totp" | "sms" | "recovery"

type Auth05AccountFields = {
  /** 邮箱，没有 `name`、`username` 时脱敏后显示。 */
  email?: string
  /** 短信验证用的手机号（11 位数字），脱敏后显示在短信面板；没有其他标识时也用它作账号摘要。 */
  phone?: string
  /** 显示名，原样显示，不脱敏；优先于邮箱和手机号。 */
  name?: string
  /** 用户名，原样显示，不脱敏；和 `name` 同时存在时作为小字补充。 */
  username?: string
  /** 头像图片；没有时显示实际显示的那个名字的首字。 */
  avatar?: string
}

/**
 * 已通过第一步认证的账号。`email`、`phone`、`name`、`username` 至少要有一个：
 * 用联合类型表达，漏传时在编译期就能发现；运行时仍会兜底（摘要为空、头像显示 ?），不会崩溃。
 */
type Auth05Account = Auth05AccountFields &
  (
    | { email: string }
    | { phone: string }
    | { name: string }
    | { username: string }
  )

type Auth05RecoveryCode = {
  /**
   * 掩码，`X` 代表一个字母或数字，其他字符原样插入，如 `"XXXX-XXXX"`、`"XXXXX-XXXXX"`。
   * 传 `false` 不做任何格式化：原样接受输入，只去掉首尾空白再提交。
   * @default "XXXX-XXXX"
   */
  format?: string | false
  /**
   * 是否自动转大写。`format` 为 `false` 时默认不转（原样输入），显式传 `true` 才转。
   * @default true
   */
  uppercase?: boolean
  /** 最大长度，仅在 `format` 为 `false` 时生效；有掩码时长度由掩码决定。 */
  maxLength?: number
  /** 输入框占位文字。@default 根据 format 生成 */
  placeholder?: string
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
  /** 备用码的格式；不传时为 `XXXX-XXXX`。 */
  recoveryCode?: Auth05RecoveryCode
  /**
   * 是否显示「记住此设备」开关。后端不支持时设为 `false`：开关不渲染，`onSuccess` 里的 `rememberDevice` 固定为 `false`。
   * @default true
   */
  showRememberDevice?: boolean
  /**
   * 主标题「验证你的身份」用的标题级别。嵌进已有页面时，宿主页通常已有 h1，用 2 或 3 保持层级连续。
   * @default Auth05 为 1，Auth05Panel 为 2
   */
  headingLevel?: 1 | 2 | 3
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

export type { Auth05Account, Auth05Method, Auth05Props, Auth05RecoveryCode }
