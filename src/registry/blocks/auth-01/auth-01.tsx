"use client"

import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { useState } from "react"

import { cn } from "@/lib/utils"

import { defaultBrand, type BrandConfig, type BrandFeature } from "./brand"
import { BrandPanel, MobileBrand } from "./brand-panel"
import type { Auth01Labels } from "./config"
import { ForgotPasswordForm } from "./forgot-password-form"
import {
  SignInForm,
  type SignInMethod,
  type SignInValues,
} from "./sign-in-form"
import { SignUpForm, type SignUpValues } from "./sign-up-form"
import type { SocialProvider } from "./social-buttons"

type AuthView = "sign-in" | "sign-up" | "forgot-password"

// 稳定引用：默认两种登录方式都开，顺序即分段控件里的顺序
const DEFAULT_SIGN_IN_METHODS: readonly SignInMethod[] = ["password", "code"]

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
// 未传回调时的示例实现：只在控制台打印，并模拟 0.8 秒的网络请求
const demo =
  <Args extends unknown[]>(name: string) =>
  async (...args: Args) => {
    console.info(`[auth-01] ${name}`, ...args)
    await wait(800)
  }

/**
 * 分屏式登录 / 注册页：左侧品牌面板 + 右侧表单，窄屏只显示表单。
 * 回调返回 Promise；组件管理 loading，回调 throw 的 Error.message 会显示为表单错误。
 */
function Auth01({
  brand,
  defaultView = "sign-in",
  signInMethods = DEFAULT_SIGN_IN_METHODS,
  socialProviders = ["github", "google"],
  allowSignUp = true,
  termsHref = "#",
  privacyHref = "#",
  onSignIn = demo<[SignInValues]>("onSignIn"),
  onSignUp = demo<[SignUpValues]>("onSignUp"),
  onForgotPassword = demo<[string]>("onForgotPassword"),
  onSendCode = demo<[string]>("onSendCode"),
  onSocialSignIn = demo<[SocialProvider]>("onSocialSignIn"),
  labels,
  className,
}: {
  /** 品牌信息，逐项覆盖默认的示例品牌 */
  brand?: Partial<BrandConfig>
  defaultView?: AuthView
  /**
   * 开放的登录方式，顺序即切换控件里的顺序，第一项是默认方式；
   * 只留一种时不显示切换控件，例如 `["password"]` 只要账号 + 密码
   * @default ["password", "code"]
   */
  signInMethods?: readonly SignInMethod[]
  /** 启用的第三方登录，传空数组隐藏该区域 */
  socialProviders?: readonly SocialProvider[]
  /** 设为 false 隐藏「注册」入口（仅邀请制的产品） */
  allowSignUp?: boolean
  termsHref?: string
  privacyHref?: string
  onSignIn?: (values: SignInValues) => Promise<void>
  onSignUp?: (values: SignUpValues) => Promise<void>
  onForgotPassword?: (email: string) => Promise<void>
  /** 验证码登录时发送短信；`signInMethods` 不含 `"code"` 时不会被调用，可以不传 */
  onSendCode?: (phone: string) => Promise<void>
  onSocialSignIn?: (provider: SocialProvider) => Promise<void>
  /** 覆盖默认文案，见 config.ts 的 DEFAULT_LABELS */
  labels?: Partial<Auth01Labels>
  className?: string
}) {
  const [view, setView] = useState<AuthView>(defaultView)
  const reducedMotion = useReducedMotion()
  const resolved: BrandConfig = { ...defaultBrand, ...brand }
  return (
    <div data-slot="auth-01" className={cn("relative flex min-h-svh", className)}>
      <BrandPanel brand={resolved} labels={labels} />
      <main className="relative flex flex-1 items-center justify-center bg-background p-6 pb-16 sm:p-12 sm:pb-16">
        <div className="w-full max-w-md">
          <MobileBrand brand={resolved} />
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={view}
              initial={{ opacity: 0, y: reducedMotion ? 0 : 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: reducedMotion ? 0 : -8 }}
              transition={{ duration: 0.18 }}
            >
              {view === "sign-in" && (
                <SignInForm
                  methods={signInMethods}
                  socialProviders={socialProviders}
                  allowSignUp={allowSignUp}
                  onSignIn={onSignIn}
                  onSendCode={onSendCode}
                  onSocialSignIn={onSocialSignIn}
                  onForgotPassword={() => setView("forgot-password")}
                  onSwitchToSignUp={() => setView("sign-up")}
                  labels={labels}
                />
              )}
              {view === "sign-up" && (
                <SignUpForm
                  termsHref={termsHref}
                  privacyHref={privacyHref}
                  onSignUp={onSignUp}
                  onSwitchToSignIn={() => setView("sign-in")}
                  labels={labels}
                />
              )}
              {view === "forgot-password" && (
                <ForgotPasswordForm
                  onForgotPassword={onForgotPassword}
                  onSwitchToSignIn={() => setView("sign-in")}
                  labels={labels}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
        <p className="absolute right-6 bottom-4 text-xs text-muted-foreground">
          {resolved.copyright}
        </p>
      </main>
    </div>
  )
}

export { Auth01 }
export type {
  Auth01Labels,
  AuthView,
  BrandConfig,
  BrandFeature,
  SignInMethod,
  SignInValues,
  SignUpValues,
  SocialProvider,
}
