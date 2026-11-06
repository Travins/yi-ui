import * as React from "react"

const MOBILE_BREAKPOINT = 768
const QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`

function subscribe(onChange: () => void) {
  const mql = window.matchMedia(QUERY)
  mql.addEventListener("change", onChange)
  return () => mql.removeEventListener("change", onChange)
}

const getSnapshot = () => window.matchMedia(QUERY).matches
// 预渲染与水合阶段一律按桌面处理，挂载后再切到真实值，避免水合不匹配
const getServerSnapshot = () => false

/** 视口是否窄于 768px。与 shadcn 官方 use-mobile 同签名，改用 useSyncExternalStore 订阅媒体查询。 */
export function useIsMobile() {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
