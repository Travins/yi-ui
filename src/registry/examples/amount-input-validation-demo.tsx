"use client"

import * as React from "react"

import { AmountInput } from "@/registry/ui/amount-input/amount-input"

const BALANCE = 8000

/**
 * 校验与错误态：`min` / `max` 越界自动提示并拦住表单提交；
 * 业务规则（余额）自己判断，用 `error` 传入提示即可。
 */
export default function AmountInputValidationDemo() {
  const [withdraw, setWithdraw] = React.useState("5000")

  return (
    <div className="w-full max-w-sm rounded-xl border border-edge bg-background p-4 shadow-xs">
      <div className="flex items-baseline justify-between gap-2 pb-3">
        <div className="min-w-0">
          <p className="text-sm font-medium">转账与提现</p>
          <p className="truncate text-xs text-muted-foreground">
            单笔 ¥100 – ¥50,000，提现不超过余额
          </p>
        </div>
        <p className="shrink-0 font-mono text-[11px] text-muted-foreground tabular-nums">
          余额 {BALANCE.toLocaleString("en-US")}
        </p>
      </div>
      <div className="flex flex-col gap-3">
        <AmountInput
          label="单笔转账"
          min={100}
          max={50000}
          defaultValue="20000"
          showApproximate={false}
        />
        <AmountInput
          label="提现"
          value={withdraw}
          onValueChange={setWithdraw}
          error={
            Number(withdraw) > BALANCE
              ? "余额不足，最多可提现 ¥8,000.00"
              : undefined
          }
          showApproximate={false}
        />
      </div>
    </div>
  )
}
