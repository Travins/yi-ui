"use client"

import * as React from "react"
import { Auth04 } from "@/registry/blocks/auth-04/auth-04"
import type { Auth04Resolution } from "@/registry/blocks/auth-04/types"

const wait = () => new Promise((resolve) => setTimeout(resolve, 350))

const YUNJIAN: Auth04Resolution = {
  kind: "sso",
  org: { name: "云间科技", domain: "yunjian.example" },
  providers: [{ id: "saml", label: "企业身份（SAML）", protocol: "saml" }],
}

const MULTI: Auth04Resolution = {
  kind: "sso",
  org: { name: "多域集团", domain: "multi.example" },
  providers: [
    { id: "saml", label: "企业身份（SAML）", protocol: "saml" },
    { id: "oidc", label: "企业身份（OIDC）", protocol: "oidc" },
  ],
}

/** 演示后端仅用于体验界面，接入时替换为真实的域名识别、SSO 与认证服务。 */
export default function LoginPage() {
  const [notice, setNotice] = React.useState("")
  return (
    <main
      data-slot="auth-04-demo"
      className="flex min-h-screen flex-col justify-center bg-background px-4 py-8 text-foreground"
    >
      <div className="mx-auto mb-4 max-w-2xl space-y-1 text-center text-xs leading-6 text-muted-foreground">
        <p>
          <span className="font-mono">@yunjian.example</span> 识别为云间科技，
          <span className="font-mono">@multi.example</span> 有两个提供方，
          <span className="font-mono">@fail.example</span> 的 SSO 跳转会失败。
        </p>
        <p>
          其他邮箱走账号密码，演示密码{" "}
          <span className="font-mono">demo1234</span>
          ；组织标识 <span className="font-mono">yunjian</span> 可识别。
        </p>
      </div>
      <Auth04
        brand={{ name: "云间工作台" }}
        supportHref="mailto:admin@yunjian.example"
        onResolveDomain={async (email) => {
          await wait()
          const domain = email.split("@")[1]?.toLowerCase() ?? ""
          if (domain === "yunjian.example") return YUNJIAN
          if (domain === "multi.example") return MULTI
          if (domain === "fail.example")
            return {
              kind: "sso",
              org: { name: "故障演示", domain: "fail.example" },
              providers: [
                { id: "saml", label: "企业身份（SAML）", protocol: "saml" },
              ],
            }
          return { kind: "password" }
        }}
        onResolveOrg={async (slug) => {
          await wait()
          if (slug === "yunjian") return YUNJIAN
          throw new Error("未找到该组织，请检查组织标识")
        }}
        onSsoSignIn={async ({ email }) => {
          await wait()
          if (email.endsWith("@fail.example"))
            throw new Error("无法连接到企业身份提供方，请稍后重试")
        }}
        onPasswordSignIn={async ({ password }) => {
          await wait()
          if (password !== "demo1234")
            throw new Error("邮箱或密码不正确，请重试")
        }}
        onAlternative={() => setNotice("请在接入后打开个人账号登录页面")}
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
