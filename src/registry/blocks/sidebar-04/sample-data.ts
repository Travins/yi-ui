import type { ContextProject } from "./types"
const SAMPLE_PROJECTS: ContextProject[] = [
  {
    id: "platform",
    name: "研发协作平台",
    range: "6 月 29 日 — 7 月 29 日",
    members: ["陈知夏", "周明远"],
    progress: [
      { label: "6/29", completed: 8, active: 12 },
      { label: "7/5", completed: 16, active: 14 },
      { label: "7/11", completed: 22, active: 10 },
      { label: "7/17", completed: 29, active: 16 },
      { label: "7/23", completed: 38, active: 12 },
      { label: "7/29", completed: 46, active: 8 },
    ],
    statuses: [
      { id: "done", name: "已完成", count: 46, color: 1 },
      { id: "active", name: "进行中", count: 8, color: 2 },
      { id: "review", name: "待评审", count: 6, color: 3 },
      { id: "todo", name: "待开始", count: 20, color: 4 },
    ],
    tasks: [
      {
        id: "ci",
        title: "搭建持续集成流水线",
        description: "补齐类型检查与自动构建，在合并前完成回归验证。",
        tags: ["后端", "内部"],
        due: "7 月 24 日",
        priority: "高优先级",
      },
      {
        id: "refactor",
        title: "重构旧版模块",
        description: "拆分数据访问与界面逻辑，逐步迁移存量调用。",
        tags: ["架构"],
        due: "7 月 28 日",
        priority: "中优先级",
      },
      {
        id: "flag",
        title: "接入灰度发布开关",
        description: "为新版结算流程加上按团队放量的开关，并补齐监控告警。",
        tags: ["前端", "发布"],
        due: "7 月 26 日",
        priority: "中优先级",
      },
    ],
  },
  {
    id: "docs",
    name: "开发者文档",
    range: "7 月 1 日 — 7 月 31 日",
    members: ["苏晓宁"],
    progress: [
      { label: "7/1", completed: 2, active: 6 },
      { label: "7/7", completed: 4, active: 7 },
      { label: "7/13", completed: 7, active: 5 },
      { label: "7/19", completed: 11, active: 5 },
      { label: "7/25", completed: 15, active: 3 },
      { label: "7/31", completed: 18, active: 2 },
    ],
    statuses: [
      { id: "done", name: "已完成", count: 18, color: 1 },
      { id: "active", name: "进行中", count: 2, color: 2 },
    ],
    tasks: [
      {
        id: "guide",
        title: "完善接入指南",
        description: "整理本地安装与常见问题，补充可运行的示例。",
        tags: ["文档"],
        due: "7 月 30 日",
        priority: "中优先级",
      },
    ],
  },
]
export { SAMPLE_PROJECTS }
