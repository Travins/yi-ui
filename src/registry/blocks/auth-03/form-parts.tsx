"use client"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp"
function Auth03CodeInput({
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
    <div data-slot="auth-03-code-input">
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
export { Auth03CodeInput }
