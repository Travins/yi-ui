"use client"
import * as React from "react"
import { MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
} from "@/components/ui/dropdown-menu"
import { DATA_TABLE_LABELS } from "./config"
import type { DataTableLabels } from "./types"

type DataTableRowAction =
  | "separator"
  | {
      label: string
      icon?: React.ReactNode
      shortcut?: React.ReactNode
      destructive?: boolean
      onSelect: () => void
    }
function DataTableRowActions({
  label,
  ariaLabel,
  labels: overrides,
  actions,
  ...props
}: React.ComponentProps<"div"> & {
  /** 行名称，用于生成按钮的读屏名称 */
  label: string
  /**
   * 完整的读屏名称，优先于 `labels.rowActions`。传函数时参数是 `label`，方便按行生成
   */
  ariaLabel?: string | ((label: string) => string)
  /** 只用到 `rowActions`（模板，`{name}` 替换为 `label`，默认「{name} 的操作」） */
  labels?: Partial<Pick<DataTableLabels, "rowActions">>
  actions: DataTableRowAction[]
}) {
  const template = overrides?.rowActions ?? DATA_TABLE_LABELS.rowActions
  const triggerLabel =
    typeof ariaLabel === "function"
      ? ariaLabel(label)
      : (ariaLabel ?? template.replaceAll("{name}", label))
  return (
    <div {...props} data-slot="data-table-row-actions">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground group-hover/row:text-foreground hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground"
              aria-label={triggerLabel}
            />
          }
        >
          <MoreHorizontal aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-auto min-w-40 *:text-xs! [&_[role=menuitem]_svg]:size-3.5!"
        >
          {actions.map((action, index) =>
            action === "separator" ? (
              <DropdownMenuSeparator key={index} />
            ) : (
              <DropdownMenuItem
                key={index}
                variant={action.destructive ? "destructive" : "default"}
                onClick={action.onSelect}
              >
                {action.icon}
                <span className="whitespace-nowrap">{action.label}</span>
                {action.shortcut && (
                  // 右侧附注（如编号）不换行，菜单宽度随内容撑开
                  <DropdownMenuShortcut className="ps-4 font-mono whitespace-nowrap">
                    {action.shortcut}
                  </DropdownMenuShortcut>
                )}
              </DropdownMenuItem>
            ),
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
export { DataTableRowActions }
export type { DataTableRowAction }
