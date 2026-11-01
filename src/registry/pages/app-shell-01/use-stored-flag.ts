"use client"

import * as React from "react"

import { DEFAULT_STORAGE_KEY } from "./config"

// localStorage 不可用（隐私模式等）时退回内存，保证同一会话内状态仍然生效
const memory = new Map<string, boolean>()
const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  window.addEventListener("storage", listener)
  return () => {
    listeners.delete(listener)
    window.removeEventListener("storage", listener)
  }
}

function read(key: string, fallback: boolean) {
  const cached = memory.get(key)
  if (cached !== undefined) return cached
  try {
    let stored = window.localStorage.getItem(key)
    if (stored === null && key === DEFAULT_STORAGE_KEY) {
      const legacyKey = "travinsy:app-shell:collapsed"
      stored = window.localStorage.getItem(legacyKey)
      if (stored !== null) {
        window.localStorage.setItem(key, stored)
        window.localStorage.removeItem(legacyKey)
      }
    }
    return stored === null ? fallback : stored === "1"
  } catch {
    return fallback
  }
}

/**
 * 持久化到 localStorage 的布尔状态。
 * 服务端与水合阶段始终返回 fallback，水合完成后再读取本地值，避免水合不一致。
 */
function useStoredFlag(key: string, fallback = false) {
  const value = React.useSyncExternalStore(
    subscribe,
    () => read(key, fallback),
    () => fallback,
  )
  const setValue = React.useCallback(
    (next: boolean) => {
      memory.set(key, next)
      try {
        window.localStorage.setItem(key, next ? "1" : "0")
      } catch {
        // 忽略：已写入内存
      }
      listeners.forEach((listener) => listener())
    },
    [key],
  )
  return [value, setValue] as const
}

export { useStoredFlag }
