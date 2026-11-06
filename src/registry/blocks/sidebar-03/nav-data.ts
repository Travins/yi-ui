import {
  InboxIcon,
  UsersIcon,
  MessageSquareIcon,
  FolderIcon,
  WorkflowIcon,
  LayoutListIcon,
} from "lucide-react"
import type { Sidebar03Module, Sidebar03Usage } from "./types"
const DEFAULT_MODULES: Sidebar03Module[] = [
  {
    id: "customers",
    label: "客户",
    icon: UsersIcon,
    tree: [
      {
        id: "workspace",
        label: "客户工作区",
        status: "active",
        children: [
          {
            id: "views",
            label: "客户视图",
            icon: FolderIcon,
            children: [
              {
                id: "all",
                label: "全部客户",
                href: "/customers/all",
                icon: LayoutListIcon,
                badge: 128,
              },
              {
                id: "follow",
                label: "待跟进",
                href: "/customers/follow",
                badge: 12,
              },
              {
                id: "deals",
                label: "合作洽谈",
                href: "/customers/deals",
                badge: 8,
              },
            ],
          },
          {
            id: "contacts",
            label: "联系人",
            href: "/customers/contacts",
            badge: 64,
          },
        ],
      },
      {
        id: "growth",
        label: "增长项目",
        status: "paused",
        children: [
          { id: "research", label: "客户调研", href: "/growth/research" },
        ],
      },
      {
        id: "archive",
        label: "往期合作",
        status: "archived",
        children: [{ id: "past", label: "历史记录", href: "/archive/past" }],
      },
    ],
  },
  ...[
    {
      id: "inbox",
      label: "收件箱",
      icon: InboxIcon,
      names: ["待处理", "已完成"],
    },
    {
      id: "messages",
      label: "消息",
      icon: MessageSquareIcon,
      names: ["团队讨论", "项目通知"],
    },
    {
      id: "files",
      label: "文件",
      icon: FolderIcon,
      names: ["设计文档", "项目资料"],
    },
    {
      id: "automation",
      label: "自动化",
      icon: WorkflowIcon,
      names: ["客户分配", "每周汇总"],
    },
  ].map(({ id, label, icon, names }): Sidebar03Module => ({
    id,
    label,
    icon,
    tree: [
      {
        id: `${id}-project`,
        label: `${label}工作区`,
        status: "active",
        children: names.map((name, i) => ({
          id: `${id}-${i}`,
          label: name,
          href: `/${id}/${i}`,
          badge: i + 2,
        })),
      },
    ],
  })),
]
const DEFAULT_USAGE: Sidebar03Usage = {
  label: "存储空间",
  used: 9.2,
  total: 10,
  unit: "GB",
  href: "/upgrade",
}
export { DEFAULT_MODULES, DEFAULT_USAGE }
