"use client"

import * as React from "react"
import { Dialog } from "@base-ui/react/dialog"
import { ChevronDown, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { useControllableState } from "@/registry/hooks/use-controllable-state"

import { DEFAULT_LABELS, SHEET_QUERY } from "./config"
import { RegionPickerPanel } from "./region-picker-panel"
import { regionPickerTriggerVariants } from "./region-picker-parts"
import type { RegionOption, RegionPickerProps } from "./types"
import { createRegionIndex, formatRegionPath } from "./utils"

const EMPTY_PATH: RegionOption[] = []

// 底部面板的遮罩：用半透明的背景色把后面的页面淡化，亮色下是白雾、暗色下是暗层，随主题走
const SCRIM = "bg-background/70 backdrop-blur-xs"

/** 订阅媒体查询；服务端与首帧按桌面渲染，只影响打开后的容器，触发器两边一致 */
function useMediaQuery(query: string) {
  return React.useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query)
      list.addEventListener("change", onChange)
      return () => list.removeEventListener("change", onChange)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}

/**
 * 省市区选择：触发器 + 分步选择面板（①省份 ②城市 ③区县，支持拼音搜索）。
 * 手机与触屏设备从底部弹出面板，桌面在输入框下方弹出浮层。
 * 数据通过 `regions` 传入，函数形式会惰性加载。
 */
