/**
 * 中文数字工具：人民币大写（财务规范）与整数中文读法。
 * 纯函数、无依赖，服务端和客户端都能用。
 *
 * 输入统一按「十进制字符串」处理，不经过浮点运算：数字先用 `String(value)` 取最短表示再解析，
 * 所以 `0.1 + 0.2`（`0.30000000000000004`）按分四舍五入后是 `叁角`，不会出现误差。
 * 非法输入（NaN、Infinity、无法解析的字符串、超出范围）一律返回空串而不抛错，
 * 方便在输入框里边敲边显示，不必到处包 try/catch。
 */

/** 整数部分最多 16 位（万亿以上到「九千九百九十九万亿」），再大的数没有通行读法。 */
const MAX_INTEGER_DIGITS = 16

const UPPER_DIGITS = "零壹贰叁肆伍陆柒捌玖"
const LOWER_DIGITS = "零一二三四五六七八九"
const UPPER_SMALL = ["", "拾", "佰", "仟"]
const LOWER_SMALL = ["", "十", "百", "千"]
// 每四位一节：个、万、亿、万亿
const SECTION_UNITS = ["", "万", "亿", "万亿"]

type ParsedDecimal = {
  negative: boolean
  /** 整数部分，已去掉前导零；零写成 `"0"` */
  int: string
  /** 小数部分，可能为空串 */
  frac: string
}

/** 把 `1.5e-7`、`1e21` 这类科学计数法展开成普通小数字符串。 */
function expandExponent(text: string) {
  const match = /^([+-]?)(\d+)(?:\.(\d*))?e([+-]?\d+)$/i.exec(text)
  if (!match) return text
  const [, sign = "", intPart = "", fracPart = "", exponent] = match
  const shift = Number(exponent)
  const digits = intPart + fracPart
  const point = intPart.length + shift
  if (point <= 0) return `${sign}0.${"0".repeat(-point)}${digits}`
  if (point >= digits.length)
    return `${sign}${digits}${"0".repeat(point - digits.length)}`
  return `${sign}${digits.slice(0, point)}.${digits.slice(point)}`
}

function parseDecimal(value: number | string): ParsedDecimal | null {
  let text: string
  if (typeof value === "number") {
    // 超过安全整数的 number 本身就已经丢了精度，不给出一个看似精确的结果
    if (!Number.isFinite(value) || Math.abs(value) > Number.MAX_SAFE_INTEGER)
      return null
    text = expandExponent(String(value))
  } else if (typeof value === "string") {
    text = expandExponent(value.trim().replace(/,/g, ""))
  } else {
    return null
  }
  const match = /^([+-]?)(\d*)(?:\.(\d*))?$/.exec(text)
  if (!match) return null
  const [, sign = "", intPart = "", frac = ""] = match
  if (!intPart && !frac) return null
  const int = intPart.replace(/^0+(?=\d)/, "") || "0"
  if (int.length > MAX_INTEGER_DIGITS) return null
  return { negative: sign === "-", int, frac }
}

/**
 * 把整数字符串读成「万」「亿」分节的中文。
 * 零的规则：节内连续的零读一个「零」，末尾的零不读；整节为零则省略该节的单位，
 * 但后面还有非零数字时补一个「零」（`1000001` → `一百万零一`）。
 */
function readInteger(int: string, digits: string, small: string[]) {
  let out = ""
  let pendingZero = false
  let sectionHasValue = false
  for (let i = int.length - 1; i >= 0; i--) {
    const digit = Number(int[int.length - 1 - i])
    if (digit === 0) {
      pendingZero = true
    } else {
      if (pendingZero && out) out += digits.charAt(0)
      pendingZero = false
      sectionHasValue = true
      out += digits.charAt(digit) + small[i % 4]
    }
    if (i % 4 === 0) {
      if (sectionHasValue) out += SECTION_UNITS[i / 4]
      sectionHasValue = false
    }
  }
  return out
}

/** 十进制数字串加一：`"199"` → `"200"`，`"99"` → `"100"`。 */
function incrementDigits(digits: string) {
  const chars = digits.split("")
  let i = chars.length - 1
  while (i >= 0 && chars[i] === "9") chars[i--] = "0"
  if (i < 0) chars.unshift("1")
  else chars[i] = String(Number(chars[i]) + 1)
  return chars.join("")
}

type RmbUppercaseOptions = {
  /**
   * 分以下的小数怎么处理：`round` 四舍五入到分（0.005 → 一分），`truncate` 直接舍去。
   * @default "round"
   */
  rounding?: "round" | "truncate"
}

