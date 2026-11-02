/**
 * 以 src/lib/themes.ts 为唯一来源，生成：
 *  a) src/styles/themes.css —— 整站主题（:root[data-theme]）+ 局部预览作用域（[data-theme-scope]）
 *  b) public/r/theme-<id>.json —— shadcn registry:theme 条目
 *  c) public/r/themes.json —— 主题目录
 *
 * public/r 里的其他文件由 `shadcn build` 生成，这里只写（以及清理）自己的 theme-*.json 与 themes.json，
 * 所以必须排在 `shadcn build` 之后运行（见 package.json 的 registry:build）。
 */
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises"
import path from "node:path"

import { registryItemSchema } from "shadcn/schema"

import {
  COLOR_THEMES,
  DEFAULT_COLOR_THEME,
  formatCssBlock,
  formatThemeLabel,
} from "../src/lib/themes"

const CSS_PATH = "src/styles/themes.css"
const OUT_DIR = "public/r"
const SCHEMA_URL = "https://ui.shadcn.com/schema/registry-item.json"

/** 与 globals.css 中 --edge 的定义保持一致：局部作用域里要重新计算，否则会继承 :root 上已解析的值。 */
const SCOPE_EDGE = {
  light: "color-mix(in oklab, var(--foreground) 10%, transparent)",
  dark: "color-mix(in oklab, var(--foreground) 12%, transparent)",
}

function buildCss() {
  const header = `/*
 * 自动生成，勿手改。来源：src/lib/themes.ts；生成脚本：scripts/build-theme-registry.ts（pnpm themes:build）。
 *
 * - :root[data-theme="x"]            整站颜色主题。写成 :root[data-theme] 以提高优先级，保证盖过 globals.css 里的 :root / .dark。
 * - [data-theme-scope="x"]           局部作用域：只在该元素内部预览主题，不改变整站（用于 /themes 页面）。
 *     · 默认跟随整站亮暗；加 .dark / .light class 可强制该作用域为暗 / 亮。
 * - 线条颜色 --edge 由 foreground 混合得到，局部作用域内重新计算。
 * - 此文件是主题定义，允许出现具体颜色值；其他地方禁止硬编码颜色。
 */
`

  const blocks = COLOR_THEMES.map((theme) => {
    const { id, cssVars } = theme
    const lightVars = { ...cssVars.light }
    const darkVars = { ...cssVars.dark }
    const scopeLight = { ...lightVars, edge: SCOPE_EDGE.light }
    const scopeDark = { ...darkVars, edge: SCOPE_EDGE.dark }

    return [
      `/* ${id} · ${formatThemeLabel(theme)} */\n` +
        formatCssBlock(`:root[data-theme="${id}"]`, lightVars),
      formatCssBlock(`:root[data-theme="${id}"].dark`, darkVars),
      formatCssBlock(`[data-theme-scope="${id}"]`, scopeLight),
      formatCssBlock(
        [
          `.dark [data-theme-scope="${id}"]:not(.light)`,
          `[data-theme-scope="${id}"].dark`,
        ].join(",\n"),
        scopeDark,
      ),
    ].join("\n\n")
  })

  return `${header}\n${blocks.join("\n\n")}\n`
}

async function readHomepage() {
  const registry = JSON.parse(await readFile("registry.json", "utf8")) as {
    homepage?: string
  }
  return (registry.homepage ?? "https://yiui.dev").replace(/\/$/, "")
}

async function main() {
  const homepage = await readHomepage()

  await writeFile(CSS_PATH, buildCss())
  const blockDir = "src/registry/blocks/theme-customizer-01"
  const presets = COLOR_THEMES.map((t) => ({
    value: t.id,
    label: t.name,
    tone: t.cssVars.light.primary,
  }))
  await writeFile(
    `${blockDir}/presets.ts`,
    `// 自动生成：pnpm themes:build；来源 src/lib/themes.ts。安装后可自由增删。\nconst PRESETS = ${JSON.stringify(presets, null, 2)}\nconst DEFAULT_THEME = "${DEFAULT_COLOR_THEME}"\nexport { PRESETS, DEFAULT_THEME }\n`,
  )
  const interfaceVars = (vars: Record<string, string>) =>
    Object.fromEntries(
      Object.entries(vars).filter(([key]) => !key.startsWith("chart-")),
    )
  const customCss = COLOR_THEMES.map((t) =>
    [
      formatCssBlock(`[data-theme="${t.id}"]`, {
        ...interfaceVars(t.cssVars.light),
        edge: SCOPE_EDGE.light,
      }),
      formatCssBlock(
        `.dark [data-theme="${t.id}"]:not(.light), [data-theme="${t.id}"].dark`,
        { ...interfaceVars(t.cssVars.dark), edge: SCOPE_EDGE.dark },
      ),
    ].join("\n"),
  ).join("\n")
  await writeFile(
    `${blockDir}/theme-customizer.css`,
    `/* 自动生成：pnpm themes:build。仅界面 token，不包含图表颜色。 */\n${customCss}\n[data-radius="sm"] { --radius: 0.375rem; }\n[data-radius="md"] { --radius: 0.625rem; }\n[data-radius="lg"] { --radius: 0.875rem; }\n[data-content-width="compact"] { --theme-content-width: 64rem; }\n[data-content-width="wide"] { --theme-content-width: none; }\n.theme-content { width: 100%; max-width: var(--theme-content-width, none); margin-inline: auto; }\n`,
  )

  await mkdir(OUT_DIR, { recursive: true })
  const keep = new Set<string>(["themes.json"])
  const catalog = []

  for (const theme of COLOR_THEMES) {
    const itemName = `theme-${theme.id}`
    const item = registryItemSchema.parse({
      $schema: SCHEMA_URL,
      name: itemName,
      type: "registry:theme",
      title: formatThemeLabel(theme),
      description: theme.description,
      cssVars: theme.cssVars,
    })
    // zod 解析会丢掉 $schema，补回去
    const json = { $schema: SCHEMA_URL, ...item }
    const file = `${itemName}.json`
    keep.add(file)
    await writeFile(
      path.join(OUT_DIR, file),
      JSON.stringify(json, null, 2) + "\n",
    )

    catalog.push({
      id: theme.id,
      group: theme.group,
      name: theme.name,
      title: theme.title,
      description: theme.description,
      url: `${homepage}/r/${file}`,
      install: {
        url: `pnpm dlx shadcn@latest add ${homepage}/r/${file}`,
        namespaced: `pnpm dlx shadcn@latest add @yiui/${itemName}`,
      },
    })
  }

  await writeFile(
    path.join(OUT_DIR, "themes.json"),
    JSON.stringify(
      { name: "yiui-themes", homepage, themes: catalog },
      null,
      2,
    ) + "\n",
  )

  // 清理已经不存在的主题产物，只动 theme-*.json，不碰 shadcn build 生成的其他文件
  for (const file of await readdir(OUT_DIR)) {
    if (
      /^theme-.+\.json$/.test(file) &&
      !keep.has(file) &&
      file !== "theme-customizer-01.json"
    ) {
      await rm(path.join(OUT_DIR, file))
    }
  }

  console.log(
    `themes: 已生成 ${CSS_PATH} 与 ${COLOR_THEMES.length} 个 registry:theme 条目`,
  )
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
