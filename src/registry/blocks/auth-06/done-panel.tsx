"use client"

import type * as React from "react"
import { Check, Minus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Auth06Labels } from "./config"

function DoneItem({
  done,
  children,
  meta,
}: {
  done: boolean
  children: React.ReactNode
  meta?: React.ReactNode
}) {
  return (
    <li
      data-slot="auth-06-done-item"
      data-state={done ? "done" : "pending"}
      className="flex items-center gap-3 px-3 py-2.5 text-sm"
    >
      <span
        aria-hidden="true"
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded-full [&_svg]:size-3",
          done
            ? "bg-primary text-primary-foreground"
            : "border border-edge text-muted-foreground",
        )}
      >
        {done ? <Check strokeWidth={3} /> : <Minus />}
      </span>
      <span className="min-w-0 flex-1">{children}</span>
      {meta && (
        <span
          className={cn(
            "shrink-0 text-xs",
            done ? "text-muted-foreground" : "text-foreground",
          )}
        >
          {meta}
        </span>
      )}
    </li>
  )
}

/** 结果页：列出这次注册完成了什么，实名跳过时那一条标为待完成。 */
function Auth06DonePanel({
  labels,
  identity,
  onEnter,
}: {
  labels: Auth06Labels
  /** `off` 时不列实名这一条 */
  identity: "submitted" | "pending" | "off"
  onEnter: () => void
}) {
  return (
    <div data-slot="auth-06-done" className="space-y-6">
      <ul className="divide-y divide-dashed divide-edge rounded-lg border border-edge">
        <DoneItem done>{labels.doneAccount}</DoneItem>
        <DoneItem done>{labels.doneProfile}</DoneItem>
        {identity !== "off" && (
          <DoneItem
            done={identity === "submitted"}
            meta={
              identity === "submitted"
                ? labels.identitySubmitted
                : labels.identityPending
            }
          >
            {labels.doneIdentity}
          </DoneItem>
        )}
      </ul>
      <Button
        type="button"
        size="lg"
        className="w-full sm:w-auto"
        onClick={onEnter}
      >
        {labels.enter}
      </Button>
    </div>
  )
}

export { Auth06DonePanel }
