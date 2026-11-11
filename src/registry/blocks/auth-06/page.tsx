"use client"
import * as React from "react"
import { Auth06 } from "@/registry/blocks/auth-06/auth-06"

const wait = () => new Promise((resolve) => setTimeout(resolve, 350))

// 放在组件外保持引用稳定；import() 让地区数据单独成块，首次打开地区选择时才下载
const loadRegions = () =>
  import("@/registry/lib/china-regions").then((m) => m.chinaRegions)

/** 演示后端仅用于体验界面，接入时替换为真实的注册服务。 */
export default function SignUpPage() {
  const [notice, setNotice] = React.useState("")
  return (
    <main
      data-slot="auth-06-demo"
      className="flex min-h-screen flex-col justify-center bg-background py-8 text-foreground"
    >
      <p className="mb-4 px-4 text-center text-xs text-muted-foreground">
        演示：邮箱 taken@example.com 视为已注册；手机号以 0000 结尾时提交失败
      </p>
      <Auth06
        brand={{ name: "云间工作台" }}
        regions={loadRegions}
        onCheckEmail={async (email) => {
          await wait()
          if (email.toLowerCase() === "taken@example.com")
            throw new Error("该邮箱已注册，可以直接登录")
        }}
        onSubmit={async (values) => {
          await wait()
          if (values.phone.endsWith("0000"))
            throw new Error("注册服务暂时不可用，请稍后重试")
        }}
        onSuccess={() => setNotice("请在接入后跳转到工作台")}
        onSignIn={() => setNotice("请在接入后打开登录页面")}
      />
      <p
        role="status"
        className="mt-4 px-4 text-center text-xs text-muted-foreground"
      >
        {notice}
      </p>
    </main>
  )
}
