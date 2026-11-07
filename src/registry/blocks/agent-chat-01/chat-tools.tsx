"use client"

import { useEffect, useState, useSyncExternalStore } from "react"
import { getToolName, isToolUIPart, type UIMessage } from "ai"
import { Check, LoaderCircle, RotateCcw, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Trace,
  TraceCollapsible,
  TraceCollapsibleContent,
  TraceCollapsibleTrigger,
  TraceIcon,
  TraceLine,
  TraceTitle,
} from "@/components/ui/trace"
import { useAgentContext } from "./agent-chat-context"
import { AgentChatCode } from "./chat-code"
import type { AgentChatLabels } from "./config"
import { formatDuration, timingFromMetadata, type ToolPart } from "./tool-clock"

type ToolStatus = "running" | "done" | "failed" | "stopped"

type ToolView = {
  part: ToolPart
  /** 消息 id + toolCallId：不同消息里的 toolCallId 可能重复 */
  key: string
  status: ToolStatus
  retrying: boolean
  /** 耗时（毫秒）；拿不到就是 undefined，不编造 */
  ms?: number
  start?: number
}

/** 工具输出超过这个高度就截断，按钮展开全部。 */
function toolStatus(part: ToolPart, live: boolean, retrying: boolean) {
  if (retrying) return "running"
  if (part.state === "output-available") return "done"
  if (part.state === "output-error" || part.state === "output-denied")
    return "failed"
  return live ? "running" : "stopped"
}

/** 每秒一次的「现在」，只在有工具运行时才计时；同一条消息里的多个工具共用这一个。 */
function useSecondTick(active: boolean) {
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    if (!active) return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [active])
  return now
}

/**
 * 一条消息里所有工具的状态与耗时。
 * 耗时优先读 part 上的 `callProviderMetadata.timing`，没有就用 Provider 里的计时器（客户端挂载后才开始记）。
 */
function useToolViews(message: UIMessage, live: boolean) {
  const { toolClock, retrying } = useAgentContext()
  const timings = useSyncExternalStore(
    toolClock.subscribe,
    toolClock.getSnapshot,
    toolClock.getServerSnapshot,
  )
  useEffect(() => {
    for (const part of message.parts) {
      if (!isToolUIPart(part)) continue
      const key = `${message.id}:${part.toolCallId}`
      const finished =
        (part.state === "output-available" ||
          part.state === "output-error" ||
          part.state === "output-denied") &&
        !retrying.has(key)
      toolClock.observe(key, finished)
    }
  }, [message, retrying, toolClock])
  const tools = message.parts.filter(isToolUIPart)
  const anyRunning = tools.some(
    (part) =>
      toolStatus(
        part,
        live,
        retrying.has(`${message.id}:${part.toolCallId}`),
      ) === "running",
  )
  const now = useSecondTick(anyRunning)
  const view = (part: ToolPart): ToolView => {
    const key = `${message.id}:${part.toolCallId}`
    const isRetrying = retrying.has(key)
    const status = toolStatus(part, live, isRetrying)
    const meta = isRetrying ? undefined : timingFromMetadata(part)
    const timing = timings.get(key)
    const start = meta?.start ?? timing?.start
    let ms = meta?.ms
    if (ms === undefined && timing) {
      if (timing.end !== undefined) ms = timing.end - timing.start
      else if (status === "running")
        ms = Math.max(0, (now ?? timing.start) - timing.start)
    }
    return { part, key, status, retrying: isRetrying, ms, start }
  }
  return view
}

/**
 * 展开 / 收起的记录。默认收起；失败的行由 `openFailed` 自动展开，并且之后保持展开（重试成功后能直接看到结果）；
 * 用户手动操作过的行以用户为准，不会再被自动展开。
 */
function useDisclosure() {
  const [toggled, setToggled] = useState<Record<string, boolean>>({})
  return {
    isOpen: (key: string) => toggled[key] ?? false,
    onOpenChange: (key: string) => (open: boolean) =>
      setToggled((value) => ({ ...value, [key]: open })),
    /** 在渲染期间调用（React 允许组件在渲染时更新自己的 state）：没操作过的失败行记为展开 */
    openFailed(keys: string[]) {
      const pending = keys.filter((key) => toggled[key] === undefined)
      if (pending.length)
        setToggled((value) => ({
          ...value,
          ...Object.fromEntries(
            pending
              .filter((key) => value[key] === undefined)
              .map((key) => [key, true]),
          ),
        }))
    },
  }
}

