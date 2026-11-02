"use client"

import * as React from "react"
import { ArrowUp, ArrowDown, Trash2, Plus, TriangleAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useControllableState } from "@/registry/hooks/use-controllable-state"
import { ColorPicker } from "@/registry/ui/color-picker/color-picker"
import { SegmentedControl } from "@/registry/ui/segmented-control/segmented-control"
import {
  findColorConflicts,
  simulateColorVision,
  type ColorConflict,
  type ColorVision,
} from "@/registry/lib/color-vision"
import { hsvToRgb, parseHex, rgbToHex, rgbToHsv } from "@/registry/lib/color"

const defaultLabels = {
  normal: "正常",
  protanopia: "红色盲",
  deuteranopia: "绿色盲",
  tritanopia: "蓝色盲",
  vision: "色觉视角",
  add: "添加颜色",
  up: (n: number) => `上移第 ${n} 个颜色`,
  down: (n: number) => `下移第 ${n} 个颜色`,
  remove: (n: number) => `删除第 ${n} 个颜色`,
  openColor: (n: number) => `选择第 ${n} 个颜色`,
  warning: "难以分清",
  presets: "配色预设",
  color: (n: number) => `颜色 ${n}`,
  moved: (n: number, m: number, k: number) =>
    `第 ${n} 项已移到第 ${m} 项，共 ${k} 项`,
  preview: "当前视角预览",
  conflict: (a: number, b: number, vision: string, d: number) =>
    `第 ${a}、${b} 项在${vision}视角下难以分清（ΔE ${d.toFixed(1)}）`,
}
type RowLabel = string | ((n: number) => string)
type PaletteEditorLabels = Omit<
  typeof defaultLabels,
  "up" | "down" | "remove" | "openColor"
> & {
  up: RowLabel
  down: RowLabel
  remove: RowLabel
  openColor?: RowLabel
}
function rowLabel(label: RowLabel, n: number) {
  return typeof label === "function" ? label(n) : label
}
type PaletteEditorProps = Omit<
  React.ComponentProps<"div">,
  "defaultValue" | "onChange"
