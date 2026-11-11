const DEFAULT_LABELS = {
  title: "注册账号",
  description: "三步完成注册，实名认证可以稍后再补。",
  /** 纵向步骤条的读屏名称 */
  steps: "注册步骤",
  /** 步骤短名：步骤栏、手机顶部进度共用 */
  accountStep: "账号",
  profileStep: "资料",
  identityStep: "实名",
  /** 可跳过的步骤在步骤栏里的标注 */
  optional: "可跳过",
  /** 完成注册时实名被跳过 */
  skipped: "已跳过",
  /** 手机顶部进度，支持 {current}、{total}、{title} */
  progress: "步骤 {current} / {total} · {title}",
  progressDone: "注册完成",
  /** 每一步的标题，切换步骤时焦点落在这里 */
  accountTitle: "创建账号",
  accountDescription: "用邮箱登录，密码至少 8 位。",
  profileTitle: "完善资料",
  profileDescription: "方便同事找到你，也用于开通对应的团队版本。",
  identityTitle: "实名认证",
  identityDescription:
    "实名只在开具发票、提现和合规核验时用到，现在可以先跳过。",
  identityNote: "证件信息加密存储，只用于核验身份，不会对外展示。",
  email: "邮箱",
  emailPlaceholder: "name@example.com",
  password: "密码",
  passwordPlaceholder: "至少 8 位",
  showPassword: "显示密码",
  hidePassword: "隐藏密码",
  /** 强度文字，{level} 为下面四档之一 */
  passwordStrength: "强度：{level}",
  passwordStrengthEmpty: "未输入",
  strengthWeak: "弱",
  strengthFair: "一般",
  strengthGood: "较强",
  strengthStrong: "强",
  agreement: "我已阅读并同意",
  terms: "《用户协议》",
  and: "和",
  privacy: "《隐私政策》",
  name: "姓名",
  namePlaceholder: "你的称呼",
  phone: "手机号",
  region: "所在地区",
  regionPlaceholder: "请选择省 / 市",
  teamSize: "团队规模",
  realName: "真实姓名",
  realNamePlaceholder: "与证件一致",
  idNumber: "身份证号",
  back: "上一步",
  next: "下一步",
  checking: "检查中…",
  skip: "跳过",
  skipAndFinish: "跳过并完成注册",
  submitAndFinish: "提交并完成注册",
  finish: "完成注册",
  submitting: "提交中…",
  emailError: "请输入正确的邮箱地址",
  passwordError: "密码至少 8 位",
  agreementError: "请先阅读并同意用户协议和隐私政策",
  nameError: "请输入姓名",
  phoneError: "请输入正确的 11 位手机号",
  regionError: "请选择所在地区",
  realNameError: "请输入与证件一致的真实姓名",
  idNumberError: "请输入正确的 18 位身份证号",
  failed: "请求失败，请稍后重试",
  doneTitle: "注册完成",
  doneDescription: "账号已经可以使用，下面是这次注册的结果。",
  doneAccount: "账号已创建",
  doneProfile: "资料已填写",
  doneIdentity: "实名认证",
  identitySubmitted: "已提交",
  identityPending: "待完成",
  enter: "进入工作台",
  signIn: "已有账号？去登录",
}

type Auth06Labels = typeof DEFAULT_LABELS

/** 团队规模的默认选项，可用 `teamSizes` 覆盖。 */
const DEFAULT_TEAM_SIZES = [
  { value: "solo", label: "仅自己" },
  { value: "2-10", label: "2–10 人" },
  { value: "11-50", label: "11–50 人" },
  { value: "50+", label: "50 人以上" },
]

function formatLabel(
  template: string,
  values: Record<string, string | number>,
) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    String(values[key] ?? ""),
  )
}

export { DEFAULT_LABELS, DEFAULT_TEAM_SIZES, formatLabel }
export type { Auth06Labels }
