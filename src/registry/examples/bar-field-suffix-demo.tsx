"use client"

import * as React from "react"
import { BarField } from "@/registry/ui/bar-field/bar-field"
import { Button } from "@/components/ui/button"
import { Eye, EyeOff } from "lucide-react"

export default function Demo() {
  const [visible, setVisible] = React.useState(false)
  return (
    <div data-slot="bar-field-suffix-demo" className="w-full max-w-sm space-y-4">
      <BarField
        label="宽度"
        defaultValue="320"
        suffix={<span className="px-2 font-mono text-xs">px</span>}
      />
      <BarField
        label="密码"
        type={visible ? "text" : "password"}
        defaultValue="password"
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
      />
    </div>
  )
}
