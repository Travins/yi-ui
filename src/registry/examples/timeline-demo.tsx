import type { CSSProperties } from "react"
import {
  FileText,
  GitPullRequest,
  Hammer,
  Rocket,
  TriangleAlert,
} from "lucide-react"
import { StatProgress } from "@/registry/ui/stat-card/stat-card"
import {
  Timeline,
  TimelineAttachment,
  TimelineConnector,
  TimelineContent,
  TimelineItem,
  TimelineMarker,
  TimelineTime,
  TimelineTitle,
} from "@/registry/ui/timeline/timeline"

// 标记按事件类型着色；done / current / upcoming 由实线、脉冲光环、虚线区分，不只靠颜色

function Avatar({ children, tone }: { children: string; tone: string }) {
  return (
    <span
      className="flex size-6 items-center justify-center rounded-full border-2 border-card bg-(--tone)/15 font-mono text-[10px] text-(--tone)"
      style={{ "--tone": `var(--flow-${tone})` } as CSSProperties}
    >
      {children}
    </span>
  )
}

export default function TimelineDemo() {
  return (
    <div className="w-full max-w-lg overflow-hidden rounded-xl border border-edge bg-background shadow-xs">
      <div className="flex items-center justify-between gap-3 border-b border-edge px-4 py-3 sm:px-6">
        <span className="text-sm font-medium">发布流水线</span>
        <span className="font-mono text-xs text-muted-foreground">
          #142 · 进行中
        </span>
      </div>
      <Timeline aria-label="发布流水线" className="px-4 py-4 sm:px-6">
        <TimelineItem>
          <TimelineMarker tone="violet" label="代码评审">
            <GitPullRequest />
          </TimelineMarker>
          <TimelineConnector />
          <TimelineContent className="pb-4">
            <div className="flex items-baseline justify-between gap-3">
              <TimelineTitle>评审通过，已合并</TimelineTitle>
              <TimelineTime dateTime="2026-10-27T10:02:00+08:00">
                10:02
              </TimelineTime>
            </div>
            <TimelineAttachment className="mt-2">
              <div
                className="flex -space-x-1.5"
                aria-label="评审人：林川、许言"
              >
                <Avatar tone="violet">LC</Avatar>
                <Avatar tone="blue">XY</Avatar>
              </div>
              <span className="text-muted-foreground">2 位评审人通过</span>
            </TimelineAttachment>
          </TimelineContent>
        </TimelineItem>
        <TimelineItem>
          <TimelineMarker tone="amber" label="告警">
            <TriangleAlert />
          </TimelineMarker>
          <TimelineConnector />
          <TimelineContent className="pb-4">
            <div className="flex items-baseline justify-between gap-3">
              <TimelineTitle>缓存命中率偏低</TimelineTitle>
              <TimelineTime dateTime="2026-10-27T10:11:00+08:00">
                10:11
              </TimelineTime>
            </div>
            <TimelineAttachment className="mt-2">
              <span className="inline-flex items-center gap-1.5 rounded-md border border-edge bg-muted/30 px-2 py-1 font-mono">
                <FileText
                  className="size-3.5 text-muted-foreground"
                  aria-hidden="true"
                />
                cache.log<span className="text-muted-foreground">18 KB</span>
              </span>
              <span className="text-muted-foreground">已清理并自动重试</span>
            </TimelineAttachment>
          </TimelineContent>
        </TimelineItem>
        <TimelineItem status="current">
          <TimelineMarker tone="blue" status="current" label="构建中">
            <Hammer />
          </TimelineMarker>
          <TimelineConnector />
          <TimelineContent className="pb-4">
            <div className="flex items-baseline justify-between gap-3">
              <TimelineTitle>正在构建站点</TimelineTitle>
              <TimelineTime dateTime="2026-10-27T10:16:00+08:00">
                现在
              </TimelineTime>
            </div>
            <div className="mt-2.5 flex items-center gap-3">
              <StatProgress
                value={68}
                tone="blue"
                size="sm"
                label="构建进度 68%"
              />
              <span className="shrink-0 font-mono text-xs whitespace-nowrap text-muted-foreground tabular-nums">
                68%
              </span>
            </div>
          </TimelineContent>
        </TimelineItem>
        <TimelineItem status="upcoming">
          <TimelineMarker status="upcoming" label="待发布">
            <Rocket />
          </TimelineMarker>
          <TimelineContent>
            <div className="flex items-baseline justify-between gap-3">
              <TimelineTitle className="text-muted-foreground">
                发布到生产环境
              </TimelineTitle>
              <TimelineTime>待构建完成</TimelineTime>
            </div>
          </TimelineContent>
        </TimelineItem>
      </Timeline>
    </div>
  )
}
