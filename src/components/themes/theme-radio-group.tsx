"use client"

import { useId } from "react"
import { CheckIcon } from "lucide-react"

import { ThemeSwatch } from "@/components/themes/theme-swatch"
import {
  type ColorThemeId,
  formatThemeLabel,
  getThemeGroups,
  isColorTheme,
} from "@/lib/themes"
import { cn } from "@/lib/utils"

const GROUPS = getThemeGroups()

/** 方向键切换、循环；Home / End 跳到首尾。 */
const KEY_STEP: Record<string, number> = {
  ArrowRight: 1,
  ArrowDown: 1,
  ArrowLeft: -1,
  ArrowUp: -1,
}

/**
 * 颜色主题单选组（radio 语义，roving tabindex）。
 * 先「中性基底」后「彩色」（按色相环排序），每组带中英对照的标题。
 * - list：紧凑两列，用于顶栏弹层
 * - card：宽松卡片，用于 /themes 页面
 */
export function ThemeRadioGroup({
  value,
  onValueChange,
  label,
  variant = "list",
  className,
}: {
  value: ColorThemeId
  onValueChange: (id: ColorThemeId) => void
  label: string
  variant?: "list" | "card"
  className?: string
}) {
  const baseId = useId()

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const isEdge = event.key === "Home" || event.key === "End"
    if (!isEdge && !(event.key in KEY_STEP)) return

    const radios = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>('[role="radio"]'),
    )
    const current = radios.findIndex(
      (radio) => radio === document.activeElement,
    )
    if (current < 0) return

    event.preventDefault()
    const nextIndex =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? radios.length - 1
          : (current + (KEY_STEP[event.key] ?? 0) + radios.length) %
            radios.length
    const next = radios[nextIndex]
    if (!next) return
    next.focus()
    const id = next.dataset.themeId
    if (isColorTheme(id)) onValueChange(id)
  }

  return (
    <div
      role="radiogroup"
      aria-label={label}
      data-slot="theme-radio-group"
      onKeyDown={onKeyDown}
      className={cn(
        "flex flex-col",
        variant === "card" ? "gap-6" : "gap-3",
        className,
      )}
    >
      {GROUPS.map((group) => (
        <div
          key={group.id}
          className={cn(
            "flex flex-col",
            variant === "card" ? "gap-3" : "gap-1",
          )}
        >
          {variant === "card" ? (
            <p className="flex flex-wrap items-baseline gap-x-2 font-mono text-xs text-muted-foreground">
              <span>
                {group.name} · {group.title}
              </span>
              <span className="text-muted-foreground/80">
                {group.description}
              </span>
            </p>
          ) : (
            <p className="px-1 text-[11px] text-muted-foreground">
              {group.name} · {group.title}
            </p>
          )}
          <div
            className={cn(
              "grid gap-1",
              variant === "card"
                ? "grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6"
                : "grid-cols-2",
            )}
          >
            {group.themes.map((theme) => {
              const checked = theme.id === value
              return (
                <button
                  key={theme.id}
                  id={`${baseId}-${theme.id}`}
                  type="button"
                  role="radio"
                  aria-checked={checked}
                  tabIndex={checked ? 0 : -1}
                  data-slot="theme-option"
                  data-theme-id={theme.id}
                  title={theme.description}
                  onClick={() => onValueChange(theme.id)}
                  className={cn(
                    "flex items-center gap-2 text-left text-xs transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 motion-reduce:transition-none",
                    variant === "card"
                      ? "rounded-lg border border-edge bg-background px-3 py-2.5 hover:bg-muted"
                      : "h-7 rounded-md px-2 hover:bg-muted",
                    checked &&
                      (variant === "card"
                        ? "border-foreground/60 bg-muted font-medium"
                        : "bg-muted font-medium ring-1 ring-foreground/15"),
                  )}
                >
                  <ThemeSwatch
                    theme={theme}
                    className={variant === "card" ? "size-5" : undefined}
                  />
                  <span className="min-w-0 flex-1 truncate">
                    <span className="sr-only">{formatThemeLabel(theme)}</span>
                    <span aria-hidden>
                      {theme.name}
                      <span className="font-normal text-muted-foreground">
                        {" · "}
                        {theme.title}
                      </span>
                    </span>
                  </span>
                  {checked && (
                    <CheckIcon
                      aria-hidden
                      className="size-3.5 shrink-0 text-foreground"
                    />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