type Disclosure = ReturnType<typeof useDisclosure>

type TraceItem =
  | { kind: "part"; part: UIMessage["parts"][number]; index: number }
  | { kind: "tool"; view: ToolView; index: number }
  | { kind: "tools"; views: ToolView[]; index: number }

/** 连续的工具调用达到阈值就合成一组；中间隔着分析摘要、来源的不算连续。 */
function buildTraceItems(
  parts: UIMessage["parts"],
  threshold: number,
  toolView: (part: ToolPart) => ToolView,
) {
  const items: TraceItem[] = []
  let run: { view: ToolView; index: number }[] = []
  const flush = () => {
    if (run.length >= Math.max(2, threshold))
      items.push({
        kind: "tools",
        views: run.map((item) => item.view),
        index: run[0]?.index ?? 0,
      })
    else
      for (const item of run)
        items.push({ kind: "tool", view: item.view, index: item.index })
    run = []
  }
  parts.forEach((part, index) => {
    if (isToolUIPart(part)) run.push({ view: toolView(part), index })
    else {
      flush()
      items.push({ kind: "part", part, index })
    }
  })
  flush()
  return items
}

/** 需要自动展开的行：失败的工具，以及含失败工具的折叠行。 */
function failedKeys(items: TraceItem[]) {
  return items.flatMap((item) => {
    if (item.kind === "tool")
      return item.view.status === "failed" ? [item.view.key] : []
    if (item.kind === "tools") {
      const failed = item.views.filter((view) => view.status === "failed")
      return failed.length
        ? [`group:${item.views[0]?.key}`, ...failed.map((view) => view.key)]
        : []
    }
    return []
  })
}

function ToolStatusIcon({ status }: { status: ToolStatus }) {
  return (
    <TraceIcon>
      {status === "running" ? (
        <LoaderCircle className="animate-spin motion-reduce:animate-none" />
      ) : status === "done" ? (
        <Check />
      ) : (
        <X />
      )}
    </TraceIcon>
  )
}

function statusText(
  view: Pick<ToolView, "status" | "retrying">,
  labels: AgentChatLabels,
) {
  if (view.retrying) return labels.retrying
  if (view.status === "running") return labels.running
  if (view.status === "done") return labels.completed
  if (view.status === "failed") return labels.failed
  return labels.stopped
}

/** 一个工具一行：「已完成 · search_web · 1.2 秒」，展开后是输入、输出和失败时的重试。 */
function AgentChatToolLine({
  view,
  messageId,
  busy,
  disclosure,
}: {
  view: ToolView
  messageId: string
  busy: boolean
  disclosure: Disclosure
}) {
  const { labels, retryTool } = useAgentContext()
  const { part, key, status, retrying, ms } = view
  const name = getToolName(part)
  const failed = status === "failed"
  const title = [
    statusText(view, labels),
    name,
    ms === undefined
      ? undefined
      : formatDuration(ms, status === "running", labels),
  ]
    .filter(Boolean)
    .join(" · ")
  const output =
    retrying || status === "running"
      ? labels.waiting
      : part.state === "output-error"
        ? part.errorText
        : part.state === "output-available"
          ? JSON.stringify(part.output, null, 2)
          : part.state === "output-denied"
            ? labels.denied
            : labels.incomplete
  return (
    <TraceCollapsible
      data-slot="agent-chat-tool"
      data-status={status}
      open={disclosure.isOpen(key)}
      onOpenChange={disclosure.onOpenChange(key)}
    >
      <TraceCollapsibleTrigger>
        <TraceLine
          status={
            status === "running" ? "running" : failed ? "error" : undefined
          }
        >
          <ToolStatusIcon status={status} />
          <TraceTitle className="tabular-nums">{title}</TraceTitle>
        </TraceLine>
      </TraceCollapsibleTrigger>
      <TraceCollapsibleContent>
        <div className="flex flex-col gap-2">
          <p className="text-xs">{labels.toolInput}</p>
          <AgentChatCode
            value={JSON.stringify(part.input ?? {}, null, 2)}
            target={labels.toolInput}
            copyLabel={labels.copyInput}
          />
          <p className="text-xs">{labels.toolOutput}</p>
          <AgentChatCode
            value={output ?? ""}
            variant={failed ? "destructive" : "default"}
            target={labels.toolOutput}
            copyLabel={labels.copyOutput}
          />
          {failed && retryTool ? (
            <Button
              variant="outline"
              size="sm"
              className="self-start"
              disabled={busy}
              aria-label={labels.retryTool.replace("{name}", name)}
              onClick={() =>
                void retryTool({
                  messageId,
                  toolCallId: part.toolCallId,
                  toolName: name,
                  input: part.input,
                })
              }
            >
              <RotateCcw />
              {labels.retry}
            </Button>
          ) : null}
        </div>
      </TraceCollapsibleContent>
    </TraceCollapsible>
  )
}

