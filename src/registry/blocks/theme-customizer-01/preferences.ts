import { DEFAULT_VALUES, PRESETS } from "./config"

type ThemeCustomizerValues = {
  theme: string
  radius: "sm" | "md" | "lg"
  contentWidth: "compact" | "wide"
}

/** 同时用于首帧脚本与客户端，忽略未知字段与无效取值。 */
function normalizePreferences(input: unknown): ThemeCustomizerValues {
  const value = (
    input && typeof input === "object" ? input : {}
  ) as Partial<ThemeCustomizerValues>
  return {
    theme: PRESETS.some((preset) => preset.value === value.theme)
      ? value.theme!
      : DEFAULT_VALUES.theme,
    radius:
      value.radius === "sm" || value.radius === "lg" ? value.radius : "md",
    contentWidth: value.contentWidth === "compact" ? "compact" : "wide",
  }
}
function applyPreferences(element: HTMLElement, value: ThemeCustomizerValues) {
  element.dataset.theme = value.theme
  element.dataset.radius = value.radius
  element.dataset.contentWidth = value.contentWidth
}
export { normalizePreferences, applyPreferences }
export type { ThemeCustomizerValues }
