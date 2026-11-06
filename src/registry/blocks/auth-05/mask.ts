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

/** 恢复码整理：去掉非字母数字、转大写、最多 8 位，第 4 位后自动加短横线。 */
function formatRecoveryCode(raw: string) {
  const clean = raw
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .slice(0, 8)
  return clean.length > 4 ? `${clean.slice(0, 4)}-${clean.slice(4)}` : clean
}

export { formatRecoveryCode, maskEmail, maskPhone }
