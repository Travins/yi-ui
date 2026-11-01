"use client"
import * as React from "react"
import { Button } from "@/components/ui/button"
import { BarField } from "@/registry/ui/bar-field/bar-field"
import { NumberStepper } from "@/registry/ui/number-stepper/number-stepper"
export default function BarFieldDemo() {
  const [email, setEmail] = React.useState("lin@example.com")
  const [saved, setSaved] = React.useState(false)
  const error = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ? undefined
    : "请输入完整的邮箱地址"
  return (
    <form
      data-slot="bar-field-demo"
      className="w-full max-w-sm space-y-4 border border-edge bg-background p-5"
      onChange={() => setSaved(false)}
      onSubmit={(event) => {
        event.preventDefault()
        if (!error) setSaved(true)
      }}
    >
      <div>
        <h3 className="text-sm font-medium">个人资料</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          完善资料，方便团队与你联系。
        </p>
      </div>
      <BarField label="姓名" name="name" defaultValue="林小满" required />
      <BarField
        label="邮箱"
        name="email"
        value={email}
        onValueChange={setEmail}
        error={error}
      />
      <NumberStepper
        label="每周工时"
        name="hours"
        unit="小时"
        min={1}
        max={80}
        defaultValue={40}
      />
      <div className="flex items-center justify-between gap-3 border-t border-dashed border-edge pt-4">
        <p role="status" className="text-xs text-muted-foreground">
          {saved ? "资料已保存" : "仅团队成员可见"}
        </p>
        <Button type="submit">保存资料</Button>
      </div>
    </form>
  )
}
