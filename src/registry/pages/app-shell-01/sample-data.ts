/** 演示用假数据：替换成你自己的接口数据即可。 */

import {
  ActivityIcon,
  BellRingIcon,
  GlobeIcon,
  LayoutGridIcon,
  RadarIcon,
  TimerIcon,
  type LucideIcon,
} from "lucide-react"

import type { StatFormatOptions } from "@/registry/lib/data-display"

type EventStatus = "ok" | "warning" | "error"

type EventRow = {
  id: string
  app: string
  target: string
  status: EventStatus
  latency: string
  time: string
}

const events: EventRow[] = [
  {
    id: "e-1042",
    app: "订单中心",
    target: "POST /api/orders",
    status: "ok",
    latency: "128 ms",
    time: "14:32:05",
  },
  {
    id: "e-1041",
    app: "用户中心",
    target: "GET /api/profile",
    status: "ok",
    latency: "86 ms",
    time: "14:31:48",
  },
  {
    id: "e-1040",
    app: "支付网关",
    target: "POST /api/pay/notify",
    status: "error",
    latency: "超时",
    time: "14:30:12",
  },
  {
    id: "e-1039",
    app: "商品服务",
    target: "GET /api/items?page=1",
    status: "warning",
    latency: "1 420 ms",
    time: "14:28:57",
  },
  {
    id: "e-1038",
    app: "订单中心",
    target: "GET /api/orders/9021",
    status: "ok",
    latency: "97 ms",
    time: "14:27:33",
  },
  {
    id: "e-1037",
    app: "消息推送",
    target: "POST /api/push",
    status: "ok",
    latency: "212 ms",
    time: "14:26:10",
  },
  {
    id: "e-1036",
    app: "用户中心",
    target: "POST /api/login",
    status: "warning",
    latency: "960 ms",
    time: "14:24:41",
  },
  {
    id: "e-1035",
    app: "支付网关",
    target: "GET /api/pay/status",
    status: "ok",
    latency: "74 ms",
    time: "14:23:02",
  },
  {
    id: "e-1034",
    app: "商品服务",
    target: "GET /api/items/301",
    status: "ok",
    latency: "103 ms",
    time: "14:21:50",
  },
  {
    id: "e-1033",
    app: "消息推送",
    target: "GET /api/push/queue",
    status: "error",
    latency: "连接被拒绝",
    time: "14:19:26",
  },
  {
    id: "e-1032",
    app: "订单中心",
    target: "PUT /api/orders/9018",
    status: "ok",
    latency: "141 ms",
    time: "14:17:09",
  },
  {
    id: "e-1031",
    app: "用户中心",
    target: "GET /api/me",
    status: "ok",
    latency: "69 ms",
    time: "14:15:44",
  },
]

/** 列表页独立的 180 条记录：固定起点、37 秒间隔与整数公式，服务端和客户端结果一致。 */
const listEvents = Array.from({ length: 180 }, (_, index) => ({
  ...(events[index % events.length] ?? events[0]),
  id: `list-${180 - index}`,
  latencyMs: 60 + ((index * 137) % 1800),
  time: new Date(Date.UTC(2026, 9, 31, 14, 32, 5) - index * 37000)
    .toISOString()
    .slice(11, 19),
}))

type StatItem = {
  id: string
  label: string
  value: number
  unit?: string
  /** 大号数字的格式 */
  format?: StatFormatOptions
  /** 较上一周期的变化，单位是百分点，或 deltaFormat 指定的其他口径 */
  delta: number
  deltaFormat?: StatFormatOptions
  /** 越低越好的指标（耗时、告警数）：下降用「好」的颜色 */
  invert?: boolean
  hint: string
  /** 近 24 小时每 2 小时一个点，共 12 个，用来画迷你走势 */
  trend: number[]
  icon: LucideIcon
}

const stats: StatItem[] = [
  {
    id: "availability",
    label: "可用率",
    value: 99.96,
    unit: "%",
    format: { compact: false, digits: 2 },
    delta: 0.02,
    deltaFormat: { digits: 2 },
    hint: "近 24 小时",
    trend: [
      99.91, 99.93, 99.9, 99.94, 99.95, 99.92, 99.94, 99.96, 99.95, 99.97,
      99.96, 99.96,
    ],
    icon: ActivityIcon,
  },
  {
    id: "probes",
    label: "拨测次数",
    value: 128640,
    format: { compact: false },
    delta: 4.1,
    hint: "较昨日",
    trend: [
      8200, 8900, 9400, 10100, 10800, 11600, 12100, 11800, 12400, 13200, 13900,
      14200,
    ],
    icon: RadarIcon,
  },
  {
    id: "latency",
    label: "平均响应",
    value: 132,
    unit: "ms",
    delta: -8,
    deltaFormat: { style: "number", digits: 0 },
    invert: true,
    hint: "ms · P50",
    trend: [141, 138, 145, 150, 148, 139, 142, 136, 134, 133, 131, 132],
    icon: TimerIcon,
  },
  {
    id: "alerts",
    label: "未恢复告警",
    value: 3,
    delta: 1,
    deltaFormat: { style: "number", digits: 0 },
    invert: true,
    hint: "需要处理",
    trend: [1, 1, 2, 1, 1, 2, 2, 3, 2, 2, 3, 3],
    icon: BellRingIcon,
  },
]

/** 24 个小时的响应耗时（ms），用来画简易柱状图 */
const latencySeries = [
  118, 124, 109, 131, 126, 140, 152, 148, 135, 129, 122, 118, 125, 133, 141,
  160, 172, 149, 138, 130, 127, 121, 116, 112,
]

