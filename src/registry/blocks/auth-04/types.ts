import type * as React from "react"
import type { Auth04Labels } from "./config"

type Auth04Step = "email" | "sso" | "password"

/** 企业身份提供方；`label` 直接显示在按钮上，请使用通用叫法。 */
type Auth04Provider = {
  id: string
  /** 例如「企业身份（SAML）」 */
  label: string
  /** 协议类型，决定默认图标 */
  protocol?: "saml" | "oidc" | "directory"
  /** 自定义图标，覆盖 `protocol` 的默认图标 */
  icon?: React.ReactNode
}

type Auth04Org = {
  name: string
  /** 企业邮箱域名，例如 yunjian.example */
  domain: string
  logo?: React.ReactNode
}

/** 域名或组织标识的识别结果。 */
type Auth04Resolution =
  | { kind: "sso"; org: Auth04Org; providers: Auth04Provider[] }
  | { kind: "password" }

type Auth04Props = Omit<React.ComponentProps<"div">, "onSuccess"> & {
  /** 根据工作邮箱识别登录方式；失败时抛出 Error，信息显示在邮箱框下。 */
  onResolveDomain: (email: string) => Promise<Auth04Resolution>
  /** 根据组织标识识别；不传则隐藏「使用组织标识登录」。 */
  onResolveOrg?: (slug: string) => Promise<Auth04Resolution>
  /**
   * 发起企业单点登录，成功后由接入方负责跳转。
   * 通过组织标识进入时没有邮箱，`email` 为空字符串。
   */
  onSsoSignIn: (values: { email: string; providerId: string }) => Promise<void>
  /** 账号密码登录，失败时抛出 Error。 */
  onPasswordSignIn: (values: {
    email: string
    password: string
  }) => Promise<void>
  /** 密码登录成功后的通知。 */
  onSuccess?: () => void
  /** 其他登录入口，由接入方处理导航。 */
  onAlternative?: (method: "personal") => void
  /** 「联系管理员」链接。@default "#" */
  supportHref?: string
  /** 品牌名称和标志。 */
  brand?: { name: string; logo?: React.ReactNode }
  /** 覆盖默认中文文案。 */
  labels?: Partial<Auth04Labels>
  /** 受控步骤。 */
  step?: Auth04Step
  /** 初始步骤。@default "email" */
  defaultStep?: Auth04Step
  /** 步骤变化通知。 */
  onStepChange?: (step: Auth04Step) => void
}

export type {
  Auth04Org,
  Auth04Props,
  Auth04Provider,
  Auth04Resolution,
  Auth04Step,
}
