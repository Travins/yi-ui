import Link from "next/link"
import type { ComponentProps } from "react"
import { ArrowUpRight } from "lucide-react"

import { CodeBlock } from "@/components/docs/code-block"
import { buttonVariants } from "@/components/ui/button"
import { GridColumns } from "@/registry/ui/grid-layout/grid-layout"
import { CodeFile, CodeStack } from "@/registry/ui/code-stack/code-stack"

const URL_COMMAND =
  "pnpm dlx shadcn@latest add https://yiui.dev/r/value-slider.json"
const NAMESPACE_COMMAND = "pnpm dlx shadcn@latest add @yiui/value-slider"
const COMPONENTS_JSON = `{
  "registries": {
    "@yiui": "https://yiui.dev/r/{name}.json"
  }
}`

/** 安装 value-slider 后写入 components/ui/value-slider/ 的文件，中间那张是入口文件。 */
const FILES = [
  { lang: "ts", name: "types.ts", seed: 3 },
  { lang: "ts", name: "utils.ts", seed: 8 },
  { lang: "tsx", name: "value-slider.tsx", seed: 21, active: true },
  { lang: "ts", name: "sound.ts", seed: 14 },
  { lang: "ts", name: "use-elastic-pull.ts", seed: 5 },
] as const

/**
 * 代码块外框默认带上下外边距，这里在卡片里自己控制间距。
 * 首页栏宽有限：字号比文档小一档、左右内边距收窄，让完整 URL 的命令在宽屏放进一行；
 * 更窄时按空格折行（实在放不下再断词），不出现横向滚动条。
 */
function Snippet(props: ComponentProps<typeof CodeBlock>) {
  return (
    <div className="min-w-0 *:my-0 [&_pre]:overflow-x-visible! [&_pre]:px-3.5! [&_pre]:text-xs! [&_pre]:[overflow-wrap:anywhere]! [&_pre]:whitespace-pre-wrap!">
      <CodeBlock {...props} />
    </div>
  )
}

/**
 * 首页「一行命令安装」：左边是 shadcn CLI 的两种装法（@yiui 命名空间 / 完整 URL）和 CLI 自动写入的 components.json，
 * 右边用代码文件堆叠示意命令执行后落进项目的文件。内容与文档里的「安装」「Registry 与命名空间」一致。
 */
function InstallShowcase() {
  return (
    <GridColumns className="sm:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
      <div className="flex min-w-0 flex-col gap-5 p-4 sm:p-6 lg:p-8">
        <p className="max-w-[34rem] text-sm leading-7 text-pretty text-muted-foreground">
          本站的组件库 Yi UI 以 shadcn registry 发布，已收录进 shadcn
          官方目录。一行命令把源码装进你的项目，装完就是你自己的代码，可以直接改。
        </p>
        <div className="flex min-w-0 flex-col gap-4">
          <Snippet
            code={NAMESPACE_COMMAND}
            lang="bash"
            title="终端 · @yiui 命名空间"
          />
          <Snippet code={URL_COMMAND} lang="bash" title="终端 · 完整 URL" />
          <Snippet
            code={COMPONENTS_JSON}
            lang="json"
            title="components.json · 首次安装时自动写入"
          />
        </div>
        <Link
          href="/docs/installation/"
          className={buttonVariants({
            variant: "outline",
            size: "lg",
            className: "self-start",
          })}
        >
          查看安装文档
          <ArrowUpRight aria-hidden="true" />
        </Link>
      </div>
      <figure className="relative isolate flex min-w-0 flex-col items-center justify-center gap-4 overflow-hidden bg-muted/20 px-4 py-8 sm:px-6">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 bg-dots [mask-image:radial-gradient(ellipse_at_center,black_45%,transparent_90%)]"
        />
        {/* 卡片宽度有上限，整体放大 1.25 倍让文件名读得清 */}
        <CodeStack className="max-w-lg scale-125 sm:scale-110 xl:scale-125">
          {FILES.map(({ lang, name, seed, ...rest }) => (
            <CodeFile
              key={name}
              lang={lang}
              name={name}
              seed={seed}
              active={"active" in rest}
            />
          ))}
        </CodeStack>
        <figcaption className="font-mono text-xs text-muted-foreground">
          components/ui/value-slider/
        </figcaption>
      </figure>
    </GridColumns>
  )
}

export { InstallShowcase }
