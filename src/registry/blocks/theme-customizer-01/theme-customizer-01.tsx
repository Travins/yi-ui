"use client"

import * as React from "react"
import { PaletteIcon } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverTitle,
} from "@/components/ui/popover"
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet"
import { TonePicker } from "@/registry/ui/tone-picker/tone-picker"
import { SegmentedControl } from "@/registry/ui/segmented-control/segmented-control"
import { cn } from "@/lib/utils"
import {
  DEFAULT_LABELS,
  DEFAULT_STORAGE_KEY,
  DEFAULT_VALUES,
  PRESETS,
} from "./config"
import {
  applyPreferences,
  normalizePreferences,
  type ThemeCustomizerValues,
} from "./preferences"

type ThemeCustomizerProps = React.ComponentProps<"div"> & {
  /** 局部目标；指定后不读写存储。默认 document.documentElement。 */
  target?: React.RefObject<HTMLElement | null> | (() => HTMLElement | null)
  /** @default "yiui:theme-customizer" */
  storageKey?: string
  /** 覆盖面板所有文案及预设名称。 */
  labels?: Partial<typeof DEFAULT_LABELS>
}
function subscribePointer(callback: () => void) {
  const media = matchMedia("(pointer: coarse)")
  media.addEventListener("change", callback)
  return () => media.removeEventListener("change", callback)
}
function ThemeCustomizer({
  target,
  storageKey = DEFAULT_STORAGE_KEY,
  labels,
  className,
  ...props
}: ThemeCustomizerProps) {
  const text = { ...DEFAULT_LABELS, ...labels }
  const [value, setValue] =
    React.useState<ThemeCustomizerValues>(DEFAULT_VALUES)
  const [previewMode, setPreviewMode] = React.useState("system")
  const [mounted, setMounted] = React.useState(false)
  const [open, setOpen] = React.useState(false)
  const { theme, setTheme } = useTheme()
  const coarse = React.useSyncExternalStore(
    subscribePointer,
    () => matchMedia("(pointer: coarse)").matches,
    () => false,
  )
  // target 可能是每次渲染都新建的函数，放进 ref，避免父组件重渲染时把偏好重置
  const targetRef = React.useRef(target)
  React.useEffect(() => {
    targetRef.current = target
  })
  const scoped = target !== undefined
  function resolveElement() {
    const current = targetRef.current
    if (!current) return document.documentElement
    return typeof current === "function" ? current() : current.current
  }
  React.useEffect(() => {
    const element = resolveElement()
    let next: ThemeCustomizerValues = DEFAULT_VALUES
    let mode = "system"
    if (scoped) {
      // 局部模式不碰存储，以目标元素上已有的属性为初始值
      next = normalizePreferences(element?.dataset)
      if (element?.classList.contains("dark")) mode = "dark"
      else if (element?.classList.contains("light")) mode = "light"
    } else {
      try {
        next = normalizePreferences(
          JSON.parse(localStorage.getItem(storageKey) || "{}"),
        )
      } catch {
        /* 存储不可用时使用默认值 */
      }
    }
    if (element) applyPreferences(element, next)
    queueMicrotask(() => {
      setValue(next)
      setPreviewMode(mode)
      setMounted(true)
    })
  }, [scoped, storageKey])
  function update(next: ThemeCustomizerValues) {
    setValue(next)
    const element = resolveElement()
    if (element) applyPreferences(element, next)
    if (!scoped) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(next))
      } catch {
        /* 仍保留本次会话状态 */
      }
    }
  }
  function changeMode(mode: string) {
    if (!scoped) {
      setTheme(mode)
      return
    }
    // 局部亮暗用 class，组件里的 dark: 变体也跟着变；「跟随系统」在局部模式下即跟随所在页面
    setPreviewMode(mode)
    const element = resolveElement()
    element?.classList.toggle("dark", mode === "dark")
    element?.classList.toggle("light", mode === "light")
  }
  const controls = (
    <div data-slot="theme-customizer-controls" className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-baseline justify-between gap-2 text-sm">
          <span className="font-medium">{text.color}</span>
          <span className="text-xs text-muted-foreground">
            {text.presets[value.theme] ??
              PRESETS.find((p) => p.value === value.theme)?.label}
          </span>
        </div>
        <TonePicker
          aria-label={text.color}
          columns={7}
          options={PRESETS.map((p) => ({
            ...p,
            label: text.presets[p.value] ?? p.label,
          }))}
          value={value.theme}
          onValueChange={(theme) => update({ ...value, theme })}
        />
      </div>
      <SegmentedControl
        label={text.radius}
        options={["sm", "md", "lg"].map((v, i) => ({
          value: v,
          label: [text.small, text.medium, text.large][i],
        }))}
        value={value.radius}
        onValueChange={(radius) =>
          update({
            ...value,
            radius: radius as ThemeCustomizerValues["radius"],
          })
        }
      />
      <SegmentedControl
        label={text.width}
        options={[
          { value: "compact", label: text.compact },
          { value: "wide", label: text.wide },
        ]}
        value={value.contentWidth}
        onValueChange={(contentWidth) =>
          update({
            ...value,
            contentWidth: contentWidth as ThemeCustomizerValues["contentWidth"],
          })
        }
      />
      <SegmentedControl
        label={text.mode}
        options={[
          { value: "light", label: text.light },
          { value: "dark", label: text.dark },
          { value: "system", label: text.system },
        ]}
        value={mounted ? (scoped ? previewMode : theme) : ""}
        onValueChange={changeMode}
      />
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={() => {
          update(DEFAULT_VALUES)
          changeMode("system")
        }}
      >
        {text.reset}
      </Button>
    </div>
  )
  const trigger = (
    <Button type="button" size="icon" variant="ghost" aria-label={text.trigger}>
      <PaletteIcon />
    </Button>
  )
  return (
    <div
      data-slot="theme-customizer"
      className={cn("inline-flex", className)}
      {...props}
    >
      {coarse ? (
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger render={trigger} />
          <SheetContent
            side="bottom"
            showCloseButton={false}
            className="max-h-[90dvh] overflow-y-auto p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
          >
            <SheetTitle>{text.title}</SheetTitle>
            {controls}
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              {text.close}
            </Button>
          </SheetContent>
        </Sheet>
      ) : (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger render={trigger} />
          <PopoverContent
            align="end"
            className="max-h-(--available-height) w-80 max-w-[calc(100vw-2rem)] overflow-y-auto p-4"
          >
            <PopoverTitle>{text.title}</PopoverTitle>
            {controls}
          </PopoverContent>
        </Popover>
      )}
    </div>
  )
}
export { ThemeCustomizer }
export type { ThemeCustomizerProps }
