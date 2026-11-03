/**
 * 金额输入的纯函数：把「用户敲出来的任意文本」整理成千分位文本，并算出整理后光标该在哪。
 * 全程按十进制字符串处理，不转 number，所以万亿级金额和 `0.1 + 0.2` 都不会丢精度。
 */

/** 整数部分最多 16 位，与 chinese-number 的大写范围一致。 */
const MAX_INTEGER_DIGITS = 16

type SanitizeOptions = {
  /** 小数位上限；0 表示只能输入整数 */
  decimals: number
  /** 是否允许开头的负号 */
  allowNegative: boolean
}

type Sanitized = {
  /** 带千分位的显示文本 */
  text: string
  /** 整理后光标所在的位置 */
  caret: number
}

/** 全角数字、全角小数点、各种减号统一成 ASCII；其余字符（逗号、空格、¥、字母）返回空串丢掉。 */
function normalizeChar(ch: string) {
  const code = ch.charCodeAt(0)
  if (code >= 0xff10 && code <= 0xff19)
    return String.fromCharCode(code - 0xfee0)
  if (/[0-9.]/.test(ch)) return ch
  if ("．。｡".includes(ch)) return "."
  if ("-－−﹣‐–".includes(ch)) return "-"
  return ""
}

function groupInteger(int: string) {
  return int.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
}

/**
 * 整理输入文本，同时换算光标。
 *
 * 光标算法：数出光标左边有几个「有效字符」（数字、小数点、负号，逗号不算），整理完后
 * 在新文本里找到第 n 个有效字符，把光标放在它后面。千分位逗号的增减不影响有效字符个数，
 * 所以在中间插入、删除、粘贴之后光标都留在用户眼里「同一个位置」。
 * 被丢掉的字符（非法字符、超出的小数位）不计数；开头多余的零被后来的数字顶替时，
 * 被顶替的零也一并不计，这样 `0|` 再敲 `5` 得到 `5|`。
 */
function sanitizeAmount(
  raw: string,
  caret: number,
  { decimals, allowNegative }: SanitizeOptions,
): Sanitized {
  const kept: { ch: string; before: boolean }[] = []
  let negative = false
  let hasDot = false
  let int = ""
  let frac = ""

  for (let i = 0; i < raw.length; i++) {
    const ch = normalizeChar(raw.charAt(i))
    const before = i < caret
    if (ch === "-") {
      if (allowNegative && kept.length === 0) {
        negative = true
        kept.push({ ch, before })
      }
    } else if (ch === ".") {
      if (decimals > 0 && !hasDot) {
        hasDot = true
        // 直接敲 ".5" 补成 "0.5"，补出来的 0 算在小数点所在的一侧
        if (int === "") {
          int = "0"
          kept.push({ ch: "0", before })
        }
        kept.push({ ch, before })
      }
    } else if (ch) {
      if (hasDot) {
        if (frac.length < decimals) {
          frac += ch
          kept.push({ ch, before })
        }
      } else if (int === "0") {
        // 前导零只留一个：0 后面再敲数字就顶替它
        if (ch !== "0") {
          kept.pop()
          int = ch
          kept.push({ ch, before })
        }
      } else if (int.length < MAX_INTEGER_DIGITS) {
        int += ch
        kept.push({ ch, before })
      }
    }
  }

  const text = `${negative ? "-" : ""}${groupInteger(int)}${hasDot ? `.${frac}` : ""}`
  const count = kept.filter((token) => token.before).length
  let position = 0
  if (count > 0) {
    position = text.length
    let seen = 0
    for (let i = 0; i < text.length; i++) {
      if (text[i] !== "," && ++seen === count) {
        position = i + 1
        break
      }
    }
  }
  return { text, caret: position }
}

/** 显示文本 → 原始数值字符串：去千分位、去末尾小数点；空和单独的负号都是 `""`，`-0` 归一成 `0`。 */
function textToValue(text: string) {
  let value = text.replace(/,/g, "")
  if (value === "" || value === "-") return ""
  if (value.endsWith(".")) value = value.slice(0, -1)
  if (/^-0*(\.0*)?$/.test(value)) value = value.slice(1)
  return value
}

/** 失焦时收尾：补齐小数位（或去掉悬空的小数点）；只剩一个负号就清空。 */
function finalizeText(text: string, decimals: number, pad: boolean) {
  if (text === "" || text === "-") return ""
  if (decimals > 0 && pad) {
    const [int, frac = ""] = text.split(".")
    return `${int}.${frac.padEnd(decimals, "0")}`
  }
  return text.endsWith(".") ? text.slice(0, -1) : text
}

/** 把外部传入的数值字符串整理成显示文本（`pad` 为真时补齐小数位）。 */
function formatAmount(value: string, options: SanitizeOptions, pad: boolean) {
  const { text } = sanitizeAmount(value, 0, options)
  return finalizeText(text, options.decimals, pad)
}

/** 两个十进制字符串按数值比较：`1234.50` 与 `1234.5` 相等，不经过浮点。 */
function compareAmount(a: string, b: string) {
  const x = splitAmount(a)
  const y = splitAmount(b)
  if (x.negative !== y.negative) return x.negative ? -1 : 1
  const length = Math.max(x.frac.length, y.frac.length)
  const left =
    x.int.padStart(Math.max(x.int.length, y.int.length), "0") +
    x.frac.padEnd(length, "0")
  const right =
    y.int.padStart(Math.max(x.int.length, y.int.length), "0") +
    y.frac.padEnd(length, "0")
  const order = left === right ? 0 : left < right ? -1 : 1
  return x.negative ? -order : order
}

/** 拆成符号、整数、小数（去掉末尾的零）；零不带符号。 */
function splitAmount(value: string) {
  const [int = "", frac = ""] = value.replace("-", "").split(".")
  const parts = { int: int.replace(/^0+/, ""), frac: frac.replace(/0+$/, "") }
  return {
    ...parts,
    negative: value.startsWith("-") && (parts.int !== "" || parts.frac !== ""),
  }
}

function sameAmount(a: string, b: string) {
  if (a === "" || b === "") return a === b
  return compareAmount(a, b) === 0
}

/** `min` / `max` 允许传 number 或字符串，统一成不带科学计数法的十进制字符串。 */
function toDecimalString(value: number | string) {
  if (typeof value === "string") return value.replace(/,/g, "").trim()
  return value.toLocaleString("en-US", {
    useGrouping: false,
    maximumFractionDigits: 20,
  })
}

export {
  MAX_INTEGER_DIGITS,
  compareAmount,
  finalizeText,
  formatAmount,
  groupInteger,
  sameAmount,
  sanitizeAmount,
  textToValue,
  toDecimalString,
}
export type { SanitizeOptions, Sanitized }
