import type { ChatTransport, UIMessage, UIMessageChunk } from "ai"
import { scripts, fallback } from "./scripts"
import type { ToolRetryEvent, ToolRetryResult } from "./types"

function createMockTransport(): ChatTransport<UIMessage> {
  return {
    async sendMessages({ messages, abortSignal }) {
      const question =
        [...messages]
          .reverse()
          .find((message) => message.role === "user")
          ?.parts.filter((part) => part.type === "text")
          .map((part) => part.text)
          .join("") ?? ""
      const script =
        scripts.find((item) => item.match.test(question)) ?? fallback
      const queue: { chunk: UIMessageChunk; delay: number }[] = []
      const push = (chunk: UIMessageChunk, delay = 80) =>
        queue.push({ chunk, delay })
      const messageId = crypto.randomUUID()
      push({ type: "start", messageId }, 0)
      push({ type: "start-step" }, 0)
      push({ type: "reasoning-start", id: "reasoning" })
      for (const delta of script.reasoning.match(/.{1,8}/gu) ?? [])
        push({ type: "reasoning-delta", id: "reasoning", delta }, 130)
      push({ type: "reasoning-end", id: "reasoning" })
      for (const [index, tool] of script.tools.entries()) {
        // 每条消息里的 toolCallId 都不同，重试和计时才能准确对应到具体的一次调用
        const toolCallId = `${messageId}-tool-${index}`
        push({
          type: "tool-input-available",
          toolCallId,
          toolName: tool.name,
          input: tool.input,
          dynamic: true,
        })
        push(
          tool.error
            ? {
                type: "tool-output-error",
                toolCallId,
                errorText: tool.error,
                dynamic: true,
              }
            : {
                type: "tool-output-available",
                toolCallId,
                output: tool.output,
                dynamic: true,
              },
          tool.duration ?? 800,
        )
      }
      if (script.chart) push({ type: "data-chart", data: script.chart }, 400)
      push({ type: "source-url", sourceId: "reference", ...script.source })
      push({ type: "text-start", id: "answer" })
      for (const delta of script.answer.match(/.{1,6}|\n/gu) ?? [])
        push({ type: "text-delta", id: "answer", delta }, 35)
      push({ type: "text-end", id: "answer" })
      if (script.changes)
        push({ type: "data-changes", data: script.changes }, 300)
      push({ type: "finish-step" }, 0)
      push({ type: "finish", finishReason: "stop" }, 0)
      let timer: ReturnType<typeof setTimeout> | undefined
      let finish: (() => void) | undefined
      let ended = false
      const cleanup = () => {
        ended = true
        clearTimeout(timer)
        finish?.()
        abortSignal?.removeEventListener("abort", abort)
      }
      let controller: ReadableStreamDefaultController<UIMessageChunk>
      const abort = () => {
        if (ended) return
        cleanup()
        controller.error(new DOMException("生成已停止", "AbortError"))
      }
      return new ReadableStream<UIMessageChunk>({
        start(value) {
          controller = value
          abortSignal?.addEventListener("abort", abort, { once: true })
          if (abortSignal?.aborted) abort()
        },
        async pull(value) {
          if (ended) return
          const next = queue.shift()
          if (!next) {
            cleanup()
            value.close()
            return
          }
          await new Promise<void>((resolve) => {
            finish = resolve
            timer = setTimeout(resolve, next.delay)
          })
          if (!ended) value.enqueue(next.chunk)
        },
        cancel() {
          cleanup()
        },
      })
    },
    async reconnectToStream() {
      return null
    },
  }
}

/**
 * 演示用的重试：模拟再调用一次。剧本里写了 `retryOutput` 的工具这次成功，其余的仍然失败，
 * 这样既能看到「重试成功」，也能看到「重试后仍失败」。
 */
async function retryMockTool({
  toolName,
}: ToolRetryEvent): Promise<ToolRetryResult> {
  await new Promise((resolve) => setTimeout(resolve, 1400))
  const output = [...scripts, fallback]
    .flatMap((script) => script.tools)
    .find((tool) => tool.name === toolName)?.retryOutput
  if (output === undefined) throw new Error("重试后仍然失败（模拟失败）")
  return { output }
}

export { createMockTransport, retryMockTool }
