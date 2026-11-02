import {
  AnalogClock,
  LocalTime,
  WorldClock,
} from "@/registry/ui/local-time/local-time"

const ZONES = [
  { label: "伦敦", timeZone: "Europe/London" },
  { label: "纽约", timeZone: "America/New_York" },
  { label: "旧金山", timeZone: "America/Los_Angeles" },
  { label: "悉尼", timeZone: "Australia/Sydney" },
]

// 「协作时区」面板：左侧是本地的模拟表盘，右侧是四个协作城市的世界时钟。
// 强调色（LIVE 圆点、表盘秒针）统一指向 --flow-blue，亮暗与颜色主题下都保持一致
export default function LocalTimeWorldClockDemo() {
  return (
    <div className="grid w-full max-w-2xl overflow-hidden rounded-xl border border-edge bg-background [--primary:var(--flow-blue)] sm:grid-cols-[14rem_1fr] shadow-xs">
      <div className="relative flex flex-col items-center justify-center gap-3 border-b border-edge bg-[radial-gradient(circle_at_50%_40%,color-mix(in_oklab,var(--flow-blue)_14%,transparent),transparent_70%)] px-4 py-5 sm:border-r sm:border-b-0">
        <p className="self-start font-mono text-[10px] tracking-[0.08em] text-muted-foreground">
          BASE / 所在地
        </p>
        <AnalogClock
          timeZone="Asia/Shanghai"
          label="上海当前时间"
          className="size-24 sm:size-32"
        />
        <div className="text-center">
          <p className="text-sm font-medium">上海</p>
          <LocalTime
            timeZone="Asia/Shanghai"
            className="mt-0.5 block font-mono text-[11px] text-muted-foreground"
          />
        </div>
      </div>
      <WorldClock
        zones={ZONES}
        title="PARTNERS / 协作城市"
        className="rounded-none border-0 bg-transparent max-sm:[&_li:nth-child(n+4)]:hidden"
      />
    </div>
  )
}
