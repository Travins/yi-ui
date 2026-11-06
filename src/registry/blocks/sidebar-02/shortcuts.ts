"use client"

import * as React from "react"

const noopSubscribe = () => () => {}
const getIsApple = () => /Mac|iPhone|iPad/i.test(navigator.platform)
// 预渲染与水合阶段按 ⌘ 处理，挂载后再换成真实平台，避免水合不匹配
const getServerIsApple = () => true

/** 当前是否苹果平台，决定快捷键显示 ⌘ 还是 Ctrl。 */
function useIsApplePlatform() {
  return React.useSyncExternalStore(
    noopSubscribe,
    getIsApple,
    getServerIsApple,
  )
}

/** 把按键写成显示文本：苹果平台 ⌘1，其余 Ctrl 1。 */
function formatShortcut(key: string, isApple: boolean) {
  return isApple ? `⌘${key}` : `Ctrl ${key}`
}

/**
 * 注册 ⌘/Ctrl + 按键的全局快捷键。
 * 只响应单独的修饰键（带 Shift、Alt 的组合不算），按住不放不重复触发；命中后阻止浏览器默认行为。
 */
function useModifierHotkey(
  match: (key: string) => boolean,
  onTrigger: (key: string) => void,
  enabled = true,
) {
  const matchRef = React.useRef(match)
  const triggerRef = React.useRef(onTrigger)
  React.useEffect(() => {
    matchRef.current = match
    triggerRef.current = onTrigger
  })

  React.useEffect(() => {
    if (!enabled) return
    function handleKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.repeat || event.isComposing) return
      if (!(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey)
        return
      if (!matchRef.current(event.key)) return
      event.preventDefault()
      triggerRef.current(event.key)
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [enabled])
}

export { formatShortcut, useIsApplePlatform, useModifierHotkey }
