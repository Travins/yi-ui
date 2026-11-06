/** 数值必须非负；颜色序号在项目切换时保持一致。 */
type ContextStatus = {
  id: string
  name: string
  count: number
  color: 1 | 2 | 3 | 4 | 5
}
type ContextTask = {
  id: string
  title: string
  description: string
  tags: string[]
  due: string
  priority: string
}
type ContextPoint = { label: string; completed: number; active: number }
type ContextProject = {
  id: string
  name: string
  range: string
  members: string[]
  progress: ContextPoint[]
  statuses: ContextStatus[]
  tasks: ContextTask[]
}
export type { ContextStatus, ContextTask, ContextPoint, ContextProject }
