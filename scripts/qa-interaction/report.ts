/** 报告渲染：把问题与场景结果拼成一页 HTML。 */
import type { ScenarioResult } from "../qa-scenarios/types"
import { CHECKS } from "./constants"
import type { Issue } from "./context"

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

export function renderReport({
  names,
  base,
  stamp,
  issues,
  seconds,
  scenarios,
}: {
  names: string[]
  base: string
  stamp: string
  issues: Issue[]
  seconds: number
  scenarios: ScenarioResult[]
}) {
  const errors = issues.filter((issue) => issue.level === "error").length
  const warnings = issues.length - errors
  const components = names.filter((name) =>
    issues.some((issue) => issue.component === name),
  )
  const card = (issue: Issue) => `
    <article class="issue ${issue.level}">
      <header>
        <span class="badge">${issue.level === "error" ? "错误" : "警告"}</span>
        <b>${escapeHtml(issue.check)}</b>
      </header>
      <p class="where">${escapeHtml(issue.where)}</p>
      <p class="message">${escapeHtml(issue.message)}</p>
      ${
        issue.screenshot
          ? `<figure><img src="${issue.screenshot}" loading="lazy" alt=""><figcaption>${issue.screenshot}</figcaption></figure>`
          : `<p class="noshot">（没有截图）</p>`
      }
    </article>`
  return `<!doctype html><meta charset="utf-8"><title>交互验收 · ${escapeHtml(names.join(", "))}</title>
<style>
body{font:14px/1.6 system-ui,-apple-system,"PingFang SC",sans-serif;margin:24px;background:#f6f6f6;color:#111}
h1{font-size:18px;margin:0 0 6px}
h2{font-size:15px;margin:26px 0 10px;padding-bottom:6px;border-bottom:1px solid #ddd}
.meta{color:#666;font-size:12px}
.summary{margin:12px 0;padding:10px 14px;border-radius:8px;background:${errors ? "#fff4f4" : "#f2fbf4"};border:1px solid ${errors ? "#f0c4c4" : "#bfe3c8"}}
.issue{background:#fff;border:1px solid #e2e2e2;border-left-width:4px;border-radius:8px;padding:10px 14px;margin:0 0 12px}
.issue.error{border-left-color:#d33}
.issue.warn{border-left-color:#e0a020}
.issue header{display:flex;gap:8px;align-items:center;font-size:13px}
.badge{font-size:11px;padding:1px 6px;border-radius:4px;background:#eee;color:#444}
.issue.error .badge{background:#fde8e8;color:#a11}
.issue.warn .badge{background:#fdf3e0;color:#8a5a00}
.where{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;color:#555;margin:6px 0}
.message{margin:6px 0 8px}
figure{margin:0}
figure img{max-width:min(100%,520px);border:1px solid #ddd;border-radius:6px;display:block}
figcaption{font-size:11px;color:#888;margin-top:3px}
.noshot{font-size:12px;color:#888;margin:0}
.ok{color:#3a7d44}
</style>
<h1>表单 / 可交互组件交互验收</h1>
<p class="meta">目标：${escapeHtml(names.join("、"))} · 地址 ${escapeHtml(base)} · 生成于 ${stamp} · 用时 ${seconds}s</p>
<div class="summary"><b>${errors} 个错误 · ${warnings} 个警告</b>${issues.length ? "" : ' <span class="ok">没有发现问题</span>'}</div>
${
  components.length
    ? components
        .map(
          (
            name,
          ) => `<h2>${escapeHtml(name)}（${issues.filter((issue) => issue.component === name).length}）</h2>
${issues
  .filter((issue) => issue.component === name)
  .map(card)
  .join("")}`,
        )
        .join("")
    : `<p class="ok">全部通过。</p>`
}
<h2>条目交互场景</h2>
${scenarios
  .map(
    (r) =>
      `<article class="issue"><b>${escapeHtml(r.component)} · ${escapeHtml(r.viewport)} · ${escapeHtml(r.step)}：${r.passed ? "通过" : "失败"}</b><p>${escapeHtml(r.message ?? "")}</p>${r.screenshots
        .filter(Boolean)
        .map((file) => `<figure><img src="${file}" alt="场景截图"></figure>`)
        .join("")}</article>`,
  )
  .join("")}
<p class="meta">检查项：${escapeHtml(Object.values(CHECKS).join("、"))}</p>`
}
