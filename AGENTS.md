<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Yi UI（yiui.dev）— 项目 Agent 指南

个人作品集 + shadcn 风格组件库（Registry）。默认语言 **简体中文**。
所有在本仓库工作的 Agent（Claude / Codex / Pi）都必须先读完本文件。

## 1. 技术栈

| 项 | 选型 |
|---|---|
| 框架 | Next.js 16（App Router，`src/` 目录，Turbopack） |
| 运行时 | Node 24（见 `.nvmrc`），pnpm 10 |
| 样式 | Tailwind CSS v4 + shadcn/ui（`base-nova` 风格，**Base UI** 底座 `@base-ui/react`，不是 Radix） |
| 内容 | Fumadocs **内容层**：`fumadocs-core` + `fumadocs-mdx`。**不使用 `fumadocs-ui`**，所有页面 UI 自己写（与 shadcn 官网相同的做法） |
| 动画 | `motion` |
| 高亮 | `shiki` |
| 主题 | `next-themes`（亮/暗）+ 自定义颜色主题（`data-theme`） |
| 部署 | Vercel 的 Next.js 运行时（自定义域名 yiui.dev）：页面全部构建时预渲染，少量接口按 `revalidate` 定时刷新 |

## 2. 常用命令

```bash
source ~/.nvm/nvm.sh && nvm use      # 每个新 shell 都要先切到 Node 24
pnpm dev                              # 开发
pnpm build                            # 生产构建，产物在 .next/（pnpm start 可本地预览）
pnpm lint
pnpm registry:lint                    # registry 规范检查
pnpm test                             # 脚本单测与自测
pnpm registry:build                   # 生成 public/r/*.json，改了发布源码要一起提交
python3 scripts/build-og-font.py      # 分享卡片（/og/*.png）出现方块字时，重新生成中文字体子集并提交
```

**环境注意**：本机 `ALL_PROXY` 是 SOCKS 代理，会导致 `shadcn` CLI 请求失败（`other side closed`）。
运行 shadcn CLI 时去掉它：

```bash
env -u ALL_PROXY -u all_proxy pnpm dlx shadcn@latest add <name>
```

### 改了什么就跑什么

git 钩子由 `pnpm install` 自动启用（`.githooks/`），不用手动跑：提交前查禁提词和 `public/r` 同步，推送前再跑 `registry:lint` 和 `pnpm test`。下面这些仍要手动跑；`--build` 和 `qa:shots` 用的是构建产物，要在 `pnpm build` 之后。

| 改动 | 运行 |
|---|---|
| 组件、区块、页面的源码或 `registry.json` | `pnpm registry:build`（产物一起提交）、`pnpm lint`、`pnpm build`，再加下面对应的行 |
| 可交互的组件或示例 | `pnpm qa:interaction <name> --build` |
| 外观或示例 | `pnpm qa:shots <name>`，截图逐张看过 |
| 依赖、`files` 或 `registryDependencies` | `pnpm qa:install <name>` |
| 文档预览、路由或加载方式 | `pnpm build`、`pnpm qa:loading` |
| 可能引起 hydration 不匹配的改动 | 在 `next dev` 下验证，生产构建不报这类错误 |
| 只改 MDX | `pnpm build` |
| `scripts/` 或颜色、数字等纯函数 | `pnpm test` |
| 发布前 | 核对 README，`pnpm qa:install` 验收全部条目 |

## 3. 目录约定

