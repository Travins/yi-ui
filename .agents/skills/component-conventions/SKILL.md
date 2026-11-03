---
name: component-conventions
description: yiui.dev 组件书写规范（强制）。编写或修改 src/registry 下任何组件、区块、页面、演示时必读：分层与依赖规则、文件与命名、代码结构（data-slot、导出、Props、变体、受控/非受控）、文案与 i18n、样式 token、客户端/静态导出、可访问性、文档结构与自查清单。
metadata:
  internal: true
---

# 组件书写规范

> 基准：**shadcn/ui 官方源码的写法**（参考本项目 `src/components/ui/button.tsx`、`trace.tsx`）。
> 本规范在此基础上补充本项目约定。与本规范冲突的旧代码以本规范为准逐步修正。
> `pnpm registry:lint` 会自动检查其中可机器校验的部分（见第 10 节）。

## 1. 分层与依赖方向

| 层            | 目录                                         | registry type                    | 定位                                            | 可以依赖                                                   |
| ------------- | -------------------------------------------- | -------------------------------- | ----------------------------------------------- | ---------------------------------------------------------- |
| 组件 ui       | `src/registry/ui/<name>/`                    | `registry:ui`                    | 单一职责、可组合的原语（如 trace、grid-layout） | `@/lib/utils`、`@/components/ui/*`、npm 包、其他 `ui` 条目 |
| 区块 block    | `src/registry/blocks/<name>/`                | `registry:block`                 | 一个完整的界面区域（登录页、AI 助手面板）       | 以上全部 + 其他 `block`                                    |
| 页面 page | `src/registry/pages/<name>/`             | `registry:page`（含 page 文件） | 一整页 / 一套布局                               | 以上全部                                                   |
| 演示 example  | `src/registry/examples/` 或条目内 `demo.tsx` | 不发布                           | 文档预览                                        | 任意                                                       |
| Hook / lib    | `src/registry/hooks/`、`src/registry/lib/`   | `registry:hook` / `registry:lib` | 跨条目复用的逻辑                                | `@/lib/utils`、npm 包                                      |

**禁止**：registry 代码 import `src/config/**`、`src/components/site|home|docs/**`、`src/lib/source.ts` 等站点私有代码；下层依赖上层（ui 不能依赖 block）。
跨条目依赖在 registry.json 的 `registryDependencies` 中用完整 URL：`https://yiui.dev/r/<name>.json`。

## 2. 文件与命名

- 目录、文件名：kebab-case；条目目录名 = registry `name`
- 入口文件 = `<name>.tsx`（区块/页面可用语义名如 `agent-chat.tsx`，但必须在文档"文件结构"中标明入口）
- 子文件按职责拆分，单文件超过约 300 行应拆分；共享类型放 `types.ts`，常量/默认文案放 `config.ts`
- `demo.tsx`：仅用于 `/view/` 预览，不进入 registry files；`page.tsx`：安装到用户项目的页面入口（target 到 `app/...`）
- 编号系列：同类区块用 `-01`、`-02` 后缀（`auth-01`、`auth-02`），API 尽量保持一致
- 组件名 PascalCase，并以条目名为前缀：`AgentChatPanel`、`AgentChatTrigger`、`GridSection`
- Hook：`use-<name>.ts`，导出 `use<Name>`

## 3. 代码结构（照 shadcn 写）

```tsx
"use client" // 仅在需要时；必须是文件第一行

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const statusCardVariants = cva("flex flex-col gap-2 rounded-lg border p-4", {
  variants: {
    tone: { default: "bg-card", muted: "bg-muted/50" },
  },
  defaultVariants: { tone: "default" },
})

function StatusCard({
  className,
  tone,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof statusCardVariants>) {
  return (
    <div
      data-slot="status-card"
      data-tone={tone}
      className={cn(statusCardVariants({ tone }), className)}
      {...props}
    />
  )
}

function StatusCardTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return (
    <h3
      data-slot="status-card-title"
      className={cn("text-sm font-medium", className)}
      {...props}
    />
  )
}

export { StatusCard, StatusCardTitle, statusCardVariants }
```

