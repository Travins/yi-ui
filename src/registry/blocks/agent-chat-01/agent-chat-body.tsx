"use client"

import { useLayoutEffect, useRef, useState, type ComponentProps } from "react"
import {
  ArrowDown,
  ArrowUp,
  Bot,
  GripHorizontal,
  PanelRight,
  Plus,
  Square,
  X,
} from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { GlyphField } from "@/registry/ui/glyph-field/glyph-field"
import { TextReveal } from "@/registry/ui/text-animate/text-animate"
import { AgentChatMessage } from "./chat-message"
import { useAgentContext } from "./agent-chat-context"

function AgentChatBody({
  draggable = false,
  headerProps,
  onMoveKeyDown,
  onResetPosition,
}: {
  draggable?: boolean
  headerProps?: ComponentProps<"header">
  onMoveKeyDown?: ComponentProps<"button">["onKeyDown"]
  onResetPosition?: () => void
}) {
  const {
    labels,
    chat,
    title,
    mode,
    toggleMode,
    setOpen,
    draft,
    setDraft,
    suggestions,
    scroll,
    updateScroll,
    toolAnnouncement,
  } = useAgentContext()
  const viewport = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLTextAreaElement>(null)
  const [following, setFollowing] = useState(scroll.current.follow)
  const busy = chat.status === "streaming" || chat.status === "submitted"
  // 切换外壳或关闭再打开时恢复滚动；流式更新仅在用户位于底部时跟随。
  useLayoutEffect(() => {
    const node = viewport.current
    if (node)
      node.scrollTop = scroll.current.follow
        ? node.scrollHeight
        : scroll.current.top
  }, [mode, scroll])
  useLayoutEffect(() => {
    const node = viewport.current
    if (node && scroll.current.follow) node.scrollTop = node.scrollHeight
  }, [chat.messages, scroll])
  useLayoutEffect(() => {
    if (!input.current) return
    input.current.style.height = "auto"
    input.current.style.height = `${Math.min(input.current.scrollHeight, 160)}px`
  }, [draft])
  const send = (text: string) => {
    if (!text.trim() || busy) return
    updateScroll({ follow: true })
    setFollowing(true)
    setDraft("")
    void chat.sendMessage({ text: text.trim() })
  }
  return (
    <div
      data-slot="agent-chat-body"
      data-state={busy ? "streaming" : "idle"}
      className="contents"
    >
      <header
        data-slot="agent-chat-header"
        {...headerProps}
        className={cn(
          "flex shrink-0 items-center gap-2 border-b border-edge px-3 py-3",
          draggable &&
            "cursor-grab touch-none select-none data-[dragging]:cursor-grabbing",
        )}
      >
        {draggable ? (
          <Button
            data-slot="agent-chat-move-handle"
            variant="ghost"
            size="icon-sm"
            aria-label={labels.moveWindow}
            className="cursor-grab in-data-[dragging]:cursor-grabbing"
            onKeyDown={onMoveKeyDown}
            onClick={(event) => {
              if (event.detail === 0) onResetPosition?.()
            }}
          >
            <GripHorizontal aria-hidden="true" />
          </Button>
        ) : null}
        <Avatar className="size-8">
          <AvatarFallback>
            <Bot className="size-4" />
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-medium">{title}</h2>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span
              className={cn(
                "size-1.5 rounded-full",
                busy
                  ? "bg-primary motion-safe:animate-pulse"
                  : "bg-muted-foreground",
              )}
            />
            {busy ? labels.thinking : labels.idle}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={labels.newChat}
          disabled={busy}
          onClick={() => {
            chat.setMessages([])
            chat.clearError()
            setDraft("")
            updateScroll({ top: 0, follow: true })
          }}
        >
          <Plus />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={mode === "embedded" ? labels.floatMode : labels.embedMode}
          aria-pressed={mode === "embedded"}
          onClick={toggleMode}
        >
          <PanelRight />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={labels.closePanel}
          onClick={() => setOpen(false)}
        >
          <X />
        </Button>
      </header>
      <div
        ref={viewport}
        role="log"
        aria-label={labels.history}
        aria-live="polite"
        aria-relevant="additions"
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5"
        onScroll={(event) => {
          const node = event.currentTarget
          const follow =
            node.scrollHeight - node.scrollTop - node.clientHeight < 48
          updateScroll({ top: node.scrollTop, follow })
          setFollowing(follow)
        }}
      >
        {chat.messages.length ? (
          <div className="flex flex-col gap-7">
            {chat.messages.map((message, index) => (
              <AgentChatMessage
                key={message.id}
                message={message}
                live={busy && index === chat.messages.length - 1}
                busy={busy}
                regenerate={() => {
                  updateScroll({ follow: true })
                  void chat.regenerate({ messageId: message.id })
                }}
              />
            ))}
          </div>
        ) : (
          <div className="relative isolate flex h-full flex-col justify-center gap-5 py-6">
            {/* 空状态的背景：只铺在四周的字符矩阵，中间留白给文字 */}
            <GlyphField
              fade="center"
              tone="primary"
              density={0.45}
              fontSize={12}
              speed={0.02}
              className="absolute -inset-4 -z-10 min-h-0 bg-transparent opacity-20"
            />
            <Bot className="size-8 text-primary" />
            <div>
              <p className="text-lg font-medium tracking-tight">
                <TextReveal by="word" trigger="mount" stagger={60}>
                  {labels.welcome}
                </TextReveal>
              </p>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                {labels.welcomeDescription}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              {suggestions.map((question) => (
                <Button
                  key={question}
                  variant="outline"
                  className="h-auto justify-start bg-card py-3 text-left whitespace-normal hover:bg-muted dark:bg-card dark:hover:bg-muted"
                  onClick={() => send(question)}
                >
                  {question}
                  <ArrowUp
                    data-icon="inline-end"
                    className="ml-auto shrink-0"
                  />
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
      {!following && chat.messages.length > 0 ? (
        <Button
          variant="secondary"
          size="sm"
          className="mx-auto mb-2"
          onClick={() => {
            updateScroll({ follow: true })
            setFollowing(true)
            if (viewport.current)
              viewport.current.scrollTop = viewport.current.scrollHeight
          }}
        >
          <ArrowDown />
          {labels.latest}
        </Button>
      ) : null}
      {chat.error ? (
        <div role="alert" className="px-4 pb-2 text-sm text-destructive">
          {labels.error}
          <Button
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={() => {
              void chat.regenerate()
            }}
          >
            {labels.retry}
          </Button>
        </div>
      ) : null}
      <p className="sr-only" role="status" aria-live="polite">
        {busy
          ? labels.generating
          : chat.messages.length
            ? labels.updated
            : labels.ready}
      </p>
      {/* 整个消息列表共用一个播报区：工具开始、完成、失败时读出一句 */}
      <p
        data-slot="agent-chat-tool-status"
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
      >
        {toolAnnouncement}
      </p>
      <form
        className="flex shrink-0 flex-col gap-2 border-t border-edge p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
        onSubmit={(event) => {
          event.preventDefault()
          send(draft)
        }}
      >
        <Textarea
          name="message"
          autoComplete="off"
          ref={input}
          aria-label={labels.input}
          placeholder={labels.placeholder}
          value={draft}
          maxLength={4000}
          className="max-h-40 min-h-16 resize-none"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (
              event.key === "Enter" &&
              !event.shiftKey &&
              !event.nativeEvent.isComposing
            ) {
              event.preventDefault()
              send(draft)
            }
          }}
        />
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">{labels.newline}</p>
          {busy ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                void chat.stop()
              }}
            >
              <Square />
              {labels.stop}
            </Button>
          ) : (
            <Button
              type="submit"
              size="icon-sm"
              aria-label={labels.send}
              disabled={!draft.trim()}
            >
              <ArrowUp />
            </Button>
          )}
        </div>
      </form>
    </div>
  )
}

export { AgentChatBody }
