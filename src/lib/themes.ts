/**
 * 颜色主题（唯一来源）。
 *
 * 这里同时包含元数据和每个主题亮 / 暗两组完整的 CSS 变量。以下产物都由它生成：
 * - src/styles/themes.css                 （`pnpm themes:build`）
 * - public/r/theme-<id>.json、themes.json （shadcn registry:theme 条目与目录）
 * - /themes 页面的预览与「复制代码」
 *
 * 色值取自 Tailwind CSS v4 默认调色板（oklch），按两组组织：
 * - 中性基底（neutral / stone / slate）：整套界面的灰阶都带对应灰族的色偏。
 *   原来的 zinc / gray 与 neutral、slate 的差别太小，放在一起根本分不开，所以不再单列。
 * - 彩色（11 个）：沿色相环取样、彼此间隔明显；primary 亮色取 600 / 700，暗色取 400 / 500，
 *   前景色按 WCAG AA（4.5:1）挑选；灰阶表面带一点同色相的色偏。
 *   对比度由 scripts/theme-contrast.ts 校验。
 * 不包含 --radius，圆角由使用者自己的 globals.css 决定。
 *
 * 亮暗模式是另一个独立维度，由 next-themes 通过 `.dark` class 控制。
 * 注意：此文件会被 scripts/build-theme-registry.ts 直接运行，不要使用 `@/` 别名导入。
 */

export type ThemeVars = Record<string, string> &
  Record<
    | "background"
    | "primary"
    | "primary-foreground"
    | "foreground"
    | "muted-foreground"
    | "muted"
    | "destructive",
    string
  >

export type ThemeVarSets = { light: ThemeVars; dark: ThemeVars }

export type ThemeGroupId = "base" | "color"

export type ColorTheme = {
  id: string
  /** 所属分组 */
  group: ThemeGroupId
  /** 中文名 */
  name: string
  /** 英文名（Tailwind 色名） */
  title: string
  description: string
  /** 预览色（亮 / 暗模式下的代表色：彩色主题是 primary，中性基底是灰族中间调），由 cssVars 派生 */
  preview: { light: string; dark: string }
  /** 色块的 background-image：彩色主题是纯色，中性基底是三段色带，让色偏看得出来 */
  swatch: { light: string; dark: string }
  /** 完整变量集，键名不带 `--` 前缀，与 globals.css 一致 */
  cssVars: ThemeVarSets
}

export type ThemeGroup = {
  id: ThemeGroupId
  name: string
  title: string
  description: string
}

/** 分组（按选择器里的展示顺序）。 */
export const THEME_GROUPS: readonly ThemeGroup[] = [
  {
    id: "base",
    name: "中性基底",
    title: "Neutrals",
    description: "灰阶带不同色偏：无色、偏暖、偏冷",
  },
  {
    id: "color",
    name: "彩色",
    title: "Colors",
    description: "按色相环排列",
  },
]

/* -------------------------------------------------------------------------- */
/*                               Tailwind 色阶                                 */
/* -------------------------------------------------------------------------- */

type Lch = readonly [l: number, c: number, h: number]

const oklch = ([l, c, h]: Lch) => `oklch(${l} ${c} ${h})`
const tone = (l: number, c: number, h: number) => oklch([l, c, h])

const WHITE = "oklch(1 0 0)"
const ALPHA_BORDER = "oklch(1 0 0 / 10%)"
const ALPHA_INPUT = "oklch(1 0 0 / 15%)"

/** 与 shadcn 一致的危险色。 */
const DESTRUCTIVE = {
  light: "oklch(0.577 0.245 27.325)",
  dark: "oklch(0.704 0.191 22.216)",
}

type Shade = 200 | 300 | 400 | 500 | 600 | 700 | 800
type ColorRamp = Record<Shade, Lch>

