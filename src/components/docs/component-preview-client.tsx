"use client"

import { Activity, useMemo, useRef, useState, type ReactNode } from "react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { registryExamples } from "@/registry/__index__"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { CopyButton } from "./copy-button"
import {
  DocFrameBar,
  DocTabsList,
  DocTabsTrigger,
  docFrameClass,
  docFramePanelClass,
} from "./doc-frame"
import { IconTip } from "./icon-tip"
import { v0Url } from "./registry-items"
import {
  TunerPanel,
  TunerProvider,
  TunerToggle,
  resolveTuner,
  useTuner,
} from "./tuner"
import { PreviewBackdrop } from "./preview-backdrop"
import { PreviewQrButton } from "./preview-qr"
import { V0Icon } from "./v0-icon"

/**
 * 自带满幅背景（点阵、光晕、字符矩阵、地球卡片等）的示例：预览区不留内边距，
 * 示例根元素撑满、去掉自身的圆角与边框，背景直接铺到预览框边缘。
 */
const FULL_BLEED = new Set([
  "isometric-mark-demo",
  "isometric-mark-shadcn-demo",
  "isometric-mark-pi-demo",
  "isometric-mark-vercel-demo",
  "glyph-field-demo",
  "glyph-field-icon-demo",
  "glyph-field-binary-demo",
  "glyph-field-cjk-demo",
  "glyph-field-custom-demo",
  "globe-demo",
  "marquee-demo",
  "text-animate-demo",
  "orbit-demo",
  "orbit-half-demo",
  "orbit-icons-demo",
  "orbit-stack-demo",
  "ripple-demo",
  "ripple-online-demo",
  "ripple-pulse-demo",
  "ripple-signal-demo",
  "greeting-card-demo",
  "shuffle-grid-demo",
  "value-slider-demo",
])

export function ComponentPreviewClient({
  name,
  item,
  source,
  code,
}: {
  name: string
  item?: string
  source: string
  code: ReactNode
}) {
  const Preview = registryExamples[name]
  const [view, setView] = useState("preview")
  const previewRef = useRef<HTMLDivElement>(null)
  const [codeHeight, setCodeHeight] = useState(320)
  // 在 tuner/ 里登记过的组件，每个示例都带一个可开关的调整面板
  // 示例可以在 tuner 配置里单独关闭面板或去掉部分控件；按示例名解析一次，保持引用稳定
  const tunerConfig = useMemo(() => resolveTuner(item, name), [item, name])
  const tuner = useTuner(tunerConfig)
  const reduced = useReducedMotion()
  return (
    <Tabs
      value={view}
      onValueChange={(value) => {
        if (value === "code" && previewRef.current)
          setCodeHeight(previewRef.current.getBoundingClientRect().height)
        setView(String(value))
      }}
      className={docFrameClass}
    >
      <DocFrameBar>
        <DocTabsList aria-label="组件示例">
          <DocTabsTrigger value="preview">预览</DocTabsTrigger>
          <DocTabsTrigger value="code">代码</DocTabsTrigger>
        </DocTabsList>
        <div className="flex items-center gap-0.5">
          {view === "preview" && <PreviewQrButton name={name} />}
          {tunerConfig && view === "preview" && (
            <TunerToggle
              config={tunerConfig}
              open={tuner.open}
              onOpenChange={tuner.setOpen}
            />
          )}
          {item && (
            <IconTip label="在 v0 中打开">
              <a
                href={v0Url(item)}
                target="_blank"
                rel="noreferrer"
                aria-label="在 v0 中打开（在新标签页中打开）"
                className={cn(
                  buttonVariants({ variant: "ghost", size: "icon-sm" }),
                  "text-muted-foreground hover:text-foreground",
                )}
              >
                <V0Icon className="size-4" />
              </a>
            </IconTip>
          )}
          {view === "code" && <CopyButton value={source} />}
        </div>
      </DocFrameBar>
      <TabsContent
        value="preview"
        ref={previewRef}
        keepMounted
        className={cn(
          docFramePanelClass,
          "relative isolate flex min-h-80 items-center justify-center",
          FULL_BLEED.has(name)
            ? "p-0 *:min-h-80 *:w-full *:max-w-none *:rounded-none *:border-0"
            : "p-4 sm:p-8",
        )}
      >
        <PreviewBackdrop name={item} />
        <TunerProvider config={tunerConfig} tuning={tuner.tuning}>
          {/* 用 Activity 不用 Suspense：Suspense 内容较大时，预渲染 HTML 会先输出占位、再用脚本替换，首屏闪一下。
              代价是整页要等本页示例的代码加载完才可交互；列表页示例太多，缩略图仍用 Suspense */}
          <Activity>
            {Preview ? <Preview /> : <p>找不到示例：{name}</p>}
          </Activity>
        </TunerProvider>
      </TabsContent>
      {/* 面板从预览下方展开：高度从 0 过渡到内容高度，同时淡入；收起时反向。减少动态效果时直接出现 / 消失 */}
      <AnimatePresence initial={false}>
        {tunerConfig && tuner.open && view === "preview" ? (
          <motion.div
            key="tuner"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={
              reduced
                ? { duration: 0 }
                : { duration: 0.24, ease: [0.25, 0.1, 0.25, 1] }
            }
            className="overflow-hidden"
          >
            <TunerPanel
              config={tunerConfig}
              values={tuner.values}
              base={tuner.base}
              onChange={tuner.setValues}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>
      <TabsContent
        value="code"
        className={cn(docFramePanelClass, "flex-none overflow-auto")}
        style={{ height: codeHeight }}
      >
        {view === "code" ? code : null}
      </TabsContent>
    </Tabs>
  )
}
