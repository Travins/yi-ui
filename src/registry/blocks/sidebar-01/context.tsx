"use client"

import * as React from "react"

import type { Sidebar01Labels } from "./config"
import type { Sidebar01Navigation } from "./types"

type Sidebar01ContextValue = {
  labels: Sidebar01Labels
  linkComponent: React.ElementType
  navigation?: Sidebar01Navigation
  /** 与当前地址匹配的 href（已规范化） */
  activeHref?: string
  /** 展开着的父项 id */
  expandedIds: string[]
  /** 搜索中：命中的父项一律展开，忽略 expandedIds */
  searching: boolean
  setExpanded: (id: string, open: boolean) => void
}

const Sidebar01Context = React.createContext<Sidebar01ContextValue | null>(null)

function useSidebar01() {
  const context = React.useContext(Sidebar01Context)
  if (!context) {
    throw new Error("Sidebar01 的子组件必须放在 Sidebar01 内部。")
  }
  return context
}

export { Sidebar01Context, useSidebar01 }
export type { Sidebar01ContextValue }