规则：

1. **函数声明** `function X() {}`，不用箭头函数常量定义组件；**不用 `forwardRef`**（React 19 ref 即 prop）
2. **导出统一放在文件末尾** `export { A, B }`；**禁止 `export default`**，例外：`page.tsx`、`layout.tsx`、`demo.tsx`、`src/registry/examples/*`
3. 每个渲染 DOM 的组件根元素都有 **`data-slot="<kebab-name>"`**；状态用 `data-state` / `data-*` 暴露，供样式与父级选择器（`has-data-[slot=x]`）使用
4. Props 类型：`React.ComponentProps<"元素">`（或 Base UI 原语的 `Xxx.Props`）& 自有 props；**解构 `className` 和自有 props，其余 `...props` 透传到根元素**
5. 合并类名用 `cn(基础类, 变体, className)`，`className` 永远最后
6. 有 2 个及以上视觉变体时用 `cva`，变体名统一：`variant`（外观）、`size`（尺寸）、`tone`（色调）；同时导出 `xxxVariants`
7. 多态：使用 Base UI 的 `render` prop，**不要**实现 `asChild`
8. 复合组件优先（Root + Parts），避免一个组件塞几十个 props；布局类组件用 ReactNode 插槽 props（`aside`、`headerActions`）
9. 图标统一 `lucide-react`；品牌图标用内联 SVG + `currentColor`

## 4. Props API 约定

| 场景     | 约定                                                                                                                           |
| -------- | ------------------------------------------------------------------------------------------------------------------------------ |
| 开关状态 | `open` / `defaultOpen` / `onOpenChange(open)`，**同时支持受控与非受控**（使用 `src/registry/hooks/use-controllable-state.ts`） |
| 值       | `value` / `defaultValue` / `onValueChange(value)`                                                                              |
| 模式枚举 | 字符串字面量联合类型并导出类型，如 `type AgentChatMode = "embedded" \| "floating"`                                             |
| 异步动作 | `onXxx(payload): Promise<void>`；组件内部管理 loading 与错误展示，抛出的 `Error.message` 显示给用户                            |
| 数据     | 通过 props 传入（`items`、`data`、`config`），组件内只放**默认示例数据**（放 `config.ts`）                                     |
| 布尔     | 肯定式命名：`allowSignUp`、`collapsible`，不用 `disableXxx` 双重否定                                                           |
| 回调参数 | 传对象而非多个位置参数（便于扩展）                                                                                             |

**表单控件（方条系列、金额输入、省市区选择等）另外遵守：**

| 场景           | 约定                                                                                                                                                                                                                                                                              |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 随表单提交     | 支持 `name` / `form`，用 `<input type="hidden">` 提交原始值（不带格式）；多个值时 `name` 可以是字符串（自动加后缀）或对象                                                                                                                                                         |
| 表单重置       | 非受控时监听所属表单的 `reset` 事件，等一帧后回到 `defaultValue`                                                                                                                                                                                                                  |
| 错误态         | `aria-invalid` 时方条变红：`aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20`（暗色 `/50`、`/40`）；根元素是字段容器的组件再提供 `error` 属性，文字放在控件下方，用 `aria-describedby` 关联                                                   |
| 触屏高度       | `bar` 档在 `pointer-coarse:` 下各加高一档：28 / 32 / 36 → 36 / 40 / 44px；`compact` 不加高                                                                                                                                                                                        |
| 聚焦样式       | 鼠标点按、文字输入聚焦与下拉打开时用边框加深 + 底色提亮（`focus-within:border-foreground/25 focus-within:bg-background`，下拉用 `data-popup-open:`），不用外圈；文字输入经 Tab 聚焦也相同。外圈 ring 只留给非文字控件的键盘 `focus-visible` 与出错态                              |
| 点按后的焦点环 | 非文字控件只在键盘 `focus-visible` 时显示外圈。指针主动转移焦点时用 `pointerFocus` + `data-pointer-focus` 压掉误触发的环，键盘捕获和失焦时复位；文字输入统一使用边框加深 + 底色提亮，无需压制 ring。`data-pointer-focus` 隐藏光标等独立逻辑保留                                   |
| 窄容器         | 根元素设 `@container`，窄于 20rem（放不下「条内标签 + 值」）时：条内标签 `sr-only`，另渲染一份 `aria-hidden` 的 `<label htmlFor>` 显示在条上方（`text-xs text-muted-foreground`），值改为左对齐。**不要只把标签藏起来**，多字段表单会分不清字段；示例里手写的方条字段也按同一规则 |
| 触摸手势       | 横向占满的拖动控件用 `touch-action: pan-y`，先判断方向再接管；二维控件只在按住手柄时拖动，空白处交给页面滚动                                                                                                                                                                      |

