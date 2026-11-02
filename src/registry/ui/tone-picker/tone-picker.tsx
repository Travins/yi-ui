"use client"

import * as React from "react"
import { Radio } from "@base-ui/react/radio"
import { RadioGroup } from "@base-ui/react/radio-group"
import { cva } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { useControllableState } from "@/registry/hooks/use-controllable-state"
import { flowToneStyle, type FlowTone } from "@/registry/lib/flow-tone"

/**
 * 与数值滑块同一套方条与高度表（bar 28 / 32 / 36px，compact 18 / 22 / 24px）。
 * 触屏设备上 bar 各加高一档（36 / 40 / 44px），色点放大、间距拉开，每个色点外围还有一圈看不见的点按区。
 */
const tonePickerVariants = cva(
  "group/tone-picker flex h-(--tone-picker-height) w-full min-w-0 items-center justify-between gap-3 rounded-md border border-edge bg-muted/60 px-3 select-none aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
  {
    variants: {
      size: {
        sm: "text-xs [--tone-picker-swatch:0.75rem]",
        default: "text-sm [--tone-picker-swatch:0.875rem]",
        lg: "text-sm [--tone-picker-swatch:1rem]",
      },
      variant: {
        bar: "",
        compact: "text-xs [--tone-picker-swatch:0.625rem]",
      },
    },
    compoundVariants: [
      {
        variant: "bar",
        size: "sm",
        class:
          "[--tone-picker-height:1.75rem] pointer-coarse:[--tone-picker-height:2.25rem]",
      },
      {
        variant: "bar",
        size: "default",
        class:
          "[--tone-picker-height:2rem] pointer-coarse:[--tone-picker-height:2.5rem]",
      },
      {
        variant: "bar",
        size: "lg",
        class:
          "[--tone-picker-height:2.25rem] pointer-coarse:[--tone-picker-height:2.75rem]",
      },
      {
        variant: "compact",
        size: "sm",
        class: "[--tone-picker-height:1.125rem]",
      },
      {
        variant: "compact",
        size: "default",
        class: "[--tone-picker-height:1.375rem]",
      },
      {
        variant: "compact",
        size: "lg",
        class: "[--tone-picker-height:1.5rem]",
      },
    ],
    defaultVariants: {
      size: "default",
      variant: "bar",
    },
  },
)

type TonePickerSize = "sm" | "default" | "lg"
type TonePickerVariant = "bar" | "compact"

type TonePickerOption = {
  value: string
  /** 可访问名称，悬停时也作为提示 */
  label: string
  /** 色点的颜色：内置色调名或任意 CSS 颜色；`null` 画成空心圆（表示「不上色」「沿用」这类选项） */
  tone: FlowTone | null
}

/** 内置色调的中文名 */
const TONE_LABELS: Record<string, string> = {
  primary: "主题色",
  foreground: "前景色",
  blue: "蓝",
  green: "绿",
  amber: "琥珀",
  rose: "玫红",
  violet: "紫",
  cyan: "青",
}

const DEFAULT_TONES: FlowTone[] = [
  "primary",
  "blue",
  "green",
  "amber",
  "rose",
  "violet",
  "cyan",
]

/** 把色调名列表变成选项；`TonePicker` 不传 `options` 时用的就是它 */
function toneOptions(tones: readonly FlowTone[] = DEFAULT_TONES) {
  return tones.map<TonePickerOption>((tone) => ({
    value: tone,
    label: TONE_LABELS[tone] ?? tone,
    tone,
  }))
}

type TonePickerProps = Omit<
  React.ComponentProps<typeof RadioGroup>,
  "value" | "defaultValue" | "onValueChange" | "children"
