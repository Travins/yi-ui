"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { SegmentedControl } from "@/registry/ui/segmented-control/segmented-control"

/*
 * 演示控制条：区块预览（src/registry/<blocks|pages>/<name>/demo.tsx）顶部的演示外壳，只在本站 /view/ 预览里出现，
 * 不属于任何 registry 条目，也不会进入 public/r 的产物（demo.tsx 不在 registry.json 的 files 里）。
 *
 * 放在 src/components/demo/ 而不是 components/docs/：registry-lint 禁止 src/registry 下任何文件
 * （包括 demo.tsx）引用 components/site|home|docs，这里是专门给演示外壳用的目录。
 *
 * 结构固定，所有区块一致：
 *   ┌ 演示 │ 标签 [选项…]  标签 [选项…] …            [操作] [重置] ┐
 *   └ 提示：当前组合下的演示规则（验证码等）· 进度/结果播报        ┘
 * 宽屏一行排下；放不下时「演示」标识和操作按钮占第一行，每个选项组各占一行，提示行始终在最下方。
 * 控件统一 sm 档（28px，触屏 36px）：它是工具栏，不能比区块里的控件更抢眼。
 * 只有提示、没有选项和操作时（如「演示验证码：123456」），`<DemoBar hint="…" />` 缩成一行：标识 + 提示。
 *
 * 行为约定（各区块的 demo.tsx 遵守）：
 * - 选项分两类：「配置」（布局、格式、模拟后端返回什么）和「状态」（直接驱动区块当前状态）。
 * - 「重置」让区块重新挂载回到初始状态；配置类选项保留，状态类选项回到初始值。
 * - 对当前界面不适用的选项组禁用而不是隐藏（`disabled`，原因写进提示行），控制条不跳动。
 */

/** 提示行的 id：被禁用的选项组用它关联原因 */
const DemoBarHintContext = React.createContext<string | undefined>(undefined)

function DemoBar({
  hint,
  status,
  actions,
  children,
  className,
  ...props
}: Omit<React.ComponentProps<"section">, "children"> & {
  /** 提示行：当前组合下的演示规则，越短越好 */
  hint?: React.ReactNode
  /** 播报行：播放进度、回调结果等，放在 role="status" 里，变化时读屏会念出但不抢焦点 */
  status?: React.ReactNode
  /** 右侧操作按钮：`Button size="sm"`，与选项组同一档高度 */
  actions?: React.ReactNode
  /** 选项组，用 `DemoBarChoice` */
  children?: React.ReactNode
}) {
  const hasControls = React.Children.count(children) > 0 || !!actions
  const hintId = React.useId()
  return (
    <DemoBarHintContext.Provider value={hint ? hintId : undefined}>
      <section
        data-slot="demo-bar"
        aria-label="演示控制"
        className={cn(
          "mx-auto w-full max-w-4xl px-4 pt-4 text-foreground",
          className,
        )}
        {...props}
      >
        <div className="rounded-lg border border-dashed border-edge bg-background">
          {hasControls && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2">
              <DemoBarBadge />
              {actions && (
                <div className="ml-auto flex items-center gap-2 md:order-last">
                  {actions}
                </div>
              )}
              {React.Children.count(children) > 0 && (
                <div className="flex basis-full flex-wrap items-center gap-x-4 gap-y-2 md:min-w-0 md:flex-1 md:basis-0">
                  {children}
                </div>
              )}
            </div>
          )}
          <div
            className={cn(
              "flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-xs leading-5 text-muted-foreground",
              hasControls && "border-t border-dashed border-edge",
            )}
          >
            {!hasControls && <DemoBarBadge />}
            {hint && (
              <p id={hintId} className="min-w-0">
                {hint}
              </p>
            )}
            {/* 播报区常驻（空的时候也在），否则第一次出现的内容读屏可能不念 */}
            <p role="status" className="min-w-0 text-foreground">
              {status}
            </p>
          </div>
        </div>
      </section>
    </DemoBarHintContext.Provider>
  )
}

/** 「演示」标识：等宽小字配斜纹底，一眼看出这一条不属于区块 */
function DemoBarBadge() {
  return (
    <span
      aria-hidden
      className="shrink-0 rounded-sm border border-edge bg-hatch px-1.5 py-0.5 font-mono text-[11px] leading-4 tracking-wider text-muted-foreground"
    >
      演示
    </span>
  )
}

/**
 * 一个选项组：标签 + 分段控件。≥sm 时标签在左、同一行；窄屏标签在上，选项占满整行，选项文字不被挤成省略号。
 * 标签放在控件外面而不是用分段控件自带的标签格：标签格会占掉一截宽度，五个选项在 375 宽下就放不下了。
 * 不适用时传 `disabled`，原因写进 DemoBar 的 `hint`。
 */
function DemoBarChoice({
  label,
  options,
  value,
  onValueChange,
  disabled,
  className,
}: {
  /** 可见标签，同时是单选组的可访问名称 */
  label: string
  options: readonly {
    value: string
    label: React.ReactNode
    disabled?: boolean
  }[]
  value: string
  onValueChange: (value: string) => void
  disabled?: boolean
  className?: string
}) {
  const hintId = React.useContext(DemoBarHintContext)
  return (
    <div
      data-slot="demo-bar-choice"
      className={cn(
        "flex min-w-0 flex-1 basis-full flex-col gap-1 sm:basis-64 sm:flex-row sm:items-center sm:gap-2",
        className,
      )}
    >
      {/* 可见标签只给眼睛看；读屏名称由 aria-label 给出（分段控件会覆盖外部传入的 aria-labelledby） */}
      <span
        aria-hidden
        className={cn(
          "shrink-0 text-xs text-muted-foreground",
          disabled && "opacity-50",
        )}
      >
        {label}
      </span>
      <SegmentedControl
        aria-label={label}
        // 禁用的原因写在提示行里，读屏通过描述读到
        aria-describedby={disabled ? hintId : undefined}
        size="sm"
        // 窄屏是纵向排列，flex-1 会把控件压扁；横排时才撑满剩余宽度
        className="min-w-0 sm:flex-1"
        options={options}
        value={value}
        disabled={disabled}
        onValueChange={onValueChange}
      />
    </div>
  )
}

export { DemoBar, DemoBarChoice }
