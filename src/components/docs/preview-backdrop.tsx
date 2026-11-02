import { cn } from "@/lib/utils"

/**
 * 卡片类组件的示例背后垫一层底纹，只在最外一圈渐隐（渐隐范围小，否则底纹几乎看不见），让卡片像摆在图纸上。
 * 只登记「示例本身是卡片、又不铺满画框」的组件；自带背景的（轨道、波纹、流程图、问候、动态格）
 * 和铺满画框的（跑马灯、文字动效、等轴测标志、字符矩阵、地球）不在这里。
 * 列表缩略图与组件详情页的预览共用这张表，按组件名取。
 */
const BACKDROPS: Record<string, "dots" | "grid"> = {
  "color-picker": "dots",
  "palette-editor": "dots",
  "bar-field": "dots",
  "bar-select": "dots",
  "grid-toolbar": "dots",
  "grid-pagination": "dots",
  "local-time": "dots",
  "stat-card": "dots",
  "mini-chart": "grid",
  "chart-card": "dots",
  timeline: "grid",
  "card-stack": "dots",
  checklist: "grid",
  "code-stack": "dots",
  "value-slider": "dots",
  "amount-input": "dots",
  "region-picker": "dots",
  "control-panel": "dots",
  "segmented-control": "dots",
  "toggle-switch": "dots",
  "tone-picker": "dots",
  "angle-dial": "dots",
  "xy-pad": "dots",
}

export function PreviewBackdrop({ name }: { name?: string }) {
  const kind = name ? BACKDROPS[name] : undefined
  if (!kind) return null
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 -z-10 [mask-image:radial-gradient(ellipse_at_center,black_45%,transparent_90%)]",
        kind === "dots" ? "bg-dots" : "bg-grid opacity-70",
      )}
    />
  )
}
