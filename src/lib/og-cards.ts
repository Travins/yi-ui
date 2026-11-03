import type { OgCardProps } from "@/lib/og"
import { siteConfig } from "@/config/site"
import { blogPosts, source } from "@/lib/source"

const kinds: Record<string, string> = {
  docs: "DOCS · 文档",
  components: "YI UI · 组件",
  blocks: "BLOCKS · 区块",
  pages: "PAGES · 页面",
}

/** 没有专属卡片的页面（首页、404 等）使用的默认卡片 key */
export const DEFAULT_OG_KEY = "default"

/**
 * 全站分享卡片清单：key 即 /og/<key>.png 的路径。
 * 文档类页面取 MDX 的标题 / titleEn / description，博客取文章标题与摘要。
 */
export function ogCards(): (OgCardProps & { key: string })[] {
  return [
    {
      key: DEFAULT_OG_KEY,
      kind: "YI UI · 组件库",
      title: "线条网格组件库",
      titleEn: "Line-grid Component Library",
      description:
        "Yi UI（易）：为中文界面打磨的线条网格 React 组件库，以 shadcn registry 分发，由 Travins 个人维护。",
      path: "/",
    },
    {
      key: "blog",
      kind: "BLOG · 博客",
      title: "博客",
      titleEn: "Blog",
      description: "关于组件、设计与个人网站的实践记录。",
      path: "/blog/",
    },
    {
      key: "themes",
      kind: "THEMES · 主题",
      title: "主题",
      titleEn: "Themes",
      description:
        "每套颜色主题在统计卡、图表、清单、设置控件与表单上的表现，一键应用到整站。",
      path: "/themes/",
    },
    ...source.getPages(siteConfig.defaultLanguage).map((page) => ({
      key: page.slugs.join("/"),
      kind: kinds[page.slugs[0] ?? ""] ?? "DOCS · 文档",
      title: page.data.title,
      titleEn: page.data.titleEn,
      description: page.data.description,
      // 站点开了 trailingSlash，文档页的 url 不带结尾斜杠，补上与实际地址一致
      path: page.url.endsWith("/") ? page.url : `${page.url}/`,
    })),
    ...blogPosts().map((post) => ({
      key: `blog/${post.slugs[0]}`,
      kind: "BLOG · 博客",
      title: post.data.title,
      description: post.data.description,
      path: post.url,
    })),
  ]
}
