"use client"

import { useLayoutEffect, useRef, useState, type ComponentProps } from "react"

type Position = { x: number; y: number }
const STORAGE_KEY = "yiui:agent-chat:position"

function readPosition() {
  const current = localStorage.getItem(STORAGE_KEY)
  if (current !== null) return current
  const legacyKey = "travinsy:agent-chat:position"
  const legacy = localStorage.getItem(legacyKey)
  if (legacy !== null) {
    localStorage.setItem(STORAGE_KEY, legacy)
    localStorage.removeItem(legacyKey)
  }
  return legacy
}
const INTERACTIVE =
  "button:not([data-slot='agent-chat-move-handle']), a, input, textarea, select, [role='button']"

function constrain(position: Position, panel: HTMLElement): Position {
  return {
    x: Math.max(0, Math.min(window.innerWidth - panel.offsetWidth, position.x)),
    // 高度不足时仍保留整个标题栏，桌面常规尺寸下将整个窗口收回视口。
    y: Math.max(
      0,
      Math.min(
        window.innerHeight - Math.min(panel.offsetHeight, window.innerHeight),
        position.y,
      ),
    ),
  }
}

function defaultPosition(panel: HTMLElement): Position {
  return constrain(
    {
      x: window.innerWidth - panel.offsetWidth - 16,
      y: window.innerHeight - panel.offsetHeight - 16,
    },
    panel,
  )
}

function writePosition(panel: HTMLElement, position: Position) {
  panel.style.left = `${position.x}px`
  panel.style.top = `${position.y}px`
  panel.style.right = "auto"
  panel.style.bottom = "auto"
}

function storePosition(position: Position | null) {
  try {
    if (position) localStorage.setItem(STORAGE_KEY, JSON.stringify(position))
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // 浏览器禁止存储时，窗口在当前会话中仍可正常移动。
  }
}

function useAgentChatPosition({
  enabled,
  active,
}: {
  enabled: boolean
  active: boolean
}) {
  const panelRef = useRef<HTMLElement>(null)
  const current = useRef<Position | null>(null)
  const restored = useRef(false)
  const [position, setPosition] = useState<Position | null>(null)
  const drag = useRef<{
    pointerId: number
    handle: HTMLElement
    start: Position
    origin: Position
  } | null>(null)

  function commit(next: Position | null) {
    current.current = next
    setPosition(next)
    storePosition(next)
  }

  function finish() {
    const session = drag.current
    if (!session) return
    drag.current = null
    panelRef.current?.removeAttribute("data-dragging")
    session.handle.removeAttribute("data-dragging")
    if (session.handle.hasPointerCapture(session.pointerId))
      session.handle.releasePointerCapture(session.pointerId)
    commit(current.current)
  }

  useLayoutEffect(() => {
    if (!active) return
    const panel = panelRef.current
    if (!panel) return
    if (!restored.current) {
      restored.current = true
      try {
        const saved: unknown = JSON.parse(readPosition() ?? "null")
        if (
          saved &&
          typeof saved === "object" &&
          "x" in saved &&
          "y" in saved &&
          typeof saved.x === "number" &&
          Number.isFinite(saved.x) &&
          typeof saved.y === "number" &&
          Number.isFinite(saved.y)
        )
          current.current = { x: saved.x, y: saved.y }
      } catch {
        // 损坏或不可读的缓存回退到默认右下角。
      }
    }
    const update = () => {
      const next = current.current ? constrain(current.current, panel) : null
      writePosition(panel, next ?? defaultPosition(panel))
      if (next) {
        current.current = next
        setPosition(next)
        storePosition(next)
      }
    }
    update()
    window.addEventListener("resize", update)
    const observer = new ResizeObserver(update)
    observer.observe(panel)
    return () => {
      window.removeEventListener("resize", update)
      observer.disconnect()
      for (const property of ["left", "top", "right", "bottom"])
        panel.style.removeProperty(property)
    }
  }, [active])

  useLayoutEffect(() => {
    if (!enabled) finish()
    return () => finish()
    // finish 只读取 ref；流式消息更新不能解除正在进行的指针捕获。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled])

  function reset() {
    const panel = panelRef.current
    if (!enabled || !panel) return
    finish()
    // 复位直接定位，无动画，同样适用于 prefers-reduced-motion。
    writePosition(panel, defaultPosition(panel))
    commit(null)
  }

  const headerProps: ComponentProps<"header"> = enabled
    ? {
        onPointerDown(event) {
          if (
            !event.isPrimary ||
            event.button !== 0 ||
            drag.current ||
            (event.target as Element).closest(INTERACTIVE)
          )
            return
          const panel = panelRef.current
          if (!panel) return
          event.preventDefault()
          if (
            (event.target as Element).closest(
              "[data-slot='agent-chat-move-handle']",
            )
          )
            (event.target as Element).closest<HTMLElement>("button")?.focus()
          const origin = current.current ?? defaultPosition(panel)
          drag.current = {
            pointerId: event.pointerId,
            handle: event.currentTarget,
            start: { x: event.clientX, y: event.clientY },
            origin,
          }
          current.current = origin
          event.currentTarget.setPointerCapture(event.pointerId)
          event.currentTarget.setAttribute("data-dragging", "true")
          panel.setAttribute("data-dragging", "true")
        },
        onPointerMove(event) {
          const session = drag.current
          const panel = panelRef.current
          if (!session || !panel || session.pointerId !== event.pointerId)
            return
          const next = constrain(
            {
              x: session.origin.x + event.clientX - session.start.x,
              y: session.origin.y + event.clientY - session.start.y,
            },
            panel,
          )
          current.current = next
          // 不提交 React state，避免每帧重渲染消息和输入框。
          writePosition(panel, next)
        },
        onPointerUp(event) {
          if (drag.current?.pointerId === event.pointerId) finish()
        },
        onPointerCancel(event) {
          if (drag.current?.pointerId === event.pointerId) finish()
        },
        onLostPointerCapture(event) {
          if (drag.current?.pointerId === event.pointerId) finish()
        },
        onDoubleClick(event) {
          if (!(event.target as Element).closest(INTERACTIVE)) reset()
        },
      }
    : {}

  function onMoveKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (!enabled || event.altKey || event.ctrlKey || event.metaKey) return
    if (event.key === "Home") {
      event.preventDefault()
      reset()
      return
    }
    const direction = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    }[event.key]
    const panel = panelRef.current
    if (!direction || !panel) return
    event.preventDefault()
    finish()
    const start = current.current ?? defaultPosition(panel)
    const step = event.shiftKey ? 64 : 16
    const next = constrain(
      { x: start.x + direction[0] * step, y: start.y + direction[1] * step },
      panel,
    )
    writePosition(panel, next)
    commit(next)
  }

  return { panelRef, position, headerProps, onMoveKeyDown, reset }
}

export { useAgentChatPosition }
