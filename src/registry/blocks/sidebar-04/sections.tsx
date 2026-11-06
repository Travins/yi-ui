"use client"

import * as React from "react"
import { CalendarDays, ChartArea, ChartColumn } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { DEFAULT_LABELS, type Sidebar04Labels } from "./config"
import type { ContextPoint, ContextStatus, ContextTask } from "./types"

type SectionProps = React.ComponentProps<"section"> & {
  title: string
  subtitle?: string
}
function ContextSection({
  title,
  subtitle,
  className,
  children,
  ...props
}: SectionProps) {
  const id = React.useId()
  return (
    <section
      data-slot="context-section"
      aria-labelledby={id}
      className={cn(
        "border-b border-dashed border-sidebar-border p-4 last:border-b-0",
        className,
      )}
      {...props}
    >
      <h2 id={id} className="text-sm font-semibold">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-1 text-xs text-sidebar-foreground/65">{subtitle}</p>
      )}
      <div className="mt-4">{children}</div>
    </section>
  )
}
type ProgressProps = Omit<React.ComponentProps<"section">, "children"> & {
  /** 按日期排序的非负数据 */ data: ContextPoint[]
  /** 日期范围 */ range?: string
  labels?: Partial<Sidebar04Labels>
}
function ProgressSection({ data, range, labels, ...props }: ProgressProps) {
  const l = { ...DEFAULT_LABELS, ...labels }
  const [type, setType] = React.useState("area")
  const [metric, setMetric] = React.useState("trend")
  const points = data.map((p) => ({
    ...p,
    completed: Math.max(0, p.completed),
    active: metric === "volume" ? 0 : Math.max(0, p.active),
  }))
  const max = Math.max(1, ...points.map((p) => p.completed + p.active))
  const x = (i: number) => 12 + (i * 252) / Math.max(1, points.length - 1)
  const y = (n: number) => 116 - (n / max) * 100
  const path = (
    upper: (p: ContextPoint) => number,
    lower: (p: ContextPoint) => number,
  ) =>
    points.length
      ? `M ${points.map((p, i) => `${x(i)},${y(upper(p))}`).join(" L ")} L ${points
          .map((p, i) => `${x(i)},${y(lower(p))}`)
          .reverse()
          .join(" L ")} Z`
      : ""
  return (
    <ContextSection title={l.progress} subtitle={range} {...props}>
      <div className="mb-3 flex items-center gap-2">
        <Select
          items={[
            { value: "trend", label: l.trend },
            { value: "volume", label: l.volume },
          ]}
          value={metric}
          onValueChange={(value) => {
            if (value) setMetric(value)
          }}
        >
          <SelectTrigger
            size="sm"
            aria-label={l.metric}
            className="min-w-0 flex-1 bg-sidebar text-xs pointer-coarse:h-9"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false} align="start">
            <SelectItem value="trend" className="text-xs">
              {l.trend}
            </SelectItem>
            <SelectItem value="volume" className="text-xs">
              {l.volume}
            </SelectItem>
          </SelectContent>
        </Select>
        {[
          { id: "area", label: l.area, icon: ChartArea },
          { id: "bar", label: l.bar, icon: ChartColumn },
        ].map((item) => (
          <Button
            key={item.id}
            size="icon-sm"
            variant="ghost"
            aria-label={item.label}
            aria-pressed={type === item.id}
            onClick={() => setType(item.id)}
          >
            <item.icon aria-hidden="true" />
          </Button>
        ))}
      </div>
      <svg
        data-slot="context-progress-chart"
        data-type={type}
        viewBox="0 0 276 140"
        className="w-full"
        role="img"
        aria-label={`${l.progress}：${metric === "trend" ? l.trend : l.volume}`}
      >
        <path d="M 10 116 H 266" stroke="var(--sidebar-border)" />
        {type === "area" ? (
          <>
            <path
              d={path(
                (p) => p.completed,
                () => 0,
              )}
              fill="var(--chart-1)"
              stroke="var(--sidebar)"
              strokeWidth="2"
            />
            <path
              d={path(
                (p) => p.completed + p.active,
                (p) => p.completed,
              )}
              fill="var(--chart-2)"
              stroke="var(--sidebar)"
              strokeWidth="2"
            />
          </>
        ) : (
          points.map((p, i) => (
            <g key={p.label}>
              <title>{`${p.label}：${l.completed} ${p.completed}，${l.active} ${p.active}`}</title>
              <rect
                x={x(i) - 8}
                y={y(p.completed)}
                width="16"
                height={(p.completed / max) * 100}
                rx="2"
                fill="var(--chart-1)"
              />
              <rect
                x={x(i) - 8}
                y={y(p.completed + p.active)}
                width="16"
                height={Math.max(0, (p.active / max) * 100 - 2)}
                rx="2"
                fill="var(--chart-2)"
              />
            </g>
          ))
        )}
        {points.map((p, i) => (
          <g key={p.label}>
            <rect
              x={x(i) - 10}
              y="10"
              width="20"
              height="108"
              fill="transparent"
            >
              <title>{`${p.label}：${l.completed} ${p.completed}，${l.active} ${p.active}`}</title>
            </rect>
            {(i === 0 || i === points.length - 1) && (
              <text
                x={x(i)}
                y="136"
                textAnchor={i === 0 ? "start" : "end"}
                fill="var(--sidebar-foreground)"
                fontSize="10"
              >
                {p.label}
              </text>
            )}
          </g>
        ))}
      </svg>
      <div className="flex gap-4 text-xs">
        <span>
          <i className="mr-1 inline-block size-2 rounded-sm bg-chart-1" />
          {l.completed}
        </span>
        {metric === "trend" && (
          <span>
            <i className="mr-1 inline-block size-2 rounded-sm bg-chart-2" />
            {l.active}
          </span>
        )}
      </div>
      <details className="mt-3 text-xs">
        <summary className="cursor-pointer text-sidebar-foreground/65">
          {l.table}
        </summary>
        <table className="mt-2 w-full tabular-nums">
          <thead>
            <tr>
              <th />
              <th>{l.completed}</th>
              <th>{l.active}</th>
            </tr>
          </thead>
          <tbody>
            {points.map((p) => (
              <tr key={p.label}>
                <th className="text-left font-normal">{p.label}</th>
                <td className="text-center">{p.completed}</td>
                <td className="text-center">{p.active}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </ContextSection>
  )
}
const STATUS_COLORS = {
  1: "bg-chart-1",
  2: "bg-chart-2",
  3: "bg-chart-3",
  4: "bg-chart-4",
  5: "bg-chart-5",
}
function StatusSection({
  data,
  labels,
  ...props
}: Omit<React.ComponentProps<"section">, "children"> & {
  data: ContextStatus[]
  labels?: Partial<Sidebar04Labels>
}) {
  const l = { ...DEFAULT_LABELS, ...labels }
  const total = data.reduce((sum, s) => sum + Math.max(0, s.count), 0)
  const percent = (count: number) =>
    new Intl.NumberFormat("zh-CN", {
      style: "percent",
      maximumFractionDigits: 0,
    }).format(total ? Math.max(0, count) / total : 0)
  return (
    <ContextSection title={l.status} subtitle={l.distribution} {...props}>
      <div
        aria-hidden="true"
        className="mb-3 flex h-2 gap-0.5 overflow-hidden rounded-full"
      >
        {data.map((s) => (
          <span
            key={s.id}
            className={STATUS_COLORS[s.color]}
            style={{ width: percent(s.count) }}
          />
        ))}
      </div>
      <ul className="space-y-1.5">
        {data.map((s) => (
          <li
            key={s.id}
            className="flex items-center gap-2 rounded-md bg-sidebar-accent/50 px-3 py-2 text-xs"
          >
            <i
              aria-hidden="true"
              className={cn("size-2 rounded-full", STATUS_COLORS[s.color])}
            />
            <span className="flex-1">{s.name}</span>
            <span className="tabular-nums">{s.count}</span>
            <span className="w-10 text-right text-sidebar-foreground/65 tabular-nums">
              {percent(s.count)}
            </span>
          </li>
        ))}
      </ul>
    </ContextSection>
  )
}
function TaskSection({
  tasks,
  onTaskSelect,
  labels,
  ...props
}: Omit<React.ComponentProps<"section">, "children"> & {
  tasks: ContextTask[]
  onTaskSelect?: (task: ContextTask) => void
  labels?: Partial<Sidebar04Labels>
}) {
  const l = { ...DEFAULT_LABELS, ...labels }
  return (
    <ContextSection title={l.tasks} subtitle={l.taskSubtitle} {...props}>
      <div className="space-y-3">
        {tasks.length ? (
          tasks.map((task) => (
            <article
              key={task.id}
              className="rounded-lg border border-sidebar-border bg-sidebar-accent/20 p-3"
            >
              <button
                type="button"
                onClick={() => onTaskSelect?.(task)}
                className="w-full rounded-sm text-left focus-visible:outline-2 focus-visible:outline-ring"
              >
                <span className="text-sm font-medium">{task.title}</span>
                <span className="mt-1.5 line-clamp-2 text-xs leading-5 text-sidebar-foreground/65">
                  {task.description}
                </span>
              </button>
              <div className="mt-3 flex flex-wrap gap-1">
                {task.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between gap-2 text-xs text-sidebar-foreground/65">
                <span className="flex items-center gap-1">
                  <CalendarDays aria-hidden="true" className="size-3" />
                  {task.due}
                </span>
                <span>{task.priority}</span>
              </div>
            </article>
          ))
        ) : (
          <p className="text-xs">{l.empty}</p>
        )}
      </div>
    </ContextSection>
  )
}
export { ContextSection, ProgressSection, StatusSection, TaskSection }
export type { SectionProps, ProgressProps }
