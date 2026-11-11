import type { Auth08MailProvider } from "./types"

const DEFAULT_LABELS = {
  /** 邮箱状态的标题，切换状态时焦点落在这里 */
  title: "邮箱登录",
  description: "我们会给你发一封带登录链接的邮件，不用记密码",
  email: "邮箱",
  emailPlaceholder: "name@example.com",
  emailRequired: "请输入邮箱",
  emailError: "邮箱格式不正确，请检查后重试",
  /** 后缀小按钮这一组的读屏名称 */
  suggestions: "常用邮箱后缀",
  send: "发送登录链接",
  sending: "发送中…",
  /** 同一个邮箱在倒计时内再次提交时，直接回到已发送状态 */
  viewSent: "回到已发送的邮件",
  sentTitle: "去邮箱查收",
  /** {email} 会替换成等宽字体显示的邮箱 */
  sentTo: "登录链接已发送至 {email}",
  changeEmail: "换一个邮箱",
  /** {name} 为邮箱服务名，如「QQ 邮箱」 */
  openMail: "打开 {name}",
  newTab: "（在新标签页打开）",
  /** 有「打开邮箱」按钮时的分隔文字 */
  codeDivider: "或输入邮件里的验证码",
  /** 没有「打开邮箱」按钮时的分隔文字 */
  codeDividerSolo: "也可以输入邮件里的验证码",
  code: "验证码，共 {length} 位",
  verifying: "验证中…",
  resend: "重新发送",
  countdown: "{seconds} 秒后可重新发送",
  resent: "已重新发送，请查收最新的一封",
  hint: "没收到？看看垃圾邮件箱，或确认邮箱地址是否写对",
  failed: "请求失败，请稍后重试",
  success: "登录成功",
  successDescription: "身份验证已完成。",
  alternative: "账号密码登录",
}
type Auth08Labels = typeof DEFAULT_LABELS

/** 输入到「名字@」时给出的常用后缀 */
const DEFAULT_DOMAIN_SUGGESTIONS = [
  "qq.com",
  "163.com",
  "gmail.com",
  "outlook.com",
]

/** 按邮箱域名找网页邮箱入口；不在表里的域名不显示「打开邮箱」按钮 */
const DEFAULT_MAIL_PROVIDERS: Auth08MailProvider[] = [
  {
    name: "QQ 邮箱",
    domains: ["qq.com", "foxmail.com"],
    url: "https://mail.qq.com",
  },
  { name: "163 邮箱", domains: ["163.com"], url: "https://mail.163.com" },
  { name: "126 邮箱", domains: ["126.com"], url: "https://mail.126.com" },
  {
    name: "新浪邮箱",
    domains: ["sina.com", "sina.cn"],
    url: "https://mail.sina.com.cn",
  },
  { name: "Gmail", domains: ["gmail.com"], url: "https://mail.google.com" },
  {
    name: "Outlook",
    domains: ["outlook.com", "hotmail.com", "live.com"],
    url: "https://outlook.live.com",
  },
  {
    name: "iCloud 邮件",
    domains: ["icloud.com", "me.com"],
    url: "https://www.icloud.com/mail",
  },
]

function formatLabel(
  template: string,
  values: Record<string, string | number>,
) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    String(values[key] ?? ""),
  )
}

/** 传入的表排在默认表之前，同一域名以传入的为准 */
function findMailProvider(email: string, custom: Auth08MailProvider[] = []) {
  const domain = email.slice(email.lastIndexOf("@") + 1).toLowerCase()
  if (!domain) return undefined
  return [...custom, ...DEFAULT_MAIL_PROVIDERS].find((provider) =>
    provider.domains.some((item) => item.toLowerCase() === domain),
  )
}

/** 「名字@」或「名字@q」时返回能补全的后缀；已经写完整域名时返回空数组 */
function matchDomainSuggestions(value: string, suggestions: string[]) {
  const at = value.indexOf("@")
  if (at <= 0 || value.indexOf("@", at + 1) !== -1) return []
  const typed = value.slice(at + 1).toLowerCase()
  if (/\s/.test(value)) return []
  return suggestions.filter(
    (domain) =>
      domain.toLowerCase().startsWith(typed) && domain.toLowerCase() !== typed,
  )
}

export {
  DEFAULT_DOMAIN_SUGGESTIONS,
  DEFAULT_LABELS,
  DEFAULT_MAIL_PROVIDERS,
  findMailProvider,
  formatLabel,
  matchDomainSuggestions,
}
export type { Auth08Labels }
