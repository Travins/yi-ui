"use client"

import * as React from "react"
import { Auth08 } from "@/registry/blocks/auth-08/auth-08"

const wait = () => new Promise((resolve) => setTimeout(resolve, 350))

/** 演示后端仅用于体验界面，接入时替换为真实的发信与认证服务。 */
export default function LoginPage() {
  const [notice, setNotice] = React.useState("")
  return (
    <main
      data-slot="auth-08-demo"
      className="flex min-h-screen flex-col justify-center bg-background px-4 py-8 text-foreground"
    >
      <p className="mb-4 text-center text-xs text-muted-foreground">
        演示验证码：123456 · 以 blocked@ 开头的邮箱模拟发送太频繁
      </p>
      <Auth08
        brand={{
          name: "云间工作台",
          logo: (
            <span
              aria-hidden="true"
              className="flex size-6 items-center justify-center rounded-md bg-primary text-xs font-semibold text-primary-foreground"
            >
              云
            </span>
          ),
        }}
        onSendLink={async (email) => {
          await wait()
          if (email.startsWith("blocked@"))
            throw new Error("发送太频繁，请稍后再试")
        }}
        onVerifyCode={async ({ code }) => {
          await wait()
          if (code !== "123456") throw new Error("验证码错误，请重新输入")
        }}
        onSuccess={() => setNotice("已登录，接入后在这里跳转")}
        onAlternative={() => setNotice("请在接入后打开账号密码登录页面")}
      />
      <p
        role="status"
        className="mt-4 text-center text-xs text-muted-foreground"
      >
        {notice}
      </p>
    </main>
  )
}
