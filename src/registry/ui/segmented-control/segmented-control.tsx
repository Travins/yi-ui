"use client"

import * as React from "react"
import { Radio } from "@base-ui/react/radio"
import { RadioGroup } from "@base-ui/react/radio-group"
import { cva } from "class-variance-authority"
import { motion, useReducedMotion } from "motion/react"

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { useControllableState } from "@/registry/hooks/use-controllable-state"
import { flowToneStyle, type FlowTone } from "@/registry/lib/flow-tone"

/**
 * 外框与数值滑块同一套方条：细边框、小圆角、淡底。
 * 高度表也与数值滑块一致（bar 28 / 32 / 36px，compact 18 / 22 / 24px），放在同一个面板里能对齐。
 */
const segmentedControlVariants = cva(
  "group/segmented-control relative flex h-(--segmented-control-height) w-full min-w-0 items-stretch overflow-hidden rounded-md border border-edge bg-muted/60 select-none aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
  {
    variants: {
      size: {
        sm: "text-xs",
        default: "text-sm",
        lg: "text-sm",
      },
      variant: {
        bar: "",
        compact: "text-xs",
      },
    },
    compoundVariants: [
      {
        variant: "bar",
        size: "sm",
        class:
          "[--segmented-control-height:1.75rem] pointer-coarse:[--segmented-control-height:2.25rem]",
      },
      {
        variant: "bar",
        size: "default",
        class:
          "[--segmented-control-height:2rem] pointer-coarse:[--segmented-control-height:2.5rem]",
      },
      {
        variant: "bar",
        size: "lg",
        class:
          "[--segmented-control-height:2.25rem] pointer-coarse:[--segmented-control-height:2.75rem]",
      },
      {
        variant: "compact",
        size: "sm",
        class: "[--segmented-control-height:1.125rem]",
      },
      {
        variant: "compact",
        size: "default",
        class: "[--segmented-control-height:1.375rem]",
      },
      {
        variant: "compact",
        size: "lg",
        class: "[--segmented-control-height:1.5rem]",
      },
    ],
    defaultVariants: {
      size: "default",
      variant: "bar",
    },
  },
)

type SegmentedControlSize = "sm" | "default" | "lg"
type SegmentedControlVariant = "bar" | "compact"

type SegmentedControlOption = {
  value: string
  label: React.ReactNode
  /** 文字前的小样：图标、色点、材质方块 */
  icon?: React.ReactNode
  disabled?: boolean
}

type SegmentedControlProps = Omit<
  React.ComponentProps<typeof RadioGroup>,
  "value" | "defaultValue" | "onValueChange" | "children"
> & {
  options: readonly SegmentedControlOption[]
  /** 受控值 */
  value?: string
  /** 非受控时的初始值；不传时取第一项 */
  defaultValue?: string
  onValueChange?: (value: string) => void
  /** 画在最左侧格子里的标签，同时作为单选组的可访问名称 */
  label?: React.ReactNode
  /**
   * 高度档：`bar` 与数值滑块默认同高，`compact` 是面板里用的中等高度
   * @default "bar"
   */
  variant?: SegmentedControlVariant
  /**
   * 尺寸档
   * @default "default"
   */
  size?: SegmentedControlSize
  /** 色调：选中块染上 `--flow-tone` 的淡色；不传时选中块用背景色加描边 */
  tone?: FlowTone
  /**
   * 标记为「已改动」：标签改用前景色，根元素带 `data-modified`
   * @default false
   */
  modified?: boolean
  /**
   * 只显示图标：每格为正方形，`label` 给读屏，并在悬停或聚焦时用提示气泡显示
   * @default false
   */
  iconOnly?: boolean
}

/**
 * 分段选择：一排互斥选项，选中块在选项之间滑动。
 * 语义是单选组（`role="radiogroup"`），方向键在选项间移动并直接选中。
 */
