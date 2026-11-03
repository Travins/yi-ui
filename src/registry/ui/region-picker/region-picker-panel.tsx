"use client"

import * as React from "react"
import { Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

import { GROUP_THRESHOLD, type RegionPickerLabels } from "./config"
import {
  RegionPickerHighlight,
  RegionPickerNotice,
  RegionPickerOption,
  RegionPickerSteps,
  type RegionPickerStep,
  type RegionPickerVariant,
} from "./region-picker-parts"
import type { RegionOption } from "./types"
import {
  formatRegionPath,
  groupRegionsByInitial,
  isLeafRegion,
  regionTreeDepth,
  searchRegionIndex,
  type RegionGroup,
  type RegionHighlight,
  type RegionIndex,
} from "./utils"

type Row = {
  node: RegionOption
  /** 从 0 数的层级 */
  level: number
  /** 从最顶层到该节点 */
  path: RegionOption[]
  highlights?: (RegionHighlight | null)[]
}

const EMPTY_PATH: RegionOption[] = []

/**
 * 只滚动列表自身，把 `element` 移进可视区。
 * 不用 scrollIntoView：它会连带滚动整个页面，浮层跟着触发器一起上下跳。
 */
function scrollWithin(
  list: HTMLElement,
  element: HTMLElement,
  block: "start" | "center" | "nearest",
) {
  const listRect = list.getBoundingClientRect()
  const rect = element.getBoundingClientRect()
  const top = rect.top - listRect.top + list.scrollTop
  if (block === "start") list.scrollTop = top
  else if (block === "center")
    list.scrollTop = top - (list.clientHeight - rect.height) / 2
  // 上方可能有吸顶的字母标题，往上滚时多留一行的位置
  else if (rect.top < listRect.top + 28) list.scrollTop = top - 28
  else if (rect.bottom > listRect.bottom)
    list.scrollTop = top + rect.height - list.clientHeight
}

const fill = (template: string, values: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ""))

/**
 * 面板内容：步骤条 → 搜索框 → 当前这一步的选项（或搜索结果）→ 底部操作。
 * 选完一步自动进入下一步，最后一步选完即确认；点已完成的步骤回到那一步重选。
 * 浮层 / 面板关闭时整体卸载，所以浏览位置、搜索词每次打开都是全新的。
 */
