"use client"

import { Auth01 } from "@/registry/blocks/auth-01/auth-01"

/** 只开账号 + 密码：没有登录方式切换，也不需要 onSendCode */
export default function Auth01PasswordOnlyDemo() {
  return (
    <Auth01
      signInMethods={["password"]}
      // 预览框只有半屏宽，品牌面板放不下特性列表；整页使用时不用传
      brand={{ features: [] }}
      socialProviders={[]}
      allowSignUp={false}
      className="min-h-[36rem] w-full overflow-hidden rounded-xl border border-edge shadow-xs"
    />
  )
}