const COLOR_RAMPS = {
  red: {
    200: [0.885, 0.062, 18.334],
    300: [0.808, 0.114, 19.571],
    400: [0.704, 0.191, 22.216],
    500: [0.637, 0.237, 25.331],
    600: [0.577, 0.245, 27.325],
    700: [0.505, 0.213, 27.518],
    800: [0.444, 0.177, 26.899],
  },
  orange: {
    200: [0.901, 0.076, 70.697],
    300: [0.837, 0.128, 66.29],
    400: [0.75, 0.183, 55.934],
    500: [0.705, 0.213, 47.604],
    600: [0.646, 0.222, 41.116],
    700: [0.553, 0.195, 38.402],
    800: [0.47, 0.157, 37.304],
  },
  amber: {
    200: [0.924, 0.12, 95.746],
    300: [0.879, 0.169, 91.605],
    400: [0.828, 0.189, 84.429],
    500: [0.769, 0.188, 70.08],
    600: [0.666, 0.179, 58.318],
    700: [0.555, 0.163, 48.998],
    800: [0.473, 0.137, 46.201],
  },
  lime: {
    200: [0.938, 0.127, 124.321],
    300: [0.897, 0.196, 126.665],
    400: [0.841, 0.238, 128.85],
    500: [0.768, 0.233, 130.85],
    600: [0.648, 0.2, 131.684],
    700: [0.532, 0.157, 131.589],
    800: [0.453, 0.124, 130.933],
  },
  green: {
    200: [0.925, 0.084, 155.995],
    300: [0.871, 0.15, 154.449],
    400: [0.792, 0.209, 151.711],
    500: [0.723, 0.219, 149.579],
    600: [0.627, 0.194, 149.214],
    700: [0.527, 0.154, 150.069],
    800: [0.448, 0.119, 151.328],
  },
  teal: {
    200: [0.91, 0.096, 180.426],
    300: [0.855, 0.138, 181.071],
    400: [0.777, 0.152, 181.912],
    500: [0.704, 0.14, 182.503],
    600: [0.6, 0.118, 184.704],
    700: [0.511, 0.096, 186.391],
    800: [0.437, 0.078, 188.216],
  },
  sky: {
    200: [0.901, 0.058, 230.902],
    300: [0.828, 0.111, 230.318],
    400: [0.746, 0.16, 232.661],
    500: [0.685, 0.169, 237.323],
    600: [0.588, 0.158, 241.966],
    700: [0.5, 0.134, 242.749],
    800: [0.443, 0.11, 240.79],
  },
  blue: {
    200: [0.882, 0.059, 254.128],
    300: [0.809, 0.105, 251.813],
    400: [0.707, 0.165, 254.624],
    500: [0.623, 0.214, 259.815],
    600: [0.546, 0.245, 262.881],
    700: [0.488, 0.243, 264.376],
    800: [0.424, 0.199, 265.638],
  },
  violet: {
    200: [0.894, 0.057, 293.283],
    300: [0.811, 0.111, 293.571],
    400: [0.702, 0.183, 293.541],
    500: [0.606, 0.25, 292.717],
    600: [0.541, 0.281, 293.009],
    700: [0.491, 0.27, 292.581],
    800: [0.432, 0.232, 292.759],
  },
  fuchsia: {
    200: [0.903, 0.076, 319.62],
    300: [0.833, 0.145, 321.434],
    400: [0.74, 0.238, 322.16],
    500: [0.667, 0.295, 322.15],
    600: [0.591, 0.293, 322.896],
    700: [0.518, 0.253, 323.949],
    800: [0.452, 0.211, 324.591],
  },
  pink: {
    200: [0.899, 0.061, 343.231],
    300: [0.823, 0.12, 346.018],
    400: [0.718, 0.202, 349.761],
    500: [0.656, 0.241, 354.308],
    600: [0.592, 0.249, 0.584],
    700: [0.525, 0.223, 3.958],
    800: [0.459, 0.187, 3.815],
  },
} satisfies Record<string, ColorRamp>

type GrayShade = 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950
type GrayRamp = Record<GrayShade, Lch>

/** 把 Tailwind stone 的明度保留，色相固定在暖黄褐（约 65°），色度放大到约 2 倍：原版色度只有 0.003–0.013，肉眼几乎看不出和 neutral 的区别。 */
const STONE_HUE = 65
const stoneStep = (l: number, c: number): Lch => [l, c, STONE_HUE]

