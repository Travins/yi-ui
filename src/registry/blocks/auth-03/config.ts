const DEFAULT_LABELS = {
  title: "手机号验证码登录",
  description: "无需记住密码，通过短信安全登录。",
  steps: "登录步骤",
  /** 步骤条上的短名，前面会自动加 01 / 02 编号 */
  phoneStep: "手机号",
  codeStep: "验证码",
  /** 当前步骤的标题，切换步骤时焦点落在这里 */
  phoneTitle: "输入手机号",
  codeTitle: "输入短信验证码",
  phone: "手机号（+86）",
  send: "获取验证码",
  sending: "发送中…",
  agreement: "我已阅读并同意",
  terms: "《用户协议》",
  and: "和",
  privacy: "《隐私政策》",
  agreementError: "请先阅读并同意用户协议和隐私政策",
  phoneError: "请输入正确的 11 位手机号",
  sent: "验证码已发送至 +86 {phone}",
  edit: "修改号码",
  code: "验证码，共 {length} 位",
  verify: "验证并登录",
  verifying: "验证中…",
  resend: "重新发送验证码",
  countdown: "{seconds} 秒后可重新发送",
  failed: "请求失败，请稍后重试",
  success: "登录成功",
  successDescription: "身份验证已完成。",
  alternative: "账号密码登录",
  limit: "若已达到当天发送次数上限，请改用其他登录方式。",
}
type Auth03Labels = typeof DEFAULT_LABELS
function formatLabel(
  template: string,
  values: Record<string, string | number>,
) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    String(values[key] ?? ""),
  )
}
export { DEFAULT_LABELS, formatLabel }
export type { Auth03Labels }
