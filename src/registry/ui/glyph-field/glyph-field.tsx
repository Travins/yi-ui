"use client"

import * as React from "react"
import { cva } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { FLOW_TONES, type FlowTone } from "@/registry/lib/flow-tone"

const GLYPHS = {
  latin: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
  binary: "01",
  hex: "0123456789ABCDEF",
  katakana: "アイウエオカキクケコサシスセソタチツテトナニヌネノ",
  cjk: "天地山水风云星月日光万物生长安全数据信息连接世界",
}

type GlyphFieldSet = keyof typeof GLYPHS | (string & {})
type GlyphFieldProps = React.ComponentProps<"div"> & {
  /** 预设名或自定义字符集。@default "latin" */
  glyphs?: GlyphFieldSet
  /** 单色或混合色调，颜色取自容器的主题变量。@default "muted" */
  tone?: FlowTone | FlowTone[]
  /** 格子占用率，范围 0–1。@default 0.8 */
  density?: number
  /** 字号，单位 px，最小 8。@default 14 */
  fontSize?: number
  /** 每个逻辑帧更新的格子比例，范围 0–1，逻辑帧率 20fps。@default 0.04 */
  speed?: number
  /** edges 四周淡出，center 中心留白。@default "edges" */
  fade?: "edges" | "center" | "none"
  paused?: boolean
  /** 只描述字符背景；不会隐藏子内容的可访问性。 */
  label?: string
}

/**
 * 调整用的覆盖项：子树里所有 `GlyphField` 的对应属性被这里的值替换。
 * 用于调试面板一类的场景；不包 `GlyphFieldTuningContext.Provider` 时组件行为不变。
 */
type GlyphFieldTuning = {
  glyphs?: GlyphFieldSet
  tone?: FlowTone | FlowTone[]
  density?: number
  fontSize?: number
  speed?: number
  fade?: "edges" | "center" | "none"
  paused?: boolean
  /** 回报示例自己的实际取值（未被覆盖前），面板据此显示当前值。 */
  onReport?: (values: GlyphFieldReport) => void
}

type GlyphFieldReport = {
  glyphs: GlyphFieldSet
  tone: FlowTone | FlowTone[]
  density: number
  fontSize: number
  speed: number
  fade: "edges" | "center" | "none"
  paused: boolean
}

const GlyphFieldTuningContext = React.createContext<GlyphFieldTuning>({})

const glyphFieldVariants = cva("pointer-events-none absolute inset-0", {
  variants: {
    fade: {
      edges: "[mask-image:radial-gradient(ellipse,black_25%,transparent_85%)]",
      center:
        "[mask-image:radial-gradient(ellipse,transparent_35%,black_100%)]",
      none: "",
    },
  },
  defaultVariants: { fade: "edges" },
})