function RegionPickerPanel({
  variant,
  index,
  status,
  labels,
  value,
  valuePath,
  depth,
  allowPartial,
  required,
  inputRef,
  onRetry,
  onCommit,
}: {
  variant: RegionPickerVariant
  /** 数据没加载好时为 null */
  index: RegionIndex | null
  status: "loading" | "error" | "ready"
  labels: RegionPickerLabels
  value: string | null
  valuePath: RegionOption[]
  depth: number
  allowPartial: boolean
  required: boolean
  inputRef: React.RefObject<HTMLInputElement | null>
  onRetry: () => void
  /** 确认选择；空数组表示清除 */
  onCommit: (path: RegionOption[]) => void
}) {
  const sheet = variant === "sheet"
  const baseId = React.useId()
  const listId = `${baseId}-list`
  const scrollRef = React.useRef<HTMLDivElement>(null)

  const [query, setQuery] = React.useState("")
  // null = 还没手动浏览过，跟随当前值所在的那一步；这样懒加载的数据到了之后也能自动定位
  const [trailState, setTrailState] = React.useState<RegionOption[] | null>(
    null,
  )
  // 前进从右滑入、后退从左滑入，让人感觉到「下一步 / 上一步」
  // null = 刚打开，列表不做横向动画，只跟着面板整体出现，免得两个方向的动作叠在一起
  const [direction, setDirection] = React.useState<"forward" | "back" | null>(
    null,
  )

  const defaultTrail = React.useMemo(
    () =>
      valuePath.slice(
        0,
        Math.max(0, Math.min(valuePath.length - 1, depth - 1)),
      ),
    [valuePath, depth],
  )
  const trail = trailState ?? defaultTrail
  const level = trail.length
  const roots = index?.roots ?? EMPTY_PATH
  const options = trail.length
    ? (trail[level - 1].children ?? EMPTY_PATH)
    : roots

  // 当前这一步里属于已选路径的那一项（上级路径一致时才算）
  const selectedHere =
    valuePath.length > level &&
    trail.every((node, i) => node.code === valuePath[i].code)
      ? valuePath[level]
      : undefined

  // ---------- 步骤条 ----------
  // 全局最深几级，与当前这条路径最深几级；名称从最深一级往上对齐（直辖市第二步叫「区县」）
  const totalSteps = Math.min(depth, regionTreeDepth(roots))
  const stepCount = Math.max(
    level + 1,
    Math.min(depth, level + regionTreeDepth(options)),
  )
  const stepLabel = (step: number) => {
    const at = step === 0 ? 0 : step + Math.max(0, totalSteps - stepCount)
    return labels.levels[at] ?? fill(labels.stepFallback, { step: step + 1 })
  }
  const steps: RegionPickerStep[] = Array.from(
    { length: stepCount },
    (_, step) => {
      const label = stepLabel(step)
      if (step < level) return { label, value: trail[step].name, state: "done" }
      if (step === level)
        return {
          label,
          value:
            selectedHere?.name ?? fill(labels.stepPending, { level: label }),
          state: "current",
        }
      return { label, state: "todo" }
    },
  )

  // ---------- 列表 ----------
  const searching = query.trim() !== ""
  const search = React.useMemo(
    () => (index && searching ? searchRegionIndex(index, query) : null),
    [index, query, searching],
  )

  // 选项多时像通讯录一样按拼音首字母分组；数据没拼音就保持原顺序
  const groups = React.useMemo<RegionGroup[] | null>(
    () =>
      options.length >= GROUP_THRESHOLD ? groupRegionsByInitial(options) : null,
    [options],
  )

  const rows = React.useMemo<Row[]>(() => {
    if (search)
      return search.results.map(({ node, level, path, highlights }) => ({
        node,
        level,
        path,
        highlights,
      }))
    const ordered = groups ? groups.flatMap((group) => group.items) : options
    return ordered.map((node) => ({ node, level, path: [...trail, node] }))
  }, [search, groups, options, trail, level])

  // 列表一换（进入下一步、搜索词变化），高亮项回到已选项或第一项
  const listKey = searching
    ? `s:${query}`
    : `b:${trail.map((node) => node.code).join(",")}`
  const selectedCode = searching ? value : selectedHere?.code
  const selectedAt = rows.findIndex((row) => row.node.code === selectedCode)
  const fallbackActive = rows.length ? Math.max(0, selectedAt) : -1
  const [activeState, setActiveState] = React.useState({
    key: listKey,
    index: fallbackActive,
  })
  const active = Math.min(
    activeState.key === listKey ? activeState.index : fallbackActive,
    rows.length - 1,
  )
  const setActive = (next: number) =>
    setActiveState({ key: listKey, index: next })
  const optionId = (i: number) => `${baseId}-opt-${i}`
  const activeId = active >= 0 ? optionId(active) : undefined

  // 进入新一步时把已选项滚到中间（重新打开能直接看到上次的选择），键盘移动时只滚进视野
  const lastKey = React.useRef<string | null>(null)
  React.useEffect(() => {
    if (!activeId) return
    const element = document.getElementById(activeId)
    if (!element) return
    const fresh = lastKey.current !== listKey
    lastKey.current = listKey
    if (fresh && selectedAt < 0) {
      scrollRef.current?.scrollTo({ top: 0 })
      return
    }
    if (scrollRef.current)
      scrollWithin(scrollRef.current, element, fresh ? "center" : "nearest")
  }, [activeId, listKey, selectedAt])

  const choose = (row: Row) => {
    if (isLeafRegion(row.node, row.level, depth)) return onCommit(row.path)
    setDirection("forward")
    setTrailState(row.path)
    setQuery("")
    // 手机上不主动聚焦搜索框，免得软键盘弹出来挡住列表
    if (!sheet) inputRef.current?.focus()
  }

  const goTo = (step: number) => {
    setDirection("back")
    setTrailState(trail.slice(0, step))
    setQuery("")
    if (!sheet) inputRef.current?.focus()
  }

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    // 拼音输入法组词时的方向键、回车是在选候选词，不能当作列表操作
    if (event.nativeEvent.isComposing) return
    const count = rows.length
    switch (event.key) {
      case "ArrowDown":
        if (!count) return
        event.preventDefault()
        setActive(Math.min(count - 1, active + 1))
        return
      case "ArrowUp":
        if (!count) return
        event.preventDefault()
        setActive(Math.max(0, active - 1))
        return
      // 左右键平时是移动光标，搜索框为空时才用来在选项间移动
      case "ArrowRight":
        if (!count || query) return
        event.preventDefault()
        setActive(Math.min(count - 1, active + 1))
        return
      case "ArrowLeft":
        if (!count || query) return
        event.preventDefault()
        setActive(Math.max(0, active - 1))
        return
      case "Enter":
        event.preventDefault()
        if (active >= 0) choose(rows[active])
        return
      case "Backspace":
        if (!query && trail.length) {
          event.preventDefault()
          goTo(trail.length - 1)
        }
        return
    }
  }

  const ready = status === "ready" && index !== null
  const announcement = !ready
    ? status === "error"
      ? labels.loadFailed
      : labels.loading
    : searching
      ? search && search.total
        ? fill(labels.resultStatus, { count: search.total })
        : labels.empty
      : fill(labels.levelStatus, {
          step: level + 1,
          level: stepLabel(level),
          count: rows.length,
        })

  // 允许选中间级时「确定」常驻，没有可确认的路径就置灰：按钮时有时无会让面板高度跳动
  const showConfirm = allowPartial && ready
  const canConfirm = showConfirm && !searching && trail.length > 0
  // 底部面板的「清除」放在标题栏（由外层渲染），这里只管浮层
  const showClear = !sheet && value !== null && !required

  // ---------- 渲染 ----------
  // 内容区高度固定：面板里撑满剩余空间；浮层里固定 16rem。
  // 浮层高度一旦随每一步的选项数变化，定位就会在输入框上方、下方之间来回翻，看起来像在抖
  const bodyClass = sheet ? "flex-1" : "h-64"

  const renderOption = (
    row: Row,
    i: number,
    layout: "row" | "chip",
    className?: string,
  ) => (
    <RegionPickerOption
      key={row.path.map((node) => node.code).join("/")}
      className={className}
      id={optionId(i)}
      title={formatRegionPath(row.path)}
      variant={variant}
      layout={layout}
      active={i === active}
      selected={row.node.code === selectedCode}
      branch={!isLeafRegion(row.node, row.level, depth)}
      onSelect={() => choose(row)}
      onHover={() => i !== active && setActive(i)}
    >
      {searching ? (
        <>
          <span className="min-w-0 flex-1 truncate">
            {row.path.map((node, at) => (
              <React.Fragment key={node.code}>
                {at > 0 && (
                  <span className="text-muted-foreground/60">{" / "}</span>
                )}
                <span className={cn(at < row.level && "text-muted-foreground")}>
                  <RegionPickerHighlight
                    text={node.name}
                    range={row.highlights?.[at]?.name}
                  />
                </span>
              </React.Fragment>
            ))}
          </span>
          <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
            <RegionPickerHighlight
              text={row.node.code}
              range={row.highlights?.[row.level]?.code}
            />
          </span>
        </>
      ) : (
        <span className="min-w-0 truncate">{row.node.name}</span>
      )}
    </RegionPickerOption>
  )

  // 浏览时的选项：面板里整行单列，浮层里是一格格按钮；分组时每组前面标字母
  // 每组第一项在 rows 里的序号，渲染时据此拼出选项 id
  const groupStarts = groups
    ? groups.map((_, g) =>
        groups.slice(0, g).reduce((sum, group) => sum + group.items.length, 0),
      )
    : []
  // 搜索时 rows 是搜索结果，和 groups 对不上，不能按分组取，否则会越界
  const browseList = searching ? null : groups ? (
    // 浮层里两栏排布：多数字母下只有一两个地名，单栏会留下大片空白
    <div className={cn(!sheet && "gap-x-3 sm:columns-2")}>
      {groups.map((group, g) => {
        const start = groupStarts[g]
        const groupId = `${baseId}-group-${group.letter}`
        return (
          <div
            key={group.letter}
            role="group"
            aria-labelledby={groupId}
            data-slot="region-picker-group"
            data-group-letter={group.letter}
            className={cn(
              sheet
                ? ""
                : "grid break-inside-avoid grid-cols-[1.25rem_minmax(0,1fr)] items-start gap-x-1.5 py-1",
            )}
          >
            <div
              id={groupId}
              data-letter={group.letter}
              className={cn(
                "font-mono text-xs font-medium text-muted-foreground",
                sheet
                  ? "sticky top-0 z-10 bg-muted px-4 py-1"
                  : "flex h-8 items-center justify-center",
              )}
            >
              {group.letter}
            </div>
            <div className={cn(sheet ? "" : "flex flex-wrap gap-1.5")}>
              {group.items.map((node, i) =>
                renderOption(
                  rows[start + i],
                  start + i,
                  sheet ? "row" : "chip",
                  // 右侧给字母索引条留出位置，箭头和对勾不被它压住
                  sheet ? "pr-9" : undefined,
                ),
              )}
            </div>
          </div>
        )
      })}
    </div>
  ) : (
    <div
      className={cn(
        sheet ? "" : "grid grid-cols-2 gap-1.5 py-1 sm:grid-cols-3",
      )}
    >
      {rows.map((row, i) => renderOption(row, i, sheet ? "row" : "chip"))}
    </div>
  )

  const groupElement = (letter: string) =>
    scrollRef.current?.querySelector<HTMLElement>(
      `[data-group-letter="${letter}"]`,
    )

  const jumpTo = (letter: string) => {
    const group = groupElement(letter)
    if (group && scrollRef.current)
      scrollWithin(scrollRef.current, group, "start")
  }

  // 字母栏跟着列表滚动高亮当前所在的字母，让两者连成一体；换一步时回到第一组
  const [spy, setSpy] = React.useState<{ key: string; letter: string } | null>(
    null,
  )
  const spyGroups = sheet && !searching ? groups : null
  const currentLetter =
    spy?.key === listKey ? spy.letter : (spyGroups?.[0]?.letter ?? null)
  const onListScroll = () => {
    const list = scrollRef.current
    if (!list || !spyGroups) return
    const top = list.getBoundingClientRect().top
    let letter = spyGroups[0].letter
    for (const group of spyGroups) {
      const element = groupElement(group.letter)
      if (!element || element.getBoundingClientRect().top - top > 1) break
      letter = group.letter
    }
    if (letter !== currentLetter) setSpy({ key: listKey, letter })
  }

  return (
    <div
      data-slot="region-picker-panel"
      data-variant={variant}
      className={cn("flex min-h-0 flex-col", sheet ? "flex-1" : "gap-2 py-2.5")}
    >
      {ready && !searching && (
        <RegionPickerSteps
          steps={steps}
          variant={variant}
          ariaLabel={labels.stepsNav}
          onSelect={goTo}
        />
      )}

      <div className={cn("relative", sheet ? "px-4 py-2" : "px-2.5")}>
        <Search
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute top-1/2 size-4 -translate-y-1/2 text-muted-foreground",
            sheet ? "left-7" : "left-5",
          )}
        />
        <Input
          ref={inputRef}
          data-slot="region-picker-search"
          type="search"
          role="combobox"
          aria-label={labels.searchLabel}
          aria-expanded="true"
          aria-autocomplete="list"
          aria-controls={ready && rows.length ? listId : undefined}
          aria-activedescendant={ready ? activeId : undefined}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          enterKeyHint="search"
          placeholder={labels.searchPlaceholder}
          // 面板里用 16px 字号与 40px 高，iOS 聚焦时不会放大页面，手指也好点
          className={cn(
            "pl-8 focus-visible:border-foreground/25 focus-visible:ring-0",
            sheet && "h-10 bg-muted/50 text-base",
          )}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={onKeyDown}
        />
      </div>

      {!ready ? (
        status === "error" ? (
          <RegionPickerNotice className={bodyClass}>
            <span>{labels.loadFailed}</span>
            <Button
              type="button"
              variant="outline"
              size={sheet ? "lg" : "sm"}
              onClick={onRetry}
            >
              {labels.retry}
            </Button>
          </RegionPickerNotice>
        ) : (
          <RegionPickerNotice loading className={bodyClass}>
            {labels.loading}
          </RegionPickerNotice>
        )
      ) : rows.length ? (
        <div
          className={cn(
            "relative min-h-0",
            sheet ? "flex-1 border-t border-border" : "h-64",
          )}
        >
          <div
            ref={scrollRef}
            id={listId}
            role="listbox"
            aria-label={searching ? labels.searchLabel : stepLabel(level)}
            data-slot="region-picker-list"
            onScroll={onListScroll}
            className={cn(
              "overflow-y-auto overscroll-contain",
              sheet
                ? "h-full pb-[env(safe-area-inset-bottom)]"
                : "h-full px-2.5",
            )}
          >
            <div
              key={listKey}
              className={cn(
                direction &&
                  !searching &&
                  "motion-safe:animate-in motion-safe:duration-200 motion-safe:fade-in-0",
                direction === "forward" &&
                  !searching &&
                  "motion-safe:slide-in-from-right-4",
                direction === "back" &&
                  !searching &&
                  "motion-safe:slide-in-from-left-4",
                searching && !sheet && "flex flex-col gap-0.5",
              )}
            >
              {searching
                ? rows.map((row, i) => renderOption(row, i, "row"))
                : browseList}
            </div>
            {/* 截断提示放在列表末尾一起滚动，不额外占高度 */}
            {search && search.total > search.results.length && (
              <p
                data-slot="region-picker-hint"
                className={cn(
                  "py-2 text-xs text-muted-foreground",
                  sheet && "px-4",
                )}
              >
                {fill(labels.resultTruncated, { limit: search.results.length })}
              </p>
            )}
          </div>

          {/* 手机上的字母索引条：长列表一点就跳到对应字母 */}
          {sheet && groups && !searching && (
            <nav
              aria-label={labels.letterIndex}
              data-slot="region-picker-index"
              className="absolute top-8 right-1 bottom-2 z-20 flex w-6 flex-col items-center justify-center"
            >
              {groups.map((group) => {
                const current = group.letter === currentLetter
                return (
                  <button
                    key={group.letter}
                    type="button"
                    aria-current={current ? "location" : undefined}
                    className="group/letter flex h-5 w-6 items-center justify-center"
                    onClick={() => jumpTo(group.letter)}
                  >
                    <span
                      className={cn(
                        "flex size-4 items-center justify-center rounded-full font-mono text-[10px] leading-none",
                        current
                          ? "bg-primary font-semibold text-primary-foreground"
                          : "text-muted-foreground group-active/letter:text-primary",
                      )}
                    >
                      {group.letter}
                    </span>
                  </button>
                )
              })}
            </nav>
          )}
        </div>
      ) : (
        <RegionPickerNotice className={bodyClass}>
          {labels.empty}
        </RegionPickerNotice>
      )}

      {(showConfirm || showClear) && (
        <div
          data-slot="region-picker-footer"
          className={cn(
            "flex items-center gap-2 border-t border-border",
            sheet
              ? "px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
              : "mx-2.5 pt-2.5",
          )}
        >
          {showClear && (
            <Button
              type="button"
              variant="outline"
              size={sheet ? "lg" : "sm"}
              onClick={() => onCommit(EMPTY_PATH)}
            >
              {labels.clear}
            </Button>
          )}
          {showConfirm && (
            <Button
              type="button"
              size={sheet ? "lg" : "sm"}
              className={cn("ml-auto min-w-0", sheet && "flex-1")}
              disabled={!canConfirm}
              onClick={() => onCommit(trail)}
            >
              <span className="truncate">
                {canConfirm
                  ? fill(labels.confirmPartial, {
                      name: formatRegionPath(trail),
                    })
                  : labels.confirmIdle}
              </span>
            </Button>
          )}
        </div>
      )}

      <span role="status" className="sr-only">
        {announcement}
      </span>
    </div>
  )
}

export { RegionPickerPanel }
