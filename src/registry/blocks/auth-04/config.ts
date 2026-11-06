const DEFAULT_LABELS = {
  title: "企业单点登录",
  description: "使用组织分配的账号登录，我们会先识别你所在的组织。",
  /** 各步骤的标题，切换步骤时焦点落在这里 */
  emailTitle: "输入工作邮箱",
  ssoTitle: "使用企业身份登录",
  passwordTitle: "输入密码",
  success: "登录成功",
  successDescription: "身份验证已完成。",
  email: "工作邮箱",
  emailPlaceholder: "name@company.com",
  emailError: "请输入正确的邮箱地址",
  continue: "继续",
  resolving: "识别中…",
  failed: "请求失败，请稍后重试",
  /** 组织标识入口 */
  orgToggle: "使用组织标识登录",
  orgSlug: "组织标识",
  orgHint: "由管理员提供，例如 acme",
  orgError: "组织标识只能包含小写字母、数字和连字符",
  orgNoSso: "该组织未启用单点登录，请使用工作邮箱继续",
  /** 企业步骤 */
  identified: "已识别为{org}的企业账号",
  signInWith: "通过{provider}继续",
  redirecting: "正在跳转到企业身份提供方…",
  retry: "重试",
  usePassword: "改用账号密码登录",
  notThisOrg: "不是这个组织？更换邮箱",
  /** 密码步骤 */
  signingInAs: "正在登录",
  change: "更换",
  password: "密码",
  showPassword: "显示密码",
  hidePassword: "隐藏密码",
  passwordRequired: "请输入密码",
  signIn: "登录",
  signingIn: "登录中…",
  /** 底部 */
  personal: "个人账号登录",
  support: "无法登录？联系管理员",
  /** 右侧组织面板 */
  panelLabel: "组织信息",
  panelTitle: "自动识别你的组织",
  panelDescription: "使用公司分配的邮箱，我们会自动识别你的组织。",
  methodsTitle: "支持的登录方式",
  methodSso: "企业单点登录（SAML / OIDC）",
  methodDirectory: "组织目录账号",
  methodPassword: "账号密码",
  orgName: "组织",
  orgDomain: "域名",
  orgProvider: "登录方式",
  security: "你将跳转到组织的身份提供方完成验证。",
  passwordPanelTitle: "账号密码登录",
  passwordPanelDescription: "使用账号和密码验证身份。",
}

type Auth04Labels = typeof DEFAULT_LABELS

function formatLabel(
  template: string,
  values: Record<string, string | number>,
) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    String(values[key] ?? ""),
  )
}

export { DEFAULT_LABELS, formatLabel }
export type { Auth04Labels }
