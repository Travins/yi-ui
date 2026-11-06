"use client"
import * as React from "react"
import { ChevronRightIcon, FolderIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Sidebar03Labels } from "./config"
import type { Sidebar03TreeNode } from "./types"

function findPath(
  nodes: Sidebar03TreeNode[],
  id?: string,
): Sidebar03TreeNode[] {
  for (const node of nodes) {
    if (node.id === id) return [node]
    const path = findPath(node.children ?? [], id)
    if (path.length) return [node, ...path]
  }
  return []
}
function filterTree(
  nodes: Sidebar03TreeNode[],
  query: string,
): Sidebar03TreeNode[] {
  if (!query) return nodes
  return nodes.flatMap((node) => {
    const children = filterTree(node.children ?? [], query)
    return node.label.toLocaleLowerCase().includes(query) || children.length
      ? [{ ...node, children }]
      : []
  })
}
type TreeProps = {
  nodes: Sidebar03TreeNode[]
  expanded: string[]
  onExpandedChange: (ids: string[]) => void
  activeId?: string
  query: string
  labels: Sidebar03Labels
  renderLink: (
    node: Sidebar03TreeNode,
    content: React.ReactNode,
  ) => React.ReactNode
}
function Sidebar03Tree({
  nodes,
  expanded,
  onExpandedChange,
  activeId,
  query,
  labels,
  renderLink,
}: TreeProps) {
  const root = React.useRef<HTMLUListElement>(null)
  const [focused, setFocused] = React.useState(activeId)
  const filtered = filterTree(nodes, query.trim().toLocaleLowerCase())
  const visible: { node: Sidebar03TreeNode; parent?: string }[] = []
  function collect(items: Sidebar03TreeNode[], parent?: string) {
    items.forEach((node) => {
      visible.push({ node, parent })
      if (query || expanded.includes(node.id))
        collect(node.children ?? [], node.id)
    })
  }
  collect(filtered)
  const focusId = visible.some(({ node }) => node.id === focused)
    ? focused
    : visible[0]?.node.id
  function focus(id?: string) {
    if (!id) return
    setFocused(id)
    const target = Array.from(
      root.current?.querySelectorAll<HTMLElement>('[role="treeitem"]') ?? [],
    ).find((el) => el.dataset.nodeId === id)
    target?.focus()
  }
  function toggle(id: string) {
    onExpandedChange(
      expanded.includes(id)
        ? expanded.filter((value) => value !== id)
        : [...expanded, id],
    )
  }
  function keydown(event: React.KeyboardEvent, node: Sidebar03TreeNode) {
    if (event.target !== event.currentTarget) return
    const index = visible.findIndex((item) => item.node.id === node.id)
    const open = Boolean(query) || expanded.includes(node.id)
    switch (event.key) {
      case "ArrowDown":
        focus(visible[Math.min(index + 1, visible.length - 1)]?.node.id)
        break
      case "ArrowUp":
        focus(visible[Math.max(0, index - 1)]?.node.id)
        break
      case "Home":
        focus(visible[0]?.node.id)
        break
      case "End":
        focus(visible.at(-1)?.node.id)
        break
      case "ArrowRight":
        if (node.children?.length) {
          if (!open) toggle(node.id)
          else focus(node.children[0]?.id)
        }
        break
      case "ArrowLeft":
        if (node.children?.length && open && !query) toggle(node.id)
        else focus(visible[index]?.parent)
        break
      case "Enter":
        if (node.href)
          event.currentTarget.querySelector<HTMLAnchorElement>("a")?.click()
        else if (node.children?.length) toggle(node.id)
        break
      default:
        return
    }
    event.preventDefault()
    event.stopPropagation()
  }
  function renderNodes(
    items: Sidebar03TreeNode[],
    level: number,
  ): React.ReactNode {
    return items.map((node, index) => {
      const branch = Boolean(node.children?.length)
      const open = Boolean(query) || expanded.includes(node.id)
      const Icon = node.icon ?? FolderIcon
      const content = (
        <>
          <Icon aria-hidden className="size-4 shrink-0" />
          <span className="truncate">{node.label}</span>
          {node.status && (
            <>
              <span
                aria-hidden
                className={cn(
                  "ml-auto size-1.5 shrink-0 rounded-full",
                  node.status === "active"
                    ? "bg-chart-2"
                    : node.status === "paused"
                      ? "bg-chart-4"
                      : "bg-sidebar-foreground/40",
                )}
              />
              <span className="sr-only">{labels[node.status]}</span>
            </>
          )}
          {node.badge !== undefined && (
            <span className="ml-auto text-xs text-sidebar-foreground/60 tabular-nums">
              {node.badge}
            </span>
          )}
        </>
      )
      return (
        <li
          key={node.id}
          data-node-id={node.id}
          role="treeitem"
          aria-selected={node.id === activeId}
          aria-label={node.label}
          aria-level={level}
          aria-posinset={index + 1}
          aria-setsize={items.length}
          aria-expanded={branch ? open : undefined}
          aria-current={node.id === activeId ? "page" : undefined}
          tabIndex={focusId === node.id ? 0 : -1}
          onFocus={(event) => {
            if (event.target === event.currentTarget) setFocused(node.id)
          }}
          onKeyDown={(event) => keydown(event, node)}
          className="rounded-md outline-hidden [&:focus-visible>div]:ring-2 [&:focus-visible>div]:ring-sidebar-ring [&:focus-visible>div]:ring-inset"
        >
          <div
            onMouseDown={(event) => {
              event.preventDefault()
              setFocused(node.id)
              event.currentTarget.parentElement?.focus({ preventScroll: true })
            }}
            className={cn(
              "flex h-8 items-center rounded-md text-sm hover:bg-sidebar-accent pointer-coarse:h-10",
              node.id === activeId &&
                "bg-sidebar-accent font-medium text-sidebar-accent-foreground",
            )}
          >
            {branch ? (
              <span
                aria-hidden
                onClick={() => toggle(node.id)}
                className="flex size-6 shrink-0 cursor-pointer items-center justify-center"
              >
                <ChevronRightIcon
                  className={cn("size-3", open && "rotate-90")}
                />
              </span>
            ) : (
              <span className="w-6 shrink-0" />
            )}
            {node.href ? (
              renderLink(node, content)
            ) : (
              <span
                onClick={() => branch && toggle(node.id)}
                className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 pr-2"
              >
                {content}
              </span>
            )}
          </div>
          {branch && open && (
            <ul
              role="group"
              className="ml-3 border-l border-sidebar-border pl-2"
            >
              {renderNodes(node.children!, level + 1)}
            </ul>
          )}
        </li>
      )
    })
  }
  return (
    <div data-slot="sidebar-03-tree" className="p-2">
      {visible.length ? (
        <ul ref={root} role="tree" aria-label={labels.tree}>
          {renderNodes(filtered, 1)}
        </ul>
      ) : (
        <p
          role="status"
          className="px-3 py-6 text-sm leading-6 text-sidebar-foreground/60"
        >
          {labels.empty}
        </p>
      )}
    </div>
  )
}
export { Sidebar03Tree, findPath }
