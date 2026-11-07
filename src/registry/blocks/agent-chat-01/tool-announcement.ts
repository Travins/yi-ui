"use client"

import { useState } from "react"
import { getToolName, isToolUIPart, type UIMessage } from "ai"
import type { AgentChatLabels } from "./config"

type ToolAnnouncementState = {
  seen: Record<string, "pending" | "done" | "failed" | "retrying">
  text: string
}

function toolStates(messages: UIMessage[], retrying: ReadonlySet<string>) {
  const states: ToolAnnouncementState["seen"] = {}
  const names: Record<string, string> = {}
  for (const message of messages)
    for (const part of message.parts) {
      if (!isToolUIPart(part)) continue
      const key = `${message.id}:${part.toolCallId}`
      names[key] = getToolName(part)
      states[key] = retrying.has(key)
        ? "retrying"
        : part.state === "output-available"
          ? "done"
          : part.state === "output-error" || part.state === "output-denied"
            ? "failed"
            : "pending"
    }
  return { states, names }
}

/**
 * 整个消息列表共用一句读屏播报：工具开始、完成、失败时更新文字，配合页面上唯一的 `aria-live="polite"` 区域。
 * 首次渲染时已有的历史调用不播报。直接在渲染期间根据上一次的记录更新（React 官方的「由 props 派生 state」写法）。
 */
function useToolAnnouncement(
  messages: UIMessage[],
  retrying: ReadonlySet<string>,
  labels: AgentChatLabels,
) {
  const [state, setState] = useState<ToolAnnouncementState>(() => ({
    seen: toolStates(messages, retrying).states,
    text: "",
  }))
  const { states, names } = toolStates(messages, retrying)
  const changed =
    Object.keys(states).length !== Object.keys(state.seen).length ||
    Object.keys(states).some((key) => states[key] !== state.seen[key])
  if (changed) {
    const sentences: string[] = []
    for (const [key, current] of Object.entries(states)) {
      const previous = state.seen[key]
      if (previous === current) continue
      const name = names[key] ?? ""
      if (current === "retrying")
        sentences.push(labels.toolRetrying.replace("{name}", name))
      else if (current === "pending")
        sentences.push(labels.toolStarted.replace("{name}", name))
      else if (current === "done")
        sentences.push(labels.toolDone.replace("{name}", name))
      else sentences.push(labels.toolFailed.replace("{name}", name))
    }
    setState({
      seen: states,
      text: sentences.length ? sentences.join("，") : state.text,
    })
  }
  return state.text
}

export { useToolAnnouncement }
