"use client"

import * as React from "react"
import { Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { BarField } from "@/registry/ui/bar-field/bar-field"

const LEVELS = ["太弱", "一般", "较强", "很强"] as const

/** 0–4 分：长度够 8 位、同时有字母和数字、有大写或符号、长度到 12 位各加一分 */
function score(password: string) {
  if (!password) return 0
  return [
    password.length >= 8,
    /[a-z]/i.test(password) && /\d/.test(password),
    /[A-Z]/.test(password) || /[^a-z\d]/i.test(password),
    password.length >= 12,
  ].filter(Boolean).length
}

function generate() {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789!@#$%"
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return Array.from(bytes, (b) => chars[b % chars.length]).join("")
}

export default function BarFieldValidationDemo() {
  const [value, setValue] = React.useState("yiui2026")
  const [visible, setVisible] = React.useState(false)
  const points = score(value)
  const level = LEVELS[Math.max(0, points - 1)]

  return (
    <div data-slot="bar-field-validation-demo" className="w-full max-w-sm">
      <BarField
        label="新密码"
        type={visible ? "text" : "password"}
        autoComplete="new-password"
        spellCheck={false}
        value={value}
        onValueChange={setValue}
        error={value.length < 8 ? "密码至少需要 8 个字符" : undefined}
        suffix={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={visible ? "隐藏密码" : "显示密码"}
            aria-pressed={visible}
            onClick={() => setVisible(!visible)}
          >
            {visible ? <EyeOff /> : <Eye />}
          </Button>
        }
        description={
          <span className="flex h-7 items-center gap-2">
            <span aria-hidden="true" className="flex shrink-0 gap-1">
              {[1, 2, 3, 4].map((step) => (
                <span
                  key={step}
                  className={cn(
                    "h-1 w-6 rounded-full bg-muted transition-colors",
                    step <= points &&
                      (points <= 1 ? "bg-destructive" : "bg-primary"),
                  )}
                />
              ))}
            </span>
            <span className="whitespace-nowrap">强度：{value ? level : "—"}</span>
          </span>
        }
        footerAction={
          <Button
            type="button"
            variant="link"
            size="sm"
            className="px-0 text-xs"
            onClick={() => {
              setValue(generate())
              setVisible(true)
            }}
          >
            生成强密码
          </Button>
        }
      />
    </div>
  )
}
