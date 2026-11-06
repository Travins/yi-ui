const DEFAULT_LABELS = {
  title: "验证你的身份",
  description: "为了保护账号安全，请再完成一步验证",
  accountSwitch: "不是你？切换账号",
  accountLabel: "当前账号",
  alternatives: "其他验证方式",
  rememberDevice: "记住此设备 30 天",
  help: "都无法使用？联系管理员",

  passkeyName: "通行密钥",
  passkeyHint: "使用指纹、面容或设备密码",
  passkeyTitle: "使用通行密钥验证",
  passkeyDescription: "通过指纹、面容或设备锁屏密码确认是你本人。",
  passkeyAction: "使用通行密钥验证",
  passkeyWaiting: "请在浏览器或系统弹窗中完成验证",
  passkeyWaitingButton: "等待验证…",
  passkeyCancelled: "已取消，可以重试",
  passkeyUnsupported: "当前浏览器不支持通行密钥",
  passkeySuggest: "改用{method}",

  totpName: "身份验证器 App",
  totpHint: "输入 App 里显示的验证码",
  totpTitle: "输入身份验证器验证码",
  totpDescription: "打开身份验证器 App，输入当前显示的 {length} 位验证码。",

  smsName: "短信验证码",
  smsHint: "发送到绑定的手机",
  smsTitle: "输入短信验证码",
  smsDescription: "我们会向 {phone} 发送一条验证码短信。",
  smsSend: "发送验证码",
  smsSending: "发送中…",
  smsResend: "重新发送",
  smsCountdown: "{seconds} 秒后可重新发送",
  smsSent: "验证码已发送至 {phone}",

  recoveryName: "恢复码",
  recoveryHint: "使用保存好的一次性恢复码",
  recoveryTitle: "输入恢复码",
  recoveryDescription: "输入创建账号时保存的恢复码。",
  recoveryLabel: "恢复码",
  recoveryPlaceholder: "{format}",
  recoveryNote: "每个恢复码只能用一次",
  recoveryError: "请输入完整的恢复码，格式为 {format}",
  recoveryEmpty: "请输入恢复码",
  recoveryTooLong:
    "备用码最多 {max} 个字符，当前 {length} 个，请检查是否多粘贴了内容",
  recoveryTrimmed: "已按格式保留前 {count} 位",

  code: "验证码，共 {length} 位",
  verify: "验证",
  verifying: "验证中…",
  failed: "请求失败，请稍后重试",
  success: "验证成功",
  successDescription: "身份验证已完成。",
  successAnnounce: "验证成功，身份验证已完成",
}

type Auth05Labels = typeof DEFAULT_LABELS

function formatLabel(
  template: string,
  values: Record<string, string | number>,
) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    String(values[key] ?? ""),
  )
}

export { DEFAULT_LABELS, formatLabel }
export type { Auth05Labels }
