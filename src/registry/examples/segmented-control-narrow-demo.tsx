import { SegmentedControl } from "@/registry/ui/segmented-control/segmented-control"

const FIELDS = [
  {
    label: "坐标刻度",
    defaultValue: "linear",
    options: [
      { value: "linear", label: "线性" },
      { value: "log", label: "对数" },
      { value: "auto", label: "自动" },
    ],
  },
  {
    label: "图例位置",
    defaultValue: "right",
    options: [
      { value: "top", label: "顶部" },
      { value: "right", label: "右侧" },
      { value: "none", label: "隐藏" },
    ],
  },
  {
    label: "网格线",
    defaultValue: "major",
    options: [
      { value: "major", label: "主要" },
      { value: "all", label: "全部" },
      { value: "none", label: "关闭" },
    ],
  },
]

export default function SegmentedControlNarrowDemo() {
  return (
    <div
      data-slot="segmented-control-narrow-demo"
      className="w-full max-w-[23rem] rounded-xl border border-edge bg-background p-4 shadow-xs"
    >
      <p className="mb-3 text-sm font-medium">图表参数</p>
      {/* 参数面板：每列至少 6.5rem（约 104px），宽时三列、窄时自动换成两列 */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(6.5rem,1fr))] gap-2">
        {FIELDS.map((field) => (
          <div key={field.label} className="flex min-w-0 flex-col gap-1.5">
            <span className="text-xs text-muted-foreground">{field.label}</span>
            <SegmentedControl
              aria-label={field.label}
              defaultValue={field.defaultValue}
              options={field.options}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
