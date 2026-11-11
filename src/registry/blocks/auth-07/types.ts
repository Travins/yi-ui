import type * as React from "react"
import type { Auth07Labels } from "./config"

type Auth07Method = "password" | "pin"
type Auth07Reason = "locked" | "expired"
type Auth07User = {
  /** 显示在问候语里；没有头像时取第一个字作为占位 */
  name: string
  email?: string
  /** 头像地址 */
  avatar?: string
}

type Auth07Props = Omit<React.ComponentProps<"div">, "onSuccess"> & {
  /** 当前登录的用户。 */
  user: Auth07User
  /**
   * 验证密码或 PIN，失败时抛出 Error；错误对象带数字属性 `retryAfter`（秒）时立即锁定这么久。
   */
  onUnlock: (values: { method: Auth07Method; secret: string }) => Promise<void>
  /** 验证成功后的通知。 */
  onSuccess?: (values: { method: Auth07Method }) => void
  /** 切换账号；未传时不显示入口。 */
  onSwitchAccount?: () => void
  /** 退出登录；未传时不显示入口。 */
  onSignOut?: () => void
  /** 锁屏原因：手动锁定或会话过期。@default "locked" */
  reason?: Auth07Reason
  /** 可用的验证方式，只有一种时不显示切换链接。@default ["password", "pin"] */
  methods?: Auth07Method[]
  /** 受控的验证方式。 */
  method?: Auth07Method
  /** 初始验证方式；默认取 `methods` 的第一项。 */
  defaultMethod?: Auth07Method
  /** 验证方式变化通知。 */
  onMethodChange?: (method: Auth07Method) => void
  /** PIN 位数，范围 4–8。@default 6 */
  pinLength?: number
  /** 连续失败多少次后锁定。@default 5 */
  maxAttempts?: number
  /** 锁定秒数。@default 30 */
  lockSeconds?: number
  /** 时钟使用的 IANA 时区；未传时在挂载后取浏览器时区。 */
  timeZone?: string
  /** 时间与日期的区域格式。@default "zh-CN" */
  locale?: string
  /** 覆盖默认中文文案。 */
  labels?: Partial<Auth07Labels>
}

export type { Auth07Method, Auth07Props, Auth07Reason, Auth07User }
