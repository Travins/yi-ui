import {
  Checklist,
  ChecklistItem,
  ChecklistList,
  ChecklistProgress,
} from "@/registry/ui/checklist/checklist"

const TASKS = [
  { label: "整理本周的设计稿", done: true },
  { label: "回复三封合作邮件", done: true },
  { label: "给组件库补上暗色截图", done: false },
  { label: "写完《线条网格》那篇文章", done: false },
  { label: "周五前把 OSS 部署跑通", done: false },
  { label: "买一盆新的绿植", done: false },
]

// 非受控：`defaultChecked` 给初始状态，点击任意一条划掉或恢复，进度条自动统计
export default function ChecklistInteractiveDemo() {
  return (
    <Checklist tone="blue" className="w-full max-w-md gap-4 rounded-xl border border-edge bg-background p-4 shadow-xs">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-medium">本周待办</p>
        <ChecklistProgress total={TASKS.length} tone="blue" className="w-32" />
      </div>
      <ChecklistList>
        {TASKS.map(({ label, done }) => (
          <ChecklistItem key={label} defaultChecked={done}>
            {label}
          </ChecklistItem>
        ))}
      </ChecklistList>
    </Checklist>
  )
}