## 5. 文案与 i18n

- 默认中文。**用户可见文案不得散落硬编码在 JSX 深处**：区块/页面把文案集中为 `DEFAULT_LABELS`（放 `config.ts`），组件接收 `labels?: Partial<Labels>` 覆盖
- 小型 ui 组件的少量文案可直接作为 props 默认值（如 `label = "复制"`）
- 日期、数字格式化用 `Intl`，不要手拼
- 代码标识符、data-slot、类型名用英文；注释用中文，注释说明"为什么"，不复述代码

## 6. 样式

- 颜色**只用主题 token**（`bg-background`、`text-muted-foreground`、`border-border`、`bg-primary/10`、`chart-1..5`）；禁止十六进制、`rgb()`、Tailwind 调色板颜色（`bg-blue-500`）、`text-white` / `bg-black`
- 线条用 `border-edge`（见 `grid-design` 技能）；圆角用 `rounded-md/lg/xl`（随 `--radius`）
- 尺寸优先 `size-*`；图标尺寸由父级 `[&_svg:not([class*='size-'])]:size-4` 统一
- **按钮高度只有三档**，一律通过 `Button` 或 `buttonVariants` 的 `size` 取得，不用 `h-*`/`py-*` 自定义：

  | 档位 | 文字按钮  | 图标按钮  | 高度 | 触屏高度 | 用途                           |
  | ---- | --------- | --------- | ---- | -------- | ------------------------------ |
  | 小   | `sm`      | `icon-sm` | 28px | 36px     | 工具栏、表格行内、文档框内操作 |
  | 默认 | `default` | `icon`    | 32px | 40px     | 表单、对话框、卡片内操作       |
  | 大   | `lg`      | `icon-lg` | 36px | 44px     | 首屏 / 页面级主操作            |

  表单和示例卡片里的提交 / 保存 / 确认 / 重试按钮，至少和同一表单里的控件同档（默认 `default`）；手机页面底部固定栏的主操作用 `lg`；`sm` 只用于工具栏、表格行内这类次要操作。

  触屏高度由 `pointer-coarse:` 自动切换，按钮、输入框（`components/ui/input`）、方条控件三者同一张表：同一档的按钮和表单控件在桌面、手机上都等高。示例里手写的方条文本框也要照这张表写（如 `h-9 pointer-coarse:h-11`），不要只写一个固定高度

  同一行并排的按钮（包括图标按钮）必须同一档；只有设计明确指定时才例外，并在代码旁注释原因。`xs`/`icon-xs` 只用于徽标、标签内的微型操作。链接按钮写 `className={buttonVariants({ variant, size, className })}`，额外类通过 `className` 参数传入，由 `buttonVariants` 内部合并

- `dark:` 变体只在 token 无法表达时使用
- 动效：`motion/react`，时长 150–300ms，必须处理 `useReducedMotion()`
- 不写内联 `style`，除非是运行时计算值（宽度、坐标、CSS 变量）

