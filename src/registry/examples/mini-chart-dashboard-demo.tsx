import {
  MiniChart,
  MiniDonut,
  MiniRing,
} from "@/registry/ui/mini-chart/mini-chart"
import {
  StatCard,
  StatLabel,
  StatTrend,
  StatValue,
} from "@/registry/ui/stat-card/stat-card"

const label = (index: number) => `10-${String(index + 1).padStart(2, "0")}`
const series = (values: number[]) =>
  values.map((value, index) => ({ label: label(index), value }))

const REQUESTS = series([12, 19, 15, 26, 21, 31, 24, 29, 22, 34, 30, 41])
const VISITS = series([28, 27, 35, 29, 40, 57, 50, 38, 48, 47, 42, 51])
const BUILD = series([48, 52, 47, 51, 44, 46, 43, 45, 41, 42, 40, 38])
const DEPLOYS = series([2, 2, 3, 3, 3, 5, 5, 4, 4, 6, 6, 7])

// 六块指标像一条小仪表盘：用 1px 间隙露出底色做分格线（窄屏两列、宽屏三列），每块用不同图形与 `--flow-*` 色调
const CELL = "gap-2 rounded-none border-0 p-3 sm:p-4"

/** 卡片底部一行：左边数值，右边涨跌幅；两者都不换行，窄卡片里数字也不会断开 */
function Reading({
  value,
  unit,
  trend,
  invert,
}: {
  value: number | string
  unit: string
  trend: number
  invert?: boolean
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-2 gap-y-1">
      <StatValue
        value={value}
        unit={unit}
        size="sm"
        className="shrink-0 whitespace-nowrap"
      />
      <StatTrend
        value={trend}
        invert={invert}
        className="shrink-0 whitespace-nowrap"
      />
    </div>
  )
}

export default function MiniChartDashboardDemo() {
  return (
    <div className="grid w-full max-w-3xl grid-cols-2 gap-px overflow-hidden rounded-xl border border-edge bg-edge sm:grid-cols-3 shadow-xs">
      <StatCard className={CELL}>
        <StatLabel>API 调用量</StatLabel>
        <MiniChart
          type="bar"
          data={REQUESTS}
          tone="blue"
          highlight="last"
          track
          className="h-14"
          tickFormatter={(text) => text.slice(3)}
          seriesLabel="万次"
          label="近 12 天 API 调用量柱图"
        />
        <Reading value={41} unit="万次" trend={18.2} />
      </StatCard>
      <StatCard className={CELL}>
        <StatLabel>博客访客</StatLabel>
        <MiniChart
          type="area"
          data={VISITS}
          tone="violet"
          className="h-14"
          seriesLabel="访客"
          label="近 12 天博客访客面积图"
        />
        <Reading value={4810} unit="人" trend={-4.3} />
      </StatCard>
      <StatCard className={CELL}>
        <StatLabel>构建时长</StatLabel>
        <MiniChart
          type="line"
          data={BUILD}
          tone="amber"
          strokeWidth={2.5}
          className="h-14"
          seriesLabel="秒"
          label="近 12 次构建时长折线图"
        />
        <Reading value="38" unit="秒" trend={-20.8} invert />
      </StatCard>
      <StatCard className={CELL}>
        <StatLabel>每日部署</StatLabel>
        <MiniChart
          type="step"
          data={DEPLOYS}
          tone="green"
          strokeWidth={2.5}
          className="h-14"
          seriesLabel="次"
          label="近 12 天部署次数阶梯线"
        />
        <Reading value="7" unit="次" trend={16.7} />
      </StatCard>
      <StatCard className={CELL}>
        <StatLabel>缓存命中率</StatLabel>
        <div className="flex h-14 items-center">
          <MiniRing
            value={86}
            arc={270}
            size={56}
            thickness={12}
            tone="cyan"
            label="缓存命中率 86%"
          >
            <span className="text-xs font-semibold">86%</span>
          </MiniRing>
          <p className="ml-3 text-xs leading-5 text-muted-foreground max-sm:hidden">
            命中 1.2 万
            <br />
            回源 1,950
          </p>
        </div>
        <Reading value="86" unit="%" trend={3.4} />
      </StatCard>
      <StatCard className={CELL}>
        <StatLabel>流量来源</StatLabel>
        <div className="flex h-14 items-center">
          <MiniDonut
            size={56}
            thickness={34}
            segments={[
              { label: "搜索引擎", value: 148, tone: "blue" },
              { label: "直接访问", value: 93, tone: "violet" },
              { label: "社交媒体", value: 64, tone: "amber" },
              { label: "外链", value: 37, tone: "rose" },
            ]}
            label="流量来源占比"
          />
          <p className="ml-3 text-xs leading-5 text-muted-foreground max-sm:hidden">
            搜索 43%
            <br />
            直接 27%
          </p>
        </div>
        <Reading value={34200} unit="次" trend={9.6} />
      </StatCard>
    </div>
  )
}
