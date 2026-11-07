import type { DynamicToolUIPart, ToolUIPart } from "ai"

type ToolPart = ToolUIPart | DynamicToolUIPart

/** 一次工具调用的起止时间（毫秒时间戳）。只在客户端、挂载之后才会产生。 */
type ToolTiming = { start: number; end?: number }

const EMPTY: ReadonlyMap<string, ToolTiming> = new Map()

/**
 * 工具计时器。AI SDK 的工具 part 不带时间字段，所以由客户端在「第一次看到这次调用」
 * 和「第一次看到它有结果」时各记一个时间。历史消息从来没被观察到运行过，不会有记录，也就不显示耗时。
 * 做成外部 store，由 Provider 持有：关掉面板再打开，已经记下的耗时不会丢。
 */
function createToolClock() {
  let timings = EMPTY
  const listeners = new Set<() => void>()
  const commit = (next: Map<string, ToolTiming>) => {
    timings = next
    listeners.forEach((listener) => listener())
  }
  return {
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    getSnapshot: () => timings,
    getServerSnapshot: () => EMPTY,
    /** 每次消息变化后调用：没见过且还没结束 → 开始计时；见过且刚结束 → 记下结束时间。 */
    observe(key: string, finished: boolean) {
      const current = timings.get(key)
      if (!current) {
        if (!finished) commit(new Map(timings).set(key, { start: Date.now() }))
        return
      }
      if (finished && current.end === undefined)
        commit(new Map(timings).set(key, { ...current, end: Date.now() }))
    },
    /** 重试：从现在重新计时。 */
    restart(key: string) {
      commit(new Map(timings).set(key, { start: Date.now() }))
    },
  }
}

type ToolClock = ReturnType<typeof createToolClock>

/**
 * 后端可以在工具 part 上附带耗时：`callProviderMetadata.timing`，
 * 写成 `{ durationMs }`，或 `{ startedAt, endedAt }`（毫秒时间戳）。有它就优先用，历史消息也能显示耗时。
 */
function timingFromMetadata(part: ToolPart) {
  const timing = part.callProviderMetadata?.timing
  if (!timing || typeof timing !== "object") return undefined
  const { durationMs, startedAt, endedAt } = timing as Record<string, unknown>
  if (typeof startedAt === "number" && typeof endedAt === "number")
    return { ms: Math.max(0, endedAt - startedAt), start: startedAt, end: endedAt }
  if (typeof durationMs === "number") return { ms: Math.max(0, durationMs) }
  return undefined
}

/** 固定用 en-US 格式化数字：服务端与客户端输出一致，不会引起 hydration 不匹配。 */
const SECONDS = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 })

/** 运行中只显示整数秒（每秒刷新一次），结束后保留一位小数；超过一分钟改成「几分几秒」。 */
function formatDuration(
  ms: number,
  running: boolean,
  labels: { toolDurationSeconds: string; toolDurationMinutes: string },
) {
  const total = running ? Math.floor(ms / 1000) : Math.round(ms / 100) / 10
  if (total < 60)
    return labels.toolDurationSeconds.replace("{seconds}", SECONDS.format(total))
  const whole = Math.floor(total)
  return labels.toolDurationMinutes
    .replace("{minutes}", String(Math.floor(whole / 60)))
    .replace("{seconds}", String(whole % 60))
}

export { createToolClock, formatDuration, timingFromMetadata }
export type { ToolClock, ToolPart, ToolTiming }