const GRAY_RAMPS = {
  neutral: {
    50: [0.985, 0, 0],
    100: [0.97, 0, 0],
    200: [0.922, 0, 0],
    300: [0.87, 0, 0],
    400: [0.708, 0, 0],
    500: [0.556, 0, 0],
    600: [0.439, 0, 0],
    700: [0.371, 0, 0],
    800: [0.269, 0, 0],
    900: [0.205, 0, 0],
    950: [0.145, 0, 0],
  },
  stone: {
    50: stoneStep(0.985, 0.004),
    100: stoneStep(0.97, 0.006),
    200: stoneStep(0.923, 0.01),
    300: stoneStep(0.869, 0.014),
    400: stoneStep(0.709, 0.02),
    500: stoneStep(0.553, 0.026),
    600: stoneStep(0.444, 0.026),
    700: stoneStep(0.374, 0.024),
    800: stoneStep(0.268, 0.02),
    900: stoneStep(0.216, 0.018),
    950: stoneStep(0.147, 0.014),
  },
  slate: {
    50: [0.984, 0.003, 247.858],
    100: [0.968, 0.007, 247.896],
    200: [0.929, 0.013, 255.508],
    300: [0.869, 0.022, 252.894],
    400: [0.704, 0.04, 256.788],
    500: [0.554, 0.046, 257.417],
    600: [0.446, 0.043, 257.281],
    700: [0.372, 0.044, 257.287],
    800: [0.279, 0.041, 260.031],
    900: [0.208, 0.042, 265.755],
    950: [0.129, 0.042, 264.695],
  },
} satisfies Record<string, GrayRamp>

/* -------------------------------------------------------------------------- */
/*                                  变量生成                                   */
/* -------------------------------------------------------------------------- */

/** 中性基底：所有灰阶都取自对应灰族，neutral 与 shadcn 官方 neutral 一致。 */
function baseVars(r: GrayRamp): ThemeVarSets {
  const chart = {
    "chart-1": oklch(r[300]),
    "chart-2": oklch(r[500]),
    "chart-3": oklch(r[600]),
    "chart-4": oklch(r[700]),
    "chart-5": oklch(r[800]),
  }
  return {
    light: {
      background: WHITE,
      foreground: oklch(r[950]),
      card: WHITE,
      "card-foreground": oklch(r[950]),
      popover: WHITE,
      "popover-foreground": oklch(r[950]),
      primary: oklch(r[900]),
      "primary-foreground": oklch(r[50]),
      secondary: oklch(r[100]),
      "secondary-foreground": oklch(r[900]),
      muted: oklch(r[100]),
      "muted-foreground": oklch(r[500]),
      accent: oklch(r[100]),
      "accent-foreground": oklch(r[900]),
      destructive: DESTRUCTIVE.light,
      border: oklch(r[200]),
      input: oklch(r[200]),
      ring: oklch(r[400]),
      ...chart,
      sidebar: oklch(r[50]),
      "sidebar-foreground": oklch(r[950]),
      "sidebar-primary": oklch(r[900]),
      "sidebar-primary-foreground": oklch(r[50]),
      "sidebar-accent": oklch(r[100]),
      "sidebar-accent-foreground": oklch(r[900]),
      "sidebar-border": oklch(r[200]),
      "sidebar-ring": oklch(r[400]),
    },
    dark: {
      background: oklch(r[950]),
      foreground: oklch(r[50]),
      card: oklch(r[900]),
      "card-foreground": oklch(r[50]),
      popover: oklch(r[900]),
      "popover-foreground": oklch(r[50]),
      primary: oklch(r[200]),
      "primary-foreground": oklch(r[900]),
      secondary: oklch(r[800]),
      "secondary-foreground": oklch(r[50]),
      muted: oklch(r[800]),
      "muted-foreground": oklch(r[400]),
      accent: oklch(r[800]),
      "accent-foreground": oklch(r[50]),
      destructive: DESTRUCTIVE.dark,
      border: ALPHA_BORDER,
      input: ALPHA_INPUT,
      ring: oklch(r[500]),
      ...chart,
      sidebar: oklch(r[900]),
      "sidebar-foreground": oklch(r[50]),
      "sidebar-primary": oklch(r[200]),
      "sidebar-primary-foreground": oklch(r[900]),
      "sidebar-accent": oklch(r[800]),
      "sidebar-accent-foreground": oklch(r[50]),
      "sidebar-border": ALPHA_BORDER,
      "sidebar-ring": oklch(r[500]),
    },
  }
}

type ColorSpec = {
  /** 亮色 primary 取哪一档（按钮一律白字，取能让白字达标的档位） */
  light: { primary: Shade | Lch }
  /** 暗色 primary 取哪一档（与亮色一样配白字，取能让白字达标的档位） */
  dark: { primary: Shade | Lch }
  /** 主色本身接近危险色时，把危险色拉开（亮色更深、暗色更浅） */
  destructive?: { light: string; dark: string }
}

