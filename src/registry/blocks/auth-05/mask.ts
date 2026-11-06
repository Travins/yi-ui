import type { Auth05Account, Auth05RecoveryCode } from "./types"

/** 邮箱脱敏：保留前 3 位，如 lin***@example.com；不足 3 位时只保留首位。 */
function maskEmail(email: string) {
  const at = email.lastIndexOf("@")
  if (at < 1) return email
  const name = email.slice(0, at)
  const keep = name.length > 3 ? 3 : 1
  return `${name.slice(0, keep)}***${email.slice(at)}`
}

/** 手机号脱敏：138 **** 8000。 */
function maskPhone(phone: string) {
  const digits = phone.replace(/\D/g, "")
  if (digits.length !== 11) return phone
  return `${digits.slice(0, 3)} **** ${digits.slice(7)}`
}

/**
 * 账号摘要的显示规则：
 * 有 name 或 username 就原样显示（不脱敏）；否则脱敏邮箱，再否则脱敏手机号。
 * 头像首字取实际显示的那个名字，用 Array.from 按字符取，避免把中文或表情拆坏。
 */
function describeAccount(account: Partial<Auth05Account>) {
  const name = account.name?.trim()
  const username = account.username?.trim()
  const email = account.email?.trim()
  const phone = account.phone?.trim()
  let primary = ""
  let secondary: string | undefined
  let masked = false
  if (name || username) {
    primary = name || username || ""
    if (name && username)
      secondary = username.startsWith("@") ? username : `@${username}`
  } else if (email) {
    primary = maskEmail(email)
    masked = true
  } else if (phone) {
    primary = maskPhone(phone)
    masked = true
  }
  const source = name || username || email || phone || ""
  const initial = (Array.from(source.replace(/^@/, ""))[0] ?? "?").toUpperCase()
  return { primary, secondary, masked, initial }
}

const DEFAULT_RECOVERY_FORMAT = "XXXX-XXXX"

type RecoveryRule = {
  /** 掩码；`false` 表示不格式化。 */
  format: string | false
  uppercase: boolean
  maxLength?: number
}

/** 整理 recoveryCode 配置：没有 `X` 的掩码没有意义，退回默认。 */
function resolveRecoveryRule(options?: Auth05RecoveryCode): RecoveryRule {
  const format =
    options?.format === false
      ? false
      : typeof options?.format === "string" && options.format.includes("X")
        ? options.format
        : DEFAULT_RECOVERY_FORMAT
  const maxLength =
    typeof options?.maxLength === "number" && options.maxLength > 0
      ? Math.floor(options.maxLength)
      : undefined
  return {
    format,
    // 不格式化时默认原样输入，显式设为 true 才转大写
    uppercase: options?.uppercase ?? format !== false,
    maxLength,
  }
}

/**
 * 恢复码整理。有掩码：去掉非字母数字，按掩码逐位填入（`X` 取一个字符，其他字符原样插入，
 * 输入没写到那一位时不提前插入分隔符，所以退格不会卡在分隔符上）。无掩码：原样返回，只受 maxLength 限制。
 */
function formatRecoveryCode(raw: string, rule: RecoveryRule) {
  if (rule.format === false) {
    const text = rule.uppercase ? raw.toUpperCase() : raw
    return rule.maxLength ? text.slice(0, rule.maxLength) : text
  }
  let clean = raw.replace(/[^a-zA-Z0-9]/g, "")
  if (rule.uppercase) clean = clean.toUpperCase()
  let output = ""
  let index = 0
  for (const char of rule.format) {
    if (index >= clean.length) break
    if (char === "X") output += clean[index++]
    else output += char
  }
  return output
}

/** 恢复码是否可以提交：有掩码要填满，无掩码只要求非空。 */
function isRecoveryComplete(code: string, rule: RecoveryRule) {
  return rule.format === false
    ? code.trim().length > 0
    : code.length === rule.format.length
}

export {
  describeAccount,
  formatRecoveryCode,
  isRecoveryComplete,
  maskEmail,
  maskPhone,
  resolveRecoveryRule,
}
export type { RecoveryRule }
