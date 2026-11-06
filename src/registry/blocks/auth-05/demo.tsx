"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import { SegmentedControl } from "@/registry/ui/segmented-control/segmented-control"
import { Auth05 } from "./auth-05"

type PasskeyMode = "success" | "cancel" | "unsupported" | "error"

const modes = [
  { value: "success", label: "成功" },
  { value: "cancel", label: "取消" },
  { value: "unsupported", label: "不支持" },
  { value: "error", label: "失败" },
]

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** 演示外壳：模拟后端与演示规则只放在这里，不属于 Auth05 组件。 */
export default function Auth05Demo() {
  const [mode, setMode] = React.useState<PasskeyMode>("success")
  const [round, setRound] = React.useState(0)
  const [notice, setNotice] = React.useState("")
  return (
    <main
      data-slot="auth-05-demo"
      className="flex min-h-screen flex-col justify-center bg-background py-8 text-foreground"
    >
      <div className="mx-auto mb-4 flex w-full max-w-3xl flex-wrap items-center gap-3 px-4">
        <span className="text-xs text-muted-foreground">通行密钥模拟结果</span>
        <SegmentedControl
          className="min-w-0 flex-1 basis-72"
          aria-label="通行密钥模拟结果"
          options={modes}
          value={mode}
          onValueChange={(value) => setMode(value as PasskeyMode)}
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setRound((value) => value + 1)
            setNotice("")
          }}
        >
          重置演示
        </Button>
      </div>
      <Auth05
        key={round}
        account={{ email: "linwei@example.com", phone: "13800138000" }}
        brand={{ name: "云间工作台" }}
        helpHref="#"
        passkeySupported={mode !== "unsupported"}
        onPasskey={async () => {
          await wait(1500)
          if (mode === "cancel") {
            throw Object.assign(new Error("The operation was cancelled."), {
              name: "NotAllowedError",
            })
          }
          if (mode === "error")
            throw new Error("这台设备上没有找到可用的通行密钥")
        }}
        onSendCode={async () => {
          await wait(1000)
        }}
        onVerify={async ({ method, code }) => {
          await wait(350)
          if (method === "recovery") {
            if (code !== "ABCD-1234") throw new Error("恢复码无效或已使用")
          } else if (code !== "123456") {
            throw new Error("验证码错误，请重新输入")
          }
        }}
        onSwitchAccount={() => setNotice("请在接入后跳转到账号选择页面")}
      />
      <div className="mx-auto mt-4 w-full max-w-3xl space-y-1 px-4 text-xs text-muted-foreground">
        <p>
          演示规则：身份验证器与短信验证码为 123456；恢复码为
          ABCD-1234；通行密钥 1.5 秒后按上方选择的结果返回。
        </p>
        <p role="status">{notice}</p>
      </div>
    </main>
  )
}