/** 彩色主题：primary / ring / chart 取自 Tailwind 色阶，灰阶表面带同色相的轻微色偏。 */
function colorVars(r: ColorRamp, spec: ColorSpec): ThemeVarSets {
  const hue = r[500][2]
  const destructive = spec.destructive ?? DESTRUCTIVE

  const lightPrimary = oklch(
    typeof spec.light.primary === "number"
      ? r[spec.light.primary]
      : spec.light.primary,
  )
  // 彩色主题按钮一律白字：深色字压在饱和色上显得发脏，统一白字观感更协调
  const lightOnPrimary = WHITE
  const darkPrimary = oklch(
    typeof spec.dark.primary === "number"
      ? r[spec.dark.primary]
      : spec.dark.primary,
  )
  const darkOnPrimary = WHITE

  const ink = tone(0.15, 0.02, hue)
  const surfaceLight = tone(0.967, 0.012, hue)
  const accentLight = tone(0.955, 0.025, hue)
  const borderLight = tone(0.915, 0.012, hue)
  const mutedInkLight = tone(0.5, 0.025, hue)
  const ringLight = oklch(r[400])
  const sidebarLight = tone(0.985, 0.006, hue)

  const surfaceDark = tone(0.27, 0.025, hue)
  const accentDark = tone(0.3, 0.04, hue)
  const cardDark = tone(0.2, 0.02, hue)
  const paper = tone(0.985, 0.004, hue)

  return {
    light: {
      background: WHITE,
      foreground: ink,
      card: WHITE,
      "card-foreground": ink,
      popover: WHITE,
      "popover-foreground": ink,
      primary: lightPrimary,
      "primary-foreground": lightOnPrimary,
      secondary: surfaceLight,
      "secondary-foreground": tone(0.25, 0.04, hue),
      muted: surfaceLight,
      "muted-foreground": mutedInkLight,
      accent: accentLight,
      "accent-foreground": tone(0.25, 0.04, hue),
      destructive: destructive.light,
      border: borderLight,
      input: borderLight,
      ring: ringLight,
      "chart-1": oklch(r[300]),
      "chart-2": oklch(r[400]),
      "chart-3": oklch(r[500]),
      "chart-4": oklch(r[600]),
      "chart-5": oklch(r[800]),
      sidebar: sidebarLight,
      "sidebar-foreground": ink,
      "sidebar-primary": lightPrimary,
      "sidebar-primary-foreground": lightOnPrimary,
      "sidebar-accent": accentLight,
      "sidebar-accent-foreground": tone(0.25, 0.04, hue),
      "sidebar-border": borderLight,
      "sidebar-ring": ringLight,
    },
    dark: {
      background: tone(0.145, 0.015, hue),
      foreground: paper,
      card: cardDark,
      "card-foreground": paper,
      popover: cardDark,
      "popover-foreground": paper,
      primary: darkPrimary,
      "primary-foreground": darkOnPrimary,
      secondary: surfaceDark,
      "secondary-foreground": paper,
      muted: surfaceDark,
      "muted-foreground": tone(0.72, 0.03, hue),
      accent: accentDark,
      "accent-foreground": paper,
      destructive: destructive.dark,
      border: ALPHA_BORDER,
      input: ALPHA_INPUT,
      ring: darkPrimary,
      "chart-1": oklch(r[200]),
      "chart-2": oklch(r[300]),
      "chart-3": oklch(r[400]),
      "chart-4": oklch(r[500]),
      "chart-5": oklch(r[600]),
      sidebar: cardDark,
      "sidebar-foreground": paper,
      "sidebar-primary": darkPrimary,
      "sidebar-primary-foreground": darkOnPrimary,
      "sidebar-accent": accentDark,
      "sidebar-accent-foreground": paper,
      "sidebar-border": ALPHA_BORDER,
      "sidebar-ring": darkPrimary,
    },
  }
}

/** 纯色色块。 */
const solidSwatch = (color: string) => `linear-gradient(${color}, ${color})`

/** 三段斜向色带：中性基底用它展示色偏（浅 / 中 / 深）。 */
const bandSwatch = (a: string, b: string, c: string) =>
  `linear-gradient(135deg, ${a} 0 34%, ${b} 34% 67%, ${c} 67% 100%)`

