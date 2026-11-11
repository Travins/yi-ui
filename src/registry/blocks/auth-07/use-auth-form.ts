"use client"

import * as React from "react"

type UnlockFailure = {
  /** 回调抛出的原因，没有时为空字符串 */
  message: string
  /** 本次失败后还能再试几次；进入锁定时为 0 */
  remaining: number
}

/** 错误对象上的 `retryAfter`（秒），只接受有限正数。 */
function readRetryAfter(caught: unknown) {
  if (typeof caught !== "object" || caught === null) return 0
  const value = (caught as { retryAfter?: unknown }).retryAfter
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.ceil(value)
    : 0
}

/**
 * 解锁请求：同步锁拦截回车与 PIN 自动提交的重复请求，累计失败次数，
 * 达到上限或服务端给出 `retryAfter` 时锁定一段时间，到时自动恢复并清零。
 */
function useUnlockAttempts({
  maxAttempts,
  lockSeconds,
}: {
  maxAttempts: number
  lockSeconds: number
}) {
  const lock = React.useRef(false)
  const failures = React.useRef(0)
  const [pending, setPending] = React.useState(false)
  const [failure, setFailure] = React.useState<UnlockFailure | null>(null)
  const [deadline, setDeadline] = React.useState(0)
  const [remaining, setRemaining] = React.useState(0)
  // 进入锁定时的总秒数：读屏只在锁定开始时播报一次，不跟着倒计时逐秒念
  const [lockTotal, setLockTotal] = React.useState(0)

  React.useEffect(() => {
    if (!deadline) return
    const tick = () => {
      const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
      setRemaining(left)
      if (left === 0) {
        failures.current = 0
        setDeadline(0)
        setLockTotal(0)
        setFailure(null)
      }
    }
    tick()
    const timer = window.setInterval(tick, 250)
    return () => window.clearInterval(timer)
  }, [deadline])

  function startLock(seconds: number) {
    setRemaining(seconds)
    setLockTotal(seconds)
    // 只在失败回调里读取时间，不参与服务端渲染
    setDeadline(Date.now() + seconds * 1000)
  }

  const locked = deadline > 0

  async function run(action: () => Promise<void>) {
    if (lock.current || locked) return false
    lock.current = true
    setPending(true)
    setFailure(null)
    try {
      await action()
      failures.current = 0
      return true
    } catch (caught) {
      const retryAfter = readRetryAfter(caught)
      failures.current += 1
      const left = Math.max(0, maxAttempts - failures.current)
      setFailure({
        message: caught instanceof Error ? caught.message : "",
        remaining: retryAfter ? 0 : left,
      })
      if (retryAfter) startLock(retryAfter)
      else if (left === 0) startLock(lockSeconds)
      return false
    } finally {
      lock.current = false
      setPending(false)
    }
  }

  return {
    pending,
    failure,
    clearFailure: () => setFailure(null),
    locked,
    remaining,
    lockTotal,
    run,
  }
}

export { readRetryAfter, useUnlockAttempts }
export type { UnlockFailure }
