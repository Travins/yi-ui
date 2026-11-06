import { blog, docs } from "../../.source/server"
import { toFumadocsSource } from "fumadocs-mdx/runtime/server"
import { flattenTree } from "fumadocs-core/page-tree"
import { loader } from "fumadocs-core/source"
import { siteConfig } from "@/config/site"

// 内容语言与 URL 生成集中配置，未来增加英文时无需修改正文组件。
export const source = loader({
  baseUrl: "/",
  source: docs.toFumadocsSource(),
  i18n: {
    languages: [...siteConfig.languages],
    defaultLanguage: siteConfig.defaultLanguage,
  },
  url: (slugs, locale) =>
    `${locale && locale !== siteConfig.defaultLanguage ? `/${locale}` : ""}/${slugs.join("/")}/`,
})

// 草稿在 loader 层排除，页面、订阅与文本输出共享同一发布边界。
export const blogSource = loader({
  baseUrl: "/blog",
  source: toFumadocsSource(
    blog.docs.filter((post) => !post.draft),
    blog.meta,
  ),
  url: (slugs) => `/blog/${slugs.join("/")}/`,
})

export function blogPosts() {
  return blogSource
    .getPages()
    .map((post) => ({ ...post, url: `${post.url.replace(/\/$/, "")}/` }))
    .sort(
      (a, b) =>
        b.data.date.localeCompare(a.data.date) || a.url.localeCompare(b.url),
    )
}

export type DocsSection = "docs" | "components"

/** 某个内容分区下的全部文档页，顺序与 meta.json 一致。 */
export function sectionPages(section: string) {
  const order = new Map(
    flattenTree(source.getPageTree(siteConfig.defaultLanguage).children).map(
      (page, index) => [page.url, index],
    ),
  )
  return source
    .getPages(siteConfig.defaultLanguage)
    .filter((page) => page.slugs[0] === section)
    .sort((a, b) => (order.get(a.url) ?? 0) - (order.get(b.url) ?? 0))
}

/** 组件、区块、页面的英文名（来自 MDX 的 titleEn），没有则为 undefined。 */
export function entryTitleEn(section: string, name: string) {
  return source.getPage([section, name], siteConfig.defaultLanguage)?.data
    .titleEn
}

/** 区块 / 页面条目在 MDX frontmatter 里登记的分组 id（见 docs-groups.ts） */
export function entryGroup(section: string, name: string) {
  return source.getPage([section, name], siteConfig.defaultLanguage)?.data.group
}
