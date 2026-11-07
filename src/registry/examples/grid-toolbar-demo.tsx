"use client"

import * as React from "react"
import { RefreshCw, Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import { BarField } from "@/registry/ui/bar-field/bar-field"
import { BarSelect } from "@/registry/ui/bar-select/bar-select"
import {
  GridToolbar,
  GridToolbarItem,
} from "@/registry/ui/grid-toolbar/grid-toolbar"
import { SegmentedControl } from "@/registry/ui/segmented-control/segmented-control"

const LEVELS = [
  { value: "all", label: "全部" },
  { value: "info", label: "信息" },
  { value: "warn", label: "警告" },
  { value: "error", label: "错误" },
]

const SERVICES = [
  { value: "gateway", label: "网关" },
  { value: "worker", label: "任务队列" },
  { value: "search", label: "检索" },
]

/** 日志页的筛选条：搜索占满剩余宽度，级别、服务、刷新各占一格 */
const LOGS = [
  {
    time: "14:32:08",
    level: "info",
    service: "gateway",
    message: "请求已接收，开始构建",
  },
  {
    time: "14:32:09",
    level: "info",
    service: "worker",
    message: "依赖缓存命中，准备编译",
  },
  {
    time: "14:32:11",
    level: "warn",
    service: "search",
    message: "索引更新延迟，稍后重试",
  },
  {
    time: "14:32:12",
    level: "error",
    service: "worker",
    message: "资源上传失败，等待重试",
  },
  {
    time: "14:32:15",
    level: "info",
    service: "gateway",
    message: "构建产物已就绪",
  },
]

export default function GridToolbarDemo() {
  const [query, setQuery] = React.useState("")
  const [level, setLevel] = React.useState("all")
  const [services, setServices] = React.useState<string[]>([])
  const [revision, setRevision] = React.useState(0)
  const logs = LOGS.filter(
    (log) =>
      (level === "all" || level === log.level) &&
      (!services.length || services.includes(log.service)) &&
      `${log.message} ${SERVICES.find((service) => service.value === log.service)?.label}`.includes(
        query,
      ),
  )
  return (
    <section
      data-slot="grid-toolbar-demo"
      className="w-full max-w-3xl overflow-hidden rounded-xl border border-edge bg-background shadow-xs"
    >
      <header className="flex items-center justify-between border-b border-edge px-4 py-3">
        <h3 className="text-sm font-medium">构建日志</h3>
        <span role="status" className="text-xs text-muted-foreground">
          {revision ? `已刷新 ${revision} 次` : "最近一次构建"}
        </span>
      </header>
      <GridToolbar bordered={false} aria-label="日志筛选">
        <GridToolbarItem grow fullOnNarrow>
          <BarField
            aria-label="搜索日志"
            icon={<Search />}
            type="search"
            placeholder="搜索日志…"
            value={query}
            onValueChange={setQuery}
          />
        </GridToolbarItem>
        <GridToolbarItem fullOnNarrow>
          <SegmentedControl
            aria-label="级别"
            value={level}
            onValueChange={setLevel}
            options={LEVELS}
          />
        </GridToolbarItem>
        <GridToolbarItem className="flex-1 @min-[36rem]:w-44 @min-[36rem]:flex-none">
          <BarSelect
            multiple
            label="服务"
            placeholder="全部"
            options={SERVICES}
            value={services}
            onValueChange={setServices}
          />
        </GridToolbarItem>
        <GridToolbarItem separator="solid">
          <Button
            variant="ghost"
            size="icon-lg"
            aria-label="刷新"
            onClick={() => setRevision((value) => value + 1)}
          >
            <RefreshCw />
          </Button>
        </GridToolbarItem>
      </GridToolbar>
      <div aria-live="polite" className="border-t border-edge">
        {logs.map((log) => (
          <div
            key={log.time}
            className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-dashed border-edge px-4 py-3 font-mono text-xs last:border-b-0"
          >
            <time className="text-muted-foreground">{log.time}</time>
            <span className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className={`size-1.5 rounded-full ${log.level === "error" ? "bg-(--flow-rose)" : log.level === "warn" ? "bg-(--flow-amber)" : "bg-(--flow-green)"}`}
              />
              {LEVELS.find((item) => item.value === log.level)?.label}
            </span>
            <span className="text-muted-foreground">
              {SERVICES.find((item) => item.value === log.service)?.label}
            </span>
            <span className="basis-full @min-[36rem]:basis-auto">
              {log.message}
            </span>
          </div>
        ))}
        {!logs.length && (
          <p className="p-4 text-sm text-muted-foreground">没有匹配的日志</p>
        )}
      </div>
    </section>
  )
}
