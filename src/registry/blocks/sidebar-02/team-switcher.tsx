"use client"

import { ChevronsUpDownIcon, PlusIcon } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

import { formatLabel, type Sidebar02Labels } from "./config"
import { formatShortcut, useIsApplePlatform } from "./shortcuts"
import type { Sidebar02Team } from "./types"

/** 方形团队标识：有图标用图标，否则用团队名的第一个字。 */
function TeamMark({ team }: { team: Sidebar02Team }) {
  return (
    <div
      data-slot="sidebar-02-team-mark"
      aria-hidden="true"
      className="flex aspect-square size-8 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-sm font-medium text-sidebar-primary-foreground [&_svg]:size-4"
    >
      {team.icon ? <team.icon /> : team.name.trim().slice(0, 1)}
    </div>
  )
}

/** 侧栏顶部的团队切换：当前团队 + 下拉菜单（单选列表、⌘1…⌘9 快捷键提示、新建团队）。 */
function TeamSwitcher({
  teams,
  activeTeamId,
  onTeamChange,
  onCreateTeam,
  labels,
}: {
  teams: Sidebar02Team[]
  activeTeamId?: string
  onTeamChange: (teamId: string) => void
  onCreateTeam?: () => void
  labels: Sidebar02Labels
}) {
  const { isMobile, state } = useSidebar()
  const isApple = useIsApplePlatform()
  const activeTeam = teams.find((team) => team.id === activeTeamId) ?? teams[0]
  if (!activeTeam) return null

  return (
    <SidebarMenu data-slot="sidebar-02-team-switcher">
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                aria-label={formatLabel(labels.switchTeam, {
                  name: activeTeam.name,
                  plan: activeTeam.plan,
                })}
                className="data-popup-open:bg-sidebar-accent data-popup-open:text-sidebar-accent-foreground"
              />
            }
          >
            <TeamMark team={activeTeam} />
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{activeTeam.name}</span>
              <span className="truncate text-xs text-sidebar-foreground/70">
                {activeTeam.plan}
              </span>
            </div>
            <ChevronsUpDownIcon
              aria-hidden="true"
              className="ml-auto group-data-[collapsible=icon]:hidden"
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side={!isMobile && state === "collapsed" ? "right" : "bottom"}
            align="start"
            className="min-w-56"
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel>{labels.teamMenuTitle}</DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={activeTeam.id}
                onValueChange={(value) => onTeamChange(String(value))}
              >
                {teams.map((team, index) => (
                  <DropdownMenuRadioItem
                    key={team.id}
                    value={team.id}
                    className="gap-2 py-1.5 pr-8"
                  >
                    <TeamMark team={team} />
                    <span className="flex-1 truncate">{team.name}</span>
                    {index < 9 ? (
                      <DropdownMenuShortcut className="tracking-normal tabular-nums">
                        {formatShortcut(String(index + 1), isApple)}
                      </DropdownMenuShortcut>
                    ) : null}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onCreateTeam}>
              <PlusIcon />
              {labels.newTeam}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

export { TeamMark, TeamSwitcher }
