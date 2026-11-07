"use client"

import {
  ArrowUpRight,
  Command,
  PanelRight,
  SquareMousePointer,
} from "lucide-react"
import { SegmentedControl } from "@/registry/ui/segmented-control/segmented-control"
import {
  AgentChatPanel,
  AgentChatProvider,
  AgentChatTrigger,
  AgentChatSuggestion,
  useAgentChat,
  type AgentChatMode,
} from "@/registry/blocks/agent-chat-01/agent-chat"
import { retryMockTool } from "@/registry/blocks/agent-chat-01/mock-transport"
import {
  initialMessages,
  scenarios,
} from "@/registry/blocks/agent-chat-01/demo-data"

import { DEFAULT_LABELS as labels } from "@/registry/blocks/agent-chat-01/config"

function AgentChatWorkspace() {
  const { mode, setMode, setOpen } = useAgentChat()
  return (
    <div
      data-slot="agent-chat-workspace"
      className="flex h-dvh min-h-0 flex-col overflow-hidden bg-background text-foreground"
    >
      <a href="#agent-workspace" className="sr-only focus:not-sr-only">
        {labels.skip}
      </a>
      <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-edge px-5">
        <span className="flex items-center gap-2 text-sm font-medium">
          <Command className="size-5" />
          {labels.workspace}
          <span className="hidden text-muted-foreground sm:inline">
            {labels.workspacePath}
          </span>
        </span>
        <AgentChatTrigger variant="button" />
      </header>
      <div className="flex min-h-0 flex-1">
        <main
          id="agent-workspace"
          className="min-w-0 flex-1 overflow-y-auto p-5 md:p-10"
        >
          <div className="mx-auto flex max-w-2xl flex-col gap-8 py-4 md:py-10">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="size-1.5 rounded-full bg-primary" />
              {labels.demoWorkspace}
            </div>
            <div>
              <p className="mb-3 text-xs tracking-widest text-muted-foreground">
                {labels.eyebrow}
              </p>
              <h1 className="text-3xl font-medium tracking-tight md:text-4xl">
                {labels.workspaceTitle}
              </h1>
              <p className="mt-4 max-w-md text-sm leading-7 text-muted-foreground">
                {labels.workspaceDescription}
              </p>
            </div>
            <div className="flex flex-col gap-3">
              {scenarios.map(({ icon: Icon, label, question, description }) => (
                <article
                  key={label}
                  className="flex items-start gap-3 rounded-xl border border-edge p-4"
                >
                  <Icon className="mt-1 size-5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <h2 className="text-sm font-medium">{label}</h2>
                    <p className="mt-1 text-xs leading-6 text-muted-foreground">
                      {description}
                    </p>
                    <AgentChatSuggestion
                      question={question}
                      className="mt-1 h-auto max-w-full justify-start p-0 text-left whitespace-normal"
                    >
                      {question}
                      <ArrowUpRight
                        data-icon="inline-end"
                        className="shrink-0"
                      />
                    </AgentChatSuggestion>
                  </div>
                </article>
              ))}
            </div>
            {/* 布局切换用方条：选中哪一项就是当前布局，不用再单独写一行「当前：…」 */}
            <SegmentedControl
              label={labels.switchLayout}
              size="sm"
              className="max-w-sm"
              options={[
                {
                  value: "embedded",
                  label: labels.embeddedLayout,
                  icon: <PanelRight />,
                },
                {
                  value: "floating",
                  label: labels.floatingLayout,
                  icon: <SquareMousePointer />,
                },
              ]}
              value={mode}
              onValueChange={(value) => {
                setMode(value as AgentChatMode)
                setOpen(true)
              }}
            />
            <p className="text-xs leading-6 text-muted-foreground">
              {labels.demoNote}
            </p>
          </div>
        </main>
        <AgentChatPanel />
      </div>
      <AgentChatTrigger />
    </div>
  )
}

export default function AgentPage() {
  return (
    <AgentChatProvider
      defaultMode="embedded"
      defaultOpen
      initialMessages={initialMessages}
      onRetryTool={retryMockTool}
    >
      <AgentChatWorkspace />
    </AgentChatProvider>
  )
}
