"use client"

import * as React from "react"
import {
  AnimatePresence,
  motion,
  useInView,
  useReducedMotion,
} from "motion/react"

import { cn } from "@/lib/utils"
import { useControllableState } from "@/registry/hooks/use-controllable-state"
import { flowToneStyle, type FlowTone } from "@/registry/lib/flow-tone"
import {
  arrangeSlots,
  createRandom,
  initialSlots,
  pickLit,
  stepSlots,
  type Slots,
} from "./engine"
import { ShuffleGridPills } from "./pills"

type ShuffleGridItem = {
  /** 唯一标识，分类里用它引用条目 */
  id: string
  /** 格子里的内容：图标、首字母头像、任意节点。不传则是一块纯色方块 */
  content?: React.ReactNode
  /** 这个条目点亮时的色调，不传则用 `tone` */
  tone?: FlowTone
}

type ShuffleGridGroup = {
  id: string
  /** 胶囊上的文字 */
  label: string
  /** 这个分类里的条目 id，数量不能超过格子数 */
  items: string[]
}

/** `lines` 共享 1px 分隔线的整块网格；`tiles` 独立圆角格；`pixels` 紧凑的纯色像素块。 */
type ShuffleGridVariant = "lines" | "tiles" | "pixels"

const BOARD: Record<ShuffleGridVariant, string> = {
  lines: "gap-px overflow-hidden rounded-lg border border-edge bg-edge",
  tiles: "gap-2.5",
  pixels: "gap-1",
}
const CELL: Record<ShuffleGridVariant, string> = {
  lines: "bg-card",
  tiles: "rounded-xl border border-dashed border-edge",
  pixels: "rounded-[3px] bg-muted/40",
}
const TILE: Record<ShuffleGridVariant, string> = {
  lines:
    "text-muted-foreground data-lit:bg-(--flow-tone)/10 data-lit:text-(--flow-tone)",
  tiles:
    "rounded-xl border border-edge bg-muted/40 text-muted-foreground shadow-xs data-lit:border-(--flow-tone)/35 data-lit:bg-(--flow-tone)/12 data-lit:text-(--flow-tone)",
  pixels: "rounded-[3px] bg-(--flow-tone)/25 data-lit:bg-(--flow-tone)",
}

/**
 * 调整用的覆盖项：子树里所有 `ShuffleGrid` 的对应属性被这里的值替换。
 * 用于调试面板一类的场景；不包 `ShuffleGridTuningContext.Provider` 时组件行为不变。
 */
type ShuffleGridTuning = {
  interval?: number
  activeCount?: number
  litCount?: number | "all"
  variant?: ShuffleGridVariant
  paused?: boolean
  /** 固定盘面外框的宽高比为打开时的样子，切换 `variant` 时容器大小不变。 */
  stableFrame?: boolean
  /** 回报示例自己的实际取值（未被覆盖前），面板据此显示当前值。 */
  onReport?: (values: ShuffleGridReport) => void
}

type ShuffleGridReport = {
  interval: number
  /** 同时在场的条目数（已按格子数与条目数截断）。 */
  activeCount: number
  /** 同时点亮的条目数；`"all"` 换算成当前格子数。 */
  litCount: number
  variant: ShuffleGridVariant
  paused: boolean
}

const ShuffleGridTuningContext = React.createContext<ShuffleGridTuning>({})

type State = { slots: Slots; lit: number[]; tick: number }
type Action =
  | { type: "tick"; shuffle: boolean }
  | { type: "arrange"; target: number[] }
  | { type: "retarget" }

type ShuffleGridProps = Omit<
  React.ComponentProps<"div">,
  "children" | "defaultValue" | "onChange"
> & {
  /** 行数 @default 3 */
  rows?: number
  /** 列数 @default 3 */
  cols?: number
  /** 条目池，数量可以比格子多，多出来的会轮流出场 */
  items: ShuffleGridItem[]
  /** 同时在场的条目数；默认约六成的格子 */
  activeCount?: number
  /**
   * 同时点亮的条目数，`"all"` 表示全部点亮；默认约三成在场条目
   * @default 在场条目的 35%
   */
  litCount?: number | "all"
  /**
   * 每一步的间隔（毫秒）
   * @default 1600
   */
  interval?: number
  /**
   * 随机种子：同一个种子，服务端与浏览器的初始画面一致
   * @default 1
   */
  seed?: number
  /**
   * 外观
   * @default "lines"
   */
  variant?: ShuffleGridVariant
  /**
   * 条目的默认色调
   * @default "primary"
   */
  tone?: FlowTone
  /**
   * 暂停洗牌与分类轮播
   * @default false
   */
  paused?: boolean
  /** 分类：传入后在格子下方显示胶囊，切换分类时格子里的条目随之换位 */
  groups?: ShuffleGridGroup[]
  /** 受控的当前分类 id */
  value?: string
  /** 非受控的初始分类 id，默认第一个 */
  defaultValue?: string
  /** 分类变化时回调（点击和自动轮播都会触发） */
  onValueChange?: (id: string) => void
  /**
   * 自动轮播分类的间隔（毫秒）；设为 0 则不自动轮播
   * @default 3600
   */
  groupInterval?: number
  /** 图示说明；不传时格子作为装饰隐藏 */
  label?: string
  /** 胶囊行的读屏名称 @default "分类" */
  groupsLabel?: string
}