> & {
  /** 可选的色调；不传时是主题色加六种多彩色调 */
  options?: readonly TonePickerOption[]
  value?: string
  /** 非受控时的初始值；不传时取第一项 */
  defaultValue?: string
  onValueChange?: (value: string) => void
  /** 左侧标签，同时作为单选组的可访问名称 */
  label?: React.ReactNode
  /**
   * 高度档：`bar` 与数值滑块默认同高，`compact` 是面板里用的中等高度
   * @default "bar"
   */
  variant?: TonePickerVariant
  /**
   * 尺寸档
   * @default "default"
   */
  size?: TonePickerSize
  /**
   * 标记为「已改动」：标签改用前景色，根元素带 `data-modified`
   * @default false
   */
  modified?: boolean
  /**
   * 色点按固定列数排成网格（选项多、一行放不下时用），方条随行数加高
   */
  columns?: number
}

/**
 * 色调选择：方条左侧标签、右侧一排色点，单选语义，方向键切换。
 * 色点颜色都来自主题变量，亮暗与颜色主题切换时跟着变。
 */
function TonePicker({
  options: optionsProp,
  value: valueProp,
  defaultValue,
  onValueChange,
  label,
  variant = "bar",
  size = "default",
  modified = false,
  columns,
  className,
  ...props
}: TonePickerProps) {
  const options = optionsProp ?? toneOptions()
  const [value, setValue] = useControllableState<string>({
    prop: valueProp,
    defaultProp: defaultValue ?? options[0]?.value ?? "",
    onChange: onValueChange,
  })
  const labelId = React.useId()

  return (
    <RadioGroup
      {...props}
      value={value}
      onValueChange={(next) => setValue(next as string)}
      aria-labelledby={label !== undefined ? labelId : undefined}
      data-slot="tone-picker"
      data-variant={variant}
      data-modified={modified ? "" : undefined}
      className={cn(
        tonePickerVariants({ size, variant }),
        "data-[disabled]:opacity-50",
        columns && "h-auto min-h-(--tone-picker-height) py-2.5",
        className,
      )}
    >
      {label !== undefined ? (
        <span
          id={labelId}
          data-slot="tone-picker-label"
          className="truncate font-medium text-muted-foreground transition-colors group-data-[modified]/tone-picker:text-foreground"
        >
          {label}
        </span>
      ) : null}
      <span
        data-slot="tone-picker-swatches"
        style={
          columns
            ? { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }
            : undefined
        }
        className={cn(
          "pointer-coarse:group-data-[variant=bar]/tone-picker:[--tone-picker-swatch:1.125rem]",
          columns
            ? "grid w-full justify-items-center gap-y-3 pointer-coarse:gap-y-4"
            : "ms-auto flex shrink-0 items-center gap-1.5 pointer-coarse:group-data-[variant=bar]/tone-picker:gap-3",
        )}
      >
        {options.map((option) => (
          <Radio.Root
            key={option.value}
            value={option.value}
            aria-label={option.label}
            title={option.label}
            data-slot="tone-picker-swatch"
            className={cn(
              "relative size-(--tone-picker-swatch) shrink-0 cursor-pointer rounded-full transition-transform outline-none before:absolute before:-inset-x-[3px] before:-inset-y-2 before:content-[''] hover:scale-110 focus-visible:outline-[3px] focus-visible:outline-offset-4 focus-visible:outline-ring focus-visible:outline-solid motion-reduce:transition-none motion-reduce:hover:scale-100 pointer-coarse:before:-inset-x-1.5 pointer-coarse:before:-inset-y-4",
              // 选中：外面再套一圈前景色细环，和色点之间隔一道背景色缝
              "data-[checked]:ring-2 data-[checked]:ring-foreground/70 data-[checked]:ring-offset-2 data-[checked]:ring-offset-background",
              option.tone === null
                ? "border border-dashed border-muted-foreground/60"
                : "bg-(--flow-tone)",
            )}
            style={flowToneStyle(option.tone ?? undefined)}
          />
        ))}
      </span>
    </RadioGroup>
  )
}

export { TonePicker, tonePickerVariants, toneOptions }
export type {
  TonePickerOption,
  TonePickerProps,
  TonePickerSize,
  TonePickerVariant,
}
