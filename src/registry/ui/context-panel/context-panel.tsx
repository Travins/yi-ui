"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { PanelRightCloseIcon, PanelRightOpenIcon, XIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { useIsMobile } from "@/hooks/use-mobile"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { useControllableState } from "@/registry/hooks/use-controllable-state"

/** 所有可见文案，通过 `ContextPanelProvider` 的 `labels` 逐项覆盖。 */
const DEFAULT_LABELS = {
  /** 页面没有给标题时的面板名称 */
  title: "上下文面板",
  /** 开合按钮的名称；开合状态由 aria-expanded 表达，名称不随状态变 */
  toggle: "切换右侧面板",
  /** 面板内关闭按钮的名称 */
  close: "关闭面板",
}

type ContextPanelLabels = typeof DEFAULT_LABELS

type ContextPanelEntry = { id: string; title: React.ReactNode }

type ContextPanelContextValue = {
  open: boolean
  setOpen: (open: boolean) => void
  hasContent: boolean
  title: React.ReactNode
  labels: ContextPanelLabels
  isMobile: boolean
  /** 桌面端面板的 id，开合按钮用它写 aria-controls */
  panelId: string
  /** portal 的目标节点；面板没有渲染（窄屏抽屉关闭）时为 null */
  container: HTMLElement | null
  setContainer: (node: HTMLElement | null) => void
  register: (id: string, title: React.ReactNode) => void
  unregister: (id: string) => void
}

const ContextPanelContext =
  React.createContext<ContextPanelContextValue | null>(null)

function useContextPanelInternal(caller: string) {
  const context = React.useContext(ContextPanelContext)
  if (!context) {
    throw new Error(`${caller} 必须放在 ContextPanelProvider 内。`)
  }
  return context
}

/**
 * 读写面板的开合状态，例如点表格的一行时 `setOpen(true)`。
 * `hasContent` 为 false（当前页面没有声明面板内容）时，面板即使 `open` 也不显示。
 */
function useContextPanel() {
  const { open, setOpen, hasContent } =
    useContextPanelInternal("useContextPanel")
  return React.useMemo(
    () => ({
      open,
      setOpen,
      toggle: () => setOpen(!open),
      hasContent,
    }),
    [open, setOpen, hasContent],
  )
}

/**
 * 面板的状态容器，不渲染 DOM。开合状态是它自己的，与官方 `SidebarProvider` 无关：
 * 左侧导航用 ⌘B 收起时，右侧面板不会跟着动。
 */
function ContextPanelProvider({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  labels: labelsProp,
  children,
}: {
  /** 受控的开合状态 */
  open?: boolean
  /**
   * 非受控时的初始状态。只决定桌面端：窄屏的抽屉会盖住页面，要等用户主动打开
   * @default false
   */
  defaultOpen?: boolean
  /** 开合变化时调用，受控与非受控都会触发 */
  onOpenChange?: (open: boolean) => void
  /** 覆盖默认文案：`title`、`toggle`、`close` */
  labels?: Partial<ContextPanelLabels>
  children?: React.ReactNode
}) {
  const [openState, setOpenState] = useControllableState({
    prop: openProp,
    defaultProp: defaultOpen,
    onChange: onOpenChange,
  })
  const isMobile = useIsMobile()
  // 窄屏的抽屉是模态的：只凭 defaultOpen 不弹出来，等用户点过开合按钮（或调用过 setOpen）才算数
  const [engaged, setEngaged] = React.useState(false)
  const open = openState && (!isMobile || engaged || openProp !== undefined)
  const setOpen = React.useCallback(
    (next: boolean) => {
      setEngaged(true)
      setOpenState(next)
    },
    [setOpenState],
  )
  const labels = React.useMemo(
    () => ({ ...DEFAULT_LABELS, ...labelsProp }),
    [labelsProp],
  )
  const panelId = React.useId()
  const [container, setContainer] = React.useState<HTMLElement | null>(null)

  // 页面可以同时声明多块内容：都渲染进面板，标题取最后声明的那一块
  const [entries, setEntries] = React.useState<ContextPanelEntry[]>([])
  const register = React.useCallback((id: string, title: React.ReactNode) => {
    setEntries((current) => {
      const existing = current.find((entry) => entry.id === id)
      if (!existing) return [...current, { id, title }]
      if (Object.is(existing.title, title)) return current
      // 原位更新：标题变化不改变各块内容的先后顺序
      return current.map((entry) =>
        entry === existing ? { id, title } : entry,
      )
    })
  }, [])
  const unregister = React.useCallback((id: string) => {
    setEntries((current) => current.filter((entry) => entry.id !== id))
  }, [])

  const hasContent = entries.length > 0
  const title = entries[entries.length - 1]?.title
  const value = React.useMemo<ContextPanelContextValue>(
    () => ({
      open,
      setOpen,
      hasContent,
      title,
      labels,
      isMobile,
      panelId,
      container,
      setContainer,
      register,
      unregister,
    }),
    [
      open,
      setOpen,
      hasContent,
      title,
      labels,
      isMobile,
      panelId,
      container,
      register,
      unregister,
    ],
  )
  return (
    <ContextPanelContext.Provider value={value}>
      {children}
    </ContextPanelContext.Provider>
  )
}

