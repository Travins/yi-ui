"use client"

import { useState } from "react"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Sidebar02 } from "@/registry/blocks/sidebar-02/sidebar-02"
import {
  DEFAULT_FOOTER_ITEMS,
  DEFAULT_NAV_GROUPS,
  DEFAULT_TEAMS,
} from "@/registry/blocks/sidebar-02/nav-data"
import {
  GridContainer,
  GridSection,
  GridSeparator,
} from "@/registry/ui/grid-layout/grid-layout"

/** 主区的占位内容：真实项目里换成各页面自己的内容。 */
const SUMMARY = [
  { label: "本周活跃成员", value: "128" },
  { label: "已完成任务", value: "342" },
  { label: "待处理评论", value: "17" },
]
const RECENT = [
  "苏晓宁 更新了「官网改版」的设计稿",
  "周明远 在「增长实验」里新增了 2 个对照组",
  "陈知夏 完成了 5 个任务",
  "韩若溪 邀请了新成员加入团队",
]
const ALL_ITEMS = [
  ...DEFAULT_NAV_GROUPS.flatMap((group) => group.items),
  ...DEFAULT_FOOTER_ITEMS,
]

/**
 * 侧栏页面入口：SidebarProvider + Sidebar02 + SidebarInset。
 * 这里把链接跳转拦下来，只切换当前项；接入真实路由时去掉 interceptNavigation，
 * 并把 activeItemId 换成由当前路径算出的值（或换成 next/link 的 Link）。
 */
export default function Sidebar02Page() {
  const [activeItemId, setActiveItemId] = useState("overview")
  const [activeTeamId, setActiveTeamId] = useState(DEFAULT_TEAMS[0]!.id)
  const team = DEFAULT_TEAMS.find((item) => item.id === activeTeamId)
  const current = ALL_ITEMS.find((item) => item.id === activeItemId)

  return (
    <SidebarProvider defaultOpen>
      <Sidebar02
        interceptNavigation
        activeItemId={activeItemId}
        onActiveItemChange={setActiveItemId}
        activeTeamId={activeTeamId}
        onTeamChange={setActiveTeamId}
      />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b border-edge bg-background px-4">
          <SidebarTrigger className="-ml-1" aria-label="切换侧栏" />
          <Separator
            orientation="vertical"
            className="mr-1 data-vertical:h-4 data-vertical:self-center"
          />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden sm:inline-flex">
                {team?.name}
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden sm:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>{current?.label}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        <GridContainer className="min-h-[calc(100svh-3.5rem)] [--grid-width:60rem]">
          <GridSection className="px-4 py-6 sm:px-6">
            <h1 className="text-xl font-semibold tracking-tight">
              {current?.label}
            </h1>
            <p className="mt-1 text-sm leading-7 text-muted-foreground">
              这是 {team?.name} 的工作区，下面是一些占位内容。
            </p>
          </GridSection>
          <GridSection>
            <dl className="grid divide-y divide-dashed divide-edge sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              {SUMMARY.map((stat) => (
                <div key={stat.label} className="px-4 py-5 sm:px-6">
                  <dt className="text-xs text-muted-foreground">
                    {stat.label}
                  </dt>
                  <dd className="mt-1 font-mono text-2xl tabular-nums">
                    {stat.value}
                  </dd>
                </div>
              ))}
            </dl>
          </GridSection>
          <GridSeparator />
          <GridSection>
            <ul className="divide-y divide-dashed divide-edge">
              {RECENT.map((entry) => (
                <li
                  key={entry}
                  className="px-4 py-3 text-sm leading-7 sm:px-6"
                >
                  {entry}
                </li>
              ))}
            </ul>
          </GridSection>
        </GridContainer>
      </SidebarInset>
    </SidebarProvider>
  )
}
