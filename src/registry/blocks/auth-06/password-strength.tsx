import { cn } from "@/lib/utils"
import { formatLabel, type Auth06Labels } from "./config"

// 四段强度条：颜色从 destructive 过渡到主色，跟随主题
const levels = [
  { label: "strengthWeak", bar: "bg-destructive" },
  { label: "strengthFair", bar: "bg-destructive/50" },
  { label: "strengthGood", bar: "bg-primary/60" },
  { label: "strengthStrong", bar: "bg-primary" },
] as const satisfies readonly { label: keyof Auth06Labels; bar: string }[]

/** 按长度与字符种类打分：0 表示尚未输入，1–4 对应 弱 / 一般 / 较强 / 强。 */
function getPasswordStrength(password: string) {
  if (!password) return 0
  const score =
    Number(password.length >= 8) +
    Number(password.length >= 12) +
    Number(/[a-z]/.test(password) && /[A-Z]/.test(password)) +
    Number(/\d/.test(password)) +
    Number(/[^A-Za-z0-9]/.test(password))
  return Math.min(4, Math.max(1, score))
}

/** 四段强度条 + 文字；文字只在档位变化时播报。 */
function Auth06PasswordStrength({
  password,
  labels,
}: {
  password: string
  labels: Auth06Labels
}) {
  const strength = getPasswordStrength(password)
  const level = strength ? levels[strength - 1] : null
  return (
    <div
      data-slot="auth-06-password-strength"
      data-strength={strength}
      className="flex items-center gap-3"
    >
      <div aria-hidden="true" className="grid flex-1 grid-cols-4 gap-1">
        {levels.map((item, index) => (
          <span
            key={item.label}
            className={cn(
              "h-1 rounded-full bg-muted transition-colors motion-reduce:transition-none",
              index < strength && item.bar,
            )}
          />
        ))}
      </div>
      <span
        aria-live="polite"
        className="w-16 text-right text-xs whitespace-nowrap text-muted-foreground"
      >
        {level
          ? formatLabel(labels.passwordStrength, {
              level: labels[level.label],
            })
          : labels.passwordStrengthEmpty}
      </span>
    </div>
  )
}

export { Auth06PasswordStrength, getPasswordStrength }
