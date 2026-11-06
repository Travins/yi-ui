"use client"

import * as React from "react"
import { ChevronsUpDown, CircleHelp, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar"
import { useControllableState } from "@/registry/hooks/use-controllable-state"
import { cn } from "@/lib/utils"
import { DEFAULT_LABELS, type Sidebar04Labels } from "./config"
import { SAMPLE_PROJECTS } from "./sample-data"
import { ProgressSection, StatusSection, TaskSection } from "./sections"
import type { ContextProject, ContextTask } from "./types"

type Sidebar04Props = Omit<
  React.ComponentProps<typeof Sidebar>,
  "side" | "collapsible"
> & {
  /** 项目数据；默认中文研发示例 */ projects?: ContextProject[]
  /** 受控项目 id */ projectId?: string
  /** 非受控初始项目；默认第一项 */ defaultProjectId?: string
  /** 项目变化通知 */ onProjectChange?: (payload: { projectId: string }) => void
  /** 点击任务标题及描述 */ onTaskSelect?: (task: ContextTask) => void
  /** 帮助入口 */ onHelp?: () => void
  /** 覆盖默认文案 */ labels?: Partial<Sidebar04Labels>
}
function Sidebar04({
  projects = SAMPLE_PROJECTS,
  projectId,
  defaultProjectId,
  onProjectChange,
  onTaskSelect,
  onHelp,
  labels,
  children,
  className,
  ...props
}: Sidebar04Props) {
  const l = { ...DEFAULT_LABELS, ...labels }
  const { toggleSidebar } = useSidebar()
  const [id, setId] = useControllableState({
    prop: projectId,
    defaultProp: defaultProjectId ?? projects[0]?.id ?? "",
    onChange: (projectId) => onProjectChange?.({ projectId }),
  })
  const project = projects.find((p) => p.id === id) ?? projects[0]
  return (
    <Sidebar
      data-slot="sidebar-04"
      side="right"
      collapsible="offcanvas"
      className={cn("[--sidebar-width:20rem]", className)}
      {...props}
    >
      <SidebarHeader
        data-slot="sidebar-04-header"
        className="h-14 flex-row items-center gap-2 border-b border-sidebar-border px-3 py-0"
      >
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="sm"
                className="min-w-0 flex-1 justify-start pointer-coarse:h-9"
                aria-label={l.project}
              />
            }
          >
            <span
              aria-hidden="true"
              className="flex size-6 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground"
            >
              {project?.name.slice(0, 1)}
            </span>
            <span className="truncate">{project?.name ?? l.empty}</span>
            <ChevronsUpDown aria-hidden="true" className="ml-auto shrink-0" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuRadioGroup
              value={project?.id ?? ""}
              onValueChange={(value) => setId(String(value))}
            >
              {projects.map((p) => (
                <DropdownMenuRadioItem key={p.id} value={p.id}>
                  {p.name}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <div role="group" aria-label={l.members} className="flex -space-x-1.5">
          {project?.members.slice(0, 2).map((name) => (
            <Avatar
              key={name}
              className="size-6 ring-2 ring-sidebar"
              title={name}
            >
              <AvatarFallback className="bg-sidebar-accent text-[10px] text-sidebar-accent-foreground">
                {name.slice(-1)}
              </AvatarFallback>
            </Avatar>
          ))}
        </div>
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label={l.close}
          onClick={toggleSidebar}
        >
          <X aria-hidden="true" />
        </Button>
      </SidebarHeader>
      <SidebarContent className="gap-0">
        {children ??
          (project && (
            <>
              <ProgressSection
                data={project.progress}
                range={project.range}
                labels={l}
              />
              <StatusSection data={project.statuses} labels={l} />
              <TaskSection
                tasks={project.tasks}
                onTaskSelect={onTaskSelect}
                labels={l}
              />
            </>
          ))}
      </SidebarContent>
      <SidebarFooter className="flex-row items-center justify-between border-t border-sidebar-border px-4">
        <Button size="sm" variant="ghost" onClick={onHelp}>
          <CircleHelp aria-hidden="true" />
          {l.help}
        </Button>
        <Badge variant="outline">{l.plan}</Badge>
      </SidebarFooter>
    </Sidebar>
  )
}
export { Sidebar04 }
export {
  ContextSection,
  ProgressSection,
  StatusSection,
  TaskSection,
} from "./sections"
export type { Sidebar04Props }
export type {
  ContextProject,
  ContextPoint,
  ContextStatus,
  ContextTask,
} from "./types"
export type { Sidebar04Labels } from "./config"