```
content/                     MDX 内容（Fumadocs 读取）
  docs/components/*.mdx      组件文档
  docs/blocks/*.mdx          区块文档
  docs/pages/*.mdx       页面文档
  docs/docs/*.mdx            入门：安装、registry、主题、llms
  blog/*.mdx                 博客
src/
  app/                       路由（页面全部可预渲染）
  components/
    ui/                      shadcn 官方原语（CLI 安装，尽量不手改）
    site/                    站点外壳：Header、Footer、主题切换、导航
    docs/                    文档渲染：ComponentPreview、CodeBlock、InstallCommand、PropsTable
  registry/                  ★ 对外发布的 registry 源码（唯一真源）
    ui/<name>/               registry:ui 组件（含线条网格原语 ui/grid-layout，站点自身也直接 import 它）
    blocks/<name>/           registry:block
    pages/<name>/        registry:page / 多文件页面
    examples/<name>-demo.tsx 文档里用的演示
  styles/                    grid.css（网格工具类）、themes.css（颜色主题）、docs.css（文档/代码样式）
  lib/                       source.ts（Fumadocs loader）、themes.ts、utils.ts
registry.json                shadcn registry 清单
public/r/                    `shadcn build` 产物（生成物，不手改）
skills/yi-ui/                给使用者 Agent 的技能（`npx skills add`）；references/catalog.md 由 registry:build 生成，评测题在 scripts/skill-evals/
scripts/                     构建辅助脚本
```

## 4. 硬性规则

### 禁止提及参考站点（任何文件都必须满足）
- 网站和仓库的任何地方（页面文案、博客、文档、代码注释、registry、技能文件、提交信息）都**不得提及设计参考站点的名字**，也不写“参考/借鉴某个人网站”之类的说法
- 设计来源只描述做法本身（如“线条网格”“等轴测挤出”），不写出处
- 禁提词清单在仓库根目录的 `.forbidden-terms`（已 gitignore，只存在于维护者本机）。提交前用 `grep -rIil -f .forbidden-terms --exclude-dir={node_modules,.next,.source,.git} --exclude=.forbidden-terms .` 自查，结果必须为空；本机没有该文件时跳过此项

### 预渲染优先（任何代码都必须满足）
站点跑在 Vercel 的 Next.js 运行时上，但**页面必须全部在构建时预渲染**（`pnpm build` 输出里页面只能是 ○ 或 ●），这样访问只走 CDN、不消耗函数调用：
- 页面和布局里禁止：`cookies()`/`headers()`/`searchParams` 等请求期 API、`cache: "no-store"` 的 fetch、Server Actions、`proxy`/middleware
- 动态路由必须有 `generateStaticParams()` 且 `dynamicParams = false`
- 生成文本文件的 Route Handler（如 `llms.txt`、`rss.xml`）必须 `export const dynamic = "force-static"`
- 需要实时数据时，单独写一个带 `export const revalidate = <秒>` 的 Route Handler（参考 `src/app/api/github-stars/route.ts`），由客户端组件在挂载后请求；页面首屏用构建时的值，失败时要有兜底，不能让构建挂掉
- `trailingSlash: true`；图片不走优化（`images.unoptimized`）

### 设计系统
- 视觉语言：**线条网格**。内容区左右竖线、全宽横线分隔、斜纹分隔带。只用 `@/registry/ui/grid-layout` 里的原语和 `src/styles/grid.css` 里的工具类实现，不要每个页面手写边框
- 颜色只能用主题变量（`bg-background`、`text-muted-foreground`、`border-border`……），**禁止硬编码颜色**，否则颜色主题切换会失效
- 亮暗模式和颜色主题是两个独立维度：`.dark` class + `data-theme` 属性
- 字体：拉丁/代码用 Geist / Geist Mono；中文用系统字体栈（PingFang SC、HarmonyOS Sans SC、Noto Sans SC），**不打包中文 webfont**
- 按钮高度只有三档：`sm` 28px / `default` 32px / `lg` 36px（图标按钮对应 `icon-sm` / `icon` / `icon-lg`），触屏设备上自动加高一档为 36 / 40 / 44px，与输入框、方条控件同一张表；只能通过 `Button` 或 `buttonVariants` 的 `size` 取得；同一行并排的按钮必须同一档，例外须注释说明（详见 `component-conventions` 技能第 6 节）
- 可访问性：遵循 `web-design-guidelines` 技能

