"use client"

import * as React from "react"

import {
  IdNumberInput,
  isValidUscc,
} from "@/registry/ui/id-number-input/id-number-input"

/**
 * 三种号码：身份证、银行卡失焦打码；信用代码初始有效；
 * 把末位改错后，18 位填满且校验位不对时提示，改对后提示立即消失。
 */
export default function IdNumberInputKindsDemo() {
  const [uscc, setUscc] = React.useState("91350100M000100Y43")
  const wrong = uscc.length === 18 && !isValidUscc(uscc)

  return (
    <div className="w-full max-w-sm rounded-xl border border-edge bg-background p-4 shadow-xs">
      <div className="flex items-baseline justify-between gap-2 pb-3">
        <div className="min-w-0">
          <p className="text-sm font-medium">三种号码</p>
          <p className="truncate text-xs text-muted-foreground">
            聚焦查看明文，失焦恢复打码
          </p>
        </div>
        <p className="shrink-0 font-mono text-[11px] text-muted-foreground">
          GB 11643 · GB 32100
        </p>
      </div>
      <div className="flex flex-col gap-3">
        <IdNumberInput
          label="身份证号"
          defaultValue="11010519491231002X"
          mask
        />
        <IdNumberInput
          kind="bankcard"
          label="银行卡号"
          defaultValue="6222021234567890123"
          mask
          showLength
        />
        <IdNumberInput
          kind="uscc"
          label="信用代码"
          value={uscc}
          onValueChange={setUscc}
          error={wrong ? "校验位不正确，请核对证件上的末位字符" : undefined}
        />
      </div>
    </div>
  )
}
