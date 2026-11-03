import registry from "../../../registry.json"
import { siteConfig } from "@/config/site"
import { blogPosts } from "@/lib/source"
import { absoluteUrl, docsPages } from "@/lib/site-content"

export const dynamic = "force-static"

export function GET() {
  const text =
    [
      `# ${siteConfig.name}`,
      `> ${siteConfig.description}。基于 Next.js，页面全部在构建时预渲染，提供可复制的 React 组件源码、中文文档与实践文章。`,
      "组件库名为 Yi UI，采用 React、Tailwind CSS v4 与 shadcn/ui（Base UI）。所有链接使用站点正式域名；全文原始 MDX 见下方链接。",
      '安装：先在目标项目初始化 shadcn，再运行 `pnpm dlx shadcn@latest add https://yiui.dev/r/<name>.json`。Yi UI 已收录进 shadcn 官方 Registry 目录，也可直接运行 `pnpm dlx shadcn@latest add @yiui/<name>`，无需配置 components.json。',
      "## 组件",
      ...registry.items
        .filter((item) => item.type === "registry:ui")
        .map(
          (item) =>
            `- [${item.name}](${absoluteUrl(`/components/${item.name}/`)}): ${item.description} Registry JSON: [${item.name}.json](${absoluteUrl(`/r/${item.name}.json`)})`,
        ),
      "## 文档",
      ...docsPages().map(
        (page) =>
          `- [${page.data.title}](${absoluteUrl(page.url)}): ${page.data.description ?? ""}`,
      ),
      "## 博客",
      ...blogPosts().map(
        (post) =>
          `- [${post.data.title}](${absoluteUrl(post.url)}): ${post.data.description}`,
      ),
      "## 其他资源",
      `- [全部文档与博客原文](${absoluteUrl("/llms-full.txt")}): 去除 frontmatter 的 MDX 全文。`,
      "- Agent 技能：`npx skills add Travins/yi-ui --skill yi-ui`。",
      "- 每个条目的 Agent 版文档（含示例代码和属性表）：`https://yiui.dev/md/components/<name>.md`，区块和页面把 components 换成 blocks、pages。",
      `- [安装](${absoluteUrl("/docs/installation/")}): 初始化 shadcn 并安装第一个组件。`,
      `- [Registry 与命名空间](${absoluteUrl("/docs/registry/")}): 用 URL 或 @yiui 命名空间安装组件。`,
      `- [主题](${absoluteUrl("/themes/")}): 颜色主题。`,
      `- [RSS](${absoluteUrl("/rss.xml")}): 博客订阅。`,
    ].join("\n\n") + "\n"
  return new Response(text, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  })
}
