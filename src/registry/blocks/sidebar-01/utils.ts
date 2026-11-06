import type { Sidebar01Group, Sidebar01Item } from "./types"

/** 去掉查询串、哈希与末尾斜杠，便于比较（项目使用 trailingSlash 时尤其需要）。 */
function normalizeHref(href: string) {
  const path = href.split(/[?#]/)[0] ?? ""
  return path.length > 1 ? path.replace(/\/+$/, "") : path || "/"
}

function matches(current: string, href: string) {
  const target = normalizeHref(href)
  return current === target || current.startsWith(`${target}/`)
}

/** 所有可跳转的 href（父项自身没有 href 时不算）。 */
function collectHrefs(groups: Sidebar01Group[], footerItems: Sidebar01Item[]) {
  const hrefs: string[] = []
  const visit = (item: Sidebar01Item) => {
    if (item.href) hrefs.push(item.href)
    for (const sub of item.items ?? []) hrefs.push(sub.href)
  }
  for (const group of groups) group.items.forEach(visit)
  footerItems.forEach(visit)
  return hrefs
}

/** 在所有条目里找出与当前地址匹配最长的那个 href（已规范化），没有命中返回 undefined。 */
function findActiveHref(hrefs: string[], currentHref?: string) {
  if (!currentHref) return undefined
  const current = normalizeHref(currentHref)
  let best: string | undefined
  for (const href of hrefs) {
    if (!matches(current, href)) continue
    const normalized = normalizeHref(href)
    if (!best || normalized.length > best.length) best = normalized
  }
  return best
}

/** 当前页面所在的父项 id，用来决定初始展开哪一项。 */
function findActiveParentId(groups: Sidebar01Group[], activeHref?: string) {
  if (!activeHref) return undefined
  for (const group of groups) {
    for (const item of group.items) {
      if (item.items?.some((sub) => normalizeHref(sub.href) === activeHref)) {
        return item.id
      }
    }
  }
  return undefined
}

/** 面包屑：分组 → 一级 → 二级，未命中返回空数组。 */
function findTrail(
  groups: Sidebar01Group[],
  footerItems: Sidebar01Item[],
  activeHref?: string,
) {
  if (!activeHref) return []
  for (const group of groups) {
    for (const item of group.items) {
      if (item.href && normalizeHref(item.href) === activeHref) {
        return [group.label, item.label]
      }
      const sub = item.items?.find((s) => normalizeHref(s.href) === activeHref)
      if (sub) return [group.label, item.label, sub.label]
    }
  }
  for (const item of footerItems) {
    if (item.href && normalizeHref(item.href) === activeHref)
      return [item.label]
  }
  return []
}

/** 按关键字过滤导航：匹配父项名称时保留全部子项，只匹配子项时只保留命中的子项。 */
function filterGroups(groups: Sidebar01Group[], query: string) {
  const keyword = query.trim().toLowerCase()
  if (!keyword) return groups
  const hit = (text: string) => text.toLowerCase().includes(keyword)
  return groups
    .map((group) => ({
      ...group,
      items: group.items.flatMap((item): Sidebar01Item[] => {
        if (hit(item.label)) return [item]
        const subs = item.items?.filter((sub) => hit(sub.label)) ?? []
        return subs.length ? [{ ...item, items: subs }] : []
      }),
    }))
    .filter((group) => group.items.length > 0)
}

function formatLabel(template: string, values: Record<string, string>) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? "")
}

export {
  collectHrefs,
  filterGroups,
  findActiveHref,
  findActiveParentId,
  findTrail,
  formatLabel,
  normalizeHref,
}
