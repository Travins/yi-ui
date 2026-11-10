"use client"
import {
  ExternalLink,
  File,
  Monitor,
  Smartphone,
  Tablet,
  Terminal,
} from "lucide-react"
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react"
import { buttonVariants, Button } from "@/components/ui/button"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { CodeView } from "./code-view"
import { PreviewSkeleton } from "./preview-skeleton"
import { SourceNote } from "./source-note"
import { loadSources, type LoadedSource } from "./source-loader"
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
import { V0Icon } from "./v0-icon"

type TreeNode = { name: string; path?: string; children: TreeNode[] }

const MIN_WIDTH = 320
// 桌面模式用固定的虚拟宽度渲染，再整体缩放进容器，这样才能看到真正的桌面布局
const DESKTOP_WIDTH = 1280
// 容器窄于这个值（手机上的文档页）时不再模拟设备宽度，直接按容器宽度渲染
const FIT_BELOW = 640
const presets = [
  { id: "desktop", label: "桌面", width: DESKTOP_WIDTH, Icon: Monitor },
  { id: "tablet", label: "平板", width: 768, Icon: Tablet },
  { id: "mobile", label: "手机", width: 375, Icon: Smartphone },
] as const

// 把 components/a/b.tsx 这样的目标路径折叠成文件树
function buildTree(files: string[]) {
  const root: TreeNode = { name: "", children: [] }
  for (const path of files) {
    let node = root
    const parts = path.split("/")
    parts.forEach((part, index) => {
      let child = node.children.find((entry) => entry.name === part)
      if (!child) {
        child = { name: part, children: [] }
        node.children.push(child)
      }
      if (index === parts.length - 1) child.path = path
      node = child
    })
  }
  return root.children
}

function FileTree({
  nodes,
  active,
  onSelect,
}: {
  nodes: TreeNode[]
  active: string
  onSelect: (path: string) => void
}) {
  return (
    <ul className="flex flex-col gap-0.5">
      {nodes.map((node) => (
        <li key={node.path ?? node.name}>
          {node.path ? (
            <button
              type="button"
              onClick={() => onSelect(node.path!)}
              aria-current={node.path === active ? "true" : undefined}
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left font-mono text-xs text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring aria-[current=true]:bg-muted aria-[current=true]:text-foreground"
            >
              <File aria-hidden="true" className="size-3.5 shrink-0" />
              <span className="min-w-0 break-all">{node.name}</span>
            </button>
          ) : (
            <div className="mt-1">
              <p className="px-2 py-1 font-mono text-xs text-muted-foreground/70">
                {node.name}/
              </p>
              <div className="ml-2 border-l border-edge pl-1">
                <FileTree
                  nodes={node.children}
                  active={active}
                  onSelect={onSelect}
                />
              </div>
            </div>
          )}
        </li>
      ))}
    </ul>
  )
}

