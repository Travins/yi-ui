import Link from "next/link"
import { DocsNavScroll } from "./docs-nav-scroll"
import { sectionNav, type NavSectionId } from "./docs-nav"

const pad = (n: number) => String(n).padStart(2, "0")

/**
 * 当前分区的侧栏，做成「索引表」：顶部是英文分区标签 + 条目计数，
 * 分区标题本身就是回到分区主页的链接（主页若已在列表里则不重复做链接）；
 * 条目通栏一行，左侧编号栏（整个分区内连续编号）；组件类条目英文名为主、中文作副标，不放图标。
 * 有分组时每组一条小标题。选中项的编号栏填斜纹并带主色竖线，悬停填点阵。
 * 样式见 src/styles/docs.css（.docs-nav-*）。
 */
export function DocsSidebarNav({
  current,
  section,
}: {
  current: string
  section: NavSectionId
}) {
  const nav = sectionNav(section)
  const total = nav.groups.reduce((sum, group) => sum + group.items.length, 0)
  const homeListed = nav.groups.some((group) =>
    group.items.some((item) => item.url === nav.url),
  )
  const head = (
    <>
      <span className="docs-nav-eyebrow">
        <span className="docs-nav-eyebrow-en" lang="en" translate="no">
          {nav.titleEn}
        </span>
        <span className="docs-nav-eyebrow-zh"> / {nav.title}</span>
      </span>
      <span className="docs-nav-count">
        <span className="sr-only">，共 </span>
        <span className="docs-nav-count-num">{pad(total)}</span>
        <span className="sr-only"> 项</span>
      </span>
    </>
  )
  // 每组第一项的全局序号偏移：编号在分区内连续
  const offsets = nav.groups.map((_, i) =>
    nav.groups.slice(0, i).reduce((sum, g) => sum + g.items.length, 0),
  )
  return (
    <nav aria-label={`${nav.title}导航`}>
      <div className="docs-nav-group">
        {homeListed ? (
          <p className="docs-nav-head">{head}</p>
        ) : (
          <Link
            className="docs-nav-head"
            href={nav.url}
            aria-current={current === nav.url ? "page" : undefined}
          >
            {head}
          </Link>
        )}
        <DocsNavScroll section={section}>
          {nav.groups.map((group, groupIndex) => {
            const titleId = `docs-nav-${section}-${group.id}`
            return (
              <div
                key={group.id}
                role={group.title ? "group" : undefined}
                aria-labelledby={group.title ? titleId : undefined}
              >
                {group.title ? (
                  <p className="docs-nav-set" id={titleId}>
                    <span className="docs-nav-set-title">
                      <span lang="en" translate="no">
                        {group.titleEn}
                      </span>
                      <span className="docs-nav-set-zh"> / {group.title}</span>
                    </span>
                    <span aria-hidden="true" className="docs-nav-set-rule" />
                  </p>
                ) : null}
                <ul className="docs-nav-list">
                  {group.items.map((item, index) => (
                    <li key={item.url} className="docs-nav-item">
                      <Link
                        className="docs-nav-link"
                        href={item.url}
                        aria-current={current === item.url ? "page" : undefined}
                      >
                        <span aria-hidden="true" className="docs-nav-index">
                          <span>
                            {pad((offsets[groupIndex] ?? 0) + index + 1)}
                          </span>
                        </span>
                        <span className="docs-nav-body">
                          {/* 组件类条目以英文名为主（更直观），中文作副标；没有英文名的只显示中文 */}
                          {item.titleEn ? (
                            <span className="docs-nav-label">
                              <span
                                className="docs-nav-primary"
                                lang="en"
                                translate="no"
                              >
                                {item.titleEn}
                                {item.status === "new" ? (
                                  <span className="ms-1.5 inline-flex h-3.5 items-center rounded-sm bg-(--flow-green)/12 px-1 align-[0.1em] text-[9px] leading-none font-medium text-(--flow-green)">
                                    新<span className="sr-only">增</span>
                                  </span>
                                ) : null}
                              </span>
                              <span className="docs-nav-secondary">
                                {item.title}
                              </span>
                            </span>
                          ) : (
                            <span className="docs-nav-label">
                              <span className="docs-nav-primary">
                                {item.title}
                                {item.status === "new" ? (
                                  <span className="ms-1.5 inline-flex h-3.5 items-center rounded-sm bg-(--flow-green)/12 px-1 align-[0.1em] text-[9px] leading-none font-medium text-(--flow-green)">
                                    新<span className="sr-only">增</span>
                                  </span>
                                ) : null}
                              </span>
                            </span>
                          )}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </DocsNavScroll>
      </div>
    </nav>
  )
}
