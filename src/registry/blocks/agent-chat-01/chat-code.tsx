"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  CodeBlock,
  CodeBlockActions,
  CodeBlockContent,
  CodeBlockCopyButton,
  CodeBlockFooter,
} from "@/components/ui/code-block"
import { cn } from "@/lib/utils"
import { useAgentContext } from "./agent-chat-context"

const CODE_MAX_HEIGHT = 220

/**
 * 输入 / 输出的代码块：超过 220px 截断，底部渐隐并给「展开全部」；复制的永远是全文。
 * 渐隐只用 `from-background`，随主题变化。
 */
function AgentChatCode({
  value,
  variant,
  target,
  copyLabel,
}: {
  value: string
  variant?: "default" | "destructive"
  target: string
  copyLabel: string
}) {
  const { labels } = useAgentContext()
  const [expanded, setExpanded] = useState(false)
  const [overflowing, setOverflowing] = useState(false)
  const content = useRef<HTMLPreElement>(null)
  useEffect(() => {
    const node = content.current
    if (!node) return
    // 收起时 scrollHeight 仍是全文高度，展开后等于自身高度，两种状态下比较的都是「全文有多高」
    const measure = () =>
      setOverflowing(node.scrollHeight > CODE_MAX_HEIGHT + 1)
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    if (node.firstElementChild) observer.observe(node.firstElementChild)
    return () => observer.disconnect()
  }, [value])
  const truncated = overflowing && !expanded
  return (
    <div
      data-slot="agent-chat-code"
      data-truncated={truncated || undefined}
      className="min-w-0"
    >
      <CodeBlock size="sm" variant={variant}>
        <CodeBlockActions>
          <CodeBlockCopyButton value={value} aria-label={copyLabel} />
        </CodeBlockActions>
        <CodeBlockContent
          ref={content}
          wrap
          className={cn(truncated && "max-h-[220px] overflow-hidden")}
        >
          {value}
        </CodeBlockContent>
        {truncated ? (
          <>
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-linear-to-t from-background to-transparent"
            />
            <div className="absolute inset-x-0 bottom-1.5 flex justify-center">
              <Button
                variant="secondary"
                size="sm"
                aria-expanded={false}
                aria-label={`${labels.codeExpand} ${target}`}
                onClick={() => setExpanded(true)}
              >
                {labels.codeExpand}
              </Button>
            </div>
          </>
        ) : null}
        {overflowing && expanded ? (
          <CodeBlockFooter className="justify-center pt-0">
            <Button
              variant="ghost"
              size="sm"
              aria-expanded
              aria-label={`${labels.codeCollapse} ${target}`}
              onClick={() => setExpanded(false)}
            >
              {labels.codeCollapse}
            </Button>
          </CodeBlockFooter>
        ) : null}
      </CodeBlock>
    </div>
  )
}

export { AgentChatCode }
