import { readdirSync } from "node:fs"
import type { Metadata, Viewport } from "next"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"

import { cn } from "@/lib/utils"

import { toDemoSlug } from "@/components/docs/demo-slug"
import { DemoView } from "@/components/docs/demo-view"
import {
  getRegistryItem,
  hasRegistryItem,
} from "@/components/docs/registry-items"

type Props = { params: Promise<{ name: string }> }

/** 所有示例名（src/registry/examples 下的文件名） */
function exampleNames() {
  return readdirSync("src/registry/examples")
    .filter((file) => file.endsWith(".tsx"))
    .map((file) => file.slice(0, -4))
}

/** 示例所属的组件：示例名去掉后缀后，最长的那个已登记条目名 */
function ownerOf(name: string) {
  const parts = name.split("-")
  for (let end = parts.length - 1; end > 0; end--) {
    const candidate = parts.slice(0, end).join("-")
    if (hasRegistryItem(candidate)) return getRegistryItem(candidate)
  }
  return undefined
}

/** 条目文档所在的分区：区块、页面的示例要回到各自的文档，不是都在 /components/ 下 */
function sectionOf(type: string) {
  if (type === "registry:block") return "blocks"
  if (type === "registry:page") return "pages"
  return "components"
}

/** 地址里的 slug → 示例名 */
function exampleOf(slug: string) {
  const name = exampleNames().find((entry) => toDemoSlug(entry) === slug)
  if (!name) throw new Error(`找不到示例：${slug}`)
  return name
}

/**
 * 全屏页模拟一个 App 页面：禁止缩放，双指、双击都不会把页面放大，拖动滑块、点按钮时页面不晃。
 * 文档页本身不限制，读文字时照常可以放大
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export const dynamicParams = false
export function generateStaticParams() {
  return exampleNames().map((name) => ({ name: toDemoSlug(name) }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const owner = ownerOf(exampleOf((await params).name))
  return {
    title: owner ? `${owner.title} · 示例` : "示例",
    robots: { index: false, follow: false },
  }
}

/**
 * 单个示例的全屏页：文档里每个示例的「手机扫码」指向这里，打开后只有这个示例，
 * 不用在整页文档里找。页头只留返回文档的链接。
 */
export default async function Page({ params }: Props) {
  const name = exampleOf((await params).name)
  const owner = ownerOf(name)
  // 「手机上的体验」示例自带手机外框；真在手机上打开时外框收起、铺满屏幕，这里也不留边距
  const phone = name.endsWith("-mobile-demo")
  return (
    <div className="flex min-h-dvh touch-manipulation flex-col bg-background">
      <header className="sticky top-0 z-10 flex h-12 shrink-0 items-center gap-2 border-b border-edge bg-background/90 px-2 backdrop-blur-sm">
        <Link
          href={
            owner ? `/${sectionOf(owner.type)}/${owner.name}/` : "/components/"
          }
          className="flex h-9 items-center gap-0.5 rounded-md pr-2 pl-1 text-sm font-medium outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <ChevronLeft aria-hidden="true" className="size-5" />
          {owner?.title ?? "组件"}
        </Link>
        <span className="ml-auto truncate pr-2 font-mono text-[11px] text-muted-foreground">
          {name}
        </span>
      </header>
      <main
        className={cn(
          "flex flex-1 items-center justify-center p-4 pb-[max(1rem,env(safe-area-inset-bottom))]",
          phone && "max-sm:items-stretch max-sm:p-0",
        )}
      >
        <DemoView name={name} />
      </main>
    </div>
  )
}
