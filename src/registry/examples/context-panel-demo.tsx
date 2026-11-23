"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import {
  ContextPanel,
  ContextPanelContent,
  ContextPanelProvider,
  ContextPanelSection,
  ContextPanelTrigger,
  useContextPanel,
} from "@/registry/ui/context-panel/context-panel"

const MEMBERS = [
  {
    id: "lin",
    name: "林知夏",
    role: "产品经理",
    team: "增长组",
    joined: "2023 年 3 月",
    recent: ["更新了「新手引导」需求文档", "评审通过 2 个设计稿"],
  },
  {
    id: "zhou",
    name: "周屿",
    role: "前端工程师",
    team: "平台组",
    joined: "2022 年 9 月",
    recent: ["合并了「表格列设置」分支", "修复 3 个线上问题"],
  },
  {
    id: "xu",
    name: "许安然",
    role: "设计师",
    team: "体验组",
    joined: "2024 年 1 月",
    recent: ["提交了暗色主题的配色方案", "整理图标库到 2.0"],
  },
  {
    id: "chen",
    name: "陈默",
    role: "后端工程师",
    team: "平台组",
    joined: "2021 年 6 月",
    recent: ["完成导出接口的限流", "值班处理 1 次告警"],
  },
]

function MemberList() {
  const [memberId, setMemberId] = React.useState("lin")
  const { setOpen } = useContextPanel()
  const member = MEMBERS.find((item) => item.id === memberId) ?? MEMBERS[0]
  return (
    <>
      <ul className="min-h-0 flex-1 divide-y divide-dashed divide-edge overflow-y-auto">
        {MEMBERS.map((item) => (
          <li
            key={item.id}
            data-selected={item.id === memberId}
            className="flex items-center gap-3 px-4 py-2.5 data-[selected=true]:bg-muted/60"
          >
            <span
              aria-hidden="true"
              className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-sm font-medium text-primary"
            >
              {item.name.slice(0, 1)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{item.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {item.role} · {item.team}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setMemberId(item.id)
                setOpen(true)
              }}
            >
              详情<span className="sr-only">：{item.name}</span>
            </Button>
          </li>
        ))}
      </ul>
      {/* 写在页面里，渲染到右侧面板里：标题和内容跟着页面的 state 走 */}
      {member ? (
        <ContextPanelContent title={member.name}>
          <ContextPanelSection title="基本信息" description={member.role}>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-sidebar-foreground/65">小组</dt>
              <dd>{member.team}</dd>
              <dt className="text-sidebar-foreground/65">加入时间</dt>
              <dd>{member.joined}</dd>
            </dl>
          </ContextPanelSection>
          <ContextPanelSection title="最近动态">
            <ul className="space-y-2 text-sm">
              {member.recent.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </ContextPanelSection>
        </ContextPanelContent>
      ) : null}
    </>
  )
}

export default function ContextPanelDemo() {
  return (
    <div
      data-slot="context-panel-demo"
      className="flex h-[24rem] w-full max-w-3xl overflow-hidden rounded-xl border border-edge bg-background shadow-xs"
    >
      <ContextPanelProvider defaultOpen>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-14 shrink-0 items-center gap-2 border-b border-edge px-4">
            <p className="truncate text-sm font-semibold">团队成员</p>
            <div className="ml-auto">
              <ContextPanelTrigger />
            </div>
          </header>
          <MemberList />
        </div>
        {/* 示例放在固定高度的框里，所以用 h-full；整页布局不用传 */}
        <ContextPanel className="h-full" />
      </ContextPanelProvider>
    </div>
  )
}
