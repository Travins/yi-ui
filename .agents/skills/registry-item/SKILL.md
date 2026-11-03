---
name: registry-item
description: 在 yiui.dev 新增或修改一个 shadcn registry 条目（组件 registry:ui、区块 registry:block、页面 registry:page、主题 registry:theme）的完整流程：源码位置、registry.json、演示、MDX 文档、构建与安装验证。
---

# 新增 registry 条目

> 开始前先读 `component-conventions` 技能（组件书写规范），本流程只描述步骤，代码写法以规范为准。

> 唯一真源：`src/registry/`。文档预览、代码展示、`public/r/<name>.json` 都读同一份文件，禁止复制副本。

## 步骤

1. **写源码**
   - 组件：`src/registry/ui/<name>/<name>.tsx`
   - 区块：`src/registry/blocks/<name>/`（可多文件）
   - 页面：`src/registry/pages/<name>/`（可多文件，含 `page.tsx`）
   - 只用主题 token 的颜色；工具函数从 `@/lib/utils` 引入 `cn`；shadcn 原语从 `@/components/ui/<x>` 引入（安装时 CLI 会改写别名）
   - 文件里的说明注释用中文
2. **登记到 `registry.json`**（根目录）
   - `name`（kebab-case）、`type`、`title`、`description`（中文）
   - `dependencies`：npm 包；`registryDependencies`：shadcn 组件名，或本站的完整 URL / `@yiui/<name>`
   - `files[].path`；页面文件必须写 `target`（如 `app/page.tsx`）
   - 用到 `src/styles/grid.css` 工具类或新的 CSS 变量时，写进 `css` / `cssVars`
3. **写演示**：`src/registry/examples/<name>-demo.tsx`（默认导出一个组件），多个变体用 `<name>-<variant>-demo.tsx`
4. **写文档**：`content/docs/<components|blocks|pages>/<name>.mdx`，frontmatter 包含 `title`、`description`；正文使用文档组件（`ComponentPreview`、`InstallCommand` 等，以 `src/components/docs/` 中实际导出的为准）；可选 `group: <分组 id>` 决定侧栏与 `/components/` 列表页的分组，分组表（id、中英文标题、顺序）统一在 `src/components/docs/docs-groups.ts` 维护，新增分组先在表里登记，frontmatter 写了未登记的 id 构建会报错，不写 `group` 则归入默认组（无小标题）；新条目在 frontmatter 加 `status: new`，侧栏条目旁显示绿色的「新」，组件稳定（通常上线一两个版本后）删掉这一行即可
5. **验证**
   ```bash
   source ~/.nvm/nvm.sh && nvm use
   pnpm registry:build && pnpm lint && pnpm build
   ```
   检查 `public/r/<name>.json` 已生成，内容包含源码。
   运行 `pnpm qa:install <name>` 实测安装；发布前不传条目名验收全部条目。

## 已实现的文档 API

MDX 内置组件由 `src/components/docs/mdx-components.tsx` 注册，无需在文档内 import：

- `<ComponentPreview name="grid-layout-demo" />`：读取 `src/registry/examples/<name>.tsx` 源码，预览/代码 Tabs；演示必须默认导出 React 组件。
- `<ComponentSource name="grid-layout" />`：从根目录 `registry.json` 查找文件，构建时读取唯一真源。
- `<InstallCommand name="grid-layout" />`：pnpm/npm/yarn/bun 命令、复制与手动安装折叠区。
- `<PropsTable name="grid-layout" component="GridSection" />`：用 `fumadocs-typescript` 从条目首个源码文件解析导出组件，通过 Parameters<typeof Component>[0] 自动解析自定义属性及 className/children，排除其余继承的 HTML 属性。
- Markdown 代码围栏支持 `title="文件名.tsx"`，构建时用 Shiki 高亮，颜色映射主题 token。

文档分区为 `content/docs/` 下的 `docs`、`components`、`blocks`、`pages`；新增分区时扩充 `src/lib/source.ts` 的分区类型及配置。每个动态路由必须设置 `dynamicParams = false` 并生成静态参数。

## 构建流程

`pnpm registry:build` 依次运行：

1. `scripts/sync-registry-css.ts` 使用 PostCSS 解析 `src/styles/grid.css`，同步三个 `@utility` 到 grid-layout 条目的 css；不要手改这些生成字段。`--edge` 与 Tailwind `color-edge` 映射在 registry.json 的 cssVars 配置。
2. `scripts/build-registry-index.ts` 扫描 `src/registry/examples/*.tsx`，生成 `src/registry/__index__.tsx` 中的 React.lazy 索引（不要手写映射）。
3. `shadcn build` 生成 `public/r/<name>.json`。
4. `scripts/build-registry-catalog.ts` 生成带源码的 `public/r/registry.json`。

`prebuild` 自动调用上述流程；Fumadocs 由 `createMDX` 集成，在 `.source/` 生成内容索引。新增演示后运行 `pnpm registry:index`，再刷新开发页面。

安装验收先运行 `pnpm registry:build`，再运行 `pnpm qa:install`。脚本提供本地 registry、创建干净 Base UI 项目并检查类型、构建与页面运行错误，报告放 `.qa/install-*/`。可用 `pnpm qa:install value-slider auth-01` 抽测，`--namespace` 验证命名空间，`--fresh` 跳过初始化缓存，`--keep` 保留项目排查。

命名空间为 `@yiui`；`InstallCommand` 默认 URL 安装，可切换命名空间安装。配置教程位于 `content/docs/docs/registry.mdx`，安装入口位于 `content/docs/docs/installation.mdx`（入门分区），components.json 中使用 `"registries": { "@yiui": "https://yiui.dev/r/{name}.json" }`。
