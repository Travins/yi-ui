import type * as React from "react"
import type { LucideIcon } from "lucide-react"

type Sidebar03TreeNode = {
  id: string
  label: string
  href?: string
  icon?: LucideIcon
  status?: "active" | "paused" | "archived"
  badge?: string | number
  children?: Sidebar03TreeNode[]
}
type Sidebar03Module = {
  id: string
  label: string
  icon: LucideIcon
  tree: Sidebar03TreeNode[]
  actions?: { id: string; label: string; onSelect: () => void }[]
}
type Sidebar03Usage = {
  label: string
  used: number
  total: number
  unit: string
  href?: string
}
type Sidebar03Navigation = {
  intercept?: boolean
  onNavigate?: (payload: { href: string; nodeId?: string }) => void
}
type Sidebar03Link = React.ElementType
export type {
  Sidebar03TreeNode,
  Sidebar03Module,
  Sidebar03Usage,
  Sidebar03Navigation,
  Sidebar03Link,
}
