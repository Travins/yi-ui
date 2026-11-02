import * as React from "react"
import { DEFAULT_STORAGE_KEY, DEFAULT_VALUES, PRESETS } from "./config"

/** 放在根布局 head 内，同步应用偏好；storageKey 必须与面板一致。 */
function ThemeCustomizerScript({
  storageKey = DEFAULT_STORAGE_KEY,
}: {
  storageKey?: string
}) {
  const config = JSON.stringify({
    key: storageKey,
    defaults: DEFAULT_VALUES,
    themes: PRESETS.map((p) => p.value),
  }).replace(/</g, "\\u003c")
  const html = `(()=>{var c=${config},v={};try{v=JSON.parse(localStorage.getItem(c.key)||"{}")||{}}catch(_){}var e=document.documentElement;e.dataset.theme=c.themes.includes(v.theme)?v.theme:c.defaults.theme;e.dataset.radius=["sm","lg"].includes(v.radius)?v.radius:"md";e.dataset.contentWidth=v.contentWidth==="compact"?"compact":"wide"})()`
  return (
    <script
      data-slot="theme-customizer-script"
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
export { ThemeCustomizerScript }
