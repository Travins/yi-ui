import type { IdNumberKind } from "./types"

const USCC_CHARACTERS = "0123456789ABCDEFGHJKLMNPQRTUWXY"
const ID_WEIGHTS = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2]
const USCC_WEIGHTS = [
  1, 3, 9, 27, 19, 26, 16, 17, 20, 29, 25, 13, 8, 24, 10, 30, 28,
]

type IdCardOptions = { allowLegacy15?: boolean }
type ParsedIdCard = { birthDate: string; gender: "male" | "female" }

/** 仅用于输入整理；校验函数不会把不合法的原始值悄悄修正。 */
function normalizeIdNumber(kind: IdNumberKind, value: string) {
  let result = ""
  for (const character of value.normalize("NFKC").toUpperCase()) {
    if (kind === "uscc") {
      if (USCC_CHARACTERS.includes(character)) result += character
    } else if (
      /\d/.test(character) ||
      (kind === "idcard" && character === "X" && result.length === 17)
    ) {
      result += character
    }
    if (result.length === (kind === "bankcard" ? 19 : 18)) break
  }
  return result
}

function groupNumber(kind: IdNumberKind, value: string) {
  if (kind === "uscc") return value
  if (kind === "bankcard") return value.match(/.{1,4}/g)?.join(" ") ?? ""
  return [value.slice(0, 6), value.slice(6, 14), value.slice(14)]
    .filter(Boolean)
    .join(" ")
}

function formatIdNumber(kind: IdNumberKind, value: string) {
  return groupNumber(kind, normalizeIdNumber(kind, value))
}

/** 短号码也隐藏敏感部分，避免输入未完成时泄露全部内容。 */
function maskIdNumber(kind: IdNumberKind, value: string) {
  const raw = normalizeIdNumber(kind, value)
  if (raw.length <= 4) return "*".repeat(raw.length)
  // 打码后不再沿用输入时的分组：分组会把露出的末四位拆散（如 ***0 123）。
  // 银行卡固定写成「**** **** **** 末四位」，长度不同的卡看起来一致；其余连写
  if (kind === "bankcard") return `**** **** **** ${raw.slice(-4)}`
  const prefix = kind === "idcard" ? 4 : 2
  if (raw.length <= prefix + 4) return "*".repeat(raw.length)
  return (
    raw.slice(0, prefix) + "*".repeat(raw.length - prefix - 4) + raw.slice(-4)
  )
}

function currentIdCardDate() {
  const now = new Date()
  return now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate()
}

function birthDateOf(value: string, today: number) {
  const digits =
    value.length === 15 ? `19${value.slice(6, 12)}` : value.slice(6, 14)
  const year = Number(digits.slice(0, 4))
  const month = Number(digits.slice(4, 6))
  const day = Number(digits.slice(6, 8))
  if (year < 1 || month < 1 || month > 12 || day < 1) return null
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
  if (
    day >
    ([31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1] ??
      0)
  )
    return null
  if (Number(digits) > today) return null
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`
}

function isValidIdCardAtDate(
  value: string,
  { allowLegacy15 = false }: IdCardOptions,
  today: number,
) {
  if (allowLegacy15 && /^\d{15}$/.test(value))
    return birthDateOf(value, today) !== null
  if (!/^\d{17}[\dX]$/.test(value) || !birthDateOf(value, today)) return false
  const sum = ID_WEIGHTS.reduce(
    (total, weight, index) => total + Number(value.charAt(index)) * weight,
    0,
  )
  return "10X98765432"[sum % 11] === value[17]
}

function parseIdCardAtDate(
  value: string,
  options: IdCardOptions,
  today: number,
): ParsedIdCard | null {
  if (!isValidIdCardAtDate(value, options, today)) return null
  return {
    birthDate: birthDateOf(value, today)!,
    gender:
      Number(value[value.length === 15 ? 14 : 16]) % 2 ? "male" : "female",
  }
}

function isValidIdCard(value: string, options: IdCardOptions = {}) {
  return isValidIdCardAtDate(value, options, currentIdCardDate())
}

function parseIdCard(
  value: string,
  options: IdCardOptions = {},
): ParsedIdCard | null {
  return parseIdCardAtDate(value, options, currentIdCardDate())
}

function isValidBankCard(
  value: string,
  { luhn = false }: { luhn?: boolean } = {},
) {
  if (!/^\d{16,19}$/.test(value)) return false
  if (!luhn) return true
  let sum = 0
  for (let index = value.length - 1; index >= 0; index--) {
    let digit = Number(value.charAt(index))
    if ((value.length - 1 - index) % 2 === 1) {
      digit *= 2
      if (digit > 9) digit -= 9
    }
    sum += digit
  }
  return sum % 10 === 0
}

function isValidUscc(value: string) {
  if (
    value.length !== 18 ||
    [...value].some((character) => !USCC_CHARACTERS.includes(character))
  )
    return false
  const sum = USCC_WEIGHTS.reduce(
    (total, weight, index) =>
      total + USCC_CHARACTERS.indexOf(value.charAt(index)) * weight,
    0,
  )
  return USCC_CHARACTERS[(31 - (sum % 31)) % 31] === value[17]
}

/** 光标按整理后保留的字符数换算，非法字符和分隔符不占位置。 */
function sanitizeIdNumber(kind: IdNumberKind, raw: string, caret: number) {
  const value = normalizeIdNumber(kind, raw)
  const count = Math.min(
    normalizeIdNumber(kind, raw.slice(0, caret)).length,
    value.length,
  )
  const text = formatIdNumber(kind, value)
  let position = 0
  let seen = 0
  while (position < text.length && seen < count) {
    if (text[position] !== " ") seen++
    position++
  }
  return { value, caret: position }
}

export {
  currentIdCardDate,
  isValidIdCardAtDate,
  parseIdCardAtDate,
  formatIdNumber,
  isValidBankCard,
  isValidIdCard,
  isValidUscc,
  maskIdNumber,
  normalizeIdNumber,
  parseIdCard,
  sanitizeIdNumber,
}
export type { IdCardOptions, ParsedIdCard }
