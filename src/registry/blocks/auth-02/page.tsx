"use client"

import { Auth02 } from "@/registry/blocks/auth-02/auth-02"

/** 将生成二维码的回调换成认证服务；不要在客户端创建认证凭据。 */
export default function LoginPage() {
  return (
    <Auth02
      onRequestCode={async () => {
        throw new Error("请接入生成登录二维码的接口")
      }}
    />
  )
}
