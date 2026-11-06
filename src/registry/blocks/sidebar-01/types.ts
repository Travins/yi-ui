import type * as React from "react"
import type { LucideIcon } from "lucide-react"

/** 二级条目：只能是链接。 */
type Sidebar01SubItem = {
  id: string
  label: string
  href: string
  /** 右侧计数，例如待处理数量 */
  badge?: string | number
}

/** 一级条目：有 `items` 时是可展开的父项（本身不跳转），否则是直接跳转的链接。 */
type Sidebar01Item = {
  id: string
  label: string
  icon: LucideIcon
  href?: string
  badge?: string | number
  items?: Sidebar01SubItem[]
}

/** 带小标题的一组条目。 */
type Sidebar01Group = {
  id: string
  label: string
  items: Sidebar01Item[]
}

type Sidebar01Brand = {
  name: string
  /** 方形 logo；不传时用默认图标 */
  logo?: React.ReactNode
  /** 传入后品牌区变成链接 */
  href?: string
}

/** 导航链接的统一行为，与 app-shell-01 的 NavLinkBehavior 一致。 */
type Sidebar01Navigation = {
  /** 点击任一导航链接后触发（手机上抽屉随后自动关闭） */
  onNavigate?: (payload: { href: string }) => void
  /** 为 true 时拦截浏览器默认跳转，由 onNavigate 自行处理（单页演示、预览用） */
  intercept?: boolean
}

export type {
  Sidebar01Brand,
  Sidebar01Group,
  Sidebar01Item,
  Sidebar01Navigation,
  Sidebar01SubItem,
}
