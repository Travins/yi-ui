---
name: yi-ui
description: 在使用者自己的项目里选择、安装、组合 Yi UI（yiui.dev，@yiui）的组件、区块和页面。用户提到 Yi UI、@yiui、方条控件、线条网格、网格工具栏、中文表单控件（金额、手机号、证件号、省市区）时使用；项目已装 components/ui/ 下带子目录的 Yi UI 组件时也使用。不用于维护 Yi UI 仓库本身。
license: MIT
compatibility: 需要 React 19、Tailwind CSS v4，以及底座为 Base UI 的 shadcn 项目。
metadata:
  author: Travins
---

# Yi UI

中文优先的 shadcn registry 组件库。组件以源码形式装进项目，装完就是项目自己的代码，可以直接改。

不确定的 API 不要猜，先读文档。每个条目都有给 Agent 读的 Markdown，含示例代码和属性表：

```
https://yiui.dev/md/components/<条目>.md
https://yiui.dev/md/blocks/<条目>.md
https://yiui.dev/md/pages/<条目>.md
```

全部条目、导入路径和说明见 [references/catalog.md](references/catalog.md)。

## 工作流程

1. **看底座。** 读 `components.json`，`style` 以 `base-` 开头才算匹配。没有项目时运行 `pnpm dlx shadcn@latest init -t next -b base -p nova -n my-app`。是 Radix 底座时先告诉用户：大部分条目能用，但不推荐，`app-shell-01` 需要手改；不要自行迁移底座。
2. **选条目。** 查 catalog。基础原语（按钮、对话框、下拉菜单等）用 shadcn 官方组件，不要用 Yi UI 硬凑，也不要重新实现 catalog 里已有的东西。
3. **读文档。** 读该条目的 `/md/` 文档，特别是「注意事项」。
4. **预览再装。** 先看会写什么。`--dry-run` 只列出文件和操作；标记为 `overwrite` 的文件要加 `--diff` 看具体改动。依赖项也可能被标记，比如项目改过的 `button`，不只是所装的条目。内容相同的文件 CLI 会自动跳过；内容不同的文件不要覆盖，先把差异告诉用户。`-y` 不会跳过覆盖确认，`--overwrite` 会覆盖全部，只在用户同意后使用。第一次安装时 CLI 会往 `components.json` 写入 `registries.@yiui`，这是正常的。

   ```bash
   pnpm dlx shadcn@latest add @yiui/<条目> --dry-run
   pnpm dlx shadcn@latest add @yiui/<条目> --dry-run --diff  # 有 overwrite 时
   pnpm dlx shadcn@latest add @yiui/<条目>
   ```

   按项目实际的包管理器换命令。CLI 不认识 `@yiui` 时改用 `https://yiui.dev/r/<条目>.json`。依赖的条目和 npm 包会一起装上。Monorepo 先看下面的「Monorepo」一节。
5. **写代码并验证。** 跑项目的类型检查和构建，然后在真实浏览器里操作一遍，构建通过不代表运行没问题。桌面和手机都要看，包括亮暗模式。手机上的底部面板和加高由 `pointer: coarse` 触发，只缩窄视口看不到，要用触屏模拟。

## 容易写错的地方

- **导入路径带子目录。** 是 `@/components/ui/number-stepper/number-stepper`，不是 `@/components/ui/number-stepper`。catalog 写的是单应用项目的默认路径，实际前缀由 `components.json` 的 `aliases` 决定，以装好的文件为准。
- **Base UI 用 `render`。** shadcn 原语的自定义触发器用 `render` 属性，不是 Radix 的 `asChild`。
- **颜色只用主题变量。** 用 `bg-background`、`text-muted-foreground`、`border-edge` 这类 token，不写十六进制或 `bg-blue-500`，否则亮暗模式和颜色主题会失效。`border-edge` 的变量由安装的 Yi UI 条目写入全局样式；项目里还没有 Yi UI 条目时先用 `border-border`。
- **按钮高度只有三档。** 通过 `Button` 的 `size` 取得：`sm` 28px、`default` 32px、`lg` 36px，图标按钮对应 `icon-sm`、`icon`、`icon-lg`；触屏上自动加高到 36、40、44px。不要写 `h-*`。同一行的按钮用同一档，表单提交按钮至少和同表单控件同档。
- **不要穿透内部结构改样式。** 优先用组件的属性和 `className`；确实要定位内部元素时用文档列出的 `data-slot`。
- **文案走 `labels`。** 组件内置中文文案，要改就传 `labels`，不要改 JSX。
- **受控和非受控二选一。** `value` 搭 `onValueChange`，或者只用 `defaultValue`。
- **不要写死错误。** 把 `error` 按当前值计算，值改对后错误要消失。
- **持久化和时间相关的内容防 hydration 不匹配。** 渲染期间不读 `Date.now()`、`Math.random()`、`window`。主题类条目要求在 `<html>` 上加 `suppressHydrationWarning`，以该条目文档为准。

