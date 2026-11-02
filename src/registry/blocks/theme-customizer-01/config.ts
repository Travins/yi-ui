import { DEFAULT_THEME, PRESETS } from "./presets"

const DEFAULT_STORAGE_KEY = "yiui:theme-customizer"
const DEFAULT_VALUES = {
  theme: DEFAULT_THEME,
  radius: "md",
  contentWidth: "wide",
} as const
const DEFAULT_LABELS = {
  title: "外观偏好",
  trigger: "定制主题",
  color: "主题色",
  radius: "圆角",
  width: "内容宽度",
  mode: "亮暗",
  small: "小",
  medium: "中",
  large: "大",
  compact: "紧凑",
  wide: "全宽",
  light: "浅色",
  dark: "深色",
  system: "跟随系统",
  reset: "恢复默认",
  close: "关闭",
  presets: {} as Record<string, string>,
}

export { PRESETS, DEFAULT_STORAGE_KEY, DEFAULT_VALUES, DEFAULT_LABELS }
