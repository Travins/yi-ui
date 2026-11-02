"use client"

import { useEffect } from "react"

import { registryExamples } from "@/registry/__index__"

/** 单个示例的全屏页内容：只渲染示例本身，给手机扫码真机体验 */
export function DemoView({ name }: { name: string }) {
  const Demo = registryExamples[name]
  // iOS Safari 不认 user-scalable=no，双指缩放要拦它私有的 gesture 事件；
  // 双击放大由页面根元素的 touch-action: manipulation 关掉（见 page.tsx）
  useEffect(() => {
    const block = (event: Event) => event.preventDefault()
    document.addEventListener("gesturestart", block)
    document.addEventListener("gesturechange", block)
    return () => {
      document.removeEventListener("gesturestart", block)
      document.removeEventListener("gesturechange", block)
    }
  }, [])
  if (!Demo) return <p>找不到示例：{name}</p>
  // 不包 Suspense：边界内容较大时，预渲染 HTML 会先输出占位、再用脚本替换，首屏会闪一下
  return <Demo />
}