> & {
  /** 受控 HEX 数组 */ value?: string[]
  /** 初始 HEX 数组 @default ["#2563eb"] */ defaultValue?: string[]
  /** 编辑时触发 */ onValueChange?: (value: string[]) => void
  /** 编辑结束时触发 */ onValueCommit?: (value: string[]) => void
  /** 最少项数 @default 1 */ minItems?: number
  /** 最多项数 @default 12 */ maxItems?: number
  /** ΔE00 提示阈值 @default 10 */ threshold?: number
  /** 自定义冲突检查；传入后替代内置检查，threshold 不再生效 */ findConflicts?: (
    colors: string[],
  ) => ColorConflict[]
  /** 选择时复制颜色 */ presets?: { label: string; colors: string[] }[]
  /** 中文文案覆盖 */ labels?: Partial<PaletteEditorLabels>
  /** 禁用 @default false */ disabled?: boolean
  /** 只读 @default false */ readOnly?: boolean
  /** JSON 数组字段名 */ name?: string
  /** 所属表单 */ form?: string
}
const initial = ["#2563eb"]
/** 新增颜色：在末项基础上旋转黄金角，避免和已有颜色撞色 */
function nextColor(last: string | undefined) {
  const rgb = parseHex(last ?? "") ?? parseHex(initial[0])!
  const hsv = rgbToHsv(rgb)
  return rgbToHex(
    hsvToRgb({
      ...hsv,
      h: (hsv.h + 137.5) % 360,
      s: Math.max(hsv.s, 0.45),
      v: Math.max(hsv.v, 0.55),
    }),
  )
}
function PaletteEditor({
  value: prop,
  defaultValue = initial,
  onValueChange,
  onValueCommit,
  minItems = 1,
  maxItems = 12,
  threshold = 10,
  findConflicts,
  presets = [],
  labels: overrides,
  disabled,
  readOnly,
  name,
  form,
  className,
  ...props
}: PaletteEditorProps) {
  const labels = { ...defaultLabels, ...overrides }
  const baseId = React.useId()
  const [value, setValue] = useControllableState({
    prop,
    defaultProp: defaultValue,
    onChange: onValueChange,
  })
  const [vision, setVision] = React.useState<ColorVision>("normal")
  const [announcement, setAnnouncement] = React.useState("")
  const root = React.useRef<HTMLDivElement>(null)
  const [identity, setIdentity] = React.useState(() => ({
    keys: value.map((_, i) => `color-${i}`),
    next: value.length,
  }))
  let keys = identity.keys
  if (keys.length !== value.length) {
    keys = keys.slice(0, value.length)
    let next = identity.next
    while (keys.length < value.length) keys.push(`color-${next++}`)
    setIdentity({ keys, next })
  }
  const locked = disabled || readOnly
  const lockedRef = React.useRef(locked)
  React.useLayoutEffect(() => {
    lockedRef.current = locked
  }, [locked])
  const conflicts = React.useMemo(
    () =>
      findConflicts
        ? findConflicts(value)
        : findColorConflicts(value, { threshold }),
    [value, threshold, findConflicts],
  )
  function change(next: string[], commit = true) {
    if (lockedRef.current) return
    setValue(next)
    if (commit) onValueCommit?.([...next])
  }
  function move(i: number, to: number) {
    if (locked || to < 0 || to >= value.length) return
    const focused = document.activeElement as HTMLElement | null
    const next = [...value],
      nextKeys = [...keys]
    next.splice(to, 0, ...next.splice(i, 1))
    nextKeys.splice(to, 0, ...nextKeys.splice(i, 1))
    setIdentity({ ...identity, keys: nextKeys })
    change(next)
    setAnnouncement(labels.moved(i + 1, to + 1, value.length))
    requestAnimationFrame(() => {
      if (focused?.matches(":disabled")) {
        root.current
          ?.querySelectorAll<HTMLElement>("[data-slot=palette-editor-item]")
          [to]?.focus()
      } else if (focused && root.current?.contains(focused)) focused.focus()
    })
  }
  React.useEffect(() => {
    const el = form
      ? document.getElementById(form)
      : root.current?.closest("form")
    const reset = () => {
      if (prop === undefined)
        requestAnimationFrame(() => setValue([...defaultValue]))
    }
    el?.addEventListener("reset", reset)
    return () => el?.removeEventListener("reset", reset)
  }, [form, prop, defaultValue, setValue])
  return (
    <div
      {...props}
      ref={root}
      data-slot="palette-editor"
      className={cn("w-full min-w-0 space-y-3", className)}
    >
      <SegmentedControl
        aria-label={labels.vision}
        size="sm"
        value={vision}
        onValueChange={(v) => setVision(v as ColorVision)}
        disabled={disabled}
        options={(
          ["normal", "protanopia", "deuteranopia", "tritanopia"] as const
        ).map((v) => ({ value: v, label: labels[v] }))}
      />
      {/* 当前视角下整组颜色并排显示，切换视角时直接对比；HEX 始终是原色 */}
      <div
        data-slot="palette-editor-preview"
        role="img"
        aria-label={`${labels.preview}：${labels[vision]}`}
        className="flex h-8 overflow-hidden rounded-md ring-1 ring-foreground/10 ring-inset"
      >
        {value.map((hex, i) => (
          <span
            key={keys[i]}
            data-slot="palette-editor-swatch"
            className="flex-1"
            style={{
              backgroundColor:
                vision === "normal" ? hex : simulateColorVision(hex, vision),
            }}
          />
        ))}
      </div>
      {presets.length > 0 && (
        <div aria-label={labels.presets} className="flex flex-wrap gap-2">
          {presets.map((p) => (
            <Button
              type="button"
              size="sm"
              variant="outline"
              key={p.label}
              disabled={
                locked ||
                p.colors.length < minItems ||
                p.colors.length > maxItems
              }
              onClick={() => change([...p.colors])}
            >
              {p.label}
            </Button>
          ))}
        </div>
      )}
      <ol data-slot="palette-editor-list" className="space-y-2">
        {value.map((hex, i) => {
          const warning = conflicts.some((c) => c.a === i || c.b === i)
          return (
            <li
              key={keys[i]}
              data-slot="palette-editor-item"
              data-conflict={warning || undefined}
              tabIndex={-1}
              className="rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              onKeyDown={(e) => {
                if (
                  !e.altKey ||
                  !["ArrowUp", "ArrowDown"].includes(e.key) ||
                  !(e.target instanceof HTMLElement) ||
                  e.target.closest("input,[role=dialog]")
                )
                  return
                if (!e.currentTarget.contains(e.target)) return
                e.preventDefault()
                move(i, i + (e.key === "ArrowUp" ? -1 : 1))
              }}
            >
              <div className="flex min-w-0 items-center gap-1">
                {/* 序号就是输入框的可见标签；读屏读完整名称「颜色 N」 */}
                <label
                  htmlFor={`${baseId}-${keys[i]}`}
                  className="w-5 shrink-0 text-center text-xs text-muted-foreground"
                >
                  <span className="sr-only">{labels.color(i + 1)}</span>
                  <span aria-hidden>{i + 1}</span>
                </label>
                {/* 固定宽度的冲突标记位，出现与消失不挤动整行 */}
                <span className="flex w-4 shrink-0 justify-center text-muted-foreground">
                  {warning && (
                    <>
                      <TriangleAlert className="size-3.5" aria-hidden />
                      <span className="sr-only">{labels.warning}</span>
                    </>
                  )}
                </span>
                <ColorPicker
                  labels={{
                    open: rowLabel(
                      labels.openColor ?? defaultLabels.openColor,
                      i + 1,
                    ),
                  }}
                  size="sm"
                  id={`${baseId}-${keys[i]}`}
                  value={hex}
                  disabled={disabled}
                  readOnly={readOnly}
                  className="flex-1"
                  onValueChange={(color) =>
                    change(
                      value.map((v, n) => (n === i ? color : v)),
                      false,
                    )
                  }
                  onValueCommit={(color) =>
                    !lockedRef.current &&
                    onValueCommit?.(value.map((v, n) => (n === i ? color : v)))
                  }
                />
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  aria-label={rowLabel(labels.up, i + 1)}
                  disabled={locked || i === 0}
                  onClick={() => move(i, i - 1)}
                >
                  <ArrowUp />
                </Button>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  aria-label={rowLabel(labels.down, i + 1)}
                  disabled={locked || i === value.length - 1}
                  onClick={() => move(i, i + 1)}
                >
                  <ArrowDown />
                </Button>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  aria-label={rowLabel(labels.remove, i + 1)}
                  disabled={locked || value.length <= minItems}
                  onClick={() => {
                    setIdentity({
                      ...identity,
                      keys: keys.filter((_, n) => n !== i),
                    })
                    change(value.filter((_, n) => n !== i))
                    requestAnimationFrame(() =>
                      root.current
                        ?.querySelectorAll<HTMLElement>(
                          "[data-slot=palette-editor-item]",
                        )
                        [Math.min(i, value.length - 2)]?.focus(),
                    )
                  }}
                >
                  <Trash2 />
                </Button>
              </div>
            </li>
          )
        })}
      </ol>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={locked || value.length >= maxItems}
        onClick={() => change([...value, nextColor(value.at(-1))])}
      >
        <Plus />
        {labels.add}
      </Button>
      {conflicts.length > 0 && (
        <ul
          data-slot="palette-editor-conflicts"
          className="space-y-1 border-t border-edge pt-3 text-xs text-muted-foreground"
        >
          {conflicts.map((c) => (
            <li
              key={`${c.a}-${c.b}-${c.vision}`}
              className="flex items-start gap-1.5"
            >
              <TriangleAlert className="mt-px size-3.5 shrink-0" aria-hidden />
              {labels.conflict(c.a + 1, c.b + 1, labels[c.vision], c.deltaE)}
            </li>
          ))}
        </ul>
      )}
      <p
        data-slot="palette-editor-announcement"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </p>
      {name && (
        <input
          type="hidden"
          name={name}
          form={form}
          value={JSON.stringify(value)}
          disabled={disabled}
        />
      )}
    </div>
  )
}
export { PaletteEditor }
export type { PaletteEditorProps, PaletteEditorLabels }
