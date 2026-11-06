import type { LucideIcon } from "lucide-react"

/** 团队：切换器里的一行。没有 icon 时用团队名的第一个字做标识。 */
type Sidebar02Team = {
  id: string
  name: string
  /** 套餐名，显示在团队名下方的小字 */
  plan: string
  icon?: LucideIcon
}

/** 账号：用户卡与「切换账号」列表里的一行。 */
type Sidebar02Account = {
  id: string
  name: string
  username: string
  email: string
  avatar?: string
}

/** 导航项。external 为 true 时在新窗口打开，且不会成为「当前项」。 */
type Sidebar02NavItem = {
  id: string
  label: string
  href: string
  icon: LucideIcon
  /** 右侧计数 */
  badge?: string | number
  external?: boolean
}

/** 导航分组。没有 label 的分组不显示标题。 */
type Sidebar02NavGroup = {
  id: string
  label?: string
  items: Sidebar02NavItem[]
  /** 在标题右侧显示「更多」菜单（需要同时有 label） */
  actionable?: boolean
}

/** 搜索弹窗里的快捷操作。 */
type Sidebar02QuickAction = {
  id: string
  label: string
  icon: LucideIcon
}

type Sidebar02GroupAction = "manage" | "hide"
type Sidebar02AccountAction = "profile" | "settings" | "devices"
type Sidebar02NavigateSource = "menu" | "search"

export type {
  Sidebar02Account,
  Sidebar02AccountAction,
  Sidebar02GroupAction,
  Sidebar02NavGroup,
  Sidebar02NavItem,
  Sidebar02NavigateSource,
  Sidebar02QuickAction,
  Sidebar02Team,
}