function SegmentedControl({
  options,
  value: valueProp,
  defaultValue,
  onValueChange,
  label,
  variant = "bar",
  size = "default",
  tone,
  modified = false,
  iconOnly = false,
  disabled,
  className,
  style,
  ...props
}: SegmentedControlProps) {
  const [value, setValue] = useControllableState<string>({
    prop: valueProp,
    defaultProp: defaultValue ?? options[0]?.value ?? "",
    onChange: onValueChange,
  })
  const labelId = React.useId()
  // 同一页里可能有多个分段选择，选中块的共享布局 id 必须各自独立
  const layoutId = React.useId()
  const reduced = useReducedMotion()
  const hasTone = tone !== undefined

  return (
    <RadioGroup
      {...props}
      value={value}
      onValueChange={(next) => setValue(next as string)}
      disabled={disabled}
      aria-labelledby={label !== undefined ? labelId : undefined}
      data-slot="segmented-control"
      data-variant={variant}
      data-icon-only={iconOnly ? "" : undefined}
      data-modified={modified ? "" : undefined}
      className={cn(
        segmentedControlVariants({ size, variant }),
        "data-[disabled]:opacity-50",
        // 纯图标的格子是正方形，整条按内容收紧，不再铺满一行
        iconOnly && "w-fit",
        // 放进网格工具栏：去掉外框、圆角和底色，高度跟随格子
        "in-data-[slot=grid-toolbar]:h-full! in-data-[slot=grid-toolbar]:rounded-none in-data-[slot=grid-toolbar]:border-0 in-data-[slot=grid-toolbar]:bg-transparent",
        className,
      )}
      style={{ ...flowToneStyle(tone), ...style }}
    >
      {label !== undefined ? (
        <span
          id={labelId}
          data-slot="segmented-control-label"
          className="flex shrink-0 items-center border-e border-edge px-3 whitespace-nowrap text-muted-foreground transition-colors group-data-[modified]/segmented-control:text-foreground"
        >
          {label}
        </span>
      ) : null}
      {/*
        有标签时，标签与选项之间只用一道整高竖线隔开（与方条输入、方条下拉同一种写法），
        不再另套一层下凹的槽：外框 → 选中块，只有两层。
      */}
      <span
        data-slot="segmented-control-options"
        // 内部容器不包含标签；纯图标与工具栏按内容收紧，不能启用尺寸包含。
        className={cn(
          "relative flex min-w-0 flex-1 items-stretch",
          !iconOnly &&
            "@container/segments in-data-[slot=grid-toolbar]:[container-type:normal]",
        )}
      >
        {options.map((option) => {
          const selected = option.value === value
          const item = (
            <Radio.Root
              value={option.value}
              disabled={option.disabled}
              data-slot="segmented-control-item"
              className={cn(
                "relative flex min-w-0 cursor-pointer items-center justify-center whitespace-nowrap text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:z-10 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset data-[checked]:text-foreground data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
                // 纯图标：正方形格子、不留文字间距，图标才能真正居中
                iconOnly
                  ? "aspect-square flex-none"
                  : "flex-auto gap-1.5 px-3 in-data-[slot=grid-toolbar]:flex-1 @max-[12rem]/segments:px-1.5 @max-[8rem]/segments:px-0.5",
                // 放进网格工具栏：每个选项是一格，格子之间虚线分隔
                "in-data-[slot=grid-toolbar]:border-s in-data-[slot=grid-toolbar]:border-dashed in-data-[slot=grid-toolbar]:border-edge in-data-[slot=grid-toolbar]:first:border-s-0",
              )}
            >
              {selected ? (
                <motion.span
                  layoutId={layoutId}
                  aria-hidden="true"
                  data-slot="segmented-control-indicator"
                  className={cn(
                    "absolute inset-[3px] rounded-sm",
                    hasTone
                      ? "bg-(--flow-tone)/20 dark:bg-(--flow-tone)/35"
                      : // 亮色下白块压在浅灰底上对比太弱，补一圈细描边和略重的阴影
                        "bg-background shadow-sm ring-1 ring-foreground/10 dark:bg-foreground/15 dark:shadow-xs dark:ring-0",
                    // 放进网格工具栏：选中块铺满整格，没有圆角、阴影和描边
                    "in-data-[slot=grid-toolbar]:inset-0 in-data-[slot=grid-toolbar]:rounded-none in-data-[slot=grid-toolbar]:bg-muted! in-data-[slot=grid-toolbar]:shadow-none! in-data-[slot=grid-toolbar]:ring-0!",
                  )}
                  transition={
                    reduced
                      ? { duration: 0 }
                      : { type: "spring", bounce: 0.18, visualDuration: 0.25 }
                  }
                />
              ) : null}
              {option.icon ? (
                <span
                  aria-hidden="true"
                  className="relative flex shrink-0 items-center [&_svg:not([class*='size-'])]:size-3.5"
                >
                  {option.icon}
                </span>
              ) : null}
              <span className={iconOnly ? "sr-only" : "relative truncate"}>
                {option.label}
              </span>
            </Radio.Root>
          )
          // 纯图标：悬停或键盘聚焦时用提示气泡显示文字
          return iconOnly ? (
            <Tooltip key={option.value}>
              <TooltipTrigger render={item} />
              <TooltipContent>{option.label}</TooltipContent>
            </Tooltip>
          ) : (
            <React.Fragment key={option.value}>{item}</React.Fragment>
          )
        })}
      </span>
    </RadioGroup>
  )
}

export { SegmentedControl, segmentedControlVariants }
export type {
  SegmentedControlOption,
  SegmentedControlProps,
  SegmentedControlSize,
  SegmentedControlVariant,
}
