import { Fragment } from "react"
import Link from "next/link"
import { ArrowUpRight } from "lucide-react"

import { entryGroup, entryTitleEn } from "@/lib/source"
import { BlockViewer } from "@/components/docs/block-viewer"
import { groupEntries } from "@/components/docs/docs-groups"
import {
  entrySections,
  sectionItems,
  type EntrySection,
} from "@/components/docs/registry-items"
import {
  GridSection,
  GridSeparator,
} from "@/registry/ui/grid-layout/grid-layout"
import { SectionHeading } from "./section-heading"

const descriptions: Record<EntrySection, string> = {
  blocks:
    "可直接安装的完整区块。切换设备宽度查看布局，或打开代码，把需要的部分带进你的项目。",
  pages:
    "从完整页面开始搭建。直接在下方操作页面、切换设备宽度或打开代码，再通过文档安装和调整。",
}

const linkClassName =
  "inline-flex min-h-11 items-center gap-1.5 text-sm underline underline-offset-4 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"

export function EntryGallery({ section }: { section: EntrySection }) {
  const items = sectionItems(section)
  const { label, title } = entrySections[section]
  // 分组与侧栏共用 docs-groups.ts 的分组表；没有登记分组的分区（如页面）只有默认组，保持原样
  const groups = groupEntries(section, items, (item) =>
    entryGroup(section, item.name),
  )
  const titled = groups.filter((group) => group.title)
  const groupAnchor = (id: string) => `${section}-group-${id}`
  // 有分组小标题时，分组是 h2、条目降为 h3，保持标题层级连续
  const ItemTitle = titled.length > 0 ? "h3" : "h2"

  return (
    <main id="main-content" className="min-w-0">
      <SectionHeading
        label={label}
        count={items.length}
        title={title}
        description={descriptions[section]}
      />
      <GridSeparator />
      {titled.length > 1 ? (
        // 每个区块都是一整块可操作的预览，页面很长：顶部放一行分组目录，点一下跳到对应分组
        <GridSection className="px-4 py-3 sm:px-6">
          <nav aria-label={`${title}分组`}>
            <ul className="flex flex-wrap gap-x-6 gap-y-1 font-mono text-xs">
              {titled.map((group) => (
                <li key={group.id}>
                  <a
                    href={`#${groupAnchor(group.id)}`}
                    className="inline-flex min-h-8 items-center gap-1.5 underline-offset-4 hover:text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring pointer-coarse:min-h-11"
                  >
                    <span lang="en" translate="no" className="uppercase">
                      {group.titleEn}
                    </span>
                    <span className="text-muted-foreground">
                      {group.title} ·{" "}
                      {String(group.items.length).padStart(2, "0")}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </GridSection>
      ) : null}
      {groups.map((group, groupIndex) => (
        <Fragment key={group.id}>
          {group.title ? (
            <>
              {groupIndex > 0 || titled.length > 1 ? <GridSeparator /> : null}
              <GridSection
                id={groupAnchor(group.id)}
                aria-labelledby={`${groupAnchor(group.id)}-title`}
                className="flex scroll-mt-(--header-height) items-center gap-3 px-4 py-2.5 font-mono text-xs sm:px-6"
              >
                <h2 id={`${groupAnchor(group.id)}-title`} className="uppercase">
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
            </>
          ) : null}
          {group.items.map((item, index) => (
            <Fragment key={item.name}>
              {index > 0 ? <GridSeparator /> : null}
              <GridSection className="min-w-0 px-4 py-6 sm:px-6 sm:py-8">
                {/* 区块与页面都直接放可操作的查看器：能点、能切设备宽度、能看代码，不必先打开预览 */}
                <BlockViewer name={item.name} />
                <div className="mt-6 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
                  <div className="max-w-2xl min-w-0">
                    <div className="flex items-center gap-3">
                      <div className="min-w-0">
                        {/* 英文名为主标题（更直观），中文名小一号放在下一行 */}
                        <ItemTitle className="text-xl leading-6 font-medium tracking-tight">
                          {entryTitleEn(section, item.name) ? (
                            <>
                              <span lang="en" translate="no">
                                {entryTitleEn(section, item.name)}
                              </span>
                              <span className="mt-0.5 block text-[13px] leading-5 font-normal tracking-normal text-muted-foreground">
                                {item.title}
                              </span>
                            </>
                          ) : (
                            item.title
                          )}
                        </ItemTitle>
                      </div>
                    </div>
                    <p className="mt-4 text-sm leading-7 text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-x-5 gap-y-1">
                    <Link
                      href={`/${section}/${item.name}/`}
                      aria-label={`查看${item.title}文档`}
                      className={linkClassName}
                    >
                      查看文档
                      <ArrowUpRight aria-hidden="true" className="size-4" />
                    </Link>
                  </div>
                </div>
              </GridSection>
            </Fragment>
          ))}
        </Fragment>
      ))}
    </main>
  )
}