function defineBase<const Id extends string>(input: {
  id: Id
  name: string
  title: string
  description: string
  ramp: GrayRamp
}) {
  const { ramp, ...meta } = input
  const cssVars = baseVars(ramp)
  return {
    ...meta,
    group: "base",
    cssVars,
    preview: { light: oklch(ramp[500]), dark: oklch(ramp[400]) },
    swatch: {
      light: bandSwatch(oklch(ramp[200]), oklch(ramp[500]), oklch(ramp[800])),
      dark: bandSwatch(oklch(ramp[200]), oklch(ramp[400]), oklch(ramp[600])),
    },
  } as const satisfies ColorTheme
}

function defineColor<const Id extends string>(input: {
  id: Id
  name: string
  title: string
  description: string
  ramp: ColorRamp
  spec: ColorSpec
}) {
  const { ramp, spec, ...meta } = input
  const cssVars = colorVars(ramp, spec)
  return {
    ...meta,
    group: "color",
    cssVars,
    preview: { light: cssVars.light.primary, dark: cssVars.dark.primary },
    swatch: {
      light: solidSwatch(cssVars.light.primary),
      dark: solidSwatch(cssVars.dark.primary),
    },
  } as const satisfies ColorTheme
}

/**
 * 主题清单：先中性基底，再彩色（按色相环顺序，红 → 粉红）。
 * 只有一个维度（data-theme），亮暗另算，所以每个主题都带亮 / 暗两套完整变量。
 */
export const COLOR_THEMES = [
  defineBase({
    id: "neutral",
    name: "中性",
    title: "Neutral",
    description: "没有色相的纯灰，shadcn 的默认外观。",
    ramp: GRAY_RAMPS.neutral,
  }),
  defineBase({
    id: "stone",
    name: "石色",
    title: "Stone",
    description: "偏暖的灰，带一点米褐调，比纯灰更柔和。",
    ramp: GRAY_RAMPS.stone,
  }),
  defineBase({
    id: "slate",
    name: "板岩",
    title: "Slate",
    description: "偏冷的蓝灰，背景、边框和文字都带蓝调，适合技术站和文档站。",
    ramp: GRAY_RAMPS.slate,
  }),
  defineColor({
    id: "red",
    name: "红色",
    title: "Red",
    description:
      "标准红色主色（亮暗都取 600，保证白字对比度）。危险色同时拉开：亮色改用 800 的深红，暗色改用 300 的浅红，避免与主色混淆。",
    ramp: COLOR_RAMPS.red,
    spec: {
      light: { primary: 600 },
      dark: { primary: 600 },
      destructive: {
        light: oklch(COLOR_RAMPS.red[800]),
        dark: oklch(COLOR_RAMPS.red[300]),
      },
    },
  }),
  defineColor({
    id: "orange",
    name: "橙色",
    title: "Orange",
    description: "明亮的橙色主色，配白字。",
    ramp: COLOR_RAMPS.orange,
    spec: { light: { primary: 700 }, dark: { primary: 700 } },
  }),
  defineColor({
    id: "amber",
    name: "琥珀",
    title: "Amber",
    description: "金黄偏橙的琥珀色主色，配白字。",
    ramp: COLOR_RAMPS.amber,
    spec: { light: { primary: 700 }, dark: { primary: 700 } },
  }),
  defineColor({
    id: "lime",
    name: "青柠",
    title: "Lime",
    description: "偏黄的亮绿色主色，配白字。",
    ramp: COLOR_RAMPS.lime,
    spec: { light: { primary: 700 }, dark: { primary: 700 } },
  }),
  defineColor({
    id: "green",
    name: "绿色",
    title: "Green",
    description: "沉稳的森林绿主色，亮暗都取 700，配白字。",
    ramp: COLOR_RAMPS.green,
    spec: { light: { primary: 700 }, dark: { primary: 700 } },
  }),
  defineColor({
    id: "teal",
    name: "青绿",
    title: "Teal",
    description: "介于绿与蓝之间的青绿色主色，配白字。",
    ramp: COLOR_RAMPS.teal,
    spec: { light: { primary: 700 }, dark: { primary: 700 } },
  }),
  defineColor({
    id: "sky",
    name: "天蓝",
    title: "Sky",
    description: "明亮清爽的天蓝色主色，配白字。",
    ramp: COLOR_RAMPS.sky,
    spec: { light: { primary: 700 }, dark: { primary: 700 } },
  }),
  defineColor({
    id: "blue",
    name: "蓝色",
    title: "Blue",
    description: "经典的饱和蓝色主色，亮暗模式都配白字。",
    ramp: COLOR_RAMPS.blue,
    spec: { light: { primary: 600 }, dark: { primary: 600 } },
  }),
  defineColor({
    id: "violet",
    name: "紫罗兰",
    title: "Violet",
    description: "浓郁的蓝紫色主色，亮暗模式都配白字。",
    ramp: COLOR_RAMPS.violet,
    spec: { light: { primary: 600 }, dark: { primary: 600 } },
  }),
  defineColor({
    id: "fuchsia",
    name: "紫红",
    title: "Fuchsia",
    description: "高饱和的紫红色主色，亮暗模式都配白字。",
    ramp: COLOR_RAMPS.fuchsia,
    spec: { light: { primary: 600 }, dark: { primary: 600 } },
  }),
  defineColor({
    id: "pink",
    name: "粉红",
    title: "Pink",
    description: "偏洋红的粉红色主色，亮暗模式都配白字。",
    ramp: COLOR_RAMPS.pink,
    // 600 档与白字只有 4.5:1，明度下调 0.012 留出余量；暗色同样用这一档
    spec: {
      light: { primary: [0.58, 0.249, 0.584] },
      dark: { primary: [0.58, 0.249, 0.584] },
    },
  }),
] as const

