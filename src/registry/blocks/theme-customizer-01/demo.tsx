"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ThemeCustomizer } from "./theme-customizer-01"
import "./theme-customizer.css"

/** 用 target 把偏好限制在预览框内，不触碰文档站与存储。 */
function PreviewContent() {
  const target = React.useRef<HTMLDivElement>(null)
  return (
    <div
      ref={target}
      data-slot="theme-customizer-preview"
      data-theme="neutral"
      data-radius="md"
      data-content-width="wide"
      // 预览框比真实页面窄，把紧凑宽度按比例缩小，切换时才看得出差别
      className="min-h-svh w-full min-w-0 bg-background text-foreground [&[data-content-width=compact]]:[--theme-content-width:32rem]"
    >
      <header className="flex items-center justify-between border-b border-edge px-5 py-3">
        <span className="text-sm font-medium">工作空间</span>
        <ThemeCustomizer target={target} />
      </header>
      <div className="theme-content space-y-5 p-5">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">项目概览</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            调整外观，让工作空间更顺手。
          </p>
        </div>
        <section className="rounded-lg border border-edge bg-card p-5">
          <h3 className="font-medium">新的工作计划</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            整理需求、邀请同事，开始下一阶段。
          </p>
          <label className="mt-4 block space-y-2 text-sm">
            项目名称
            <Input placeholder="输入项目名称" />
          </label>
          <Button className="mt-4">创建项目</Button>
        </section>
      </div>
    </div>
  )
}
export default function ThemeCustomizerDemo() {
  return <PreviewContent />
}
