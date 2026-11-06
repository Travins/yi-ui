/**
 * 登录页所有用户可见的文案，包含表单校验提示（validation* 键）。
 * 校验提示里的 {min}、{length} 由 schemas.ts 的规则常量填入；只改规则（密码策略、手机号格式）
 * 不用动文案，想换提示语则覆盖对应的 validation* 键。
 * 品牌名、标题、特性列表属于品牌数据，见 brand.ts。
 */
const DEFAULT_LABELS = {
  title: "扫码登录，继续你的工作",
  mobileHint: "手机上通常无法扫描自己屏幕上的码，建议使用短信登录。",
  providerLabel: "扫码方式",
  pending: "请用手机扫描登录二维码",
  scanned: "已扫码，请在手机上确认",
  expired: "二维码已过期",
  confirmed: "登录成功",
  error: "二维码生成失败",
  refresh: "刷新",
  retry: "重试",
  rescan: "重新扫码",
  loading: "正在生成二维码…",
  qrLabel: "登录二维码，请用手机扫描",
  stepOpen: "打开 App",
  stepScan: "扫一扫",
  stepConfirm: "在手机上确认",
  sms: "短信验证码登录",
  password: "账号密码登录",
  back: "返回扫码",
  remaining: "剩余 {seconds} 秒",
  // 品牌面板
  brandPanelLabel: "{name} 品牌介绍",
  // 登录
  signInTitle: "欢迎回来",
  signInDescription: "输入账号信息即可登录",
  signInMethodLabel: "登录方式",
  signInPasswordTab: "密码登录",
  signInCodeTab: "验证码登录",
  accountLabel: "用户名或邮箱",
  accountPlaceholder: "请输入用户名或邮箱",
  passwordLabel: "密码",
  passwordPlaceholder: "请输入密码",
  forgotPassword: "忘记密码？",
  remember: "记住登录状态",
  signInSubmit: "登录",
  signInPending: "登录中…",
  phoneLabel: "手机号",
  phonePlaceholder: "请输入 11 位手机号",
  codeLabel: "验证码",
  codePlaceholder: "6 位数字验证码",
  sendCode: "获取验证码",
  sendCodePending: "发送中…",
  resendCode: "{seconds}s 后重发",
  socialDivider: "或",
  noAccount: "还没有账号？",
  signUpLink: "注册",
  // 注册
  signUpTitle: "创建账号",
  signUpDescription: "填写以下信息即可完成注册",
  nameLabel: "姓名",
  namePlaceholder: "请输入姓名",
  emailLabel: "邮箱",
  emailPlaceholder: "name@example.com",
  newPasswordPlaceholder: "至少 8 位，包含字母和数字",
  confirmPasswordLabel: "确认密码",
  confirmPasswordPlaceholder: "再次输入密码",
  termsPrefix: "我已阅读并同意",
  termsOfService: "服务条款",
  termsConjunction: "和",
  privacyPolicy: "隐私政策",
  signUpSubmit: "注册",
  signUpPending: "注册中…",
  haveAccount: "已有账号？",
  signInLink: "登录",
  // 找回密码
  forgotPasswordTitle: "找回密码",
  forgotPasswordDescription: "输入注册时使用的邮箱，我们会发送重置链接",
  sendResetLink: "发送重置链接",
  sendResetLinkPending: "发送中…",
  backToSignIn: "返回登录",
  emailSentTitle: "邮件已发送",
  emailSentDescription:
    "我们已向 {email} 发送了重置密码的链接，请查收邮件。没收到？请检查垃圾邮件箱。",
  // 输入框与密码强度
  showPassword: "显示密码",
  hidePassword: "隐藏密码",
  passwordStrength: "强度：{level}",
  passwordStrengthEmpty: "强度：—",
  strengthWeak: "弱",
  strengthFair: "一般",
  strengthGood: "较强",
  strengthStrong: "强",
  // 校验提示（schemas.ts 使用，{min}、{length} 由规则常量填入）
  validationAccountRequired: "请输入用户名或邮箱",
  validationPasswordRequired: "请输入密码",
  validationEmailRequired: "请输入邮箱",
  validationEmailInvalid: "请输入有效的邮箱地址",
  validationPhoneInvalid: "请输入有效的 {length} 位手机号",
  validationCodeInvalid: "请输入 {length} 位数字验证码",
  validationPasswordMin: "密码至少 {min} 位",
  validationPasswordLetter: "密码需要包含字母",
  validationPasswordDigit: "密码需要包含数字",
  validationNameMin: "姓名至少 {min} 个字符",
  validationConfirmRequired: "请再次输入密码",
  validationTermsRequired: "请先阅读并同意服务条款",
  validationPasswordMismatch: "两次输入的密码不一致",
  // 通用
  requestFailed: "操作失败，请稍后重试",
} as const

type Auth02Labels = { [Key in keyof typeof DEFAULT_LABELS]: string }

/** 合并用户传入的文案与默认文案。 */
function resolveLabels(labels?: Partial<Auth02Labels>): Auth02Labels {
  return { ...DEFAULT_LABELS, ...labels }
}

/** 把文案里的 {key} 占位符替换成实际值，例如「强度：{level}」。 */
function formatLabel(
  template: string,
  values: Record<string, string | number>,
): string {
  return Object.entries(values).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, String(value)),
    template,
  )
}

/** 以 {key} 为界把文案拆成前后两段，便于把值渲染成强调元素。 */
function splitLabel(template: string, key: string): [string, string] {
  const [before = template, after = ""] = template.split(`{${key}}`)
  return [before, after]
}

export { DEFAULT_LABELS, formatLabel, resolveLabels, splitLabel }
export type { Auth02Labels }
