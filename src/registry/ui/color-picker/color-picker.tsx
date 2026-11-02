"use client"
import * as React from "react"
import { ColorPickerPanel } from "./color-panel"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover"
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { barFieldVariants } from "@/registry/ui/bar-field/bar-field"
import { useControllableState } from "@/registry/hooks/use-controllable-state"
import {
  parseHex,
  rgbToHex,
  rgbToHsv,
  hsvToRgb,
  type HSV,
} from "@/registry/lib/color"
import {
  ColorArea,
  ColorHueSlider,
  ColorAlphaSlider,
  ColorSwatch,
} from "./color-parts"
import { cn } from "@/lib/utils"
const defaultLabels = {
  open: "选择颜色",
  invalid: "请输入有效的 HEX 颜色",
  saturation: "饱和度",
  brightness: "明度",
  hue: "色相",
  alpha: "透明度",
  format: "颜色格式",
  presets: "预设色板",
  eyeDropper: "吸取屏幕颜色",
  done: "完成",
  red: "红",
  green: "绿",
  blue: "蓝",
  lightness: "亮度",
}
type ColorPickerLabels = typeof defaultLabels
type ColorPickerProps = Omit<
  React.ComponentProps<"div">,
  "defaultValue" | "onChange"
> & {
  /** 方条标签；省略时提供 aria-label */ label?: React.ReactNode
  /** 受控 HEX */ value?: string
  /** 初始颜色 @default "#2563eb" */ defaultValue?: string
  /** 变化时持续触发 */ onValueChange?: (value: string) => void
  /** 操作结束触发 */ onValueCommit?: (value: string) => void
  /** 输出包含透明度 @default false */ alpha?: boolean
  /** 初始面板格式 @default "HEX" */ format?: "HEX" | "RGB" | "HSL"
  /** 预设颜色 @default [] */ presets?: string[]
  /** 中文文案覆盖 */ labels?: Partial<ColorPickerLabels>
  /** 高度档 @default "default" */ size?: "sm" | "default" | "lg"
  /** 禁用 @default false */ disabled?: boolean
  /** 只读 @default false */ readOnly?: boolean
  /** 错误信息 */ error?: string
  /** 说明 */ description?: React.ReactNode
  /** HEX 输入框的 id，方便外部 label 关联 */ id?: string
  /** 表单字段名 */ name?: string
  /** 所属表单 */ form?: string
}
function subscribe(notify: () => void) {
  const m = matchMedia("(pointer: coarse)")
  m.addEventListener("change", notify)
  return () => m.removeEventListener("change", notify)
}
function ColorPicker({
  id: idProp,
  label,
  value: prop,
  defaultValue = "#2563eb",
  onValueChange,
  onValueCommit,
  alpha = false,
  format: initialFormat = "HEX",
  presets = [],
  labels: overrides,
  size = "default",
  disabled,
  readOnly,
  error,
  description,
  name,
  form,
  className,
  ...props
}: ColorPickerProps) {
  const autoId = React.useId()
  const id = idProp ?? autoId
  const labels = { ...defaultLabels, ...overrides }
  const [value, setValue] = useControllableState({
    prop,
    defaultProp: defaultValue,
    onChange: onValueChange,
  })
  const [local, setLocal] = React.useState<HSV>(() =>
    rgbToHsv(parseHex(value) ?? parseHex("#2563eb")!),
  )
  const parsed = rgbToHsv(parseHex(value) ?? parseHex("#2563eb")!, local.h)
  const renderedHex = rgbToHex(hsvToRgb(local), alpha)
  const hsv =
    rgbToHex(parseHex(value) ?? hsvToRgb(local), alpha) === renderedHex
      ? local
      : parsed
  const [draft, setDraft] = React.useState<string | null>(null)
  const [invalid, setInvalid] = React.useState(false)
  const [format, setFormat] = React.useState(initialFormat)
  const [open, setOpen] = React.useState(false),
    [sheetOpen, setSheetOpen] = React.useState(false)
  const coarse = React.useSyncExternalStore(
    subscribe,
    () => matchMedia("(pointer: coarse)").matches,
    () => false,
  )
  const eye = React.useSyncExternalStore(
    () => () => {},
    () => "EyeDropper" in window,
    () => false,
  )
  const root = React.useRef<HTMLDivElement>(null)
  function change(next: HSV, commit = false) {
    setLocal(next)
    const hex = rgbToHex(hsvToRgb(next), alpha)
    setValue(hex)
    setDraft(null)
    setInvalid(false)
    if (commit) onValueCommit?.(hex)
  }
  function submit(text: string) {
    const rgb = parseHex(text)
    if (!rgb) {
      setInvalid(true)
      return
    }
    change(rgbToHsv(rgb, local.h), true)
  }
  React.useEffect(() => {
    const el =
      root.current?.closest("form") ??
      (form ? document.getElementById(form) : null)
    const reset = () => {
      if (prop === undefined) {
        const next = rgbToHsv(parseHex(defaultValue)!)
        setLocal(next)
        setValue(rgbToHex(hsvToRgb(next), alpha))
        setDraft(null)
        setInvalid(false)
      }
    }
    el?.addEventListener("reset", reset)
    return () => el?.removeEventListener("reset", reset)
  }, [prop, defaultValue, form, setValue, alpha])
  const hex = rgbToHex(hsvToRgb(hsv), alpha)
  const panel = (
    <ColorPickerPanel
      {...{
        presets,
        hsv,
        hex,
        alpha,
        labels,
        format,
        setFormat,
        draft,
        setDraft,
        invalid,
        submit,
        change,
        onValueCommit,
        eye,
        coarse,
        setSheetOpen,
      }}
    />
  )
  const trigger = (
    <Button
      type="button"
      size={size === "sm" ? "icon-sm" : size === "lg" ? "icon-lg" : "icon"}
      variant="ghost"
      disabled={disabled || readOnly}
      aria-label={labels.open}
      aria-haspopup="dialog"
      aria-expanded={coarse ? sheetOpen : open}
      className="shrink-0 focus-visible:ring-inset"
      onClick={() => {
        if (coarse) setSheetOpen(true)
      }}
    >
      <ColorSwatch color={hex} />
    </Button>
  )
  return (
    <div
      {...props}
      ref={root}
      data-slot="color-picker"
      className={cn(
        "w-full min-w-0 in-data-[slot=grid-toolbar]:h-full",
        className,
      )}
    >
      <Popover open={coarse ? false : open} onOpenChange={setOpen}>
        <div className="@container/color-picker flex h-full flex-col gap-1.5">
          {label && (
            <label
              htmlFor={id}
              aria-hidden
              className="hidden text-xs text-muted-foreground in-data-[slot=grid-toolbar]:hidden! @max-[20rem]/color-picker:block"
            >
              {label}
            </label>
          )}
          <div
            data-slot="color-picker-control"
            className={cn(
              barFieldVariants({ size }),
              // 与 bar-field 同一套状态样式
              invalid || error
                ? "border-destructive ring-3 ring-destructive/20 dark:border-destructive/50 dark:ring-destructive/40"
                : "border-edge focus-within:border-foreground/25 focus-within:bg-background hover:not-focus-within:bg-muted dark:focus-within:bg-input/30",
              disabled && "opacity-50",
            )}
          >
            {label && (
              <label
                htmlFor={id}
                // mr-auto 把色块与 HEX 推到右侧，与方条文本框「标签靠左、值靠右」一致
                className="mr-auto shrink-0 text-muted-foreground in-data-[slot=grid-toolbar]:not-sr-only! @max-[20rem]/color-picker:sr-only"
              >
                {label}
              </label>
            )}
            {coarse ? trigger : <PopoverTrigger render={trigger} />}
            <input
              id={id}
              disabled={disabled}
              readOnly={readOnly}
              aria-label={props["aria-label"]}
              aria-labelledby={props["aria-labelledby"]}
              aria-invalid={!!(invalid || error)}
              aria-describedby={
                invalid || error || description
                  ? `${id}-description`
                  : undefined
              }
              className={cn(
                "h-full min-w-0 bg-transparent font-mono text-base outline-none pointer-fine:md:text-sm",
                // 有标签时按 HEX 位数定宽（等宽字体），整组靠右；无标签或标签移到上方时占满剩余宽度
                label
                  ? cn(
                      alpha ? "w-[10ch]" : "w-[8ch]",
                      "@max-[20rem]/color-picker:flex-1",
                    )
                  : "flex-1",
              )}
              value={draft ?? hex}
              onChange={(e) => {
                setDraft(e.target.value)
                setInvalid(false)
              }}
              onBlur={() => {
                if (draft !== null) submit(draft)
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  submit(draft ?? hex)
                }
              }}
            />
          </div>
          {(invalid || error || description) && (
            <p
              id={`${id}-description`}
              className={cn(
                "text-xs",
                invalid || error ? "text-destructive" : "text-muted-foreground",
              )}
            >
              {invalid ? labels.invalid : (error ?? description)}
            </p>
          )}
        </div>
        {!coarse && (
          <PopoverContent
            aria-label={labels.open}
            className="w-72 max-w-[calc(100vw-2rem)]"
          >
            {panel}
          </PopoverContent>
        )}
      </Popover>
      {coarse && (
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent
            side="bottom"
            showCloseButton={false}
            className="max-h-[90dvh] overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
          >
            <SheetTitle>{label ?? labels.open}</SheetTitle>
            <SheetDescription className="sr-only">
              {labels.open}
            </SheetDescription>
            {panel}
          </SheetContent>
        </Sheet>
      )}
      {name && (
        <input
          type="hidden"
          name={name}
          form={form}
          value={hex}
          disabled={disabled}
        />
      )}
    </div>
  )
}
export { ColorPicker, ColorArea, ColorHueSlider, ColorAlphaSlider, ColorSwatch }
export type { ColorPickerProps, ColorPickerLabels }
