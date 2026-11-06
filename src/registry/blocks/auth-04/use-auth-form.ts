"use client"

import * as React from "react"

type AsyncResult<T> = { ok: true; value: T } | { ok: false }

/** 用同步锁拦截回车与连点造成的重复请求，并返回回调的结果。 */
function useAsyncAction(fallback: string) {
  const lock = React.useRef(false)
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState("")
  async function run<T>(action: () => Promise<T>): Promise<AsyncResult<T>> {
    if (lock.current) return { ok: false }
    lock.current = true
    setPending(true)
    setError("")
    try {
      return { ok: true, value: await action() }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : fallback)
      return { ok: false }
    } finally {
      lock.current = false
      setPending(false)
    }
  }
  return { pending, error, setError, run }
}

export { useAsyncAction }