function buildState(props: {
  cells: number
  items: ShuffleGridItem[]
  active: number
  lit: number | "all"
  seed: number
  target?: number[]
}): State {
  const random = createRandom(props.seed)
  const slots = props.target
    ? arrangeSlots(Array(props.cells).fill(null), props.target, random)
    : initialSlots(props.cells, props.items.length, props.active, random)
  const count = props.lit === "all" ? slots.length : props.lit
  return { slots, lit: pickLit(slots, count, random), tick: 0 }
}

/** 方格里的内容随机出现、换位、点亮；也可以按分类整体换位，像一面会呼吸的能力墙或团队指派板。 */
function ShuffleGrid({
  className,
  rows = 3,
  cols = 3,
  items,
  activeCount: activeCountProp,
  litCount: litCountProp,
  interval: intervalProp = 1600,
  seed = 1,
  variant: variantProp = "lines",
  tone = "primary",
  paused: pausedProp = false,
  groups,
  value,
  defaultValue,
  onValueChange,
  groupInterval = 3600,
  label,
  groupsLabel,
  ...props
}: ShuffleGridProps) {
  const uid = React.useId()
  const ref = React.useRef<HTMLDivElement>(null)
  const boardRef = React.useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { amount: 0.3 })
  const reduced = !!useReducedMotion()
  const tuning = React.useContext(ShuffleGridTuningContext)
  const { onReport, stableFrame } = tuning
  const interval = tuning.interval ?? intervalProp
  const variant = tuning.variant ?? variantProp
  const paused = tuning.paused ?? pausedProp

  const cells = Math.max(1, Math.floor(rows)) * Math.max(1, Math.floor(cols))
  const idIndex = React.useMemo(
    () => new Map(items.map((item, index) => [item.id, index])),
    [items],
  )
  const targetOf = React.useCallback(
    (id: string) =>
      groups
        ?.find((group) => group.id === id)
        ?.items.flatMap((itemId) => idIndex.get(itemId) ?? [])
        .slice(0, cells),
    [groups, idIndex, cells],
  )
  const propActive = Math.min(
    cells,
    items.length,
    activeCountProp ?? Math.round(cells * 0.6),
  )
  const active = Math.min(cells, items.length, tuning.activeCount ?? propActive)
  const propLit: number | "all" =
    litCountProp ?? Math.max(1, Math.round(propActive * 0.35))
  const lit: number | "all" =
    tuning.litCount ?? litCountProp ?? Math.max(1, Math.round(active * 0.35))
  const reportedLit = propLit === "all" ? cells : propLit
  React.useEffect(() => {
    onReport?.({
      interval: intervalProp,
      activeCount: propActive,
      litCount: reportedLit,
      variant: variantProp,
      paused: pausedProp,
    })
  }, [onReport, intervalProp, propActive, reportedLit, variantProp, pausedProp])

  const [group, setGroup] = useControllableState({
    prop: value,
    defaultProp: defaultValue ?? groups?.[0]?.id ?? "",
    onChange: onValueChange,
  })

  const [state, dispatch] = React.useReducer(
    (prev: State, action: Action): State => {
      const random = createRandom(seed * 7919 + (prev.tick + 1) * 104729)
      let slots = prev.slots
      if (action.type === "arrange") {
        slots = arrangeSlots(slots, action.target, random)
      } else if (action.type === "retarget") {
        // 在场数量变了：一次补齐 / 拿掉，不必等一格一格地换
        for (let n = 0; n < cells; n++) {
          if (slots.filter((v) => v !== null).length === active) break
          slots = stepSlots(slots, items.length, active, random)
        }
      } else if (action.shuffle) {
        slots = stepSlots(slots, items.length, active, random)
      }
      const count = lit === "all" ? slots.length : lit
      return { slots, lit: pickLit(slots, count, random), tick: prev.tick + 1 }
    },
    undefined,
    () =>
      buildState({
        cells,
        items,
        active,
        lit,
        seed,
        target: groups ? targetOf(group) : undefined,
      }),
  )

  // 在场数、点亮数变了就立刻重排，不等下一个定时步；分类决定谁在场时只重新挑点亮的
  const settled = React.useRef({ active, lit })
  React.useEffect(() => {
    const prev = settled.current
    if (prev.active === active && prev.lit === lit) return
    settled.current = { active, lit }
    dispatch(
      !groups && prev.active !== active
        ? { type: "retarget" }
        : { type: "tick", shuffle: false },
    )
  }, [active, lit, groups])

  // 切换分类：把格子排成新分类的样子（首次渲染已经按初始分类排好，不重复）
  const arranged = React.useRef(group)
  React.useEffect(() => {
    if (!groups || arranged.current === group) return
    arranged.current = group
    const target = targetOf(group)
    if (target) dispatch({ type: "arrange", target })
  }, [groups, group, targetOf])

  const running = inView && !paused && !reduced
  // 有分类时由分类决定谁在场，定时器只负责换一批点亮的；没有分类时才真正洗牌
  React.useEffect(() => {
    if (!running) return
    const id = window.setInterval(
      () => dispatch({ type: "tick", shuffle: !groups }),
      Math.max(200, interval),
    )
    return () => window.clearInterval(id)
  }, [running, interval, groups])

  // 分类自动轮播；用户手动选过之后多等一轮，不抢操作
  const holdUntil = React.useRef(0)
  React.useEffect(() => {
    if (!groups || groups.length < 2 || !groupInterval || !running) return
    const wait = Math.max(groupInterval, holdUntil.current - Date.now())
    const id = window.setTimeout(() => {
      const index = groups.findIndex((item) => item.id === group)
      const next = groups[(index + 1) % groups.length]
      if (next) setGroup(next.id)
    }, wait)
    return () => window.clearTimeout(id)
  }, [groups, group, groupInterval, running, setGroup])

  // 固定外框：记下打开时盘面的宽高比，之后换 `variant`（间距不同）盘面大小也不变
  const [frameRatio, setFrameRatio] = React.useState<number>()
  React.useEffect(() => {
    const rect = boardRef.current?.getBoundingClientRect()
    setFrameRatio(
      stableFrame && rect?.height ? rect.width / rect.height : undefined,
    )
  }, [stableFrame])

  const litSet = new Set(state.lit)
  const transition = reduced
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 380, damping: 32 }

  return (
    <div
      {...props}
      ref={ref}
      data-slot="shuffle-grid"
      data-variant={variant}
      className={cn("flex w-full flex-col gap-4", className)}
    >
      <div
        ref={boardRef}
        data-slot="shuffle-grid-board"
        role={label ? "img" : undefined}
        aria-label={label}
        aria-hidden={label ? undefined : true}
        className={cn("grid", BOARD[variant])}
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          ...(frameRatio
            ? {
                gridTemplateRows: `repeat(${Math.max(1, Math.floor(rows))}, minmax(0, 1fr))`,
                aspectRatio: frameRatio,
              }
            : null),
        }}
      >
        {state.slots.map((slot, cell) => {
          const item = slot === null ? undefined : items[slot]
          return (
            <div
              key={cell}
              data-slot="shuffle-grid-cell"
              className={cn(
                "relative",
                !frameRatio && "aspect-square",
                CELL[variant],
              )}
            >
              <AnimatePresence initial={false}>
                {item ? (
                  <motion.div
                    key={item.id}
                    layoutId={`${uid}-${item.id}`}
                    initial={{ opacity: 0, scale: 0.6 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.6 }}
                    transition={transition}
                    className="absolute inset-0"
                  >
                    <div
                      data-slot="shuffle-grid-tile"
                      data-lit={litSet.has(slot as number) || undefined}
                      className={cn(
                        "group/tile flex size-full items-center justify-center transition-colors duration-500 motion-reduce:transition-none [&_svg:not([class*='size-'])]:size-5",
                        TILE[variant],
                      )}
                      style={flowToneStyle(item.tone ?? tone)}
                    >
                      {item.content}
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          )
        })}
      </div>
      {groups ? (
        <ShuffleGridPills
          label={groupsLabel}
          options={groups}
          value={group}
          onValueChange={(id) => {
            holdUntil.current = Date.now() + groupInterval * 2
            setGroup(id)
          }}
        />
      ) : null}
    </div>
  )
}

