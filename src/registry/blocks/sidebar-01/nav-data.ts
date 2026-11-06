import {
  ChartColumnIcon,
  FileTextIcon,
  ImagesIcon,
  LayoutDashboardIcon,
  LifeBuoyIcon,
  MessageSquareIcon,
  PlugIcon,
  SettingsIcon,
  ShieldCheckIcon,
  TagsIcon,
  UsersIcon,
} from "lucide-react"

import type { Sidebar01Brand, Sidebar01Group, Sidebar01Item } from "./types"

/** 示例数据：一个内容运营后台。换成你自己的路由即可。 */
const DEFAULT_BRAND: Sidebar01Brand = { name: "内容工作台" }

const DEFAULT_GROUPS: Sidebar01Group[] = [
  {
    id: "content",
    label: "内容",
    items: [
      {
        id: "overview",
        label: "工作概览",
        icon: LayoutDashboardIcon,
        href: "/overview",
      },
      {
        id: "articles",
        label: "文章",
        icon: FileTextIcon,
        badge: 8,
        items: [
          { id: "all", label: "全部文章", href: "/content/articles" },
          { id: "drafts", label: "草稿箱", href: "/content/drafts", badge: 5 },
          { id: "review", label: "待审核", href: "/content/review", badge: 3 },
          { id: "archive", label: "已归档", href: "/content/archive" },
        ],
      },
      {
        id: "media",
        label: "媒体库",
        icon: ImagesIcon,
        items: [
          { id: "images", label: "图片", href: "/media/images" },
          { id: "videos", label: "视频", href: "/media/videos" },
          { id: "files", label: "文件", href: "/media/files" },
        ],
      },
      {
        id: "comments",
        label: "评论",
        icon: MessageSquareIcon,
        href: "/comments",
        badge: 12,
      },
    ],
  },
  {
    id: "operations",
    label: "运营",
    items: [
      {
        id: "taxonomy",
        label: "栏目与标签",
        icon: TagsIcon,
        items: [
          { id: "categories", label: "栏目", href: "/taxonomy/categories" },
          { id: "tags", label: "标签", href: "/taxonomy/tags" },
        ],
      },
      {
        id: "subscribers",
        label: "订阅用户",
        icon: UsersIcon,
        items: [
          { id: "list", label: "用户列表", href: "/subscribers/list" },
          { id: "segments", label: "用户分组", href: "/subscribers/segments" },
          { id: "exports", label: "导出记录", href: "/subscribers/exports" },
        ],
      },
      {
        id: "analytics",
        label: "数据分析",
        icon: ChartColumnIcon,
        items: [
          { id: "traffic", label: "访问流量", href: "/analytics/traffic" },
          { id: "sources", label: "来源渠道", href: "/analytics/sources" },
          { id: "retention", label: "阅读留存", href: "/analytics/retention" },
        ],
      },
    ],
  },
  {
    id: "system",
    label: "系统",
    items: [
      {
        id: "members",
        label: "成员与权限",
        icon: ShieldCheckIcon,
        items: [
          { id: "people", label: "团队成员", href: "/members/people" },
          { id: "roles", label: "角色权限", href: "/members/roles" },
        ],
      },
      {
        id: "integrations",
        label: "集成",
        icon: PlugIcon,
        href: "/integrations",
      },
    ],
  },
]

/** 固定在底部的次要入口，只放链接。 */
const DEFAULT_FOOTER_ITEMS: Sidebar01Item[] = [
  { id: "help", label: "帮助中心", icon: LifeBuoyIcon, href: "/help" },
  { id: "settings", label: "设置", icon: SettingsIcon, href: "/settings" },
]

export { DEFAULT_BRAND, DEFAULT_FOOTER_ITEMS, DEFAULT_GROUPS }
