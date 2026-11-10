"use client"
import { Check, Copy } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

type CopyState = "idle" | "copied" | "failed"

/**
 * 图标复制按钮：成功后图标变对勾 2 秒，结果通过 sr-only 的 aria-live 播报。
 * value 可以是字符串，也可以是在点击时才求值的函数（例如复制整页 Markdown）；
 * 函数可以返回 Promise，用于点击时才去加载的内容（例如按需加载的源码）。
 */
export function CopyButton({
  value,
  label = "复制代码",
  className,
  variant = "ghost",
}: {
  value: string | (() => string | Promise<string>)
  label?: string
  className?: string
  variant?: "ghost" | "outline"
}) {
  const [state, setState] = useState<CopyState>("idle")
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])

  async function copy() {
    try {
      const text = typeof value === "function" ? value() : value
      if (typeof text === "string") await navigator.clipboard.writeText(text)
      // 文字要等请求：Safari 只接受在点击当时发起的写入，所以把 Promise 交给 ClipboardItem
      else if (typeof ClipboardItem !== "undefined")
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/plain": text.then(
              (value) => new Blob([value], { type: "text/plain" }),
            ),
          }),
        ])
      else await navigator.clipboard.writeText(await text)
      setState("copied")
    } catch {
      setState("failed")
    }
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setState("idle"), 2000)
  }

  const tip =
    state === "copied" ? "已复制" : state === "failed" ? "复制失败" : label
  return (
    <>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              type="button"
              variant={variant}
              size="icon-sm"
              aria-label={label}
              onClick={copy}
              className={cn(
                "text-muted-foreground hover:text-foreground",
                className,
              )}
            />
          }
        >
          {state === "copied" ? (
            <Check aria-hidden="true" />
          ) : (
            <Copy aria-hidden="true" />
          )}
        </TooltipTrigger>
        <TooltipContent>{tip}</TooltipContent>
      </Tooltip>
      <span role="status" aria-live="polite" className="sr-only">
        {state === "copied"
          ? "已复制"
          : state === "failed"
            ? "复制失败，请手动选择"
            : ""}
      </span>
    </>
  )
}
