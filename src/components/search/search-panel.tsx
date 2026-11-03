"use client"

import type { SortedResult } from "fumadocs-core/search"
import { SearchIcon, SearchXIcon, XIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import {
  Fragment,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type RefObject,
} from "react"
import { cn } from "cn"
import { Button, buttonVariants } from "@/components/ui/button"
import { Kbd, KbdGroup } from "@/components/ui/kbd"
import { searchShortcuts } from "@/lib/search"
import {
  isIndexReady,
  pushRecent,
  readRecent,
  retryIndex,
  search,
  warmIndex,
  writeRecent,
} from "./search-client"
import { buildIdleModel, buildResultModel, type Row } from "./search-model"
import { ResultRow } from "./search-rows"

const DEBOUNCE = 120

function Skeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-1 p-2">
      {[0, 1, 2].map((item) => (
        <div key={item} className="flex h-9 items-center gap-2.5 px-2.5">
          <div className="size-4 shrink-0 rounded-sm bg-foreground/8 motion-safe:animate-pulse" />
          <div
            className="h-3 rounded-sm bg-foreground/8 motion-safe:animate-pulse"
            style={{ width: `${[38, 52, 30][item]}%` }}
          />
        </div>
      ))}
    </div>
  )
}

export function SearchPanel({
  inputRef,
  onClose,
}: {
  inputRef: RefObject<HTMLInputElement | null>
  onClose: () => void
}) {
  const router = useRouter()
  const id = useId()
  const listId = `${id}-list`
  const scroller = useRef<HTMLDivElement>(null)
  const keyboardMove = useRef(false)

  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState(0)
  const [recent, setRecent] = useState<string[]>(readRecent)
  const [ready, setReady] = useState(isIndexReady)
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [response, setResponse] = useState<{
    query: string
    results: SortedResult[]
  }>({ query: "", results: [] })

  const q = query.trim()

  // 首次打开时下载索引；失败后可通过 attempt 重试。
  useEffect(() => {
    if (isIndexReady()) return
    let cancelled = false
    warmIndex().then(
      () => !cancelled && (setReady(true), setError(false)),
      () => !cancelled && setError(true),
    )
    return () => {
      cancelled = true
    }
  }, [attempt])

  // 防抖搜索；上一次是空查询时（第一个字符）立即搜索，避免空白闪烁。
  useEffect(() => {
    if (!q || !ready) return
    let cancelled = false
    const timeout = setTimeout(
      () => {
        search(q).then(
          (results) => {
            if (cancelled) return
            setResponse({ query: q, results })
            setError(false)
          },
          () => !cancelled && setError(true),
        )
      },
      response.query ? DEBOUNCE : 0,
    )
    return () => {
      cancelled = true
      clearTimeout(timeout)
    }
    // response.query 只用于决定延迟，不应触发重新搜索
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, ready])

  const settled = response.query === q
  const model = useMemo(
    () =>
      q
        ? buildResultModel(response.results, response.query)
        : buildIdleModel(recent),
    [q, response, recent],
  )
  const { rows, sections } = model
  const loading = !!q && !ready && !error
  const failed = !!q && error
  const empty = !!q && ready && settled && rows.length === 0
  const showList = rows.length > 0 && !failed && !loading
  const active = Math.min(selected, Math.max(0, rows.length - 1))
  const optionId = (index: number) => `${id}-option-${index}`

  useEffect(() => {
    if (!keyboardMove.current) return
    keyboardMove.current = false
    if (active === 0) {
      scroller.current?.scrollTo({ top: 0 })
      return
    }
    document
      .getElementById(`${id}-option-${active}`)
      ?.scrollIntoView({ block: "nearest" })
  }, [active, id])

  const remember = useCallback(() => {
    if (!q) return
    const next = pushRecent(recent, q)
    setRecent(next)
    writeRecent(next)
  }, [q, recent])

  const open = useCallback(
    (row: Row, newTab = false) => {
      if (row.kind === "recent") {
        setQuery(row.query)
        setSelected(0)
        inputRef.current?.focus()
        return
      }
      remember()
      if (newTab) {
        window.open(row.url, "_blank", "noopener")
        return
      }
      onClose()
      router.push(row.url)
    },
    [inputRef, onClose, remember, router],
  )

  const onRowOpen = useCallback(
    (row: Row, event: MouseEvent) => {
      // 带修饰键时交给浏览器（新标签页等），只记录最近搜索
      if (
        row.kind !== "recent" &&
        (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
      ) {
        remember()
        return
      }
      event.preventDefault()
      open(row)
    },
    [open, remember],
  )

  const onHover = useCallback((index: number) => setSelected(index), [])

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.nativeEvent.isComposing || event.keyCode === 229) return
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault()
      if (!rows.length) return
      keyboardMove.current = true
      const step = event.key === "ArrowDown" ? 1 : -1
      setSelected((active + step + rows.length) % rows.length)
    } else if (event.key === "Enter" && showList && rows[active]) {
      event.preventDefault()
      open(rows[active], event.metaKey || event.ctrlKey)
    }
  }

  function clear() {
    setQuery("")
    setSelected(0)
    inputRef.current?.focus()
  }

  const summary =
    q && showList
      ? `${model.pageCount} 个页面${model.hitCount ? ` · ${model.hitCount} 处匹配` : ""}`
      : ""

  return (
    <>
      <div className="flex h-12 shrink-0 items-center gap-3 border-b border-edge px-4">
        <SearchIcon
          aria-hidden
          className="size-4 shrink-0 text-muted-foreground"
        />
        <input
          ref={inputRef}
          name="search"
          type="text"
          inputMode="search"
          role="combobox"
          aria-label="搜索关键词"
          aria-autocomplete="list"
          aria-expanded={showList}
          aria-controls={listId}
          aria-activedescendant={showList ? optionId(active) : undefined}
          value={query}
          placeholder="搜索文档、组件与博客…"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          enterKeyHint="search"
          className="h-full min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground"
          onChange={(event) => {
            setQuery(event.target.value)
            setSelected(0)
          }}
          onKeyDown={onKeyDown}
        />
        {query ? (
          <button
            type="button"
            aria-label="清除输入"
            onClick={clear}
            className="-mr-1 flex size-6 shrink-0 items-center justify-center rounded-sm text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <XIcon aria-hidden className="size-4" />
          </button>
        ) : (
          <Kbd aria-hidden className="shrink-0 max-sm:hidden">
            Esc
          </Kbd>
        )}
      </div>

      <div
        ref={scroller}
        className="max-h-[min(60vh,440px)] min-h-0 overflow-y-auto overscroll-contain"
      >
        {loading ? <Skeleton /> : null}

        {failed ? (
          <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
            <p className="text-sm text-muted-foreground">
              搜索索引加载失败，请检查网络后重试。
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                retryIndex()
                setError(false)
                setAttempt((value) => value + 1)
              }}
            >
              重试
            </Button>
          </div>
        ) : null}

        {empty ? (
          <div className="flex flex-col items-center gap-4 px-6 py-10 text-center">
            <SearchXIcon aria-hidden className="size-6 text-muted-foreground" />
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium">没有找到“{q}”的结果</p>
              <p className="text-[13px] text-muted-foreground">
                检查一下拼写，或者换个关键词试试。
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {searchShortcuts.slice(0, 3).map((item) => (
                <a
                  key={item.url}
                  href={item.url}
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                  )}
                  onClick={(event) => {
                    if (event.metaKey || event.ctrlKey || event.shiftKey) return
                    event.preventDefault()
                    onClose()
                    router.push(item.url)
                  }}
                >
                  {item.title}
                </a>
              ))}
            </div>
          </div>
        ) : null}

        <div
          id={listId}
          role="listbox"
          aria-label={q ? "搜索结果" : "快捷入口"}
          hidden={!showList}
          className="p-2 pb-3"
        >
          {sections.map((section, sectionIndex) => {
            const headingId = `${id}-${section.id}`
            return (
              <div key={section.id} role="group" aria-labelledby={headingId}>
                <div
                  className={`flex items-center justify-between px-3 pb-1.5 ${sectionIndex ? "pt-3" : "pt-1.5"}`}
                >
                  <div
                    id={headingId}
                    className="text-xs font-medium text-muted-foreground"
                  >
                    {section.label}
                  </div>
                  {section.action === "clear-recent" ? (
                    <button
                      type="button"
                      onClick={() => {
                        setRecent([])
                        writeRecent([])
                        inputRef.current?.focus()
                      }}
                      className="-my-0.5 rounded-sm px-1 text-xs text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      清除
                    </button>
                  ) : null}
                </div>
                {section.blocks.map((block) => {
                  const [head, ...rest] = block
                  if (!head) return null
                  return (
                    <Fragment key={head.key}>
                      <ResultRow
                        row={head}
                        id={optionId(head.index)}
                        selected={head.index === active}
                        onHover={onHover}
                        onOpen={onRowOpen}
                      />
                      {rest.length ? (
                        <div className="ml-[18px] border-l border-edge pl-1.5">
                          {rest.map((row) => (
                            <ResultRow
                              key={row.key}
                              row={row}
                              id={optionId(row.index)}
                              selected={row.index === active}
                              onHover={onHover}
                              onOpen={onRowOpen}
                            />
                          ))}
                        </div>
                      ) : null}
                    </Fragment>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      <div role="status" aria-live="polite" className="sr-only">
        {empty
          ? `没有找到“${q}”的结果`
          : summary
            ? `找到 ${summary.replace(" · ", "，")}`
            : ""}
      </div>

      <div
        className={`h-10 shrink-0 items-center justify-between gap-4 border-t border-edge px-4 text-xs text-muted-foreground ${summary ? "flex" : "flex max-sm:hidden"}`}
      >
        <div aria-hidden className="flex items-center gap-4 max-sm:hidden">
          <span className="flex items-center gap-1.5">
            <KbdGroup>
              <Kbd>↑</Kbd>
              <Kbd>↓</Kbd>
            </KbdGroup>
            选择
          </span>
          <span className="flex items-center gap-1.5">
            <Kbd>↵</Kbd>
            打开
          </span>
          <span className="flex items-center gap-1.5">
            <Kbd>Esc</Kbd>
            关闭
          </span>
        </div>
        <span aria-hidden className="ml-auto tabular-nums">
          {summary}
        </span>
      </div>
    </>
  )
}
