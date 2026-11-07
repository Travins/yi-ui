"use client"

import {
  createContext,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { useChat } from "@ai-sdk/react"
import { isToolUIPart, type ChatTransport, type UIMessage } from "ai"
import { useControllableState } from "@/registry/hooks/use-controllable-state"
import {
  DEFAULT_LABELS,
  DEFAULT_TOOL_GROUP_THRESHOLD,
  agentSuggestions,
  type AgentChatLabels,
} from "./config"
import type { AgentChatMode, ToolRetryEvent, ToolRetryResult } from "./types"
import { createMockTransport } from "./mock-transport"
import { useToolAnnouncement } from "./tool-announcement"
import { createToolClock, type ToolClock } from "./tool-clock"

type ChatState = ReturnType<typeof useChat<UIMessage>>
type AgentContextValue = {
  mode: AgentChatMode
  setMode: (mode: AgentChatMode) => void
  toggleMode: () => void
  open: boolean
  setOpen: (open: boolean) => void
  chat: ChatState
  title: string
  labels: AgentChatLabels
  suggestions: string[]
  draft: string
  setDraft: (draft: string) => void
  scroll: { current: { top: number; follow: boolean } }
  updateScroll: (value: Partial<{ top: number; follow: boolean }>) => void
  /** 连续多少个工具调用折叠成一行 */
  toolGroupThreshold: number
  /** 只有传了 `onRetryTool` 才有；失败的工具调用据此显示「重试」按钮 */
  retryTool?: (event: ToolRetryEvent) => Promise<void>
  /** 正在重试的调用（messageId:toolCallId） */
  retrying: ReadonlySet<string>
  toolClock: ToolClock
  /** 工具开始、完成、失败的读屏播报文字，由面板里唯一的 aria-live 区域读出 */
  toolAnnouncement: string
}
const AgentContext = createContext<AgentContextValue | null>(null)
function useAgentContext() {
  const context = useContext(AgentContext)
  if (!context) throw new Error("请在 AgentChatProvider 内使用助手组件")
  return context
}
function useAgentChat() {
  const { mode, setMode, toggleMode, open, setOpen } = useAgentContext()
  return { mode, setMode, toggleMode, open, setOpen }
}
function AgentChatProvider({
  children,
  mode: controlledMode,
  onModeChange,
  defaultMode = "floating",
  open: controlledOpen,
  onOpenChange,
  defaultOpen = false,
  transport,
  suggestions = agentSuggestions,
  title,
  labels: labelOverrides,
  initialMessages,
  onRetryTool,
  toolGroupThreshold = DEFAULT_TOOL_GROUP_THRESHOLD,
}: {
  children: ReactNode
  mode?: AgentChatMode
  onModeChange?: (mode: AgentChatMode) => void
  defaultMode?: AgentChatMode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  labels?: Partial<AgentChatLabels>
  defaultOpen?: boolean
  transport?: ChatTransport<UIMessage>
  suggestions?: string[]
  title?: string
  initialMessages?: UIMessage[]
  /**
   * 用户点失败工具上的「重试」时调用；不传则不显示重试按钮。
   * 返回 `{ output }` 会把这次调用改成已完成，抛出 Error 会显示错误文字，返回 undefined 则由你自己更新消息。
   */
  onRetryTool?: (event: ToolRetryEvent) => Promise<ToolRetryResult>
  /**
   * 同一条消息里连续调用多少个工具后折叠成一行，小于 2 按 2 处理；传 `Infinity` 不折叠
   * @default 3
   */
  toolGroupThreshold?: number
}) {
  const [mode, setMode] = useControllableState({
    prop: controlledMode,
    defaultProp: defaultMode,
    onChange: onModeChange,
  })
  const [open, setOpen] = useControllableState({
    prop: controlledOpen,
    defaultProp: defaultOpen,
    onChange: onOpenChange,
  })
  const labels = { ...DEFAULT_LABELS, ...labelOverrides }
  const [draft, setDraft] = useState("")
  const [mock] = useState(createMockTransport)
  const scroll = useRef({ top: 0, follow: true })
  const updateScroll = (value: Partial<{ top: number; follow: boolean }>) => {
    scroll.current = { ...scroll.current, ...value }
  }
  const chat = useChat<UIMessage>({
    transport: transport ?? mock,
    messages: initialMessages,
  })
  const [toolClock] = useState(createToolClock)
  const [retrying, setRetrying] = useState<ReadonlySet<string>>(new Set())
  const toolAnnouncement = useToolAnnouncement(chat.messages, retrying, labels)
  const retryTool = onRetryTool
    ? async (event: ToolRetryEvent) => {
        const key = `${event.messageId}:${event.toolCallId}`
        const update = (patch: Record<string, unknown>) =>
          chat.setMessages((messages) =>
            messages.map((message) =>
              message.id !== event.messageId
                ? message
                : {
                    ...message,
                    parts: message.parts.map((part) =>
                      isToolUIPart(part) && part.toolCallId === event.toolCallId
                        ? ({ ...part, ...patch } as typeof part)
                        : part,
                    ),
                  },
            ),
          )
        toolClock.restart(key)
        setRetrying((value) => new Set(value).add(key))
        try {
          const result = await onRetryTool(event)
          if (result)
            update({
              state: "output-available",
              output: result.output,
              errorText: undefined,
            })
        } catch (error) {
          update({
            state: "output-error",
            errorText: error instanceof Error ? error.message : labels.failed,
          })
        } finally {
          setRetrying((value) => {
            const next = new Set(value)
            next.delete(key)
            return next
          })
        }
      }
    : undefined
  return (
    <AgentContext.Provider
      value={{
        mode,
        setMode,
        toggleMode: () =>
          setMode((value) => (value === "embedded" ? "floating" : "embedded")),
        open,
        setOpen,
        chat,
        title: title ?? labels.title,
        labels,
        suggestions,
        draft,
        setDraft,
        scroll,
        updateScroll,
        toolGroupThreshold,
        retryTool,
        retrying,
        toolClock,
        toolAnnouncement,
      }}
    >
      {children}
    </AgentContext.Provider>
  )
}

export { AgentChatProvider, useAgentChat, useAgentContext }
