"use client"

import { createContext, createElement, useContext, type ReactNode } from "react"

/** 记住侧栏折叠状态的 localStorage 键（统一使用 yiui: 前缀） */
const DEFAULT_STORAGE_KEY = "yiui:app-shell:collapsed"

/**
 * 侧栏折叠状态在水合前由内联脚本写到 AppShell 根元素的 `data-collapsed`，
 * 所以所有随折叠变化的样式都用 `group-data-[collapsed]/app-shell:` 变体表达，
 * 而不是依赖 React 状态——这样首帧就是正确的折叠状态。
 * Tailwind 需要看到完整类名，所以下面写字面量而不是拼接。
 */

/**
 * 一级导航的宽度类名，只在这里定义一次：
 * app-shell.tsx 的侧栏与 app-header.tsx 的品牌区共用，顶栏才能和导航对齐。
 */
const NAV_WIDTH_CLASS = {
  /** 侧栏：展开 200px，折叠 60px */
  sidebar: "w-[200px] group-data-[collapsed]/app-shell:w-[60px]",
  /** 顶栏品牌区：同侧栏；窄屏下始终按图标栏宽度 */
  brand:
    "w-[200px] group-data-[collapsed]/app-shell:w-[60px] max-[800px]:w-[60px]",
} as const

/**
 * 宽度变化时的过渡，和宽度放在一起，避免两处不一致。
 * 只有 AppShell 根元素带 `data-animate`（用户点击折叠按钮之后）才播放，
 * 首次渲染与水合时不会出现宽度动画。
 */
const NAV_WIDTH_TRANSITION =
  "motion-safe:group-data-[animate]/app-shell:transition-[width] motion-safe:group-data-[animate]/app-shell:duration-200"

/**
 * 控制台布局里所有用户可见的文案。
 * 通过 AppShell 的 `labels` 覆盖其中任意几项；带占位符的文案用 formatLabel 填充。
 * 导航数据里的文字不在这里，见 nav-config.ts；演示数据见 sample-data.ts。
 */
const DEFAULT_LABELS = {
  skipToContent: "跳转到主内容",
  mainContent: "主内容",
  mainNavigation: "主导航",
  mainNavigationDescription: "选择要访问的页面",
  openNavigation: "打开导航",
  collapseSidebar: "收起侧边栏",
  expandSidebar: "展开侧边栏",
  breadcrumb: "面包屑",
  brandHome: "{name}，回到首页",
  workspaceNavigation: "{name}导航",
  workspaceSidebar: "{name}侧栏",
  toggleTheme: "切换亮暗模式",
  userMenu: "用户菜单：{name}",
  signOut: "退出登录",
  serviceStatus: "服务状态",
  serviceStatusAria: "查看服务状态：{name}",
  checkedAt: "检查于 {name}",
  stateHealthy: "可用",
  stateWarning: "需关注",
  stateUnavailable: "不可用",
  stateUnknown: "未知",
  // 概览仪表盘
  overviewSection: "工作台",
  overviewTitle: "概览",
  overviewDescription: "近 24 小时的拨测质量与告警情况",
  exportAction: "导出",
  refreshAction: "刷新",
  scopeSwitch: "数据范围",
  keyMetrics: "关键指标",
  statTrendLabel: "{name}近 24 小时走势",
  latencyTrend: "响应耗时趋势",
  latencyTrendUnit: "每小时 P50，单位 ms",
  latencySeries: "P50 响应耗时",
  latencyPeak: "峰值",
  latencyLow: "谷值",
  latencyAverage: "均值",
  latencyChartLabel: "过去 24 小时响应耗时，最高 {max} 毫秒，最低 {min} 毫秒",
  recentEvents: "最近事件",
  recentEventsCount: "按时间倒序，共 {count} 条",
  eventsCaption: "最近拨测事件",
  // 概览的补充图表
  errorBudget: "错误预算",
  errorBudgetDescription: "30 天窗口，SLA 目标 {target}",
  errorBudgetRemaining: "预算剩余",
  errorBudgetLabel: "30 天错误预算剩余 {percent}",
  errorBudgetTarget: "SLA 目标",
  errorBudgetCurrent: "当前可用率",
  errorBudgetUsed: "已消耗 {used} / {total} 分钟",
  statusCodes: "状态码分布",
  statusCodesDescription: "近 24 小时请求按响应状态码归类",
  statusCodesTotal: "总请求",
  statusCodesLabel: "近 24 小时状态码分布，共 {total} 次请求",
  slowestEndpoints: "最慢接口",
  slowestEndpointsDescription: "近 24 小时 P95 响应耗时，单位 ms",
  slowestEndpointsLabel: "最慢接口 P95 响应耗时排名",
  // 各导航页的数据摘要
  pageSummary: "数据摘要",
  metricTotal: "总拨测",
  metricSuccessRate: "成功率",
  metricFailed: "失败与超时",
  probeVolume: "拨测量",
  probeVolumeDescription: "今日每 2 小时一档，按拨测类型堆叠",
  probeVolumeLabel: "今日拨测量按拨测类型堆叠的柱图",
  probeHttp: "HTTP(S)",
  probeTcp: "TCP",
  probeDns: "DNS",
  probePing: "Ping",
  failureReasons: "异常原因",
  failureReasonsDescription: "失败与超时的原因占比",
  failureReasonsTotal: "异常拨测",
  failureReasonsLabel: "异常拨测原因占比，共 {total} 次",
  latencyDistribution: "耗时分布",
  latencyDistributionDescription: "近 24 小时各耗时区间的请求数",
  latencyDistributionSeries: "请求数",
  latencyDistributionLabel: "近 24 小时响应耗时分布柱图",
  sloAttainment: "SLO 达标率",
  sloAttainmentDescription: "按接口统计，达标的占比",
  sloRingLabel: "{name} 耗时 SLO 达标 {percent}",
  nodeResources: "节点资源概览",
  nodeCpu: "CPU",
  nodeMemory: "内存",
  nodeOnline: "在线节点 {online} / {total}",
  nodeRingLabel: "{name}{metric}使用率 {percent}",
  eventsTrend: "事件趋势",
  eventsTrendDescription: "今日每 2 小时一档，按级别堆叠",
  eventsTrendLabel: "今日事件数按级别堆叠的柱图",
  eventsTotal: "事件总数",
  resolution: "处理进度",
  resolutionDescription: "异常事件的恢复情况",
  resolutionRecovered: "已恢复",
  resolutionInProgress: "处理中",
  resolutionPending: "待认领",
  resolutionLabel: "异常事件已恢复 {percent}",
  // 列表与表格
  createAction: "新建",
  allApplications: "全部应用",
  searchEvents: "搜索应用或目标",
  listCaption: "{title}列表",
  emptyRows: "没有匹配的记录",
  columnApp: "应用",
  columnTarget: "目标",
  columnStatus: "状态",
  columnLatency: "耗时",
  columnTime: "时间",
  // 事件状态
  eventOk: "正常",
  eventWarning: "告警",
  eventError: "错误",
} as const

