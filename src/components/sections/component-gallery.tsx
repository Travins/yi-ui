import { Fragment } from "react"
import Link from "next/link"
import { ArrowUpRight } from "lucide-react"

import { sectionPages } from "@/lib/source"
import {
  GridColumns,
  GridSection,
  GridSeparator,
} from "@/registry/ui/grid-layout/grid-layout"
import { groupEntries } from "@/components/docs/docs-groups"
import { ComponentThumbnail } from "./component-thumbnail"
import { SectionHeading } from "./section-heading"

export function ComponentGallery() {
  const pages = sectionPages("components").filter(
    (page) => page.slugs.length > 1,
  )
  // 分组与侧栏共用 docs-groups.ts 的分组表；没有分组小标题时保持原样。
  const groups = groupEntries("components", pages, (page) => page.data.group)
  const titled = groups.some((group) => group.title)
  const CardTitle = titled ? "h3" : "h2"
  // GridColumns 只负责一行的分栏，横向分隔交给 GridSection。
  const rowsOf = (items: typeof pages) =>
    Array.from({ length: Math.ceil(items.length / 2) }, (_, index) =>
      items.slice(index * 2, index * 2 + 2),
    )

  return (
    <main id="main-content" className="min-w-0">
      <SectionHeading
        label="COMPONENTS"
        count={pages.length}
        title="组件"
        description="Yi UI 的全部组件：从线条、留白与排版开始，构建属于自己的界面。源码开放，复制即用。"
      />
      <GridSeparator />
      {groups.map((group) => (
        <Fragment key={group.id}>
          {group.title ? (
            <GridSection
              aria-labelledby={`component-group-${group.id}`}
              className="flex items-center gap-3 px-4 py-2.5 font-mono text-xs sm:px-6"
            >
              <h2 id={`component-group-${group.id}`} className="uppercase">
                <span lang="en" translate="no">
                  {group.titleEn}
                </span>
                <span className="text-muted-foreground normal-case">
                  {" "}
                  / {group.title}
                </span>
              </h2>
              <span aria-hidden="true" className="h-px flex-1 bg-edge" />
              <span aria-hidden="true" className="text-muted-foreground">
                {String(group.items.length).padStart(2, "0")}
              </span>
            </GridSection>
          ) : null}
          {rowsOf(group.items).map((row) => (
            <GridSection key={row[0]?.url}>
              <GridColumns>
                {row.map((page) => {
                  const name = page.slugs.at(-1)!
                  const titleId = `component-${name}-title`
                  const descriptionId = `component-${name}-description`

                  return (
                    <article key={page.url} className="min-w-0">
                      {/* 不套卡片：演示铺满网格单元，下方一条横线隔出标题栏，和侧栏的索引表同一套线条语言；悬停标题栏时单元顶边亮起主题色线 */}
                      <div className="group/card relative flex h-full flex-col">
                        <span
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-x-0 top-0 z-20 h-px origin-left scale-x-0 bg-primary transition-transform duration-500 ease-out group-has-[a:focus-visible]/card:scale-x-100 group-has-[a:hover]/card:scale-x-100 motion-reduce:transition-none"
                        />
                        <ComponentThumbnail
                          name={name}
                          label={`${page.data.title}演示`}
                        />
                        {/* 只有标题栏是链接：上方的演示可以直接操作，不会误触跳转 */}
                        <div className="group/link relative flex items-stretch border-t border-edge transition-colors has-[a:focus-visible]:bg-muted/30 has-[a:hover]:bg-muted/30">
                          <div className="min-w-0 flex-1 px-4 py-4 sm:px-6">
                            {/* 英文名为主标题，中文名小一号跟在后面 */}
                            <CardTitle
                              id={titleId}
                              className="flex items-baseline gap-2 truncate text-base leading-6 font-medium tracking-tight"
                            >
                              {page.data.titleEn ? (
                                <>
                                  <span
                                    lang="en"
                                    translate="no"
                                    className="group-has-[a:hover]/link:text-primary"
                                  >
                                    {page.data.titleEn}
                                  </span>
                                  <span className="truncate text-[13px] font-normal tracking-normal text-muted-foreground">
                                    {page.data.title}
                                  </span>
                                </>
                              ) : (
                                page.data.title
                              )}
                            </CardTitle>
                            <p
                              id={descriptionId}
                              className="mt-1 line-clamp-2 text-[13px] leading-5 text-muted-foreground"
                            >
                              {page.data.description}
                            </p>
                          </div>
                          <span
                            aria-hidden="true"
                            className="flex w-14 shrink-0 items-center justify-center border-l border-edge text-muted-foreground transition-colors group-has-[a:hover]/link:text-foreground"
                          >
                            <ArrowUpRight className="size-4 transition-transform motion-safe:group-has-[a:hover]/link:translate-x-0.5 motion-safe:group-has-[a:hover]/link:-translate-y-0.5" />
                          </span>
                          <Link
                            href={page.url}
                            aria-labelledby={titleId}
                            aria-describedby={descriptionId}
                            className="absolute inset-0 z-10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
                          />
                        </div>
                      </div>
                    </article>
                  )
                })}
                {/* 一行只有一个组件时补一个空单元，只为保留中间的分栏线 */}
                {row.length === 1 ? (
                  <div aria-hidden="true" className="hidden sm:block" />
                ) : null}
              </GridColumns>
            </GridSection>
          ))}
        </Fragment>
      ))}
    </main>
  )
}
