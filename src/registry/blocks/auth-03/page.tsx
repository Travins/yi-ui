"use client"
import * as React from "react"
import { Auth03 } from "@/registry/blocks/auth-03/auth-03"
/** 演示后端仅用于体验界面，接入时替换为真实短信和认证服务。 */
export default function LoginPage() {
  const [notice, setNotice] = React.useState("")
  return (
    <main
      data-slot="auth-03-demo"
      className="flex min-h-screen flex-col justify-center bg-background px-4 py-8 text-foreground"
    >
      <p className="mb-4 text-center text-xs text-muted-foreground">
        演示验证码：123456
      </p>
      <Auth03
        brand={{ name: "云间工作台" }}
        onSendCode={async (phone) => {
          await new Promise((resolve) => setTimeout(resolve, 350))
          if (phone.endsWith("0000")) throw new Error("发送太频繁，请稍后再试")
        }}
        onVerify={async ({ code }) => {
          await new Promise((resolve) => setTimeout(resolve, 350))
          if (code !== "123456") throw new Error("验证码错误，请重新输入")
        }}
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
