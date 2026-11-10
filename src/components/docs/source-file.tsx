"use client"

import { useId, useState } from "react"
import { ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CodeView } from "./code-view"
import { CopyButton } from "./copy-button"
import { DocFrame, DocFrameBar } from "./doc-frame"
import { PreviewSkeleton } from "./preview-skeleton"
import { SourceNote } from "./source-note"
import {
  loadSources,
  loadedSources,
  type LoadedSource,
} from "./source-loader"

/**
 * 源码列表里的一个文件：默认收起，只显示安装路径和行数。
 * 高亮源码在展开时才请求（悬停或聚焦时预取）；复制按钮不必先展开，点击时取全文。
 */
export function SourceFile({
  name,
  path,
  lines,
}: {
  /** 所属条目，源码从 /code/<name>.json 取 */
  name: string
  path: string
  lines: number
}) {
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<LoadedSource | null>(null)
  const [failed, setFailed] = useState(false)
  const id = useId()
  const find = (files: LoadedSource[]) =>
    files.find((entry) => entry.path === path) ?? null
  const prefetch = () => void loadSources(name).catch(() => {})
  const load = () => {
    setFailed(false)
    loadSources(name)
      .then((files) => setFile(find(files)))
      .catch(() => setFailed(true))
  }
  const source = () => {
    const ready = loadedSources(name)
    return ready
      ? (find(ready)?.source ?? "")
      : loadSources(name).then((files) => find(files)?.source ?? "")
  }
  return (
    <DocFrame>
      <DocFrameBar onPointerEnter={prefetch} onFocus={prefetch}>
        <Button
          variant="ghost"
          size="sm"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => {
            if (!open && !file) load()
            setOpen((value) => !value)
          }}
          className="min-w-0 flex-1 justify-start"
        >
          <ChevronDown
            aria-hidden="true"
            className={open ? "rotate-180" : undefined}
          />
          <span className="min-w-0 truncate font-mono text-xs" title={path}>
            {path}
          </span>
          <span className="shrink-0 text-xs text-muted-foreground">
            {lines} 行
          </span>
        </Button>
        <CopyButton value={source} label={`复制 ${path}`} />
      </DocFrameBar>
      <div id={id} hidden={!open} className="max-h-[44rem] overflow-auto">
        {!open ? null : file ? (
          <>
            <CodeView lines={file.lines} collapse={false}>
              <div dangerouslySetInnerHTML={{ __html: file.html }} />
            </CodeView>
            <SourceNote file={file} />
          </>
        ) : failed ? (
          <div
            role="alert"
            className="flex flex-col items-start gap-3 p-4 text-sm text-muted-foreground"
          >
            <p>源码没有加载出来，可能是网络中断。</p>
            <Button variant="outline" size="sm" onClick={load}>
              重新加载
            </Button>
          </div>
        ) : (
          <PreviewSkeleton className="h-40" label="正在加载源码…" />
        )}
      </div>
    </DocFrame>
  )
}