/**
 * 面板本体，放在主内容的右侧（与主内容同在一个横向 flex 容器里）。
 * 桌面端是一栏 20rem 的 `aside`，收起时宽度为 0；视口窄于 768px 时改成从右侧滑出的抽屉。
 * 内容不写在这里，由页面里的 `ContextPanelContent` 声明；没有内容时不显示。
 *
 * 宽度用 `className="[--context-panel-width:24rem]"` 调整；默认贴着视口顶部、占满一屏高，
 * 放进固定高度的容器时传 `className="h-full"`。其余属性只作用在桌面端的 `aside` 上。
 */
function ContextPanel({
  className,
  ...props
}: Omit<React.ComponentProps<"aside">, "children">) {
  const {
    open,
    setOpen,
    hasContent,
    title,
    labels,
    isMobile,
    panelId,
    setContainer,
  } = useContextPanelInternal("ContextPanel")
  const visible = open && hasContent
  const heading = title ?? labels.title
  const headingId = `${panelId}-title`

  const panelRef = React.useRef<HTMLElement>(null)
  // 焦点最后停在面板里还是面板外；面板外的那个元素是关闭后归还焦点的位置
  const focusInsideRef = React.useRef(false)
  const returnFocusRef = React.useRef<HTMLElement | null>(null)

  React.useEffect(() => {
    if (isMobile) return
    const onFocusIn = (event: FocusEvent) => {
      const panel = panelRef.current
      if (!panel || !(event.target instanceof HTMLElement)) return
      if (panel.contains(event.target)) {
        focusInsideRef.current = true
      } else {
        focusInsideRef.current = false
        returnFocusRef.current = event.target
      }
    }
    // 监听挂在 document 上：等面板里的控件（输入框、内嵌菜单）先处理 Esc，它们拦下了就不关面板
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return
      const panel = panelRef.current
      if (panel && event.target instanceof Node && panel.contains(event.target))
        setOpen(false)
    }
    document.addEventListener("focusin", onFocusIn)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("focusin", onFocusIn)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [isMobile, setOpen])

  // 收起后面板是 inert 的，停在里面的焦点会丢到 body：还给打开面板前的元素，找不到就给开合按钮
  React.useEffect(() => {
    if (isMobile || visible || !focusInsideRef.current) return
    focusInsideRef.current = false
    const previous = returnFocusRef.current
    const target = previous?.isConnected
      ? previous
      : document.querySelector<HTMLElement>(
          `[data-slot="context-panel-trigger"][aria-controls="${CSS.escape(panelId)}"]`,
        )
    target?.focus()
  }, [isMobile, visible, panelId])

  if (isMobile) {
    // 抽屉的焦点圈定、Esc 关闭和焦点归还由 Dialog 处理
    return (
      <Sheet open={visible} onOpenChange={setOpen}>
        <SheetContent
          data-slot="context-panel"
          data-mobile="true"
          side="right"
          showCloseButton={false}
          className={cn(
            "gap-0 bg-sidebar p-0 text-sidebar-foreground [--context-panel-width:20rem] data-[side=right]:w-(--context-panel-width) data-[side=right]:max-w-[85vw]",
            className,
          )}
        >
          <SheetHeader
            data-slot="context-panel-header"
            className="h-14 shrink-0 flex-row items-center gap-2 border-b border-sidebar-border px-4 py-0"
          >
            <SheetTitle className="min-w-0 flex-1 truncate text-sm font-semibold text-sidebar-foreground">
              {heading}
            </SheetTitle>
            <SheetClose
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={labels.close}
                />
              }
            >
              <XIcon aria-hidden="true" />
            </SheetClose>
          </SheetHeader>
          <div
            ref={setContainer}
            data-slot="context-panel-body"
            className="min-h-0 flex-1 overflow-y-auto"
          />
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <aside
      ref={panelRef}
      id={panelId}
      data-slot="context-panel"
      data-state={visible ? "open" : "closed"}
      aria-labelledby={headingId}
      // 收起后宽度为 0：inert 让里面的控件不再接收焦点，读屏也读不到
      inert={!visible}
      className={cn(
        "sticky top-0 hidden h-svh w-0 shrink-0 overflow-hidden bg-sidebar text-sidebar-foreground transition-[width] duration-200 ease-linear [--context-panel-width:20rem] data-[state=open]:w-(--context-panel-width) motion-reduce:transition-none md:block",
        className,
      )}
      {...props}
    >
      {/* 内层固定宽度：开合动画期间内容不被挤压换行 */}
      <div className="flex h-full w-(--context-panel-width) flex-col border-l border-sidebar-border">
        <div
          data-slot="context-panel-header"
          className="flex h-14 shrink-0 items-center gap-2 border-b border-sidebar-border px-4"
        >
          <h2
            id={headingId}
            className="min-w-0 flex-1 truncate text-sm font-semibold"
          >
            {heading}
          </h2>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={labels.close}
            onClick={() => setOpen(false)}
          >
            <XIcon aria-hidden="true" />
          </Button>
        </div>
        <div
          ref={setContainer}
          data-slot="context-panel-body"
          className="min-h-0 flex-1 overflow-y-auto"
        />
      </div>
    </aside>
  )
}

