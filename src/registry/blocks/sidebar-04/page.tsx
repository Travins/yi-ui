"use client"

import * as React from "react"
import { PanelRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import {
  SidebarProvider,
  SidebarInset,
  useSidebar,
} from "@/components/ui/sidebar"
import {
  GridContainer,
  GridSection,
  GridColumns,
  GridSeparator,
} from "@/registry/ui/grid-layout/grid-layout"
import { Sidebar04 } from "@/registry/blocks/sidebar-04/sidebar-04"
import { SAMPLE_PROJECTS } from "@/registry/blocks/sidebar-04/sample-data"

function PanelToggle() {
  const { toggleSidebar, open, openMobile, isMobile } = useSidebar()
  return (
    <Button
      data-slot="sidebar-04-toggle"
      size="icon-sm"
      variant="ghost"
      aria-label="切换上下文面板"
      aria-expanded={isMobile ? openMobile : open}
      onClick={toggleSidebar}
    >
      <PanelRight aria-hidden="true" />
    </Button>
  )
}
export default function Sidebar04Page() {
  const [projectId, setProjectId] = React.useState(SAMPLE_PROJECTS[0]!.id)
  const [message, setMessage] =
    React.useState("选择任务，查看当前工作的上下文。")
  const project = SAMPLE_PROJECTS.find((p) => p.id === projectId)!
  return (
    <SidebarProvider
      defaultOpen
      style={{ "--sidebar-width": "20rem" } as React.CSSProperties}
    >
      <SidebarInset>
        <header
          data-slot="sidebar-04-main-header"
          className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-edge px-4"
        >
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden sm:block">
                研发工作区
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden sm:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>{project.name}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <PanelToggle />
        </header>
        <GridContainer className="w-full min-w-0 flex-1">
          <GridSection className="px-4 py-8 sm:px-6">
            <p className="text-xs text-muted-foreground">项目看板</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">
              让每一次交付都有进展
            </h1>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              梳理本轮研发计划，让任务、评审和交付保持同步。
            </p>
            <p role="status" className="mt-4 text-sm">
              {message}
            </p>
          </GridSection>
          <GridSeparator />
          <GridSection>
            <GridColumns className="md:grid-cols-3">
              {["待开始", "进行中", "待评审"].map((name, i) => (
                <div key={name} className="min-h-72 p-4">
                  <h2 className="mb-5 text-sm font-medium">{name}</h2>
                  {project.tasks.slice(i, i + 1).map((task) => (
                    <div
                      key={task.id}
                      className="mb-3 border-l-2 border-edge pl-3"
                    >
                      <h3 className="text-sm">{task.title}</h3>
                      <p className="mt-2 text-xs leading-6 text-muted-foreground">
                        {task.description}
                      </p>
                    </div>
                  ))}
                </div>
              ))}
            </GridColumns>
          </GridSection>
        </GridContainer>
      </SidebarInset>
      <Sidebar04
        projects={SAMPLE_PROJECTS}
        projectId={projectId}
        onProjectChange={({ projectId }) => {
          setProjectId(projectId)
          setMessage("已切换项目。")
        }}
        onTaskSelect={(task) => setMessage(`已选择：${task.title}`)}
        onHelp={() =>
          setMessage("打开右侧面板查看进度；按 ⌘B 或 Ctrl B 切换面板。")
        }
      />
    </SidebarProvider>
  )
}
