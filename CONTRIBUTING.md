# 参与贡献

感谢你愿意改进 Yi UI。下面是提交 Issue 与 Pull Request 前需要知道的事。

## 提 Issue

- **Bug**：写清复现步骤、期望结果与实际结果，附上浏览器、亮 / 暗模式与颜色主题；能附截图或录屏更好。
- **新组件或改进建议**：说明使用场景，以及它和现有组件的关系。

## 本地开发

```bash
git clone https://github.com/Travins/yi-ui.git
cd yi-ui
nvm use          # Node 24（见 .nvmrc）
pnpm install
pnpm dev
```

## 改组件之前

所有对外发布的代码都在 `src/registry/` 里，文档预览、代码展示与 `public/r/*.json` 读取的都是同一份源码。动手前请先读：

- [`AGENTS.md`](./AGENTS.md)：技术栈、目录约定与硬性规则（页面全部预渲染、只用主题变量、按钮高度三档等）；
- [`.agents/skills/component-conventions`](./.agents/skills/component-conventions/SKILL.md)：组件书写规范（分层、命名、data-slot、Props、可访问性、加载与占位）；
- [`.agents/skills/registry-item`](./.agents/skills/registry-item/SKILL.md)：新增或修改 registry 条目的完整流程；
- [`.agents/skills/grid-design`](./.agents/skills/grid-design/SKILL.md)：线条网格的页面布局规范。

用 AI 工具协作时，这些文件同样是给它读的。

## 提交 Pull Request

1. 从 `dev` 新建分支，PR 也提到 `dev`，一个 PR 只做一件事。`master` 只用于发布，合并进去就会自动部署到 yiui.dev。
2. `pnpm install` 会自动启用 `.githooks/` 里的 git 钩子：提交前检查 `public/r` 是否与源码同步，推送前跑 `registry:lint` 和 `pnpm test`。以下检查需要全部通过：

   ```bash
   pnpm registry:build   # 改了发布源码时运行，并提交 public/r
   pnpm lint
   pnpm registry:lint
   pnpm test
   pnpm build
   ```

   改了可交互的组件或示例时，再运行 `pnpm qa:interaction <组件名> --build`；改了文档预览、路由或加载方式时，再运行 `pnpm qa:loading`。完整的对照表见 [`AGENTS.md`](./AGENTS.md) 第 2 节。

   发布前运行 `pnpm qa:install` 验收全部条目；抽测用 `pnpm qa:install value-slider`，命名空间用 `pnpm qa:install --namespace value-slider`。先运行 `pnpm registry:build`；`--fresh` 跳过初始化缓存，`--keep` 保留临时项目，报告在 `.qa/`。

   改了组件外观时，再跑一次截图验收并看一遍报告：`pnpm qa:shots <组件名>`。
3. 提交信息使用 [Conventional Commits](https://www.conventionalcommits.org/) 格式，正文用简体中文，例如 `fix(registry): 数值滑块键盘调节越界`。
4. 在 PR 描述里写清改了什么、为什么改，界面改动附截图（亮色与暗色）。

## 许可证

提交的代码将以 [MIT](./LICENSE) 协议发布。
