"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
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
import {
  GridColumns,
  GridContainer,
  GridSection,
  GridSeparator,
} from "@/registry/ui/grid-layout/grid-layout"
import { Sidebar01, type Sidebar01Props } from "./sidebar-01"
import { DEFAULT_FOOTER_ITEMS, DEFAULT_GROUPS } from "./nav-data"
import { collectHrefs, findActiveHref, findTrail } from "./utils"

/** 演示用的占位指标，固定值，保证预渲染稳定。 */
const STATS = [
  { label: "本月发布", value: "24", hint: "较上月多 6 篇" },
  { label: "待审核", value: "3", hint: "最早一篇等待 2 天" },
  { label: "平均阅读时长", value: "4 分 12 秒", hint: "近 30 天" },
]

/** 演示页的占位文案 */
const COPY = {
  eyebrow: "内容 / 编辑台",
  intro:
    "这里是占位内容。收起侧栏后，把鼠标移到带子菜单的图标上，会在右侧浮出子菜单。",
}

const ROWS = [
  "春季专题策划稿",
  "读者来信合集",
  "编辑部周报",
  "新栏目试运行说明",
]

/**
 * 演示页的外壳：SidebarProvider + Sidebar01 + SidebarInset（顶栏 + 线条网格主区）。
 * 安装后的 page.tsx 和文档预览共用它；真实项目里换成自己的布局即可。
 */
function Sidebar01Shell({
  className,
  ...props
}: Omit<Sidebar01Props, "variant">) {
  const groups = props.groups ?? DEFAULT_GROUPS
  const footerItems = props.footerItems ?? DEFAULT_FOOTER_ITEMS
  const trail = findTrail(
    groups,
    footerItems,
    findActiveHref(collectHrefs(groups, footerItems), props.currentHref),
  )
  const title = trail[trail.length - 1] ?? "工作概览"

  return (
    // 触屏上菜单行加高到 40px，收起后的图标栏跟着加宽到 56px 才放得下
    <SidebarProvider
      defaultOpen
      className={cn("pointer-coarse:[--sidebar-width-icon:3.5rem]!", className)}
    >
      <Sidebar01 variant="sidebar" {...props} />
      <SidebarInset className="min-w-0 overflow-x-clip">
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b border-edge bg-background px-3">
          <SidebarTrigger aria-label="切换侧栏" />
          <Separator
            orientation="vertical"
            className="h-4 data-vertical:self-center"
          />
          <Breadcrumb>
            <BreadcrumbList>
              {trail.map((name, index) => (
                <React.Fragment key={`${index}-${name}`}>
                  {index > 0 ? <BreadcrumbSeparator /> : null}
                  <BreadcrumbItem>
                    {index === trail.length - 1 ? (
                      <BreadcrumbPage>{name}</BreadcrumbPage>
                    ) : (
                      <span>{name}</span>
                    )}
                  </BreadcrumbItem>
                </React.Fragment>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        <GridContainer className="[--grid-width:64rem]">
          <GridSection className="px-4 py-8 sm:px-6">
            <p className="font-mono text-xs text-muted-foreground">
              {COPY.eyebrow}
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">
              {title}
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-7 text-muted-foreground">
              {COPY.intro}
            </p>
          </GridSection>
          <GridSeparator />
          <GridSection>
            <GridColumns className="sm:grid-cols-3">
              {STATS.map((stat) => (
                <div key={stat.label} className="p-4 sm:p-6">
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums">
                    {stat.value}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {stat.hint}
                  </p>
                </div>
              ))}
            </GridColumns>
          </GridSection>
          <GridSeparator />
          <GridSection>
            <ul className="divide-y divide-dashed divide-edge">
              {ROWS.map((row, index) => (
                <li
                  key={row}
                  className="flex items-center gap-3 px-4 py-3 text-sm sm:px-6"
                >
                  <span className="font-mono text-xs text-muted-foreground tabular-nums">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="truncate">{row}</span>
                </li>
              ))}
            </ul>
          </GridSection>
        </GridContainer>
      </SidebarInset>
    </SidebarProvider>
  )
}

export { Sidebar01Shell }