type AppShellLabels = { [Key in keyof typeof DEFAULT_LABELS]: string }

/** 合并用户传入的文案与默认文案。 */
function resolveLabels(labels?: Partial<AppShellLabels>): AppShellLabels {
  return { ...DEFAULT_LABELS, ...labels }
}

/**
 * 把文案里的占位符替换成实际值。
 * 传字符串时等价于替换 `{name}`（保持早期写法可用）；传对象可一次替换多个，如 `{ count: 3 }`。
 */
function formatLabel(
  template: string,
  values: string | Record<string, string | number>,
): string {
  if (typeof values === "string") return template.replace("{name}", values)
  return Object.entries(values).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, String(value)),
    template,
  )
}

/** AppShell 向下提供的文案，让主区域里的页面组件也能拿到同一套覆盖值。 */
const AppShellLabelsContext = createContext<
  Partial<AppShellLabels> | undefined
>(undefined)

function AppShellLabelsProvider({
  labels,
  children,
}: {
  labels?: Partial<AppShellLabels>
  children: ReactNode
}) {
  // 本文件是 .ts（不含 JSX），用 createElement 渲染 Provider
  return createElement(
    AppShellLabelsContext.Provider,
    { value: labels },
    children,
  )
}

/**
 * 读取当前文案：组件自己的 labels > AppShell 提供的 labels > DEFAULT_LABELS。
 * 页面组件（PageHeader、ListPage 等）放在 AppShell 里时会自动继承 AppShell 的文案。
 */
function useAppShellLabels(labels?: Partial<AppShellLabels>): AppShellLabels {
  const inherited = useContext(AppShellLabelsContext)
  return resolveLabels({ ...inherited, ...labels })
}

export {
  AppShellLabelsProvider,
  DEFAULT_LABELS,
  DEFAULT_STORAGE_KEY,
  NAV_WIDTH_CLASS,
  NAV_WIDTH_TRANSITION,
  formatLabel,
  resolveLabels,
  useAppShellLabels,
}
export type { AppShellLabels }