/**
 * 连续多个工具合成的一行：「调用了 4 个工具 · 3.1 秒」，点开是逐个工具的明细。
 * 有工具在运行时显示进度，有工具失败时用 error 状态并自动展开（手动收起后不再自动展开）。
 */
function AgentChatToolGroup({
  views,
  messageId,
  busy,
  disclosure,
}: {
  views: ToolView[]
  messageId: string
  busy: boolean
  disclosure: Disclosure
}) {
  const { labels } = useAgentContext()
  const key = `group:${views[0]?.key}`
  const running = views.findIndex((view) => view.status === "running")
  const failed = views.filter((view) => view.status === "failed").length
  const status: ToolStatus =
    running >= 0
      ? "running"
      : failed > 0
        ? "failed"
        : views.some((view) => view.status === "stopped")
          ? "stopped"
          : "done"
  // 总耗时：都有起止时间就取首尾跨度（工具并行时不会重复计），只有时长就相加；有一个拿不到就不显示
  let ms: number | undefined
  if (views.every((view) => view.ms !== undefined)) {
    const starts = views.map((view) => view.start)
    ms =
      status !== "running" && starts.every((value) => value !== undefined)
        ? Math.max(...views.map((view) => (view.start ?? 0) + (view.ms ?? 0))) -
          Math.min(...(starts as number[]))
        : views.reduce((sum, view) => sum + (view.ms ?? 0), 0)
  }
  const head =
    running >= 0
      ? labels.toolGroupRunning
          .replace("{current}", String(running + 1))
          .replace("{total}", String(views.length))
      : labels.toolGroup.replace("{count}", String(views.length))
  const title = [
    head,
    running < 0 && failed > 0
      ? labels.toolGroupFailed.replace("{failed}", String(failed))
      : running < 0 && status === "stopped"
        ? labels.stopped
        : undefined,
    ms === undefined ? undefined : formatDuration(ms, running >= 0, labels),
  ]
    .filter(Boolean)
    .join(" · ")
  return (
    <TraceCollapsible
      data-slot="agent-chat-tool-group"
      data-status={status}
      open={disclosure.isOpen(key)}
      onOpenChange={disclosure.onOpenChange(key)}
    >
      <TraceCollapsibleTrigger>
        <TraceLine
          status={
            status === "running"
              ? "running"
              : status === "failed"
                ? "error"
                : undefined
          }
        >
          <ToolStatusIcon status={status} />
          <TraceTitle className="tabular-nums">{title}</TraceTitle>
        </TraceLine>
      </TraceCollapsibleTrigger>
      <TraceCollapsibleContent>
        <Trace>
          {views.map((view) => (
            <AgentChatToolLine
              key={view.part.toolCallId}
              view={view}
              messageId={messageId}
              busy={busy}
              disclosure={disclosure}
            />
          ))}
        </Trace>
      </TraceCollapsibleContent>
    </TraceCollapsible>
  )
}

export {
  AgentChatToolGroup,
  AgentChatToolLine,
  buildTraceItems,
  failedKeys,
  useDisclosure,
  useToolViews,
}