/**
 * 开合按钮，通常放在顶栏右侧。当前页面没有声明面板内容时不渲染，
 * 所以可以放在公共布局里，不用每个页面自己判断。
 */
function ContextPanelTrigger({
  onClick,
  children,
  ...props
}: React.ComponentProps<typeof Button>) {
  const { open, setOpen, hasContent, labels, isMobile, panelId } =
    useContextPanelInternal("ContextPanelTrigger")
  if (!hasContent) return null
  return (
    <Button
      data-slot="context-panel-trigger"
      variant="ghost"
      size="icon-sm"
      aria-label={labels.toggle}
      aria-expanded={open}
      // 窄屏的抽屉关闭时不在 DOM 里，没有可指向的节点
      aria-controls={isMobile ? undefined : panelId}
      onClick={(event) => {
        onClick?.(event)
        if (!event.defaultPrevented) setOpen(!open)
      }}
      {...props}
    >
      {children ??
        (open ? (
          <PanelRightCloseIcon aria-hidden="true" />
        ) : (
          <PanelRightOpenIcon aria-hidden="true" />
        ))}
    </Button>
  )
}

/**
 * 页面用它声明右侧面板的内容，写在页面组件里的任意位置。
 * 挂载期间面板可用，卸载（离开页面）后自动撤掉。内容经 portal 渲染进面板，
 * 但仍属于页面自己的 React 树，可以直接用页面的 state 和 context。
 */
function ContextPanelContent({
  title,
  children,
}: {
  /** 面板标题；不传时用 `labels.title` */
  title?: React.ReactNode
  children?: React.ReactNode
}) {
  const id = React.useId()
  const { register, unregister, container } = useContextPanelInternal(
    "ContextPanelContent",
  )
  React.useEffect(() => register(id, title), [register, id, title])
  React.useEffect(() => () => unregister(id), [unregister, id])
  return container ? createPortal(children, container) : null
}

/** 面板里的一个分区：标题、可选的说明和内容，分区之间用虚线隔开。 */
function ContextPanelSection({
  title,
  description,
  className,
  children,
  ...props
}: Omit<React.ComponentProps<"section">, "title"> & {
  /** 分区标题，同时是这个分区的读屏名称 */
  title: React.ReactNode
  /** 标题下方的一行说明 */
  description?: React.ReactNode
}) {
  const id = React.useId()
  return (
    <section
      data-slot="context-panel-section"
      aria-labelledby={id}
      className={cn(
        "border-b border-dashed border-sidebar-border p-4 last:border-b-0",
        className,
      )}
      {...props}
    >
      <h3 id={id} className="text-sm font-semibold">
        {title}
      </h3>
      {description ? (
        <p className="mt-1 text-xs text-sidebar-foreground/65">{description}</p>
      ) : null}
      <div className="mt-3">{children}</div>
    </section>
  )
}

export {
  ContextPanel,
  ContextPanelContent,
  ContextPanelProvider,
  ContextPanelSection,
  ContextPanelTrigger,
  useContextPanel,
}
export type { ContextPanelLabels }
