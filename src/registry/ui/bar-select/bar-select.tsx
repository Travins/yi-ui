"use client"

import * as React from "react"
import { Check, ChevronDown, Search, X } from "lucide-react"
import { cva } from "class-variance-authority"
import { Button } from "@/components/ui/button"
import {
  Combobox,
  ComboboxTrigger,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxGroup,
  ComboboxLabel,
} from "@/components/ui/combobox"
import { InputGroupAddon } from "@/components/ui/input-group"
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { useControllableState } from "@/registry/hooks/use-controllable-state"
import { defaultLabels } from "./config"
import type { BarSelectProps } from "./types"

const barSelectVariants = cva(
  "flex min-w-0 items-center rounded-md border bg-muted/60 transition-colors",
  {
    // 高度含边框，与方条输入、分段选择同一张表；标签模式换行时可以长高
    variants: {
      size: {
        sm: "min-h-7 text-xs pointer-coarse:min-h-9",
        default: "min-h-8 text-sm pointer-coarse:min-h-10",
        lg: "min-h-9 text-sm pointer-coarse:min-h-11",
      },
    },
    defaultVariants: { size: "default" },
  },
)
function subscribePointer(notify: () => void) {
  const media = window.matchMedia("(pointer: coarse)")
  media.addEventListener("change", notify)
  return () => media.removeEventListener("change", notify)
}
function BarSelect(props: BarSelectProps) {
  const {
    options,
    label,
    placeholder = "请选择",
    searchable = options.length > 8,
    clearable = true,
    size = "default",
    error,
    description,
    name,
    form,
    disabled,
    labels: labelsProp,
    contentClassName,
    className,
    id: idProp,
    multiple = false,
    value: valueProp,
    defaultValue,
    onValueChange,
    ...rest
  } = props
  // 模式属性不透传到 DOM。
  const { display: displayProp, ...domProps } = rest as typeof rest & {
    display?: string
  }
  const display = props.multiple ? (displayProp ?? "first-plus") : "first-plus"
  const labels = { ...defaultLabels, ...labelsProp }
  // 调用方的 id 交给触发按钮，外部 <label htmlFor> 才能关联到可聚焦的控件
  const autoId = React.useId()
  const id = idProp ?? autoId
  const anchor = React.useRef<HTMLDivElement>(null)
  const [value, setValue] = useControllableState<string | string[] | null>({
    prop: valueProp,
    defaultProp: defaultValue ?? (multiple ? [] : null),
    onChange: (next) => {
      if (props.multiple)
        (onValueChange as ((value: string[]) => void) | undefined)?.(
          Array.isArray(next) ? next : [],
        )
      else
        (onValueChange as ((value: string | null) => void) | undefined)?.(
          typeof next === "string" ? next : null,
        )
    },
  })
  const [open, setOpen] = React.useState(false)
  const [sheetOpen, setSheetOpen] = React.useState(false)
  function changeSheetOpen(next: boolean) {
    setSheetOpen(next && !disabled)
    if (!next) setQuery("")
  }
  const [query, setQuery] = React.useState("")
  const [wasDisabled, setWasDisabled] = React.useState(disabled)
  if (wasDisabled !== disabled) {
    setWasDisabled(disabled)
    if (disabled) {
      setOpen(false)
      setSheetOpen(false)
      setQuery("")
    }
  }
  const coarse = React.useSyncExternalStore(
    subscribePointer,
    () => window.matchMedia("(pointer: coarse)").matches,
    () => false,
  )
  const Trigger = coarse ? Button : ComboboxTrigger
  const values = Array.isArray(value) ? value : value ? [value] : []
  const selected = values
    .map((v) => options.find((o) => o.value === v))
    .filter((o) => !!o)
  const text = (v: string) => {
    const o = options.find((item) => item.value === v)
    return o?.textValue ?? (typeof o?.label === "string" ? o.label : v)
  }
  const filtered = options.filter((o) =>
    text(o.value).toLocaleLowerCase().includes(query.toLocaleLowerCase()),
  )
  const groups = [...new Set(filtered.map((o) => o.group ?? ""))]
  const clear = () => {
    setValue(multiple ? [] : null)
    setQuery("")
  }
  React.useEffect(() => {
    const element =
      anchor.current?.closest("form") ??
      (form ? document.getElementById(form) : null)
    if (!element || valueProp !== undefined) return
    const reset = () => {
      setValue(defaultValue ?? (multiple ? [] : null))
      setQuery("")
    }
    element.addEventListener("reset", reset)
    return () => element.removeEventListener("reset", reset)
  }, [form, valueProp, defaultValue, multiple, setValue])
  const contents = (
    <>
      {searchable && (
        // 搜索行做成弹层顶部的一条：无边框、左侧放大镜、下方分隔线
        <ComboboxInput
          aria-label={labels.search}
          placeholder={`${labels.search}…`}
          showTrigger={false}
          showClear={false}
          className={cn(
            "m-0! h-9! rounded-none! border-0! border-b! border-border! bg-transparent! shadow-none! has-[[data-slot=input-group-control]:focus-visible]:ring-0! [&_[data-slot=input-group-addon]:empty]:hidden [&_input]:text-base md:[&_input]:text-sm",
            coarse && "h-11! px-2",
          )}
        >
          <InputGroupAddon>
            <Search aria-hidden="true" className="size-3.5" />
          </InputGroupAddon>
        </ComboboxInput>
      )}
      {/* 选项没有通过 items 交给 Base UI，列表会带 data-empty，官方样式随之清掉内边距，这里用 ! 保留 */}
      <ComboboxList
        className={cn(
          "overflow-auto p-1!",
          coarse
            ? "max-h-[50dvh] px-3! [&_[data-slot=combobox-item]]:min-h-11 [&_[data-slot=combobox-item]]:text-base"
            : "max-h-72",
        )}
      >
        {!filtered.length && (
          <div className="p-3 text-center text-sm text-muted-foreground">
            {labels.empty}
          </div>
        )}
        {groups.map((group) => (
          <ComboboxGroup key={group}>
            {group && <ComboboxLabel>{group}</ComboboxLabel>}
            {filtered
              .filter((o) => (o.group ?? "") === group)
              .map((option) => (
                <ComboboxItem
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                  className={cn(
                    size === "sm" ? "text-xs" : "text-sm",
                    option.count === 0 && "text-muted-foreground",
                    // 多选用左侧勾选框表达状态，隐藏官方右侧的对勾，计数靠右
                    multiple && "pr-1.5 [&>span.absolute]:hidden",
                  )}
                >
                  {multiple && (
                    <span
                      aria-hidden="true"
                      data-checked={values.includes(option.value) || undefined}
                      className="flex size-3.5 shrink-0 items-center justify-center rounded-[4px] border border-input bg-background text-primary-foreground! data-checked:border-primary data-checked:bg-primary [&_*]:text-primary-foreground!"
                    >
                      {values.includes(option.value) && (
                        <Check
                          className="size-2.5 text-primary-foreground!"
                          strokeWidth={3}
                        />
                      )}
                    </span>
                  )}
                  {option.icon}
                  <span className="min-w-0 flex-1 truncate">
                    {option.label}
                  </span>
                  {option.count !== undefined && (
                    <span className="ms-2 font-mono text-xs text-muted-foreground tabular-nums">
                      {option.count}
                    </span>
                  )}
                </ComboboxItem>
              ))}
          </ComboboxGroup>
        ))}
      </ComboboxList>
      {coarse ? (
        // 触屏：底部两颗等宽大按钮，留出安全区
        <div className="grid grid-cols-2 gap-3 border-t border-border p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Button
            type="button"
            variant="outline"
            size="lg"
            disabled={disabled || !clearable || !values.length}
            onClick={clear}
          >
            {labels.clear}
          </Button>
          <Button
            type="button"
            size="lg"
            onClick={() => changeSheetOpen(false)}
          >
            {labels.done}
          </Button>
        </div>
      ) : (
        multiple && (
          <div className="flex items-center justify-between gap-2 border-t border-border p-2 text-xs">
            <span aria-live="polite">{labels.selected(values.length)}</span>
            {clearable && (
              <Button
                type="button"
                variant="ghost"
                size={size === "lg" ? "default" : "sm"}
                disabled={disabled || !values.length}
                onClick={clear}
              >
                {labels.clear}
              </Button>
            )}
          </div>
        )
      )}
    </>
  )
  return (
    <div
      {...domProps}
      data-slot="bar-select"
      data-size={size}
      className={cn(
        "@container/bar-select w-full min-w-0",
        // 放进网格工具栏：铺满整格
        "in-data-[slot=grid-toolbar]:h-full",
        className,
      )}
    >
      {label && (
        <span
          aria-hidden="true"
          className="mb-1.5 hidden text-xs text-muted-foreground in-data-[slot=grid-toolbar]:hidden! @max-[10rem]/bar-select:block"
        >
          {label}
        </span>
      )}
      <Combobox<string, boolean>
        multiple={multiple}
        value={value}
        disabled={disabled}
        open={!disabled && !coarse && open}
        onOpenChange={(next) => {
          if (coarse || (disabled && next)) return
          setOpen(next)
          if (!next) setQuery("")
        }}
        inputValue={query}
        onInputValueChange={setQuery}
        itemToStringLabel={text}
        filter={null}
        inline={coarse}
        onValueChange={(next) => {
          setValue(next)
          setQuery("")
          if (!multiple) {
            setOpen(false)
            changeSheetOpen(false)
          }
        }}
      >
        <div
          ref={anchor}
          data-slot="bar-select-control"
          className={cn(
            barSelectVariants({ size }),
            "relative",
            error ? "border-destructive" : "border-edge hover:bg-muted",
            disabled && "opacity-50",
            // 展开时标签和值作为一个整体铺底色，不只亮触发键那一段
            "has-[[data-slot=combobox-trigger][aria-expanded=true]]:bg-muted in-data-[slot=grid-toolbar]:has-[[data-slot=combobox-trigger][aria-expanded=true]]:bg-muted",
            // 放进网格工具栏：去掉外框、圆角和底色，铺满整格
            "in-data-[slot=grid-toolbar]:h-full! in-data-[slot=grid-toolbar]:min-h-0! in-data-[slot=grid-toolbar]:rounded-none in-data-[slot=grid-toolbar]:border-0 in-data-[slot=grid-toolbar]:bg-transparent in-data-[slot=grid-toolbar]:hover:bg-muted",
          )}
        >
          {label && (
            <span
              id={`${id}-label`}
              className="flex shrink-0 items-center self-stretch border-r border-edge px-3 text-muted-foreground in-data-[slot=grid-toolbar]:not-sr-only! in-data-[slot=grid-toolbar]:px-3! in-data-[slot=grid-toolbar]:whitespace-nowrap! @max-[10rem]/bar-select:sr-only"
            >
              {label}
            </span>
          )}
          {multiple && display === "chips" && selected.length > 0 && (
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1 py-1 ps-2">
              {selected.map((o) => (
                <span
                  key={o.value}
                  data-slot="bar-select-chip"
                  className="flex h-5 items-center gap-0.5 rounded-sm border border-edge bg-background ps-1.5 text-xs"
                >
                  {o.label}
                  {/* 标签内的移除键：跟随官方 combobox chip 的 icon-xs 档 */}
                  <Button
                    type="button"
                    size="icon-xs"
                    variant="ghost"
                    className="size-4.5 rounded-[3px] text-muted-foreground hover:text-foreground"
                    disabled={disabled}
                    aria-label={labels.remove(text(o.value))}
                    onClick={() =>
                      setValue(values.filter((v) => v !== o.value))
                    }
                  >
                    <X className="size-3" />
                  </Button>
                </span>
              ))}
            </div>
          )}
          <Trigger
            {...(coarse
              ? {
                  type: "button" as const,
                  variant: "ghost" as const,
                  size,
                  disabled,
                  "aria-haspopup": "dialog" as const,
                }
              : {
                  render: <Button type="button" variant="ghost" size={size} />,
                })}
            data-slot="combobox-trigger"
            id={id}
            aria-label={props["aria-label"]}
            aria-labelledby={label ? `${id}-label ${id}-value` : undefined}
            aria-expanded={coarse ? sheetOpen : open}
            aria-invalid={!!error}
            // 触屏时列表内联在底部面板里，Combobox 不再自己弹出，由触发键打开面板
            onClick={() => {
              if (coarse) changeSheetOpen(true)
            }}
            aria-describedby={
              [error && `${id}-error`, description && `${id}-description`]
                .filter(Boolean)
                .join(" ") || undefined
            }
            className={cn(
              "h-auto min-w-0 flex-1 justify-between self-stretch rounded-none font-normal focus-visible:ring-inset",
              error &&
                "focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-ring/50 focus-visible:outline-solid",
              multiple && display === "chips" && selected.length && "flex-none",
            )}
          >
            <span
              id={`${id}-value`}
              className={cn(
                "flex min-w-0 flex-1 text-start",
                clearable && values.length > 0 && "pe-6",
              )}
            >
              {!selected.length ? (
                <span className="truncate">{placeholder}</span>
              ) : multiple && display === "summary" ? (
                <span className="truncate">
                  {labels.selected(values.length)}
                </span>
              ) : multiple && display === "chips" ? null : (
                <>
                  {/* 宽度不够时只截断首项文字，「+N」始终完整显示 */}
                  <span className="truncate">{selected[0]?.label}</span>
                  {values.length > 1 && (
                    <span className="shrink-0 ps-1 font-mono text-xs text-muted-foreground tabular-nums">
                      +{values.length - 1}
                    </span>
                  )}
                </>
              )}
            </span>
            {coarse && (
              <ChevronDown
                aria-hidden="true"
                className="size-4 text-muted-foreground"
              />
            )}
          </Trigger>
          {/* 清除键叠在触发条上、下拉箭头左侧（兄弟元素，避免按钮嵌套） */}
          {clearable && values.length > 0 && (
            <Button
              type="button"
              size="icon-xs"
              variant="ghost"
              aria-label={labels.clear}
              disabled={disabled}
              className="absolute end-8 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={clear}
            >
              <X className="size-3.5" />
            </Button>
          )}
        </div>
        {coarse ? (
          <Sheet open={!disabled && sheetOpen} onOpenChange={changeSheetOpen}>
            <SheetContent
              side="bottom"
              className={cn("max-h-[85dvh] overflow-auto", contentClassName)}
            >
              <SheetTitle className="px-4 pt-4">
                {label ?? props["aria-label"]}
              </SheetTitle>
              <SheetDescription
                aria-live="polite"
                className={cn("px-4", !multiple && "sr-only")}
              >
                {multiple ? labels.selected(values.length) : labels.search}
              </SheetDescription>
              {contents}
            </SheetContent>
          </Sheet>
        ) : (
          <ComboboxContent
            anchor={anchor}
            className={cn(
              "w-auto max-w-[min(var(--available-width),calc(100vw-2rem))] min-w-(--anchor-width) outline-none data-[chips=true]:min-w-(--anchor-width)",
              contentClassName,
            )}
          >
            {contents}
          </ComboboxContent>
        )}
      </Combobox>
      {name &&
        (multiple ? values : [typeof value === "string" ? value : ""]).map(
          (v, index) => (
            <input
              key={index}
              type="hidden"
              name={name}
              form={form}
              value={v}
              disabled={disabled}
            />
          ),
        )}
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-xs text-destructive">
          {error}
        </p>
      )}
      {description && (
        <p
          id={`${id}-description`}
          className="mt-1.5 text-xs text-muted-foreground"
        >
          {description}
        </p>
      )}
    </div>
  )
}
export { BarSelect, barSelectVariants }
export type { BarSelectProps, BarSelectOption, BarSelectLabels } from "./types"
