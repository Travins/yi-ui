/** 所有可见文案，通过 `labels` 属性逐项覆盖；含 `{query}` 的文案渲染时填入实际值。 */
const DEFAULT_LABELS = {
  navLabel: "主导航",
  footerLabel: "辅助入口",
  collapse: "收起侧栏",
  expand: "展开侧栏",
  search: "搜索导航",
  searchPlaceholder: "搜索导航…",
  empty: "没有找到「{query}」相关的导航项",
}

type Sidebar01Labels = typeof DEFAULT_LABELS

/** 行高：触屏上加高一档（32 → 40）；收起后的图标按钮也跟着变大，需要配合 SidebarProvider 加宽图标栏，见文档 */
const ROW_CLASS =
  "pointer-coarse:h-10 pointer-coarse:group-data-[collapsible=icon]:size-10!"
/** 二级行高：28 → 36 */
const SUB_ROW_CLASS = "pointer-coarse:h-9"

export { DEFAULT_LABELS, ROW_CLASS, SUB_ROW_CLASS }
export type { Sidebar01Labels }
