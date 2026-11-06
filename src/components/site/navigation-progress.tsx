"use client"

import { useEffect, useRef } from "react"
import { usePathname } from "next/navigation"

/** 超过这个时长仍没完成的站内跳转才出现加载指示；预取命中时跳转几乎瞬间完成，不会出现 */
const SHOW_AFTER = 200
/** 兜底：链接被其他处理器拦下、页面始终没变时，过一段时间自动隐藏 */
const GIVE_UP_AFTER = 8000

/**
 * 站内跳转加载指示：页头标志右侧三道小斜杠依次点亮，呼应「易」标志的斜杠造型。
 * 不放在页头底边，避免和导航当前项的指示线叠在一起干扰菜单。
 * 静态导出没有服务端等待，只有慢网下预取未命中的跳转才会慢，所以只在点击站内链接 200ms 后仍未完成时显示，
 * 路径变化后隐藏。用捕获阶段监听点击，不干预 Link 自身的预取与跳转。
 */
function NavigationProgress() {
  const pathname = usePathname()
  const line = useRef<HTMLDivElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => {
    clearTimeout(timer.current)
    line.current?.setAttribute("data-pending", "false")
  }, [pathname])
  useEffect(() => {
    function click(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return
      const anchor = (event.target as Element).closest?.("a")
      if (!anchor || anchor.target || anchor.hasAttribute("download")) return
      const url = new URL(anchor.href)
      if (url.origin !== location.origin || url.pathname === location.pathname)
        return
      clearTimeout(timer.current)
      timer.current = setTimeout(() => {
        line.current?.setAttribute("data-pending", "true")
        timer.current = setTimeout(
          () => line.current?.setAttribute("data-pending", "false"),
          GIVE_UP_AFTER,
        )
      }, SHOW_AFTER)
    }
    document.addEventListener("click", click, true)
    // 给验收脚本留一个「点击监听已就绪」的信号：水合前点击会退回浏览器原生跳转，骨架就测不到。
    // 只在 effect 里设，不进服务端 HTML，避免 hydration 不匹配。
    document.documentElement.dataset.navReady = "true"
    return () => {
      document.removeEventListener("click", click, true)
      delete document.documentElement.dataset.navReady
      clearTimeout(timer.current)
    }
  }, [])
  return (
    <span
      ref={line}
      data-slot="navigation-progress"
      data-pending="false"
      aria-hidden="true"
      className="pointer-events-none flex items-center gap-[3px] self-center opacity-0 transition-opacity duration-150 data-[pending=true]:opacity-100 motion-reduce:transition-none"
    >
      {[0, 1, 2].map((index) => (
        <span
          key={index}
          data-slot="navigation-progress-bar"
          className="h-3 w-[3px] -skew-x-[30deg] rounded-[1px] bg-primary"
          style={{ animationDelay: `${index * 160}ms` }}
        />
      ))}
    </span>
  )
}
export { NavigationProgress }