/** 同尺寸的服务端底色占位与客户端字符画布；子内容保持普通 DOM 语义。 */
function GlyphField({
  className,
  children,
  glyphs: glyphsProp = "latin",
  tone: toneProp = "muted",
  density: densityProp = 0.8,
  fontSize: fontSizeProp = 14,
  speed: speedProp = 0.04,
  fade: fadeProp = "edges",
  paused: pausedProp = false,
  label,
  ...props
}: GlyphFieldProps) {
  const tuning = React.useContext(GlyphFieldTuningContext)
  const { onReport } = tuning
  // 色调数组用值作为依赖，调用者每次传新数组也不会反复回报
  const reportToneKey = JSON.stringify(toneProp)
  React.useEffect(() => {
    onReport?.({
      glyphs: glyphsProp,
      tone: JSON.parse(reportToneKey) as FlowTone | FlowTone[],
      density: densityProp,
      fontSize: fontSizeProp,
      speed: speedProp,
      fade: fadeProp,
      paused: pausedProp,
    })
  }, [
    onReport,
    glyphsProp,
    reportToneKey,
    densityProp,
    fontSizeProp,
    speedProp,
    fadeProp,
    pausedProp,
  ])
  const glyphs = tuning.glyphs ?? glyphsProp
  const tone = tuning.tone ?? toneProp
  const density = tuning.density ?? densityProp
  const fontSize = tuning.fontSize ?? fontSizeProp
  const speed = tuning.speed ?? speedProp
  const fade = tuning.fade ?? fadeProp
  const paused = tuning.paused ?? pausedProp
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  // 用值作为依赖，避免调用者每次创建新的色调数组而重启画布。
  const toneKey = JSON.stringify(tone)
  React.useEffect(() => {
    const canvas = canvasRef.current
    const host = canvas?.parentElement
    const ctx = canvas?.getContext("2d")
    if (!canvas || !host || !ctx) return
    const alphabet = Array.from(GLYPHS[glyphs as keyof typeof GLYPHS] ?? glyphs)
    if (!alphabet.length) return
    const size = Math.max(8, fontSize)
    const stepX = size * 1.2
    const stepY = size * 1.65
    let columns = 0
    let cells: { glyph: string; color: number; opacity: number }[] = []
    let colors: string[] = []
    let frame = 0
    let last = 0
    let visible = false
    let randomSeed = 421
    const media = matchMedia("(prefers-reduced-motion: reduce)")
    const random = () => {
      randomSeed = (Math.imul(randomSeed, 1664525) + 1013904223) >>> 0
      return randomSeed / 4294967296
    }
    function newCell() {
      return {
        glyph:
          random() <= Math.max(0, Math.min(1, density))
            ? alphabet[Math.floor(random() * alphabet.length)]!
            : "",
        color: Math.floor(random() * colors.length),
        opacity: 0.18 + random() * 0.55,
      }
    }
    function paint(index: number) {
      if (!ctx) return
      const x = (index % columns) * stepX
      const y = Math.floor(index / columns) * stepY
      ctx.clearRect(x, y, stepX, stepY)
      const cell = cells[index]
      if (!cell) return
      ctx.globalAlpha = cell.opacity
      ctx.fillStyle = colors[cell.color % colors.length]!
      ctx.fillText(cell.glyph, x + stepX / 2, y + stepY / 2)
    }
    function palette() {
      if (!host) return
      const swatch = document.createElement("span")
      swatch.hidden = true
      host.append(swatch)
      const tones = JSON.parse(toneKey) as FlowTone | FlowTone[]
      colors = (
        Array.isArray(tones) ? (tones.length ? tones : ["muted"]) : [tones]
      ).map((value) => {
        swatch.style.color =
          FLOW_TONES[value as keyof typeof FLOW_TONES] ?? value
        return getComputedStyle(swatch).color
      })
      swatch.remove()
      cells.forEach((_, index) => paint(index))
    }
    function resize() {
      if (!host || !canvas || !ctx) return
      const { width, height } = host.getBoundingClientRect()
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.font = `${size}px ${getComputedStyle(host).getPropertyValue("--font-geist-mono") || "monospace"}`
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      columns = Math.ceil(width / stepX)
      // 限制超大容器的单次工作量。
      cells = Array.from(
        { length: Math.min(30000, columns * Math.ceil(height / stepY)) },
        newCell,
      )
      cells.forEach((_, index) => paint(index))
    }
    function tick(now: number) {
      if (now - last >= 50) {
        const count = Math.ceil(cells.length * Math.max(0, Math.min(1, speed)))
        for (let n = 0; n < count; n++) {
          const index = Math.floor(random() * cells.length)
          if (!cells.length) break
          cells[index] = newCell()
          paint(index)
        }
        last = now
      }
      frame = requestAnimationFrame(tick)
    }
    function sync() {
      cancelAnimationFrame(frame)
      if (visible && !document.hidden && !paused && !media.matches && speed > 0)
        frame = requestAnimationFrame(tick)
    }
    palette()
    resize()
    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(host)
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? false
      sync()
    })
    intersection.observe(host)
    const mutations = new MutationObserver(palette)
    // 只观察祖先属性，避免画布或探针引起反馈循环，并支持局部主题。
    for (
      let ancestor: Element | null = host;
      ancestor;
      ancestor = ancestor.parentElement
    ) {
      mutations.observe(ancestor, {
        attributes: true,
        attributeFilter: ["class", "data-theme", "style"],
      })
    }
    media.addEventListener("change", sync)
    document.addEventListener("visibilitychange", sync)
    window.addEventListener("resize", resize)
    return () => {
      cancelAnimationFrame(frame)
      resizeObserver.disconnect()
      intersection.disconnect()
      mutations.disconnect()
      media.removeEventListener("change", sync)
      document.removeEventListener("visibilitychange", sync)
      window.removeEventListener("resize", resize)
    }
  }, [glyphs, toneKey, density, fontSize, speed, paused])

  return (
    <div
      data-slot="glyph-field"
      data-paused={paused || undefined}
      className={cn(
        "relative isolate flex min-h-72 w-full items-center justify-center overflow-hidden bg-background",
        className,
      )}
      {...props}
    >
      <div
        data-slot="glyph-field-background"
        role={label ? "img" : undefined}
        aria-label={label}
        aria-hidden={label ? undefined : true}
        className={glyphFieldVariants({ fade })}
      >
        <div
          data-slot="glyph-field-placeholder"
          className="absolute inset-0 bg-muted/20"
        />
        <canvas
          ref={canvasRef}
          data-slot="glyph-field-canvas"
          className="absolute inset-0 size-full"
        />
      </div>
      <div
        data-slot="glyph-field-content"
        className="relative z-10 flex max-w-full flex-col items-center justify-center text-center"
      >
        {children}
      </div>
    </div>
  )
}

export { GlyphField, GlyphFieldTuningContext, glyphFieldVariants }
export type {
  GlyphFieldProps,
  GlyphFieldReport,
  GlyphFieldSet,
  GlyphFieldTuning,
}