function RegionPicker({
  regions,
  value: valueProp,
  defaultValue = null,
  onValueChange,
  depth,
  allowPartial = false,
  name,
  form,
  required = false,
  disabled,
  label,
  error,
  placeholder,
  fallbackLabel,
  title: titleProp,
  size = "default",
  presentation = "auto",
  container,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  labels: labelsProp,
  className,
  ref,
  ...props
}: RegionPickerProps) {
  const labels = { ...DEFAULT_LABELS, ...labelsProp }
  const maxDepth =
    depth === undefined ? Infinity : Math.max(1, Math.floor(depth))

  const triggerRef = React.useRef<HTMLButtonElement>(null)
  React.useImperativeHandle(ref, () => triggerRef.current as HTMLButtonElement)
  const searchRef = React.useRef<HTMLInputElement>(null)
  const closeRef = React.useRef<HTMLButtonElement>(null)
  const narrow = useMediaQuery(SHEET_QUERY)
  const sheet = presentation === "sheet" || (presentation === "auto" && narrow)
  // 挂进指定容器时（如文档里的手机外框），面板只盖住容器、不锁整页滚动
  const contained = container !== undefined
  const proxyRef = React.useRef<HTMLInputElement>(null)

  const [open, setOpen] = useControllableState({
    prop: openProp,
    defaultProp: defaultOpen,
    onChange: onOpenChange,
  })

  // 惰性加载：浮层第一次打开、或已有值需要显示路径时才调用，且只调用一次。
  // 加载函数放进 ref，调用方每次渲染都写内联箭头函数也不会重复请求。
  const [lazyData, setLazyData] = React.useState<RegionOption[] | null>(null)
  const [failed, setFailed] = React.useState(false)
  const [attempt, setAttempt] = React.useState(0)
  const loaderRef = React.useRef(regions)
  const requestRef = React.useRef<Promise<RegionOption[]> | null>(null)
  React.useEffect(() => {
    loaderRef.current = regions
  })

  // 受控与非受控都要拿到当前值，下面的 onChange 里用它反查路径
  const indexRef = React.useRef<ReturnType<typeof createRegionIndex> | null>(
    null,
  )
  const [code, setCode] = useControllableState<string | null>({
    prop: valueProp,
    defaultProp: defaultValue,
    onChange: (next) =>
      onValueChange?.(
        next,
        (next && indexRef.current?.byCode.get(next)) || EMPTY_PATH,
      ),
  })

  const lazy = typeof regions === "function"
  const wantsData = lazy && (open || code !== null)
  React.useEffect(() => {
    if (!wantsData || lazyData) return
    const loader = loaderRef.current
    if (typeof loader !== "function") return
    const request = (requestRef.current ??= loader())
    let stale = false
    request.then(
      (data) => {
        if (!stale) setLazyData(data)
      },
      () => {
        if (!stale) setFailed(true)
      },
    )
    return () => {
      stale = true
    }
  }, [wantsData, lazyData, attempt])

  const retry = () => {
    requestRef.current = null
    setFailed(false)
    setAttempt((count) => count + 1)
  }

  const data = lazy ? lazyData : regions
  // 数据一到就建一次索引（搜索、回显路径都靠它），数据与 depth 不变就不重建
  const index = React.useMemo(
    () => (data ? createRegionIndex(data, { depth: maxDepth }) : null),
    [data, maxDepth],
  )
  React.useEffect(() => {
    indexRef.current = index
  })

  const valuePath = (code !== null && index?.byCode.get(code)) || EMPTY_PATH
  const status = index ? "ready" : failed ? "error" : "loading"

  // 触发器文字：找得到就显示路径；加载中或代码失效时用调用方存的名称兜底
  let text: React.ReactNode = null
  let title: string | undefined
  if (code !== null) {
    const last = valuePath.at(-1)
    if (last) {
      title = formatRegionPath(valuePath)
      // 放不下时只截上级，最末一级（真正选中的那个）始终完整显示
      const parents = valuePath.slice(0, -1)
      const sep = <span className="text-muted-foreground/60"> / </span>
      text = (
        <>
          {parents.length > 0 && (
            <span className="min-w-0 truncate">
              {parents.map((node, i) => (
                <React.Fragment key={node.code}>
                  {i > 0 && sep}
                  {node.name}
                </React.Fragment>
              ))}
            </span>
          )}
          {parents.length > 0 && (
            <span className="shrink-0 whitespace-pre">{sep}</span>
          )}
          <span className="shrink-0">{last.name}</span>
        </>
      )
    } else {
      title =
        fallbackLabel ??
        (status === "loading" && lazy
          ? labels.loading
          : `${labels.unknown}（${code}）`)
      text = title
    }
  }

  const commit = (path: RegionOption[]) => {
    setCode(path.at(-1)?.code ?? null)
    setOpen(false)
  }

  // 表单：同名的隐藏输入负责提交代码；它是可校验的文本输入，所以 required 能拦住提交、
  // 浏览器的气泡提示也有地方挂。覆盖在触发器上，聚焦时转交给触发器。
  React.useEffect(() => {
    proxyRef.current?.setCustomValidity(
      required && code === null ? labels.required : "",
    )
  }, [required, code, labels.required])

  // 非受控的表单重置回到初始值；reset 事件在表单清空之前触发，等一帧再覆盖
  const controlled = valueProp !== undefined
  React.useEffect(() => {
    const element = proxyRef.current?.form
    if (!element || controlled) return
    const reset = () => window.setTimeout(() => setCode(defaultValue))
    element.addEventListener("reset", reset)
    return () => element.removeEventListener("reset", reset)
  }, [controlled, defaultValue, setCode])

  const errorId = React.useId()
  const invalid =
    Boolean(error) ||
    props["aria-invalid"] === true ||
    props["aria-invalid"] === "true"
  const describedBy =
    [props["aria-describedby"], error ? errorId : undefined]
      .filter(Boolean)
      .join(" ") || undefined

  const triggerProps = {
    ...props,
    "aria-invalid": invalid || undefined,
    "aria-describedby": describedBy,
    ref: triggerRef,
    "data-slot": "region-picker-trigger",
    disabled,
    title: title ?? titleProp,
    "aria-busy": code !== null && !index && !failed && lazy ? true : undefined,
    className: regionPickerTriggerVariants({ size }),
    children: (
      <>
        {label && (
          <span
            data-slot="region-picker-label"
            className="shrink-0 text-muted-foreground"
          >
            {label}
          </span>
        )}
        <span
          data-slot="region-picker-value-text"
          className={cn(
            "flex min-w-0 flex-1",
            // 有条内标签时值靠右，与方条开关、数值滑块的「左标签右数值」一致
            label && "justify-end",
            code === null && "text-muted-foreground",
          )}
        >
          {typeof text === "string" || code === null ? (
            <span className="min-w-0 truncate">
              {code === null ? (placeholder ?? labels.placeholder) : text}
            </span>
          ) : (
            text
          )}
        </span>
        <ChevronDown
          aria-hidden="true"
          className="size-4 shrink-0 text-muted-foreground"
        />
      </>
    ),
  }

  const panel = (variant: "sheet" | "popover") => (
    <RegionPickerPanel
      variant={variant}
      index={index}
      status={status}
      labels={labels}
      value={code}
      valuePath={valuePath}
      depth={maxDepth}
      allowPartial={allowPartial}
      required={required}
      inputRef={searchRef}
      onRetry={retry}
      onCommit={commit}
    />
  )

  // 官方 SheetContent 未开放 Portal 的 container，仅内嵌模式保留底层容器适配。
  const sheetContents = (
    <>
      <div className="flex h-12 shrink-0 items-center justify-between gap-1 pr-2 pl-4">
        <SheetTitle className="text-base font-medium">
          {labels.title}
        </SheetTitle>
        {/* 标题栏里的按钮同一档 lg：清除与关闭并排 */}
        {code !== null && !required && (
          <Button
            type="button"
            variant="ghost"
            size="lg"
            className="ml-auto text-muted-foreground"
            onClick={() => commit(EMPTY_PATH)}
          >
            {labels.clear}
          </Button>
        )}
        <SheetClose
          ref={closeRef}
          aria-label={labels.close}
          render={<Button type="button" variant="ghost" size="icon-lg" />}
        >
          <X aria-hidden="true" />
        </SheetClose>
      </div>
      {panel("sheet")}
    </>
  )
  const sheetClassName = cn(
    "gap-0 outline-none motion-reduce:transition-none",
    contained ? "absolute h-[85%]" : "h-[85dvh]",
  )
  const sheetContentProps = {
    "data-slot": "region-picker-sheet",
    // 避免唤起软键盘；内嵌面板聚焦时不滚动外层容器。
    initialFocus: () => {
      closeRef.current?.focus({ preventScroll: true })
      return false as const
    },
    finalFocus: triggerRef,
    className: sheetClassName,
    children: sheetContents,
  }

  return (
    <div
      data-slot="region-picker"
      data-size={size}
      data-invalid={invalid ? "" : undefined}
      data-disabled={disabled ? "" : undefined}
      className={cn("relative w-full", className)}
    >
      {sheet ? (
        <Sheet
          open={open}
          onOpenChange={(next) => setOpen(next)}
          modal={contained ? "trap-focus" : true}
        >
          <SheetTrigger {...triggerProps} />
          {contained ? (
            <Dialog.Portal container={container}>
              <Dialog.Backdrop
                data-slot="region-picker-backdrop"
                className={`absolute inset-0 z-50 ${SCRIM} transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 motion-reduce:transition-none`}
              />
              <Dialog.Popup
                {...sheetContentProps}
                data-side="bottom"
                className={cn(
                  "inset-x-0 bottom-0 z-50 flex flex-col border-t bg-popover bg-clip-padding text-sm text-popover-foreground shadow-lg transition duration-200 ease-in-out data-ending-style:translate-y-10 data-ending-style:opacity-0 data-starting-style:translate-y-10 data-starting-style:opacity-0",
                  sheetClassName,
                )}
              />
            </Dialog.Portal>
          ) : (
            <SheetContent
              {...sheetContentProps}
              side="bottom"
              showCloseButton={false}
            />
          )}
        </Sheet>
      ) : (
        <Popover open={open} onOpenChange={(next) => setOpen(next)}>
          <PopoverTrigger {...triggerProps} />
          <PopoverContent
            align="start"
            className="w-[30rem] max-w-[calc(100vw-1rem)] min-w-(--anchor-width) gap-0 p-0"
            initialFocus={searchRef}
          >
            {panel("popover")}
          </PopoverContent>
        </Popover>
      )}
      <input
        ref={proxyRef}
        data-slot="region-picker-value"
        tabIndex={-1}
        aria-hidden="true"
        autoComplete="off"
        name={name}
        form={form}
        required={required}
        disabled={disabled}
        value={code ?? ""}
        onChange={() => {}}
        onFocus={() => triggerRef.current?.focus()}
        // 只盖住触发器那一行，原生的必填气泡指向触发器而不是下面的错误文字
        className="pointer-events-none absolute inset-x-0 top-0 h-full max-h-11 w-full opacity-0"
      />
      {error && (
        <p
          id={errorId}
          data-slot="region-picker-error"
          className="mt-1.5 text-xs text-destructive"
        >
          {error}
        </p>
      )}
    </div>
  )
}

export { RegionPicker, regionPickerTriggerVariants }
export type {
  RegionOption,
  RegionPickerProps,
  RegionPickerSize,
  RegionsSource,
} from "./types"
