"use client"

import * as React from "react"

import { Sidebar01Shell } from "./shell"

/**
 * 预览：这些路由并不存在，所以拦截跳转，用本地状态模拟「当前页」，点击侧栏就能看到高亮和展开的变化。
 */
export default function Sidebar01Demo() {
  const [href, setHref] = React.useState("/content/articles")
  return (
    <Sidebar01Shell
      currentHref={href}
      navigation={{ intercept: true, onNavigate: ({ href }) => setHref(href) }}
    />
  )
}