### 语言
- 博客（`content/blog/`）用 `humanizer-zh` 技能润色
- 界面文案、文档、注释的默认语言为简体中文；代码标识符用英文
- `<html lang="zh-CN">`；组件库定位为**中文优先**，不做英文站，英文读者只提供 `README.en.md`；组件对外文案仍通过 `labels` 可覆盖

### Registry
- 对外发布的代码只放在 `src/registry/`，文档预览、代码展示、`public/r/*.json` 都从同一份源码读取，**禁止复制粘贴副本**
- 新增或修改 registry 条目请按 `registry-item` 技能执行；MDX 的 `group` 字段与分组表（`src/components/docs/docs-groups.ts`）见该技能第 4 步
- **所有 registry 代码必须遵守 `component-conventions` 技能（组件书写规范）**：分层依赖、命名、data-slot、导出方式、Props 约定、labels 文案、样式 token、可访问性、文档结构。写任何组件前先读它

## 5. 项目级技能（`.agents/skills/`，`.claude/skills` 和 `.pi/skills` 是指向它的软链接）

这些是维护本仓库用的。给组件使用者的技能在 `skills/yi-ui/`：改了组件的用法或易错点，要同步它的 `SKILL.md`。

| 技能 | 用途 | 何时必读 |
|---|---|---|
| `shadcn` | shadcn CLI、组件组合、registry 规范 | 增删 `components/ui`、写 registry |
| `next-best-practices` | Next.js 文件约定、RSC 边界、元数据 | 写任何路由/布局 |
| `vercel-react-best-practices` | React 性能 | 写交互组件 |
| `frontend-design` | 高质量视觉设计（与 `grid-design` 冲突时以 `grid-design` 为准） | 做新页面、新组件外观 |
| `web-design-guidelines` | UI/可访问性审查 | 交付 UI 前自查 |
| `next-dev-loop` | 在运行中的 `next dev` 里验证行为 | 验收 UI 改动 |
| `component-conventions` | **组件书写规范（强制）** | 写/改 src/registry 下任何代码 |
| `registry-item` | 本项目新增 registry 组件的完整流程 | 新增/修改组件、区块、页面、主题 |
| `component-acceptance` | 组件从开发到验收的流程、标准与验收清单 | 新增组件、重做示例、发布前验收 |
| `grid-design` | 本项目线条网格设计规范 | 做任何页面布局 |
| `humanizer-zh` | 中文文本润色：去空话、套话和模板化表达 | 撰写或修改 `content/blog/` 下的博客，成稿前必须用它过一遍 |

查第三方库文档优先用 context7 MCP；Next.js 以 `node_modules/next/dist/docs/` 为准。

## 6. AI 协作约定

用 AI 工具（单个或多个 Agent）在本仓库工作时遵守下面的约定。维护者本机的模型分工与调度规则写在 `AGENTS.local.md`（已 gitignore，不入库）；存在时一并读取。

### 分支与发布
- 日常开发在 `dev` 分支上提交、推送；推送 `dev` 不会触发 Vercel 构建
- `master` 是线上分支，推送即自动部署到 yiui.dev。只有维护者确认要发布时，才把 `dev` 合并（快进）到 `master` 并推送
- 发布前先核对 `README.md` 与 `README.en.md`：组件 / 区块 / 页面列表、特点、命令表要和本次发布的内容一致，有出入就先更新再发布
- 不要直接在 `master` 上提交

### 拆分与派发任务
- 任务说明必须**自包含**：目标、要读的文件和技能、允许修改的文件范围、验收标准（如 `pnpm build` 通过）
- 共享工作区里并行的子任务，**修改的文件范围不能重叠**；有重叠就串行，或者各自用独立的 git worktree
- 子 Agent **不要 git commit**，完成后汇报：修改了哪些文件、做了哪些取舍、还有什么遗留问题
- 子 Agent 改完都必须运行 `pnpm lint` 和 `pnpm build`（或者说明为什么没跑）
- 主控审查后统一提交