export function BlockViewerClient({
  name,
  title,
  height,
  files,
  install,
}: {
  name: string
  title: string
  height: string
  /** 安装后的文件路径；源码在第一次打开「代码」时才请求 */
  files: string[]
  install: ReactNode
}) {
  const heightPx = /^\d+(\.\d+)?px$/.test(height) ? parseFloat(height) : 720
  const [view, setView] = useState("preview")
  // iframe 的虚拟（布局）宽度；放不下时整体缩放，布局宽度不变
  const [width, setWidth] = useState(DESKTOP_WIDTH)
  // 容器可用宽度，由 ResizeObserver 维护；0 表示尚未测量
  const [available, setAvailable] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [installOpen, setInstallOpen] = useState(false)
  const [active, setActive] = useState(files[0] ?? "")
  // 高亮源码按需加载：悬停或聚焦「代码」时预取，点开时一般已经到了
  const [sources, setSources] = useState<LoadedSource[] | null>(null)
  const [failed, setFailed] = useState(false)
  const prefetchSources = () => void loadSources(name).catch(() => {})
  const showSources = () => {
    setFailed(false)
    loadSources(name)
      .then(setSources)
      .catch(() => setFailed(true))
  }
  const tree = useMemo(() => buildTree(files), [files])
  const [near, setNear] = useState(false)
  const [loadedName, setLoadedName] = useState<string | null>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setNear(true)
          observer.disconnect()
        }
      },
      { rootMargin: "200px" },
    )
    observer.observe(stage)
    return () => observer.disconnect()
  }, [])

  const drag = useRef<{ x: number; width: number } | null>(null)

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    const observer = new ResizeObserver(
      ([entry]) => entry && setAvailable(Math.floor(entry.contentRect.width)),
    )
    observer.observe(stage)
    return () => observer.disconnect()
  }, [])

  const fit = available > 0 && available < FIT_BELOW
  const layoutWidth = fit ? available : width
  const scale = available > 0 ? Math.min(1, available / layoutWidth) : 1
  const frameWidth = Math.round(layoutWidth * scale)
  const frameHeight = Math.round(heightPx * scale)
  const clamp = (value: number) =>
    Math.round(Math.min(Math.max(value, MIN_WIDTH), available || value))
  // 预览框居中，拖右边缘时左右各变化一半，所以位移乘以 2 才能让边缘跟手
  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    // 拖拽以屏幕上看到的宽度为准（此时不缩放）
    drag.current = { x: event.clientX, width: frameWidth }
    setWidth(frameWidth)
    setDragging(true)
  }
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return
    setWidth(clamp(drag.current.width + (event.clientX - drag.current.x) * 2))
  }
  const onPointerUp = () => {
    drag.current = null
    setDragging(false)
  }
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 64 : 16
    if (event.key === "ArrowLeft") setWidth(clamp(frameWidth - step))
    else if (event.key === "ArrowRight") setWidth(clamp(frameWidth + step))
    else if (event.key === "Home") setWidth(DESKTOP_WIDTH)
    else return
    event.preventDefault()
  }

  const activeFile = sources?.find((file) => file.path === active)
  const iconAction = cn(
    buttonVariants({ variant: "ghost", size: "icon-sm" }),
    "text-muted-foreground hover:text-foreground",
  )

  return (
    <Tabs
      value={view}
      onValueChange={(value) => {
        if (value === "code" && !sources) showSources()
        setView(String(value))
      }}
      className={docFrameClass}
    >
      <DocFrameBar>
        <DocTabsList aria-label={`${title} 查看方式`}>
          <DocTabsTrigger value="preview">预览</DocTabsTrigger>
          <DocTabsTrigger
            value="code"
            onPointerEnter={prefetchSources}
            onFocus={prefetchSources}
          >
            代码
          </DocTabsTrigger>
        </DocTabsList>
        <div
          role="group"
          aria-label="预览宽度"
          className={cn(
            "hidden items-center gap-1 sm:flex",
            view !== "preview" && "sm:hidden",
          )}
        >
          {presets.map(({ id, label, width: presetWidth, Icon }) => (
            <IconTip key={id} label={`${label} ${presetWidth}px`}>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`${label}宽度`}
                aria-pressed={!fit && width === presetWidth}
                onClick={() => setWidth(presetWidth)}
                className="text-muted-foreground aria-pressed:bg-muted aria-pressed:text-foreground"
              >
                <Icon aria-hidden="true" />
              </Button>
            </IconTip>
          ))}
          <span
            title="iframe 的布局宽度 · 缩放比例"
            className="ml-1 min-w-24 font-mono text-xs text-muted-foreground tabular-nums"
          >
            {layoutWidth}px · {Math.round(scale * 100)}%
          </span>
        </div>
        <div className="flex items-center gap-0.5">
          <IconTip label="在 v0 中打开">
            <a
              href={v0Url(name)}
              target="_blank"
              rel="noreferrer"
              aria-label="在 v0 中打开（在新标签页中打开）"
              className={iconAction}
            >
              <V0Icon className="size-4" />
            </a>
          </IconTip>
          {view === "code" && activeFile && (
            <CopyButton value={activeFile.source} label={`复制 ${active}`} />
          )}
          <IconTip label="新标签打开预览">
            <a
              href={`/view/${name}/`}
              target="_blank"
              rel="noreferrer"
              aria-label="新标签打开预览（在新标签页中打开）"
              className={iconAction}
            >
              <ExternalLink aria-hidden="true" />
            </a>
          </IconTip>
          <Button
            variant="ghost"
            size="sm"
            aria-expanded={installOpen}
            onClick={() => setInstallOpen((open) => !open)}
            className="text-muted-foreground aria-expanded:text-foreground"
          >
            <Terminal aria-hidden="true" data-icon="inline-start" />
            安装
          </Button>
        </div>
      </DocFrameBar>
      {installOpen && <div className="mb-1">{install}</div>}
      <TabsContent value="preview" keepMounted className={docFramePanelClass}>
        <div ref={stageRef} className="flex justify-center bg-muted/30 sm:px-4">
          <div
            className={cn(
              "relative bg-background sm:ring-1 sm:ring-edge",
              !dragging &&
                "transition-[width,height] duration-200 motion-reduce:transition-none",
            )}
            style={{ width: frameWidth, height: frameHeight }}
          >
            {/* iframe 以布局宽度渲染，再用 transform 缩放到容器里 */}
            <div className="relative size-full overflow-hidden">
              {loadedName !== name && (
                <PreviewSkeleton className="absolute inset-0" />
              )}
              <iframe
                src={near ? `/view/${name}/` : undefined}
                onLoad={(event) => {
                  if (
                    near &&
                    event.currentTarget.contentWindow?.location.pathname ===
                      `/view/${name}/`
                  )
                    setLoadedName(name)
                }}
                data-ready={loadedName === name}
                title={`${title} 预览`}
                loading="eager"
                className={cn(
                  "block origin-top-left border-0 opacity-0 transition-opacity duration-200 data-[ready=true]:opacity-100 motion-reduce:transition-none",
                  dragging && "pointer-events-none",
                )}
                style={{
                  width: layoutWidth,
                  height: heightPx,
                  transform: `scale(${scale})`,
                }}
              />
            </div>
            <div
              role="separator"
              tabIndex={0}
              aria-orientation="vertical"
              aria-label="拖拽或用左右方向键调整预览宽度，Home 恢复"
              aria-valuenow={layoutWidth}
              aria-valuemin={MIN_WIDTH}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              onKeyDown={onKeyDown}
              className="group absolute inset-y-0 -right-4 hidden w-4 cursor-ew-resize touch-none items-center justify-center outline-none sm:flex"
            >
              <span className="h-10 w-1 rounded-full bg-edge transition-colors group-hover:bg-muted-foreground group-focus-visible:bg-ring" />
            </div>
          </div>
        </div>
      </TabsContent>
      <TabsContent
        value="code"
        className={cn(docFramePanelClass, "flex-none")}
        style={{ height: frameHeight, overflow: "auto" }}
      >
        <div className="grid md:grid-cols-[15rem_minmax(0,1fr)]">
          <nav
            aria-label="文件"
            className="border-b border-edge p-2 md:border-r md:border-b-0"
          >
            <FileTree nodes={tree} active={active} onSelect={setActive} />
          </nav>
          <div className="min-w-0 md:max-h-[44rem] md:overflow-auto">
            {view !== "code" ? null : activeFile ? (
              <>
                <CodeView
                  key={activeFile.path}
                  lines={activeFile.lines}
                  collapse={false}
                >
                  <div dangerouslySetInnerHTML={{ __html: activeFile.html }} />
                </CodeView>
                <SourceNote file={activeFile} />
              </>
            ) : failed ? (
              <div
                role="alert"
                className="flex flex-col items-start gap-3 p-4 text-sm text-muted-foreground"
              >
                <p>源码没有加载出来，可能是网络中断。</p>
                <Button variant="outline" size="sm" onClick={showSources}>
                  重新加载
                </Button>
              </div>
            ) : (
              <PreviewSkeleton className="h-64" label="正在加载源码…" />
            )}
          </div>
        </div>
      </TabsContent>
    </Tabs>
  )
}
