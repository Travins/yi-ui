"use client"

import { registryViews } from "@/registry/__index__"

/** /view/<name>/ 的整页内容：渲染条目的 demo.tsx（构建时由索引脚本生成映射）。 */
export function ViewFrame({ name }: { name: string }) {
  const View = registryViews[name]
  if (!View) return <p>找不到预览：{name}</p>
  // 不包 Suspense：边界内容较大时，预渲染 HTML 会先输出占位、再用脚本替换，首屏会闪一下
  return <View />
}
