import {
  BookOpenIcon,
  CalendarDaysIcon,
  CreditCardIcon,
  DatabaseIcon,
  FilePlusIcon,
  FlaskConicalIcon,
  GlobeIcon,
  LayoutDashboardIcon,
  LightbulbIcon,
  ListTodoIcon,
  PuzzleIcon,
  RocketIcon,
  SettingsIcon,
  ShieldCheckIcon,
  UserPlusIcon,
  UsersIcon,
} from "lucide-react"

import type {
  Sidebar02Account,
  Sidebar02NavGroup,
  Sidebar02NavItem,
  Sidebar02QuickAction,
  Sidebar02Team,
} from "./types"

/** 示例数据：虚构的团队协作后台，换成你自己的数据即可。 */
const DEFAULT_TEAMS: Sidebar02Team[] = [
  { id: "xinghe", name: "星河数据", plan: "专业版" },
  { id: "qinghe", name: "青禾设计组", plan: "团队版" },
  { id: "yunqi", name: "云栖实验室", plan: "免费版" },
]

const DEFAULT_ACCOUNTS: Sidebar02Account[] = [
  {
    id: "work",
    name: "林清禾",
    username: "qinghe",
    email: "qinghe@xinghe.example",
  },
  {
    id: "zhou",
    name: "周明远",
    username: "mingyuan",
    email: "mingyuan@xinghe.example",
  },
]

const DEFAULT_NAV_GROUPS: Sidebar02NavGroup[] = [
  {
    id: "main",
    items: [
      { id: "overview", label: "概览", href: "/overview", icon: LayoutDashboardIcon },
      { id: "databases", label: "数据库", href: "/databases", icon: DatabaseIcon, badge: 8 },
      { id: "tasks", label: "我的任务", href: "/tasks", icon: ListTodoIcon, badge: 12 },
      { id: "insights", label: "洞察", href: "/insights", icon: LightbulbIcon, badge: 3 },
    ],
  },
  {
    id: "projects",
    label: "项目",
    actionable: true,
    items: [
      { id: "redesign", label: "官网改版", href: "/projects/redesign", icon: RocketIcon },
      { id: "growth", label: "增长实验", href: "/projects/growth", icon: FlaskConicalIcon, badge: 2 },
      { id: "calendar", label: "内容日历", href: "/projects/calendar", icon: CalendarDaysIcon },
    ],
  },
  {
    id: "team",
    label: "团队",
    actionable: true,
    items: [
      { id: "members", label: "成员", href: "/team/members", icon: UsersIcon },
      { id: "roles", label: "权限", href: "/team/roles", icon: ShieldCheckIcon },
      { id: "integrations", label: "集成", href: "/team/integrations", icon: PuzzleIcon },
      { id: "billing", label: "账单", href: "/team/billing", icon: CreditCardIcon },
    ],
  },
]

const DEFAULT_FOOTER_ITEMS: Sidebar02NavItem[] = [
  { id: "settings", label: "设置", href: "/settings", icon: SettingsIcon },
  { id: "api-docs", label: "API 文档", href: "/api-docs", icon: BookOpenIcon },
  {
    id: "open-web",
    label: "在浏览器中打开",
    href: "https://example.com/app",
    icon: GlobeIcon,
    external: true,
  },
]

const DEFAULT_QUICK_ACTIONS: Sidebar02QuickAction[] = [
  { id: "new-task", label: "新建任务", icon: FilePlusIcon },
  { id: "invite-member", label: "邀请成员", icon: UserPlusIcon },
]

export {
  DEFAULT_ACCOUNTS,
  DEFAULT_FOOTER_ITEMS,
  DEFAULT_NAV_GROUPS,
  DEFAULT_QUICK_ACTIONS,
  DEFAULT_TEAMS,
}