type ShuffleGridAvatarProps = React.ComponentProps<"span"> & {
  /** 姓名，取第一个字（拉丁字母转大写）作首字母 */
  name: string
}

/** 首字母头像：圆底加一个字，颜色随格子的色调，亮起时更深。适合放进 `content`。 */
function ShuffleGridAvatar({
  className,
  name,
  ...props
}: ShuffleGridAvatarProps) {
  const initial = Array.from(name.trim())[0]?.toUpperCase() ?? "?"
  return (
    <span
      data-slot="shuffle-grid-avatar"
      aria-hidden="true"
      className={cn(
        "flex size-[58%] items-center justify-center rounded-full bg-muted text-sm font-medium text-muted-foreground ring-1 ring-edge transition-colors duration-500 group-data-lit/tile:bg-(--flow-tone)/15 group-data-lit/tile:text-(--flow-tone) group-data-lit/tile:ring-(--flow-tone)/40",
        className,
      )}
      {...props}
    >
      {initial}
    </span>
  )
}

export { ShuffleGrid, ShuffleGridAvatar, ShuffleGridTuningContext }
export type {
  ShuffleGridAvatarProps,
  ShuffleGridGroup,
  ShuffleGridItem,
  ShuffleGridProps,
  ShuffleGridReport,
  ShuffleGridTuning,
  ShuffleGridVariant,
}
