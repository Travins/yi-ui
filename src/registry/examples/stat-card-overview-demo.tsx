import { Activity, HeartPulse, Share2 } from "lucide-react"
import { formatStat, toneColor } from "@/registry/lib/data-display"
import { MiniChart } from "@/registry/ui/mini-chart/mini-chart"
import {
  StatBadge,
  StatCard,
  StatHeader,
  StatIcon,
  StatLabel,
  StatMeta,
  StatMeter,
  StatProgress,
  StatSegments,
  StatTrend,
  StatValue,
} from "@/registry/ui/stat-card/stat-card"

const CALLS = [38, 44, 41, 52, 49, 63, 58, 71, 66, 84, 79, 96].map(
  (value, index) => ({ label: `${index + 1} 时`, value }),
)

const SOURCES = [
  { label: "搜索引擎", value: 148, tone: "blue" },
  { label: "直接访问", value: 93, tone: "violet" },
  { label: "社交媒体", value: 64, tone: "amber" },
  { label: "外链", value: 37, tone: "cyan" },
] as const

const SOURCE_TOTAL = SOURCES.reduce((sum, item) => sum + item.value, 0)

// 同一组原语拼成一块概览面板：卡片之间共用细线，不再是四张孤立的小卡；窄屏只留前两块
const CELL = "flex flex-col gap-3 rounded-none border-0 bg-transparent p-4"

export default function StatCardOverviewDemo() {
  return (
    <div className="w-full max-w-3xl overflow-hidden rounded-xl border border-edge bg-background shadow-xs">
      <div className="flex items-center justify-between gap-3 border-b border-edge px-4 py-3">
        <span className="text-sm font-medium">站点概览</span>
        <span className="font-mono text-xs text-muted-foreground">
          近 7 天 · 实时
        </span>
      </div>
      <div className="grid sm:grid-cols-2">
        <StatCard className={`${CELL} border-b border-edge sm:border-r`}>
          <StatHeader>
            <StatLabel>API 调用量</StatLabel>
            <StatIcon tone="blue">
              <Activity />
            </StatIcon>
          </StatHeader>
          <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
            <div className="flex flex-col gap-2">
              <StatValue
                value={12840000}
                unit="次"
                size="lg"
                className="whitespace-nowrap"
              />
              <StatTrend value={12.4}>较上周</StatTrend>
            </div>
            <MiniChart
              type="area"
              tone="blue"
              data={CALLS}
              seriesLabel="调用量"
              className="h-12 w-28 shrink-0"
              label="今日每小时 API 调用量"
            />
          </div>
        </StatCard>
        <StatCard className={`${CELL} border-b border-edge max-sm:border-b-0`}>
          <StatHeader className="items-center">
            <StatLabel>本月构建配额</StatLabel>
            <StatBadge status="watch">偏高</StatBadge>
          </StatHeader>
          <StatValue value="4320" unit="/ 6000 分钟" />
          <div className="flex flex-col gap-2">
            <StatProgress
              value={72}
              tone="usage"
              size="lg"
              label="构建配额已用 72%"
            />
            <StatMeta>
              <span>已用 72%</span>
              <span>剩余 12 天</span>
            </StatMeta>
          </div>
        </StatCard>
        <StatCard
          className={`${CELL} border-b border-edge max-sm:hidden sm:border-r sm:border-b-0`}
        >
          <StatHeader className="items-center">
            <StatLabel>服务健康度</StatLabel>
            <StatIcon tone="green">
              <HeartPulse />
            </StatIcon>
          </StatHeader>
          <StatValue value="99.98" unit="%" />
          <StatMeter
            value={92}
            segments={16}
            className="h-6 w-full"
            label="服务健康度 92%"
          />
          <StatMeta>
            <span>可用 4/5 个区域</span>
            <span>P95 128 ms</span>
          </StatMeta>
        </StatCard>
        <StatCard className={`${CELL} max-sm:hidden`}>
          <StatHeader>
            <StatLabel>流量来源</StatLabel>
            <StatIcon tone="violet">
              <Share2 />
            </StatIcon>
          </StatHeader>
          <StatValue value={SOURCE_TOTAL} unit="次访问" />
          <StatSegments segments={[...SOURCES]} className="h-2.5" />
          <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
            {SOURCES.map((item) => (
              <li key={item.label} className="flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: toneColor(item.tone) }}
                />
                <span className="truncate text-muted-foreground">
                  {item.label}
                </span>
                <span className="ml-auto font-medium tabular-nums">
                  {formatStat((item.value / SOURCE_TOTAL) * 100, {
                    style: "percent",
                    digits: 0,
                  })}
                </span>
              </li>
            ))}
          </ul>
        </StatCard>
      </div>
    </div>
  )
}
