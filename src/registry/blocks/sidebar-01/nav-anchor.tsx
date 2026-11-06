"use client"

import * as React from "react"

import { useSidebar } from "@/components/ui/sidebar"
import { useSidebar01 } from "./context"

/**
 * 导航链接：默认渲染 `<a>`，可通过 Sidebar01 的 `linkComponent` 换成 Next 的 Link。
 * 保留 Cmd/Ctrl 点击等原生行为，只处理普通左键点击；手机上点击后自动关闭抽屉。
 * 通过 `render={<NavAnchor href="…" />}` 交给侧栏按钮或浮层条目使用。
 */
function NavAnchor({
  href,
  onClick,
  ...props
}: React.ComponentProps<"a"> & { href: string }) {
  const { linkComponent: LinkComponent, navigation } = useSidebar01()
  const { isMobile, setOpenMobile } = useSidebar()

  function handleClick(event: React.MouseEvent<HTMLAnchorElement>) {
    onClick?.(event)
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return
    }
    if (navigation?.intercept) event.preventDefault()
    navigation?.onNavigate?.({ href })
    if (isMobile) setOpenMobile(false)
  }

  return (
    <LinkComponent
      data-slot="sidebar-01-link"
      href={href}
      onClick={handleClick}
      // 拦截跳转时地址只是标识（预览里这些路由并不存在），换成 Link 时不要预取
      {...(navigation?.intercept && LinkComponent !== "a"
        ? { prefetch: false }
        : null)}
      {...props}
    />
  )
}

export { NavAnchor }