/** 概览页标签条：value 与 events 的 app 字段对应，替换数据时一起改 */
const scopes = [
  { value: "all", label: "全局总览", icon: GlobeIcon },
  { value: "orders", label: "订单中心", icon: LayoutGridIcon },
  { value: "payments", label: "支付网关", icon: LayoutGridIcon },
]

/** 概览页标签条右侧的时间范围说明 */
const dateRange = "2025-06-01 ~ 2025-06-02"

const services = [
  {
    id: "probe",
    label: "拨测服务",
    state: "healthy" as const,
    detail: "全部节点在线",
  },
  {
    id: "worker",
    label: "任务调度",
    state: "warning" as const,
    detail: "队列积压 1 200 条，正在消化",
  },
  {
    id: "notify",
    label: "通知通道",
    state: "healthy" as const,
    detail: "站内信、邮件均可用",
  },
]

/** 每 2 小时一档的横轴标签，共 12 档，概览以外的页面摘要共用 */
const bucketHours = Array.from(
  { length: 12 },
  (_, index) => `${String(index * 2).padStart(2, "0")}:00`,
)

/** 状态码分布：近 24 小时 128 640 次请求；tone 同时用于环形图与图例 */
const statusCodes = [
  { id: "2xx", label: "2xx 成功", value: 118420, tone: "green" },
  { id: "3xx", label: "3xx 重定向", value: 6310, tone: "blue" },
  { id: "4xx", label: "4xx 客户端", value: 2980, tone: "amber" },
  { id: "5xx", label: "5xx 服务端", value: 930, tone: "rose" },
] as const

/** 错误预算（30 天窗口，SLA 99.95% 对应 21.6 分钟不可用时间） */
const errorBudget = {
  target: 99.95,
  current: 99.96,
  totalMinutes: 21.6,
  usedMinutes: 8.2,
}

/** 最慢接口：近 24 小时 P95 耗时（ms），已按从慢到快排序 */
const slowestEndpoints = [
  { label: "POST /api/pay/notify", value: 1840 },
  { label: "GET /api/items?page=1", value: 1420 },
  { label: "POST /api/login", value: 960 },
  { label: "GET /api/push/queue", value: 780 },
  { label: "POST /api/orders", value: 540 },
  { label: "GET /api/orders/9021", value: 310 },
]

/** 拨测记录：每 2 小时一档、按拨测类型的次数，合计 128 640 次，与概览的拨测次数一致 */
const probeVolume = (
  [
    [4787, 1390, 927, 618],
    [5196, 1509, 1006, 670],
    [5489, 1593, 1062, 708],
    [5897, 1712, 1141, 761],
    [6305, 1831, 1221, 814],
    [6773, 1966, 1311, 874],
    [7065, 2051, 1367, 912],
    [6890, 2000, 1333, 889],
    [7240, 2102, 1401, 934],
    [7707, 2238, 1492, 994],
    [8116, 2356, 1571, 1047],
    [8292, 2407, 1605, 1070],
  ] satisfies [number, number, number, number][]
).map(([http, tcp, dns, ping], index) => ({
  hour: bucketHours[index] ?? "",
  http,
  tcp,
  dns,
  ping,
}))

/** 拨测记录：失败与超时共 515 次，按原因拆分 */
const failureReasons = [
  { label: "连接超时", value: 236, tone: "rose" },
  { label: "状态码异常", value: 139, tone: "amber" },
  { label: "DNS 解析", value: 78, tone: "violet" },
  { label: "TLS 握手", value: 62, tone: "blue" },
] as const

/** 接口探测：近 24 小时各耗时区间的请求数，合计 128 640 */
const latencyBuckets = [
  { bucket: "<50", count: 18420 },
  { bucket: "50–100", count: 41260 },
  { bucket: "100–200", count: 39870 },
  { bucket: "200–500", count: 21540 },
  { bucket: "0.5–1 s", count: 5980 },
  { bucket: ">1 s", count: 1570 },
]

/** 接口探测：各分位耗时的 SLO 达标率（%） */
const sloTargets = [
  { id: "p50", label: "P50", target: "≤ 150 ms", value: 98 },
  { id: "p95", label: "P95", target: "≤ 800 ms", value: 94 },
  { id: "p99", label: "P99", target: "≤ 1.5 s", value: 91 },
]

/** 节点监控：按区域汇总的节点资源，cpu / memory 是使用率（%） */
const nodeGroups = [
  { id: "bj", name: "华北 · 北京", online: 12, total: 12, cpu: 38, memory: 52 },
  { id: "sh", name: "华东 · 上海", online: 16, total: 16, cpu: 46, memory: 61 },
  { id: "gz", name: "华南 · 广州", online: 8, total: 9, cpu: 71, memory: 78 },
  { id: "sg", name: "海外 · 新加坡", online: 6, total: 6, cpu: 29, memory: 44 },
]

/** 事件与异常：每 2 小时一档的事件数，按级别拆分 */
const eventVolume = (
  [
    [1, 4],
    [0, 3],
    [0, 2],
    [2, 5],
    [1, 4],
    [0, 3],
    [1, 6],
    [3, 7],
    [2, 5],
    [1, 6],
    [4, 8],
    [3, 7],
  ] satisfies [number, number][]
).map(([error, warning], index) => ({
  hour: bucketHours[index] ?? "",
  error,
  warning,
}))

/** 事件与异常：异常事件的处理进度，三项相加为异常总数 18 */
const resolution = { recovered: 15, inProgress: 2, pending: 1 }

export {
  bucketHours,
  dateRange,
  errorBudget,
  eventVolume,
  events,
  listEvents,
  failureReasons,
  latencyBuckets,
  latencySeries,
  nodeGroups,
  probeVolume,
  resolution,
  scopes,
  services,
  slowestEndpoints,
  sloTargets,
  statusCodes,
  stats,
}
export type { EventRow, EventStatus, StatItem }
