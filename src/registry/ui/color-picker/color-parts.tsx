"use client"
import * as React from "react"
import { Slider } from "@base-ui/react/slider"
import { cn } from "@/lib/utils"
import { clamp, hsvToRgb, rgbToHex, type HSV } from "@/registry/lib/color"

const checker: React.CSSProperties = {
  backgroundColor: "var(--background)",
  backgroundImage:
    "conic-gradient(var(--muted) 25%, transparent 0 50%, var(--muted) 0 75%, transparent 0)",
  backgroundSize: "12px 12px",
}
function ColorSwatch({
  color,
  className,
  style,
  ...props
}: React.ComponentProps<"span"> & { color: string }) {
  return (
    <span
      data-slot="color-swatch"
      className={cn(
        "relative inline-block size-5 shrink-0 rounded-sm",
        className,
      )}
      style={{ ...checker, ...style }}
      {...props}
    >
      {/* 内描边画在颜色层之上：深色在暗色背景、浅色在亮色背景上都能看清色块边界 */}
      <span
        className="absolute inset-0 rounded-[inherit] ring-1 ring-foreground/20 ring-inset"
        style={{ background: color }}
      />
    </span>
  )
}
type AreaProps = Omit<React.ComponentProps<"div">, "onChange"> & {
  /** HSV 颜色 */ value: HSV
  /** 拖动及键盘变化 */ onValueChange: (value: HSV) => void
  /** 松手或按键结束 */ onValueCommit?: (value: HSV) => void
  /** 读屏名称 @default 中文 */ labels?: {
    saturation?: string
    brightness?: string
  }
}
function ColorArea({
  value,
  onValueChange,
  onValueCommit,
  labels,
  className,
  ...props
}: AreaProps) {
  const latest = React.useRef(value)
  React.useEffect(() => {
    latest.current = value
  }, [value])
  const frame = React.useRef<number>(0)
  React.useEffect(() => () => cancelAnimationFrame(frame.current), [])
  function update(e: React.PointerEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const next = {
      ...latest.current,
      s: clamp((e.clientX - rect.left) / rect.width),
      v: 1 - clamp((e.clientY - rect.top) / rect.height),
    }
    latest.current = next
    cancelAnimationFrame(frame.current)
    frame.current = requestAnimationFrame(() => onValueChange(next))
  }
  return (
    <div
      data-slot="color-area"
      className={cn(
        "relative h-44 touch-none rounded-md select-none has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
        className,
      )}
      style={{
        background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent), hsl(${value.h} 100% 50%)`,
      }}
      {...props}
      onPointerDown={(e) => {
        if (e.button !== 0) return
        e.preventDefault()
        e.currentTarget.setPointerCapture(e.pointerId)
        update(e)
      }}
      onPointerMove={(e) => {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) update(e)
      }}
      onPointerUp={(e) => {
        if (!e.currentTarget.hasPointerCapture(e.pointerId)) return
        update(e)
        cancelAnimationFrame(frame.current)
        onValueChange(latest.current)
        onValueCommit?.(latest.current)
        e.currentTarget.releasePointerCapture(e.pointerId)
      }}
      onPointerCancel={() => {
        cancelAnimationFrame(frame.current)
        onValueCommit?.(latest.current)
      }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background shadow-sm ring-1 ring-foreground"
        style={{ left: `${value.s * 100}%`, top: `${(1 - value.v) * 100}%` }}
      />
      {(["s", "v"] as const).map((key) => (
        <input
          key={key}
          type="range"
          className="sr-only"
          min={0}
          max={100}
          step={1}
          value={value[key] * 100}
          aria-label={
            key === "s"
              ? (labels?.saturation ?? "饱和度")
              : (labels?.brightness ?? "明度")
          }
          aria-valuetext={`${Math.round(value[key] * 100)}%`}
          onChange={(e) =>
            onValueChange({ ...value, [key]: Number(e.target.value) / 100 })
          }
          onKeyDown={(e) => {
            if (
              ![
                "ArrowLeft",
                "ArrowRight",
                "ArrowUp",
                "ArrowDown",
                "Home",
                "End",
              ].includes(e.key)
            )
              return
            e.preventDefault()
            const n =
              e.key === "Home"
                ? 0
                : e.key === "End"
                  ? 1
                  : clamp(
                      value[key] +
                        (["ArrowLeft", "ArrowDown"].includes(e.key) ? -1 : 1) *
                          (e.shiftKey ? 0.1 : 0.01),
                    )
            onValueChange({ ...value, [key]: n })
          }}
          onKeyUp={() => onValueCommit?.(latest.current)}
        />
      ))}
    </div>
  )
}
type ColorSliderProps = {
  /** 当前值 */ value: number
  /** 变化 */ onValueChange: (value: number) => void
  /** 提交 */ onValueCommit?: (value: number) => void
  /** 读屏名称 */ label?: string
  className?: string
}
function ColorTrack({
  value,
  onValueChange,
  onValueCommit,
  label,
  max,
  background,
  className,
}: ColorSliderProps & { max: number; background: string }) {
  return (
    <Slider.Root
      data-slot="color-track"
      min={0}
      max={max}
      step={max === 1 ? 0.01 : 1}
      value={value}
      onValueChange={(v) => onValueChange(v as number)}
      onValueCommitted={(v) => onValueCommit?.(v as number)}
      className={cn("w-full", className)}
    >
      <Slider.Control className="flex h-7 items-center pointer-coarse:h-11">
        <Slider.Track
          className="relative h-3 w-full rounded-full"
          style={{
            ...checker,
            backgroundImage: background,
            backgroundSize: "100% 100%, 12px 12px",
          }}
        >
          <Slider.Thumb
            aria-label={label}
            getAriaValueText={(v) =>
              `${label} ${Math.round(Number(v) * (max === 1 ? 100 : 1))}${max === 1 ? "%" : " 度"}`
            }
            className="size-4 rounded-full border-2 border-background bg-foreground shadow-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </Slider.Track>
      </Slider.Control>
    </Slider.Root>
  )
}
function ColorHueSlider(props: ColorSliderProps) {
  return (
    <ColorTrack
      {...props}
      label={props.label ?? "色相"}
      max={360}
      background="linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)"
    />
  )
}
function ColorAlphaSlider({
  color,
  ...props
}: ColorSliderProps & { color: HSV }) {
  return (
    <ColorTrack
      {...props}
      label={props.label ?? "透明度"}
      max={1}
      background={`linear-gradient(to right, transparent, ${rgbToHex(hsvToRgb({ ...color, a: 1 }))}), conic-gradient(var(--muted) 25%, transparent 0 50%, var(--muted) 0 75%, transparent 0)`}
    />
  )
}
export { ColorArea, ColorHueSlider, ColorAlphaSlider, ColorSwatch }
export type { AreaProps, ColorSliderProps }
