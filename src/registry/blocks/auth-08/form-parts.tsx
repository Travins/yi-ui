"use client"

import type * as React from "react"
import { Button } from "@/components/ui/button"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp"
import { cn } from "@/lib/utils"

function Auth08CodeInput({
  length,
  value,
  error,
  describedBy,
  label,
  disabled,
  onChange,
  onComplete,
}: {
  length: number
  value: string
  error: boolean
  describedBy?: string
  label: string
  disabled: boolean
  onChange: (value: string) => void
  onComplete: (value: string) => void
}) {
  return (
    <div data-slot="auth-08-code-input">
      <InputOTP
        maxLength={length}
        value={value}
        onChange={onChange}
        onComplete={onComplete}
        pattern="^[0-9]*$"
        autoComplete="one-time-code"
        inputMode="numeric"
        aria-label={label}
        aria-invalid={error || undefined}
        aria-describedby={describedBy}
        disabled={disabled}
        containerClassName="w-full"
      >
        <InputOTPGroup className="w-full">
          {Array.from({ length }, (_, index) => (
            <InputOTPSlot
              key={index}
              index={index}
              aria-invalid={error || undefined}
              className="h-9 min-w-0 flex-1 border-edge text-base data-[active=true]:border-foreground/25 data-[active=true]:bg-muted/40 data-[active=true]:ring-0 pointer-coarse:h-11"
            />
          ))}
        </InputOTPGroup>
      </InputOTP>
    </div>
  )
}

/** 邮箱后缀小按钮：按下时不抢走输入框焦点，补全后光标仍在输入框末尾 */
function Auth08DomainSuggestions({
  label,
  local,
  domains,
  disabled,
  onPick,
}: {
  label: string
  local: string
  domains: string[]
  disabled: boolean
  onPick: (email: string) => void
}) {
  if (domains.length === 0) return null
  return (
    <div
      role="group"
      aria-label={label}
      data-slot="auth-08-domain-suggestions"
      className="flex flex-wrap gap-1.5"
    >
      {domains.map((domain) => (
        <Button
          key={domain}
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          aria-label={`${local}@${domain}`}
          className="border-edge font-mono text-xs font-normal text-muted-foreground hover:text-foreground"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onPick(`${local}@${domain}`)}
        >
          @{domain}
        </Button>
      ))}
    </div>
  )
}

/** 带文字的分隔线，两侧线条用网格线色 */
function Auth08Divider({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="auth-08-divider"
      className={cn(
        "flex items-center gap-3 text-xs text-muted-foreground before:h-px before:flex-1 before:bg-edge after:h-px after:flex-1 after:bg-edge",
        className,
      )}
      {...props}
    />
  )
}

export { Auth08CodeInput, Auth08DomainSuggestions, Auth08Divider }
