"use client"
import * as React from "react"
/** 用同步锁拦截自动提交与回车的重复请求。 */
function useAsyncAction(fallback: string) {
  const lock = React.useRef(false)
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState("")
  async function run(action: () => Promise<void>) {
    if (lock.current) return false
    lock.current = true
    setPending(true)
    setError("")
    try {
      await action()
      return true
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : fallback)
      return false
    } finally {
      lock.current = false
      setPending(false)
    }
  }
  return { pending, error, setError, run }
}
export { useAsyncAction }
