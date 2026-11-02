import {
  MiniChart,
  MiniRing,
  type MiniChartType,
} from "@/registry/ui/mini-chart/mini-chart"

const label = (index: number) => `10-${String(index + 1).padStart(2, "0")}`
const series = (values: number[]) =>
  values.map((value, index) => ({ label: label(index), value }))

type Row = {
  name: string
  hint: string
  type: MiniChartType
  tone: "blue" | "violet" | "amber" | "green"
  data: ReturnType<typeof series>
  value: string
  trend: number
  /** 越低越好的指标：下降显示为好的颜色 */
  invert?: boolean
}

const ROWS: Row[] = [
  {
    name: "API 调用量",
    hint: "万次 / 天",
    type: "bar",
    tone: "blue",
    data: series([12, 19, 15, 26, 21, 31, 24, 29, 22, 34, 30, 41]),
    value: "41",
    trend: 18.2,
  },
  {
    name: "博客访客",
    hint: "人 / 天",
    type: "area",
    tone: "violet",
    data: series([28, 27, 35, 29, 40, 57, 50, 38, 48, 47, 42, 51]),
    value: "4810",
    trend: -4.3,
  },
  {
    name: "构建时长",
    hint: "秒 / 次",
    type: "line",
    tone: "amber",
    data: series([48, 52, 47, 51, 44, 46, 43, 45, 41, 42, 40, 38]),
    value: "38",
    trend: -20.8,
    invert: true,
  },
  {
    name: "每日部署",
    hint: "次 / 天",
    type: "step",
    tone: "green",
    data: series([2, 2, 3, 3, 3, 5, 5, 4, 4, 6, 6, 7]),
    value: "7",
    trend: 16.7,
  },
]

// 迷你图嵌在一行文字里：名称、走势、当前值、涨跌各占一列
export default function MiniChartDemo() {
  return (
    <div className="w-full max-w-xl divide-y divide-edge overflow-hidden rounded-xl border border-edge bg-background px-4 text-sm shadow-xs">
      {ROWS.map((row) => (
        <div
          key={row.name}
          className="grid grid-cols-[minmax(4.5rem,1fr)_minmax(3rem,10rem)_auto_auto] items-center gap-3 py-3 sm:gap-4"
        >
          <div className="min-w-0">
            <p className="truncate font-medium">{row.name}</p>
            <p className="truncate text-xs text-muted-foreground">{row.hint}</p>
          </div>
          <MiniChart
            type={row.type}
            tone={row.tone}
            data={row.data}
            highlight={row.type === "bar" ? "last" : undefined}
            seriesLabel={row.name}
            label={`近 12 天${row.name}走势`}
            className="h-9"
          />
          <span className="text-right font-semibold tabular-nums">
            {row.value}
          </span>
          <span
            className={
              row.trend >= 0 !== Boolean(row.invert)
                ? "text-right text-xs text-(--flow-green) tabular-nums"
                : "text-right text-xs text-(--flow-rose) tabular-nums"
            }
          >
            {row.trend >= 0 ? "+" : ""}
            {row.trend}%
          </span>
        </div>
      ))}
      <div className="flex items-center gap-4 py-3">
        <MiniRing
          value={86}
          tone="cyan"
          size={40}
          thickness={4}
          label="缓存命中率 86%"
        />
        <div className="min-w-0 flex-1">
          <p className="font-medium">缓存命中率</p>
          <p className="text-xs text-muted-foreground">
            命中 1.2 万 · 回源 1,950
          </p>
        </div>
        <span className="font-semibold tabular-nums">86%</span>
      </div>
    </div>
  )
}
