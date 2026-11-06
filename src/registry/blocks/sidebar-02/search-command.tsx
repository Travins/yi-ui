"use client"

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command"

import type { Sidebar02Labels } from "./config"
import type {
  Sidebar02NavGroup,
  Sidebar02NavItem,
  Sidebar02QuickAction,
} from "./types"

type SearchEntry = { item: Sidebar02NavItem; group?: string }

/** 搜索弹窗：可搜全部导航项与快捷操作，回车选中。 */
function SearchCommand({
  open,
  onOpenChange,
  groups,
  footerItems,
  quickActions,
  onSelectItem,
  onSelectAction,
  labels,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  groups: Sidebar02NavGroup[]
  footerItems: Sidebar02NavItem[]
  quickActions: Sidebar02QuickAction[]
  onSelectItem: (item: Sidebar02NavItem) => void
  onSelectAction: (action: Sidebar02QuickAction) => void
  labels: Sidebar02Labels
}) {
  const entries: SearchEntry[] = [
    ...groups.flatMap((group) =>
      group.items.map((item) => ({ item, group: group.label })),
    ),
    ...footerItems.map((item) => ({ item })),
  ]

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title={labels.searchTitle}
      description={labels.searchDescription}
    >
      <Command>
        <CommandInput placeholder={labels.searchPlaceholder} />
        <CommandList>
          <CommandEmpty>{labels.searchEmpty}</CommandEmpty>
          <CommandGroup heading={labels.searchPages}>
            {entries.map(({ item, group }) => (
              <CommandItem
                key={item.id}
                value={item.id}
                keywords={[item.label, group ?? ""]}
                onSelect={() => onSelectItem(item)}
              >
                <item.icon />
                {item.label}
                {group ? <CommandShortcut>{group}</CommandShortcut> : null}
              </CommandItem>
            ))}
          </CommandGroup>
          {quickActions.length > 0 ? (
            <CommandGroup heading={labels.searchActions}>
              {quickActions.map((action) => (
                <CommandItem
                  key={action.id}
                  value={action.id}
                  keywords={[action.label]}
                  onSelect={() => onSelectAction(action)}
                >
                  <action.icon />
                  {action.label}
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}
        </CommandList>
      </Command>
    </CommandDialog>
  )
}

export { SearchCommand }
