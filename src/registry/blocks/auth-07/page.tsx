"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Auth07 } from "@/registry/blocks/auth-07/auth-07"

/** 演示后端仅用于体验界面，接入时替换为真实的会话验证接口。 */
export default function LockScreenPage() {
  // 换一个 key 就是重新锁定：组件回到初始状态
  const [session, setSession] = React.useState(0)
  const [unlocked, setUnlocked] = React.useState(false)
  const [notice, setNotice] = React.useState("")
  return (
    <main data-slot="auth-07-demo" className="relative bg-background">
      <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-3 px-4 pt-3 text-xs text-muted-foreground">
        <p>演示密码 yiui2026 · PIN 123456</p>
        {unlocked ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setUnlocked(false)
              setNotice("")
              setSession((value) => value + 1)
            }}
          >
            重新锁定
          </Button>
        ) : null}
      </div>
      <Auth07
        key={session}
        user={{ name: "林薇", email: "linwei@example.com" }}
        maxAttempts={3}
        lockSeconds={5}
        onUnlock={async ({ method, secret }) => {
          await new Promise((resolve) => setTimeout(resolve, 350))
          if (method === "password" && secret !== "yiui2026")
            throw new Error("密码错误")
          if (method === "pin" && secret !== "123456")
            throw new Error("PIN 错误")
        }}
        onSuccess={() => setUnlocked(true)}
        onSwitchAccount={() => setNotice("接入后在这里打开账号选择页")}
        onSignOut={() => setNotice("接入后在这里清除会话并返回登录页")}
      />
      <p
        role="status"
        className="absolute inset-x-0 bottom-3 z-20 px-4 text-center text-xs text-muted-foreground"
      >
        {notice}
      </p>
    </main>
  )
}