## 方条控件

方条文本框、方条下拉、颜色选择、数值滑块、分段选择、开关、金额、手机号、证件号、数量等共用一套高度和外观，可以放在同一张表单里，`size` 也是同一张表。

- **传 `label`。** 容器窄于 20rem 时标签自动挪到条上方，不要自己写一份。
- **随表单提交用 `name`。** 提交的是不带格式的原始值，支持 `form` 和表单重置。
- **排成工具栏用 `grid-toolbar`。** 方条文本框、方条下拉、分段选择、颜色选择、数量选择、金额、手机号、证件号放进 `GridToolbarItem` 后，会自动去掉外框铺满整格，不要手动改边框。格子默认按内容定宽，要占满剩余宽度时传 `grow`，并给 `min-w-*`。行高由 `GridToolbar` 的 `size` 决定，控件自己的 `size` 在格子里不起作用。其他控件放进去之前先实测。

## 布局和主题

- **线条网格：** 用 `grid-layout` 的原语搭页面骨架，不要每页手写边框。
- **颜色主题：** `pnpm dlx shadcn@latest add https://yiui.dev/r/theme-<id>.json`，详见 https://yiui.dev/docs/theming/ 。
- **区块和页面：** 其中的页面文件按 Next.js App Router 写，会写入 `app/` 下的固定路径，安装前务必 `--dry-run`。

## Monorepo

以下在 shadcn 官方 monorepo 模板（`init --monorepo`）上实测，其他结构按 `components.json` 的 `aliases` 对应调整。

- **组件在应用目录或 UI 包目录安装都可以。** 组件和它用到的 `hooks`、`lib` 都会写进 UI 包，npm 包也装在 UI 包。
- **从 UI 包的路径导入。** 比如 `@workspace/ui/components/number-stepper/number-stepper`，包名以项目为准，不要照抄 `@/components/ui/...`。
- **UI 包要用 `Bundler` 解析。** 组件内部有相对导入，模板的 `NodeNext` 会让 UI 包的 `tsc` 报 TS2835，应用构建不受影响。在 UI 包的 `tsconfig.json` 里设 `"module": "ESNext"`、`"moduleResolution": "Bundler"`，不要逐个给导入加扩展名。
- **区块和页面要多做两步。** 它们的代码写进应用，但 CLI 仍把 npm 包装进 UI 包。
  1. 安装前，把应用 `components.json` 里的 `aliases.hooks` 和 `aliases.lib` 改成 UI 包的路径（如 `@workspace/ui/hooks`、`@workspace/ui/lib`），否则区块会从应用里导入这些文件而找不到。这是对项目配置的修改，先告诉用户。
  2. 安装后，跑一次类型检查，把报 `Cannot find module` 的包加到应用的依赖里。

## 环境问题

CLI 报 `other side closed` 时，通常是 SOCKS 代理导致的，去掉它再试：`env -u ALL_PROXY -u all_proxy pnpm dlx shadcn@latest add @yiui/<条目>`。

## 发现问题时

Yi UI 的问题不要只在本地绕过去。如果怀疑是组件本身的 bug 或文档有误：

1. 先在干净用法下复现，排除项目自己的改动。
2. 告诉用户，征得同意后提 issue：`gh issue create -R Travins/yi-ui`，或打开 https://github.com/Travins/yi-ui/issues/new 。
3. 写清条目名、复现步骤、期望和实际结果，以及浏览器、亮暗模式、视口宽度。不要附上用户项目的私有代码或数据。

本地需要先绕过时，在代码旁注释 issue 链接，修复后再去掉。
