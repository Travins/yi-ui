"use client"

import { useEffect, useState } from "react"
import { Building2, Smartphone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SegmentedControl } from "@/registry/ui/segmented-control/segmented-control"
import { Auth02, type Auth02Status } from "./auth-02"

const providers = [
  {
    id: "app",
    label: "App 扫码",
    icon: <Smartphone aria-hidden />,
    description: "使用已登录的手机 App，安全确认本次登录。",
  },
  {
    id: "enterprise",
    label: "企业账号扫码",
    icon: <Building2 aria-hidden />,
    description: "打开企业工作台，扫描二维码后确认工作账号。",
  },
]
const states = [
  { value: "pending", label: "待扫码" },
  { value: "scanned", label: "已扫码" },
  { value: "expired", label: "已过期" },
  { value: "confirmed", label: "成功" },
  { value: "error", label: "失败" },
]
export default function Auth02Demo() {
  const [status, setStatus] = useState<Auth02Status>("pending")
  const [auto, setAuto] = useState(false)
  useEffect(() => {
    if (!auto) return
    const scanned = setTimeout(() => setStatus("scanned"), 3000)
    const confirmed = setTimeout(() => {
      setStatus("confirmed")
      setAuto(false)
    }, 6000)
    return () => {
      clearTimeout(scanned)
      clearTimeout(confirmed)
    }
  }, [auto])
  return (
    <div data-slot="auth-02-demo" className="w-full">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-3 px-4 pt-4">
        <span className="text-xs text-muted-foreground">演示状态</span>
        <SegmentedControl
          className="min-w-0 flex-1 basis-72"
          aria-label="演示状态"
          options={states}
          value={status}
          onValueChange={(value) => {
            setAuto(false)
            setStatus(value as Auth02Status)
          }}
        />
        <Button
          size="default"
          variant="outline"
          disabled={auto}
          onClick={() => {
            setStatus("pending")
            setAuto(true)
          }}
        >
          模拟自动登录
        </Button>
      </div>
      <Auth02
        status={status}
        onStatusChange={setStatus}
        providers={providers}
        onRequestCode={async (id) => {
          await new Promise((resolve) => setTimeout(resolve, 400))
          return {
            value: `https://example.com/login?provider=${id}`,
            expiresAt: Date.now() + 60000,
          }
        }}
        onSignIn={async () => {
          await new Promise((resolve) => setTimeout(resolve, 500))
        }}
        onSendCode={async () => {
          await new Promise((resolve) => setTimeout(resolve, 500))
        }}
      />
    </div>
  )
}
