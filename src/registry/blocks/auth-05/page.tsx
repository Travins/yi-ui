"use client"

import { useRouter } from "next/navigation"

import { Auth05 } from "@/registry/blocks/auth-05/auth-05"

/**
 * 登录第二步：账号已通过第一步认证后进入这里。
 * 把下面的回调换成自己的认证服务；通行密钥的 WebAuthn 调用写在 onPasskey 里，
 * challenge 必须从服务端获取，不要在客户端生成。
 */
export default function VerifyPage() {
  const router = useRouter()
  return (
    <main className="flex min-h-screen flex-col justify-center bg-background py-8 text-foreground">
      <Auth05
        account={{ email: "name@example.com", phone: "13800138000" }}
        helpHref="/support"
        onPasskey={async () => {
          throw new Error("请接入通行密钥验证")
        }}
        onSendCode={async () => {
          throw new Error("请接入短信发送接口")
        }}
        onVerify={async () => {
          throw new Error("请接入验证码校验接口")
        }}
        onSuccess={() => router.push("/")}
        onSwitchAccount={() => router.push("/login")}
      />
    </main>
  )
}