export type ColorThemeId = (typeof COLOR_THEMES)[number]["id"]

export const DEFAULT_COLOR_THEME: ColorThemeId = "neutral"

/** 颜色主题在 localStorage 里的 key（亮暗模式由 next-themes 用 "theme" 管理） */
export const COLOR_THEME_STORAGE_KEY = "color-theme"

/** 不在清单里的值（例如已移除主题的旧 id）返回 false，所有读取处据此回落到默认主题。 */
export function isColorTheme(value: unknown): value is ColorThemeId {
  return COLOR_THEMES.some((theme) => theme.id === value)
}

export function getColorTheme(
  id: string,
): (typeof COLOR_THEMES)[number] | undefined {
  return COLOR_THEMES.find((theme) => theme.id === id)
}

/** 「中文 · English」格式的主题名，选择器、页面标题、文档表格统一使用。 */
export function formatThemeLabel(
  theme: Pick<ColorTheme, "name" | "title">,
): string {
  return `${theme.name} · ${theme.title}`
}

/** 按分组归类，保持 COLOR_THEMES 里的顺序。 */
export function getThemeGroups(): Array<
  ThemeGroup & { themes: Array<(typeof COLOR_THEMES)[number]> }
> {
  return THEME_GROUPS.map((group) => ({
    ...group,
    themes: COLOR_THEMES.filter((theme) => theme.group === group.id),
  }))
}

/** 把变量集渲染成 `selector { --k: v; }`，themes.css 与「复制代码」共用。 */
export function formatCssBlock(
  selector: string,
  vars: Record<string, string>,
  indent = "  ",
): string {
  const lines = Object.entries(vars).map(
    ([key, value]) => `${indent}--${key}: ${value};`,
  )
  return `${selector} {\n${lines.join("\n")}\n}`
}

/** 可直接粘贴到 globals.css 的 `:root` + `.dark` 两段。 */
export function formatThemeCss(theme: Pick<ColorTheme, "cssVars">): string {
  return [
    formatCssBlock(":root", theme.cssVars.light),
    formatCssBlock(".dark", theme.cssVars.dark),
  ].join("\n\n")
}

/**
 * 首帧之前同步执行的内联脚本：从 localStorage 读取颜色主题并写到 <html data-theme>，
 * 避免静态导出下（无法用 cookie）出现主题闪烁。
 * 读到的值不在当前主题清单里（例如已移除的旧 id）时回落到默认主题。
 */
export const COLOR_THEME_INIT_SCRIPT = `(function(){try{var ids=${JSON.stringify(
  COLOR_THEMES.map((theme) => theme.id),
)};var t=localStorage.getItem(${JSON.stringify(COLOR_THEME_STORAGE_KEY)});if(ids.indexOf(t)<0)t=${JSON.stringify(
  DEFAULT_COLOR_THEME,
)};document.documentElement.setAttribute("data-theme",t)}catch(e){document.documentElement.setAttribute("data-theme",${JSON.stringify(
  DEFAULT_COLOR_THEME,
)})}})()`
