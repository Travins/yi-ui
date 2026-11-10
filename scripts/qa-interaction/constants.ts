/** 交互验收的常量：视口、选择器、检查项编号。 */
import { readdirSync } from "node:fs"

export const DEFAULT_BASE = "http://localhost:3002"
export const DESKTOP = { width: 1280, height: 1000 }
export const MOBILE = { width: 390, height: 844 }

/** 没有参数时检查全部组件文档 */
export const DEFAULT_NAMES = readdirSync("content/docs/components")
  .filter((file) => file.endsWith(".mdx") && file !== "index.mdx")
  .map((file) => file.slice(0, -4))

/**
 * 状态切换时宽度必须一致的控件：倒计时 / 进行中会换文字，宽度不能跟着变（叠放占位）。
 * 新增同类控件时往这里加选择器即可。
 */
export const STABLE_WIDTH_SELECTORS = ["[data-slot=phone-input-send]"]

/**
 * 环要等过渡结束才量得准：shadcn Button 用 transition-all，环是渐显的（150ms）；
 * 量太早会读到过渡中间态（0px、全透明），把有环的当成没环。
 */
export const RING_SETTLE_MS = 320
/** 每个示例最多点几个按钮，免得示例按钮特别多时跑太久 */
export const MAX_CLICKS = 12
/** 按住检查最多摸几个按钮 */
export const MAX_PRESSES = 6
/** 可点目标 */
export const INTERACTIVE_SELECTOR =
  'button, [role=radio], [role=switch], [role=slider], input[type=range], [data-slot$="-trigger"]'
/** 需要「按住不盖住边框」的目标：加减、分段选项、开关 */
export const PRESS_SELECTOR =
  '[data-slot$="-increment"], [data-slot$="-decrement"], [data-slot="segmented-control-item"], [role=switch], [role=radio]'
/** 「点按后不留输入光标」的目标：加减按钮 */
export const STEPPER_SELECTOR = '[data-slot$="-increment"], [data-slot$="-decrement"]'
/** 表单控件的容器：判断边框、裁切、高度都从它入手 */
export const CONTROL_SELECTOR =
  '[data-slot$="-control"], [data-slot="segmented-control"]'

export const CHECKS = {
  pointerRing: "① 点按后不出现焦点环",
  keyboardRing: "② 键盘 Tab 聚焦看得到焦点环",
  pressedBorder: "③ 按住不盖住边框",
  caret: "④ 点按后不留输入光标",
  labels: "⑤ 390px 下每个字段都有可见标签",
  width: "⑥ 状态切换宽度不变",
  errorClear: "⑦ 错误能消失",
  mobile: "⑧ 手机不横向溢出 / 输入字号 / 控件高度",
  cardSpec: "⑨ 示例卡片规范",
  buttonHeight: "⑪ 提交按钮高度",
  runtime: "⑩ 运行时报错",
  popupHighlight: "⑫ 弹层打开时方条保持高亮",
  toolbarFit: "⑬ 工具栏里铺满整格",
} as const

export const CHECK_IDS: Record<string, string> = {
  // 交互场景的步骤截图：不论通过与否都会拍，不能落到默认的 issue 命名
  交互场景: "scenario",
  [CHECKS.pointerRing]: "pointer-ring",
  [CHECKS.keyboardRing]: "keyboard-ring",
  [CHECKS.pressedBorder]: "pressed-border",
  [CHECKS.caret]: "caret",
  [CHECKS.labels]: "labels",
  [CHECKS.width]: "width",
  [CHECKS.errorClear]: "error-clear",
  [CHECKS.mobile]: "mobile",
  [CHECKS.cardSpec]: "card-spec",
  [CHECKS.buttonHeight]: "button-height",
  [CHECKS.runtime]: "runtime",
  [CHECKS.popupHighlight]: "popup-highlight",
  [CHECKS.toolbarFit]: "toolbar-fit",
}