## 7. 客户端与静态导出

- 默认写服务端可渲染的组件；只有用到 state、effect、事件、浏览器 API 时才加 `"use client"`，并把客户端部分**下沉到最小的子组件**
- 渲染期间禁止依赖 `Date.now()`、`Math.random()`、`window`（会导致静态 HTML 与首屏不一致）；需要时用 `useEffect` / `useSyncExternalStore` 并提供稳定的服务端快照
- 持久化（localStorage）的 key 统一前缀 `travinsy:`，例如 `travinsy:app-shell:collapsed`
- 演示数据必须确定性（固定种子），不能每次构建不同

## 8. 可访问性

- 交互元素用语义元素（`button`、`a`），纯图标按钮必须有 `aria-label`
- 切换类按钮用 `aria-pressed` / `aria-expanded`；选择组用 radio 语义
- 流式/动态内容区域用 `aria-live="polite"`
- 键盘可达：Tab 顺序合理、Esc 关闭浮层、焦点可见（`focus-visible:ring-3 ring-ring/50`）
- 颜色不是唯一信息载体（状态同时有图标或文字）

## 9. 文档（content/docs/<分区>/<name>.mdx）固定结构

```
---
title: 中文名
description: 一句话说明（同 registry.json 的 description）
---
<ComponentPreview /> 或 <BlockViewer />      ← 预览
## 安装                                        ← <InstallCommand />
## 用法                                        ← 最小可运行示例
## 示例                                        ← 变体 / 组合（每个一个 demo）
## API                                         ← <PropsTable />，复合组件逐个列出
## 可访问性                                    ← 键盘、ARIA 行为
## 注意事项                                    ← 可选：SSR、性能、已知限制
```

来源于用户项目的条目，在简介中写"提炼自我的一个 xxx 项目"，不写真实品牌名。

## 10. 自动检查与自查清单

`pnpm registry:lint` 检查：`data-slot`、导出方式、`"use client"` 位置、禁用颜色、禁止的 import 路径、registry.json 依赖与实际 import 是否一致。

交付前自查：

- [ ] `pnpm registry:lint && pnpm lint && pnpm build` 全部通过
- [ ] 全部颜色主题（14 个，含中性基底）× 亮/暗 下外观正常；375px 无横向溢出
- [ ] 文案可通过 `labels` 覆盖；无硬编码颜色
- [ ] 文档结构符合第 9 节；演示数据确定性
- [ ] 关键条目在临时项目中 `shadcn add` 实测通过

## 12. 加载与占位

- 页面是预渲染的 HTML：依赖尺寸测量、canvas、WebGL 或当前时间的内容必须提供水合前占位。
- 占位必须与真实内容同尺寸，不能使布局跳动；颜色跟随主题变量。
- 占位使用 `data-slot="<组件>-placeholder"` 和 `aria-hidden`，容器用 `data-ready` 控制真实内容淡入；减少动态效果时关闭过渡。
- 文本类组件的 SSR 内容必须可见，不得为了等待挂载隐藏整块文字。
- 时间类内容先输出稳定占位，挂载后再读取当前时间，避免 hydration 不一致。
- 样板见 `src/registry/ui/globe/globe.tsx` 的同尺寸占位与就绪状态。

- 占位层必须绝对定位，不参与布局；淡出后保留的节点也不能占据尺寸。调用方 `className` 只作用于原有根元素，根元素 `data-slot` 保持兼容，内部图形层可用 `*-plot`。
- 站内跳转的加载指示（页头标志右侧的三道小斜杠，`data-slot="navigation-progress"`）只覆盖页面载荷未到的慢跳转，不要放在页头底边与导航指示线叠在一起。路径提交后页面已经切换，即使示例 chunk 仍在下载也应结束加载指示，由示例区的同尺寸骨架继续反馈加载状态。
