"use client"

import { AgentChatChanges, AgentChatChart } from "./chat-charts"
import {
  AgentChatToolGroup,
  AgentChatToolLine,
  buildTraceItems,
  failedKeys,
  useDisclosure,
  useToolViews,
} from "./chat-tools"
import { AgentChatMarkdown } from "./chat-markdown"
import { useAgentContext } from "./agent-chat-context"
import type { ChatChanges, ChatChart } from "./types"
import { useEffect, useState } from "react"
import { isToolUIPart, type UIMessage } from "ai"
import {
  Brain,
  Check,
  Copy,
  ExternalLink,
  LoaderCircle,
  RotateCcw,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react"
import { Bubble, BubbleContent } from "@/components/ui/bubble"
import { Button } from "@/components/ui/button"
import { Message, MessageContent, MessageFooter } from "@/components/ui/message"
import {
  Trace,
  TraceCollapsible,
  TraceCollapsibleContent,
  TraceCollapsibleTrigger,
  TraceIcon,
  TraceLine,
  TraceTitle,
} from "@/components/ui/trace"

type MessagePart = UIMessage["parts"][number]

/** 是否属于分析过程里的一行：分析摘要、工具调用、可打开的来源（图表块不算）。 */
function isTracePart(part: MessagePart) {
  if (part.type === "reasoning" || isToolUIPart(part)) return true
  return part.type === "source-url" && safeSource(part.url) !== undefined
}

function messageText(message: UIMessage) {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("")
}

function AgentChatReasoning({
  text,
  running,
  interrupted,
}: {
  text: string
  running: boolean
  interrupted: boolean
}) {
  const { labels } = useAgentContext()
  const [seconds, setSeconds] = useState(0)
  useEffect(() => {
    if (!running) return
    const started = Date.now()
    const timer = setInterval(
      () => setSeconds((Date.now() - started) / 1000),
      100,
    )
    return () => clearInterval(timer)
  }, [running])
  return (
    <TraceCollapsible data-slot="agent-chat-reasoning">
      <TraceCollapsibleTrigger>
        <TraceLine status={running ? "running" : undefined}>
          <TraceIcon>
            {running ? (
              <LoaderCircle className="animate-spin motion-reduce:animate-none" />
            ) : (
              <Brain />
            )}
          </TraceIcon>
          <TraceTitle>
            {running
              ? labels.thinking
              : interrupted
                ? labels.thinkingStopped
                : seconds === 0
                  ? labels.reasoningSummary
                  : labels.thought.replace(
                      "{seconds}",
                      new Intl.NumberFormat(undefined, {
                        maximumFractionDigits: 1,
                      }).format(seconds),
                    )}
          </TraceTitle>
        </TraceLine>
      </TraceCollapsibleTrigger>
      <TraceCollapsibleContent>
        <p className="text-sm leading-7">{text || labels.preparing}</p>
      </TraceCollapsibleContent>
    </TraceCollapsible>
  )
}
function safeSource(url: string) {
  try {
    const parsed = new URL(url)
    return ["https:", "http:"].includes(parsed.protocol)
      ? parsed.href
      : undefined
  } catch {
    return undefined
  }
}

/** 回答里的图表块：流式接口以 `data-chart` 数据块下发。 */
function messageCharts(message: UIMessage) {
  return message.parts.flatMap((part, index) =>
    part.type === "data-chart"
      ? [{ id: part.id ?? String(index), chart: part.data as ChatChart }]
      : [],
  )
}

/** 回答末尾的改动摘要块：流式接口以 `data-changes` 数据块下发。 */
function messageChanges(message: UIMessage) {
  return message.parts.flatMap((part, index) =>
    part.type === "data-changes"
      ? [{ id: part.id ?? String(index), data: part.data as ChatChanges }]
      : [],
  )
}

function AgentChatMessage({
  message,
  live,
  busy,
  regenerate,
}: {
  message: UIMessage
  live: boolean
  busy: boolean
  regenerate: () => void
}) {
  const { labels, toolGroupThreshold } = useAgentContext()
  const toolView = useToolViews(message, live)
  const disclosure = useDisclosure()
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null)
  const [notice, setNotice] = useState("")
  const items = buildTraceItems(message.parts, toolGroupThreshold, toolView)
  disclosure.openFailed(failedKeys(items))
  const text = messageText(message)
  const charts = messageCharts(message)
  const changes = messageChanges(message)
  if (message.role === "user")
    return (
      <Message data-slot="agent-chat-message" data-role="user" align="end">
        <MessageContent>
          <Bubble align="end" variant="muted">
            <BubbleContent>{text}</BubbleContent>
          </Bubble>
        </MessageContent>
      </Message>
    )
  return (
    <Message
      data-slot="agent-chat-message"
      data-role="assistant"
      data-state={live ? "streaming" : "idle"}
    >
      <MessageContent className="gap-4">
        {message.parts.some(isTracePart) ? (
          <Trace>
            {items.map((item) => {
              if (item.kind === "tools")
                return (
                  <AgentChatToolGroup
                    key={`group-${item.views[0]?.key}`}
                    views={item.views}
                    messageId={message.id}
                    busy={busy}
                    disclosure={disclosure}
                  />
                )
              if (item.kind === "tool")
                return (
                  <AgentChatToolLine
                    key={item.view.part.toolCallId}
                    view={item.view}
                    messageId={message.id}
                    busy={busy}
                    disclosure={disclosure}
                  />
                )
              const { part, index } = item
              if (part.type === "reasoning")
                return (
                  <AgentChatReasoning
                    key={index}
                    text={part.text}
                    running={live && part.state === "streaming"}
                    interrupted={!live && part.state === "streaming"}
                  />
                )
              if (part.type === "source-url") {
                const href = safeSource(part.url)
                return href ? (
                  <a
                    key={part.sourceId}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <TraceLine>
                      <TraceIcon>
                        <ExternalLink />
                      </TraceIcon>
                      <TraceTitle>
                        {part.title ?? new URL(href).hostname}
                        <span className="sr-only">{labels.newTab}</span>
                      </TraceTitle>
                    </TraceLine>
                  </a>
                ) : null
              }
              return null
            })}
          </Trace>
        ) : null}
        {charts.map(({ id, chart }) => (
          <AgentChatChart key={id} chart={chart} />
        ))}
        {text ? (
          <Bubble variant="ghost">
            <BubbleContent>
              <AgentChatMarkdown text={text} />
            </BubbleContent>
          </Bubble>
        ) : null}
        {changes.map(({ id, data }) => (
          <AgentChatChanges key={id} data={data} />
        ))}
        {!live ? (
          <MessageFooter className="flex-wrap gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={labels.copy}
              disabled={!text}
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(text)
                  setNotice(labels.copied)
                } catch {
                  setNotice(labels.copyFailed)
                }
              }}
            >
              {notice === labels.copied ? <Check /> : <Copy />}
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={labels.useful}
              aria-pressed={feedback === "up"}
              onClick={() => {
                setFeedback(feedback === "up" ? null : "up")
                setNotice(labels.feedback)
              }}
            >
              <ThumbsUp />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={labels.notUseful}
              aria-pressed={feedback === "down"}
              onClick={() => {
                setFeedback(feedback === "down" ? null : "down")
                setNotice(labels.feedback)
              }}
            >
              <ThumbsDown />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={labels.regenerate}
              disabled={busy}
              onClick={regenerate}
            >
              <RotateCcw />
            </Button>
            <span role="status" className="text-xs">
              {notice}
            </span>
          </MessageFooter>
        ) : null}
      </MessageContent>
    </Message>
  )
}

export { AgentChatMessage, messageText }
