"use client"

import * as React from "react"

import { Sidebar01Shell } from "@/registry/blocks/sidebar-01/shell"

/**
 * 页面入口。nav-data.ts 里的地址只是示例（这些路由并不存在），
 * 所以这里拦截跳转，用本地状态模拟「当前页」，点侧栏就能看到高亮、展开和面包屑的变化。
 *
 * 接入真实路由时：把 navigation 换成 Next 的 Link 和 usePathname，并把 nav-data.ts 改成你自己的地址：
 *
 *   import Link from "next/link"
 *   import { usePathname } from "next/navigation"
 *   <Sidebar01Shell currentHref={usePathname()} linkComponent={Link} />
 */
export default function Sidebar01Page() {
  const [href, setHref] = React.useState("/content/articles")
  return (
    <Sidebar01Shell
      currentHref={href}
      navigation={{ intercept: true, onNavigate: ({ href }) => setHref(href) }}
    />
  )
}
