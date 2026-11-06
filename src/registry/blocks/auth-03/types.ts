import type * as React from "react"
import type { Auth03Labels } from "./config"
type Auth03Step = "phone" | "code"
type Auth03Props = Omit<React.ComponentProps<"div">, "onSuccess"> & {
  /** 发送短信，失败时抛出 Error；号码为不带区号的 11 位数字。 */
  onSendCode: (phone: string) => Promise<void>
  /** 验证短信，失败时抛出 Error。 */
  onVerify: (values: { phone: string; code: string }) => Promise<void>
  /** 验证成功后的通知。 */
  onSuccess?: () => void
  /** 其他登录入口，由接入方处理导航。 */
  onAlternative?: (method: "password") => void
  /** 验证码位数。@default 6 */
  codeLength?: number
  /** 重发间隔秒数。@default 60 */
  resendSeconds?: number
  /** 是否必须同意协议。@default true */
  requireAgreement?: boolean
  /** 协议链接；未提供时仅显示协议名称。 */
  agreementLinks?: { terms?: string; privacy?: string }
  /** 品牌名称和标志。 */
  brand?: { name: string; logo?: React.ReactNode }
  /** 覆盖默认中文文案。 */
  labels?: Partial<Auth03Labels>
  /** 受控步骤。 */
  step?: Auth03Step
  /** 初始步骤。@default "phone" */
  defaultStep?: Auth03Step
  /** 步骤变化通知。 */
  onStepChange?: (step: Auth03Step) => void
}
export type { Auth03Props, Auth03Step }
