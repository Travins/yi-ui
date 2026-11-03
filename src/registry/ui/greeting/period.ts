// 时段划分：纯函数，不依赖 React 和当前时间，方便测试与服务端使用。

type GreetingPeriod = "morning" | "noon" | "afternoon" | "evening"

/** 每个时段的起始小时（0–23）。`evening` 持续到次日 `morning` 开始。 */
type GreetingBoundaries = Record<GreetingPeriod, number>

const PERIODS: readonly GreetingPeriod[] = [
  "morning",
  "noon",
  "afternoon",
  "evening",
]

const DEFAULT_BOUNDARIES: GreetingBoundaries = {
  morning: 5,
  noon: 11,
  afternoon: 14,
  evening: 18,
}

/** 起始小时必须严格递增且落在 0–23；传错时回落到默认划分，而不是渲染出错乱的时段。 */
function normalizeBoundaries(
  boundaries?: Partial<GreetingBoundaries>,
): GreetingBoundaries {
  const merged = { ...DEFAULT_BOUNDARIES, ...boundaries }
  const hours = PERIODS.map((period) => merged[period])
  const valid = hours.every(
    (hour, index) =>
      Number.isFinite(hour) &&
      hour >= 0 &&
      hour < 24 &&
      (index === 0 || hour > (hours[index - 1] ?? Infinity)),
  )
  return valid ? merged : DEFAULT_BOUNDARIES
}

const NEXT_PERIOD: Record<GreetingPeriod, GreetingPeriod> = {
  morning: "noon",
  noon: "afternoon",
  afternoon: "evening",
  evening: "morning",
}

/** 时刻（小时，可带小数）所在的时段，以及已经过去的比例（0–1）。 */
function resolvePeriod(
  time: number,
  boundaries: GreetingBoundaries,
): { period: GreetingPeriod; progress: number } {
  const shifted = time < boundaries.morning ? time + 24 : time
  let period: GreetingPeriod = "evening"
  for (const candidate of [...PERIODS].reverse()) {
    period = candidate
    if (!(shifted < boundaries[candidate])) break
  }
  const start = boundaries[period]
  const end = boundaries[NEXT_PERIOD[period]] + (period === "evening" ? 24 : 0)
  return {
    period,
    progress: Math.min(1, Math.max(0, (shifted - start) / (end - start))),
  }
}

/** `05–11` 这样的区间文字；`evening` 的终点是次日 `morning` 的起点。 */
function periodRange(period: GreetingPeriod, boundaries: GreetingBoundaries) {
  const end = boundaries[NEXT_PERIOD[period]]
  const pad = (hour: number) => String(hour).padStart(2, "0")
  return `${pad(boundaries[period])}–${pad(end)}`
}

export {
  DEFAULT_BOUNDARIES,
  PERIODS,
  normalizeBoundaries,
  periodRange,
  resolvePeriod,
}
export type { GreetingBoundaries, GreetingPeriod }