/**
 * 人民币大写，按财务规范书写：
 * - 数字用「壹贰叁肆伍陆柒捌玖」，单位用「拾佰仟万亿」，**拾位保留「壹」**（`100000` → `壹拾万元整`），防止被改写；
 * - 到元为止在「元」后加「整」，有角无分时「角」后不加（`0.5` → `伍角`），有分时「分」后不加；
 * - 元位有数、角位为零而分位有数时补「零」（`10.05` → `壹拾元零伍分`），整数部分为零时不写「零元」（`0.05` → `伍分`）；
 * - 负数前加「负」；结果为零（包括 `-0.001` 舍入后）写 `零元整`。
 *
 * 支持到整数部分 16 位（九千九百九十九万亿）。传 number 时超过安全整数范围，传字符串可避开这个限制。
 * NaN、非法字符串、超出范围一律返回空串。
 *
 * @example
 * toRmbUppercase(1234.56) // "壹仟贰佰叁拾肆元伍角陆分"
 * toRmbUppercase("1000.00") // "壹仟元整"
 */
function toRmbUppercase(
  value: number | string,
  options: RmbUppercaseOptions = {},
): string {
  const { rounding = "round" } = options
  const parsed = parseDecimal(value)
  if (!parsed) return ""
  // 全部换成「分」的整数串再算，避免任何小数运算（也不依赖 BigInt）
  let cents = (parsed.int + parsed.frac.slice(0, 2).padEnd(2, "0")).replace(
    /^0+(?=\d)/,
    "",
  )
  if (rounding === "round" && Number(parsed.frac[2] ?? 0) >= 5)
    cents = incrementDigits(cents)
  if (cents.length > MAX_INTEGER_DIGITS + 2) return ""

  const yuan = cents.length > 2 ? cents.slice(0, -2) : "0"
  const jiao = cents.length > 1 ? Number(cents[cents.length - 2]) : 0
  const fen = Number(cents[cents.length - 1])

  if (/^0+$/.test(cents)) return "零元整"
  let out = parsed.negative ? "负" : ""
  if (yuan !== "0") out += `${readInteger(yuan, UPPER_DIGITS, UPPER_SMALL)}元`
  if (jiao === 0 && fen === 0) return `${out}整`
  if (jiao > 0) out += `${UPPER_DIGITS[jiao]}角`
  else if (yuan !== "0") out += "零"
  if (fen > 0) out += `${UPPER_DIGITS[fen]}分`
  return out
}

type ChineseNumeralsOptions = {
  /**
   * 用大写数字（壹贰叁…拾佰仟）。财务写法不省略「壹拾」，也不写口语的「十」开头。
   * @default false
   */
  financial?: boolean
}

/**
 * 数字的中文读法：`123` → `一百二十三`，`10010` → `一万零一十`。
 *
 * - 整个数以 10–19 开头时读「十」而不读「一十」（`10` → `十`，`110000` → `十一万`）；
 *   数中间的「一十」保留（`10010` → `一万零一十`，`110` → `一百一十`）。`financial: true` 时一律保留「壹拾」。
 * - 二一律写「二」，不写「两」（`2000` → `二千`）。
 * - 小数点后逐位读，`3.14` → `三点一四`；负数前加「负」。
 *
 * 支持到整数部分 16 位；NaN、非法字符串、超出范围返回空串。
 */
function toChineseNumerals(
  value: number | string,
  options: ChineseNumeralsOptions = {},
): string {
  const { financial = false } = options
  const parsed = parseDecimal(value)
  if (!parsed) return ""
  const digits = financial ? UPPER_DIGITS : LOWER_DIGITS
  const small = financial ? UPPER_SMALL : LOWER_SMALL

  let out =
    parsed.int === "0"
      ? digits.charAt(0)
      : readInteger(parsed.int, digits, small)
  if (!financial && out.startsWith(`${digits.charAt(1)}${small[1]}`))
    out = out.slice(1)
  if (parsed.frac)
    out += `点${[...parsed.frac].map((digit) => digits.charAt(Number(digit))).join("")}`
  // 全零（含 -0）不带符号
  const isZero = /^0*$/.test(parsed.int + parsed.frac)
  return parsed.negative && !isZero ? `负${out}` : out
}

export { toChineseNumerals, toRmbUppercase }
export type { ChineseNumeralsOptions, RmbUppercaseOptions }
