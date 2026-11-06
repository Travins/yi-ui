"use client"

import * as React from "react"

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
import { Sidebar03 } from "@/registry/blocks/sidebar-03/sidebar-03"
import { DEFAULT_MODULES } from "@/registry/blocks/sidebar-03/nav-data"
import { findPath } from "@/registry/blocks/sidebar-03/tree"
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
export default function Sidebar03Page() {
  const [activeItemId, setActiveItemId] = useState("all")
  const [moduleId, setModuleId] = useState("customers")
  const currentModule = DEFAULT_MODULES.find((item) => item.id === moduleId)
  const path = findPath(currentModule?.tree ?? [], activeItemId)
  const current = path.at(-1)
  const team = { name: "客户协作空间" }
  return (
    <SidebarProvider defaultOpen>
      <Sidebar03
        moduleId={moduleId}
        onModuleChange={setModuleId}
        activeNodeId={activeItemId}
        navigation={{
          intercept: true,
          onNavigate: ({ nodeId }) => {
            if (nodeId) setActiveItemId(nodeId)
          },
        }}
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
                {currentModule?.label}
              </BreadcrumbItem>
              {path.map((node, index) => {
                const last = index === path.length - 1
                // 窄屏只留最后一级，避免面包屑挤满顶栏
                const hide = last ? undefined : "hidden sm:inline-flex"
                return (
                  <React.Fragment key={node.id}>
                    <BreadcrumbSeparator className="hidden sm:block" />
                    <BreadcrumbItem className={hide}>
                      {last ? (
                        <BreadcrumbPage>{node.label}</BreadcrumbPage>
                      ) : (
                        node.label
                      )}
                    </BreadcrumbItem>
                  </React.Fragment>
                )
              })}
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        <GridContainer className="min-h-[calc(100svh-3.5rem)] [--grid-width:60rem]">
          <GridSection className="px-4 py-6 sm:px-6">
            <h1 className="text-xl font-semibold tracking-tight">
              {current?.label ?? currentModule?.label}
            </h1>
            <p className="mt-1 text-sm leading-7 text-muted-foreground">
              这是{team?.name}的工作区，下面是一些占位内容。
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
                <li key={entry} className="px-4 py-3 text-sm leading-7 sm:px-6">
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
