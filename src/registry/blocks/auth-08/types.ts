import type * as React from "react"
import type { Auth08Labels } from "./config"

type Auth08Step = "email" | "sent"

/** 网页邮箱入口：邮箱域名命中 `domains` 时显示「打开 {name}」 */
type Auth08MailProvider = {
  /** 按钮里显示的名称，如「QQ 邮箱」 */
  name: string
  /** 小写域名，如 `["qq.com", "foxmail.com"]` */
  domains: string[]
  /** 网页邮箱地址，新标签页打开 */
  url: string
}

type Auth08Props = Omit<React.ComponentProps<"div">, "onSuccess"> & {
  /** 发送登录邮件，失败时抛出 Error；邮箱已去掉首尾空格、域名已转小写。 */
  onSendLink: (email: string) => Promise<void>
  /** 校验邮件里的验证码，失败时抛出 Error；不传时不显示验证码输入。 */
  onVerifyCode?: (values: { email: string; code: string }) => Promise<void>
  /** 验证码校验成功后的通知。 */
  onSuccess?: () => void
  /** 其他登录入口，由接入方处理导航；不传时不显示底部链接。 */
  onAlternative?: (method: "password") => void
  /** 品牌名称和标志，显示在顶部且切换状态时不动。 */
  brand?: { name: string; logo?: React.ReactNode }
  /** 验证码位数，限制在 1–12。@default 6 */
  codeLength?: number
  /** 重发间隔秒数。@default 60 */
  resendSeconds?: number
  /**
   * 输入到「名字@」时给出的后缀小按钮；传空数组关闭。
   * @default ["qq.com", "163.com", "gmail.com", "outlook.com"]
   */
  domainSuggestions?: string[]
  /** 追加或覆盖网页邮箱入口，排在内置表之前，同一域名以这里为准。 */
  mailProviders?: Auth08MailProvider[]
  /** 覆盖默认中文文案。 */
  labels?: Partial<Auth08Labels>
  /** 受控状态。 */
  step?: Auth08Step
  /** 初始状态。@default "email" */
  defaultStep?: Auth08Step
  /** 状态变化通知。 */
  onStepChange?: (step: Auth08Step) => void
}

export type { Auth08MailProvider, Auth08Props, Auth08Step }
