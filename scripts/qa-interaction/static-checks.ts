/** 静态检查：读示例源码，不开浏览器（⑦⑨）。 */
import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"

import { CHECKS } from "./constants"
import { add, type Ctx } from "./context"

/* ------------------------------------------------------------------ */
/* ⑦ 错误能消失 / ⑨ 示例卡片规范（静态检查）                            */
/* ------------------------------------------------------------------ */

/** 只找这个组件自己的示例文件：src/registry/examples/<name>-*.tsx */
export function exampleFiles(component: string): string[] {
  try {
    return readdirSync("src/registry/examples")
      .filter(
        (file) => file.startsWith(`${component}-`) && file.endsWith(".tsx"),
      )
      .map((file) => join("src/registry/examples", file))
  } catch {
    return []
  }
}

/** 示例里写死 error 属性，错误永远消不掉：改成随值计算 */
export function checkHardcodedError(ctx: Ctx, files: string[]) {
  for (const file of files) {
    const lines = readFileSync(file, "utf8").split("\n")
    lines.forEach((line, index) => {
      if (!/\berror=(?:"|'|\{["'`])/.test(line)) return
      add(
        ctx,
        CHECKS.errorClear,
        `${file}:${index + 1}`,
        `示例写死了 error：${line.trim().slice(0, 90)} —— 硬编码的错误永远不消失，应改成随值计算`,
        "error",
        null,
      )
    })
  }
}

/**
 * 示例最外层卡片：写了 `rounded-xl border` 就要配 `p-4` 与 `shadow-xs`，
 * 否则组件页里的卡片框和内边距各写各的。手机壳外框（*-mobile-demo）不在此列。
 */
export function checkExampleCards(ctx: Ctx, files: string[]) {
  for (const file of files) {
    if (/-mobile-demo\.tsx$/.test(file)) continue
    // 有意的整版布局：控制面板两栏网格 / 动作展台、二维拖拽板满幅网格卡片，不套用 p-4 卡片规范
    if (
      /(control-panel-demo|control-panel-actions-demo|xy-pad-demo|xy-pad-view-demo)\.tsx$/.test(
        file,
      )
    )
      continue
    const source = readFileSync(file, "utf8")
    for (const match of source.matchAll(/"([^"\n]*rounded-xl[^"\n]*)"/g)) {
      const value = match[1] ?? ""
      const tokens = value.split(/\s+/)
      const hasBorder = tokens.some(
        (token) => token === "border" || token.startsWith("border-"),
      )
      if (!hasBorder) continue
      // 固定尺寸的图标块（size-14 / size-16 之类）不是卡片
      if (tokens.some((token) => /^size-\d+$/.test(token))) continue
      // 分区卡片：overflow-hidden 加各分区自带内边距（如 checklist 的头部 + 列表），外框不加 p-4
      if (tokens.includes("overflow-hidden") && tokens.includes("shadow-xs"))
        continue
      // max-w-xs 的密排卡片（compact 档）用 p-3 是同一种紧凑尺度，不算偏离规范
      const compactCard = tokens.includes("max-w-xs")
      const hasPadding =
        tokens.includes("p-4") || (compactCard && tokens.includes("p-3"))
      const missing: string[] = []
      if (!hasPadding) missing.push("p-4")
      if (!tokens.includes("shadow-xs")) missing.push("shadow-xs")
      if (!missing.length) continue
      add(
        ctx,
        CHECKS.cardSpec,
        file,
        `示例卡片缺少 ${missing.join(" / ")}：className="${value.slice(0, 100)}"`,
        "warn",
        null,
      )
    }
  }
}
