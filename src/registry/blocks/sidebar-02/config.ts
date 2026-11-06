/**
 * 侧栏所有用户可见的文案。
 * 含 {name}、{group}、{plan} 的文案在渲染时由 formatLabel 填入实际值。
 */
const DEFAULT_LABELS = {
  // 团队切换
  switchTeam: "切换团队，当前：{name}（{plan}）",
  teamMenuTitle: "团队",
  newTeam: "新建团队",
  // 搜索
  searchButton: "搜索…",
  searchTooltip: "搜索",
  searchTitle: "搜索",
  searchDescription: "搜索页面和快捷操作，回车跳转。",
  searchPlaceholder: "搜索页面或操作…",
  searchEmpty: "没有找到相关结果",
  searchPages: "页面",
  searchActions: "快捷操作",
  // 导航
  navLabel: "主导航",
  footerNavLabel: "辅助导航",
  groupMore: "{group}的更多操作",
  groupManage: "管理分组",
  groupHide: "隐藏分组",
  newWindow: "（在新窗口打开）",
  // 账号
  accountTrigger: "账号菜单：{name}",
  profile: "个人资料",
  accountSettings: "账号设置",
  devices: "设备管理",
  switchAccount: "切换账号",
  addAccount: "添加账号",
  signOut: "退出登录",
} as const

type Sidebar02Labels = Record<keyof typeof DEFAULT_LABELS, string>

/** 合并用户传入的文案与默认文案。 */
function resolveLabels(labels?: Partial<Sidebar02Labels>): Sidebar02Labels {
  return { ...DEFAULT_LABELS, ...labels }
}

/** 把文案里的 {key} 占位符替换成实际值。 */
function formatLabel(
  template: string,
  values: Record<string, string | number>,
): string {
  return Object.entries(values).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, String(value)),
    template,
  )
}

export { DEFAULT_LABELS, formatLabel, resolveLabels }
export type { Sidebar02Labels }
