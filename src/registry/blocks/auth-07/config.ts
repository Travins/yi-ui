const DEFAULT_LABELS = {
  /** 根节点的读屏名称 */
  region: "锁屏",
  /** 时钟区的读屏名称 */
  clock: "当前时间",
  /** reason="locked" 时的原因说明 */
  locked: "屏幕已锁定",
  /** reason="expired" 时的原因说明 */
  expired: "登录已过期，请重新验证身份",
  /** 验证表单的读屏名称 */
  form: "验证身份",
  password: "密码",
  /** PIN 输入的读屏名称；{length} 为位数 */
  pin: "PIN 码，共 {length} 位",
  showPassword: "显示密码",
  hidePassword: "隐藏密码",
  capsLock: "大写锁定已开启",
  unlock: "解锁",
  unlocking: "验证中…",
  usePin: "改用 PIN",
  usePassword: "改用密码",
  switchAccount: "切换账号",
  signOut: "退出登录",
  /** 回调抛出的错误没有 message 时使用 */
  wrongPassword: "密码错误",
  wrongPin: "PIN 错误",
  /** 验证失败后的提示；{message} 为回调抛出的原因，{count} 为剩余次数 */
  attempts: "{message}，还可以尝试 {count} 次",
  /** 锁定期间的倒计时；{seconds} 为剩余秒数 */
  lockedOut: "尝试次数过多，请 {seconds} 秒后再试",
  unlocked: "已解锁",
  /** 解锁后的说明；{name} 为用户名 */
  unlockedDescription: "欢迎回来，{name}",
}
type Auth07Labels = typeof DEFAULT_LABELS
function formatLabel(
  template: string,
  values: Record<string, string | number>,
) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    String(values[key] ?? ""),
  )
}
export { DEFAULT_LABELS, formatLabel }
export type { Auth07Labels }
