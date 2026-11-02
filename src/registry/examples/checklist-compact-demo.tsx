import {
  Checklist,
  ChecklistItem,
  ChecklistList,
} from "@/registry/ui/checklist/checklist"

const ITEMS = [
  { label: "护照与签证", done: true },
  { label: "充电器和转换插头", done: true },
  { label: "下载离线地图", done: false },
  { label: "兑换少量现金", done: false },
]

// `size="sm"` 的紧凑款，适合塞进侧栏或小卡片；划线换成玫红，像红笔批改
export default function ChecklistCompactDemo() {
  return (
    <Checklist size="sm" tone="rose" className="w-full max-w-xs gap-2 rounded-xl border border-edge bg-background p-4 shadow-xs">
      <p className="text-xs font-medium text-muted-foreground">出发前检查</p>
      <ChecklistList>
        {ITEMS.map(({ label, done }) => (
          <ChecklistItem key={label} defaultChecked={done}>
            {label}
          </ChecklistItem>
        ))}
      </ChecklistList>
    </Checklist>
  )
}
