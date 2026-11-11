import type * as React from "react"
import type { RegionsSource } from "@/registry/ui/region-picker/region-picker"
import type { Auth06Labels } from "./config"

/** 向导所处的位置；`done` 是提交成功后的结果页，不算一步。 */
type Auth06Step = "account" | "profile" | "identity" | "done"

/** 实名步骤：可跳过、必填或不出现（整个向导只有两步）。 */
type Auth06IdentityMode = "optional" | "required" | "off"

type Auth06Region = {
  /** 最末一级的行政区划代码 */
  code: string
  /** 从省到市的名称，如 `["浙江省", "杭州市"]` */
  path: string[]
}

type Auth06Values = {
  email: string
  password: string
  name: string
  /** 11 位纯数字，不带区号 */
  phone: string
  region: Auth06Region
  /** 所选团队规模选项的 `value` */
  teamSize: string
  /** 跳过实名时没有这一项 */
  identity?: { realName: string; idNumber: string }
}

type Auth06TeamSize = { value: string; label: string }

/** 向导内部的草稿：前后切换步骤时全部保留。 */
type Auth06Draft = {
  email: string
  password: string
  agreed: boolean
  name: string
  phone: string
  region: string | null
  regionPath: string[]
  teamSize: string
  realName: string
  idNumber: string
}

type Auth06Errors = Partial<Record<keyof Auth06Draft, string>>

type Auth06Props = Omit<React.ComponentProps<"div">, "onSubmit"> & {
  /** 地区数据，传数组或惰性加载函数，同 `RegionPicker` 的 `regions`。 */
  regions: RegionsSource
  /** 最后一步统一提交，失败时抛出 Error，`message` 显示在当前步骤表单上方。 */
  onSubmit: (values: Auth06Values) => Promise<void>
  /** 第一步「下一步」时检查邮箱是否可用；抛出的 `message` 显示在邮箱下方。 */
  onCheckEmail?: (email: string) => Promise<void>
  /** 结果页点「进入工作台」时触发，参数为已提交的值。 */
  onSuccess?: (values: Auth06Values) => void
  /** 传入后底部显示「已有账号？去登录」，导航由接入方处理。 */
  onSignIn?: () => void
  /** 实名步骤。@default "optional" */
  identityStep?: Auth06IdentityMode
  /** 团队规模选项，第一项为默认值。@default 仅自己 / 2–10 人 / 11–50 人 / 50 人以上 */
  teamSizes?: Auth06TeamSize[]
  /** 协议链接；未提供时只显示协议名称。 */
  agreementLinks?: { terms?: string; privacy?: string }
  /** 品牌名称和标志。 */
  brand?: { name: string; logo?: React.ReactNode }
  /** 覆盖默认中文文案。 */
  labels?: Partial<Auth06Labels>
  /** 受控步骤。 */
  step?: Auth06Step
  /** 初始步骤。@default "account" */
  defaultStep?: Auth06Step
  /** 步骤变化通知（前进、返回、点步骤栏、完成）。 */
  onStepChange?: (step: Auth06Step) => void
}

export type {
  Auth06Draft,
  Auth06Errors,
  Auth06IdentityMode,
  Auth06Props,
  Auth06Region,
  Auth06Step,
  Auth06TeamSize,
  Auth06Values,
}
