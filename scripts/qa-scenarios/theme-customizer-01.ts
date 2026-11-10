import type { Page } from "playwright-core"

import type { Scenario } from "./types"

const PREVIEW = '[data-slot="theme-customizer-preview"]'
const trigger = (page: Page) =>
  page.getByRole("button", { name: "定制主题", exact: true })
/** 手机上面板是模态抽屉，打开时背后的触发按钮对读屏隐藏，读它的 aria-expanded 要用 CSS 定位 */
const triggerByCss = (page: Page) => page.locator('button[aria-label="定制主题"]')
const panel = (page: Page) => page.getByRole("dialog", { name: "外观偏好" })
const group = (page: Page, name: string) =>
  panel(page).getByRole("radiogroup", { name })
const radio = (page: Page, groupName: string, name: string) =>
  group(page, groupName).getByRole("radio", { name, exact: true })

const PRESET_LABELS = [
  "中性", "石色", "板岩", "红色", "橙色", "琥珀", "青柠",
  "绿色", "青绿", "天蓝", "蓝色", "紫罗兰", "紫红", "粉红",
] as const

async function open(page: Page) {
  await trigger(page).click()
  await panel(page).waitFor({ state: "visible" })
}

/** 面板里的所有选项是否各组只有一个选中 */
const checkedOf = (page: Page, groupName: string) =>
  group(page, groupName)
    .locator('[role="radio"][aria-checked="true"]')
    .allInnerTexts()
    .then((texts) => texts.map((text) => text.trim()))

const checkedLabel = async (page: Page, groupName: string) => {
  const checked = group(page, groupName).locator('[role="radio"][aria-checked="true"]')
  // 主题色的色块没有文字，名称在 aria-label 上
  const label = await checked.first().getAttribute("aria-label")
  return label ?? ((await checked.first().innerText()) ?? "").trim()
}

/** 读预览区的计算样式：颜色变量、圆角变量、内容最大宽度、真实控件的圆角与底色 */
async function snapshot(page: Page) {
  return page.locator(PREVIEW).evaluate(async (el) => {
    // 按钮底色、圆角有 CSS 过渡，等它们走完再读，否则读到的是中间值
    await Promise.all(
      document
        .getAnimations()
        .filter((a) => a.effect?.getTiming().iterations !== Infinity)
        .map((a) => a.finished.catch(() => {})),
    )
    const style = getComputedStyle(el)
    const content = el.querySelector<HTMLElement>(".theme-content")!
    const button = [...el.querySelectorAll<HTMLElement>("button")].find(
      (node) => node.textContent?.trim() === "创建项目",
    )!
    const card = el.querySelector<HTMLElement>("section")!
    return {
      primary: style.getPropertyValue("--primary").trim(),
      background: style.getPropertyValue("--background").trim(),
      radiusVar: style.getPropertyValue("--radius").trim(),
      maxWidth: getComputedStyle(content).maxWidth,
      contentWidth: Math.round(content.getBoundingClientRect().width),
      pageBackground: style.backgroundColor,
      textColor: style.color,
      buttonBackground: getComputedStyle(button).backgroundColor,
      buttonRadius: parseFloat(getComputedStyle(button).borderTopLeftRadius),
      cardRadius: parseFloat(getComputedStyle(card).borderTopLeftRadius),
    }
  })
}
type Snapshot = Awaited<ReturnType<typeof snapshot>>

/** 等预览区的某项计算样式变成与旧值不同 */
async function waitChanged(page: Page, key: keyof Snapshot, previous: unknown) {
  await page.waitForFunction(
    ([selector, name, prev]) => {
      const el = document.querySelector(selector as string)!
      const style = getComputedStyle(el)
      const content = el.querySelector<HTMLElement>(".theme-content")!
      const now: Record<string, unknown> = {
        primary: style.getPropertyValue("--primary").trim(),
        background: style.getPropertyValue("--background").trim(),
        radiusVar: style.getPropertyValue("--radius").trim(),
        maxWidth: getComputedStyle(content).maxWidth,
        pageBackground: style.backgroundColor,
      }
      return now[name as string] !== prev
    },
    [PREVIEW, key, previous] as const,
  )
}

const overflowOf = (page: Page) =>
  page.evaluate(
    () =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )

export default {
  name: "主题定制器",
  viewports: ["desktop", "mobile"],
  steps: [
    {
      name: "触发按钮与面板：aria-expanded 联动，初始选中中性 / 中 / 全宽 / 跟随系统",
      async run({ page, assert, visible, shot }) {
        assert(
          (await triggerByCss(page).getAttribute("aria-expanded")) === "false",
          "面板未打开时 aria-expanded 应为 false",
        )
        await open(page)
        await visible(panel(page), "点击后应打开「外观偏好」面板")
        assert(
          (await triggerByCss(page).getAttribute("aria-expanded")) === "true",
          "面板打开后 aria-expanded 应为 true",
        )
        const expected: [string, string][] = [
          ["主题色", "中性"],
          ["圆角", "中"],
          ["内容宽度", "全宽"],
          ["亮暗", "跟随系统"],
        ]
        for (const [name, label] of expected) {
          const checked = await checkedOf(page, name)
          const actual = name === "主题色" ? [await checkedLabel(page, name)] : checked
          assert(
            actual.length === 1 && actual[0] === label,
            `「${name}」应只选中「${label}」，实际 ${JSON.stringify(actual)}`,
          )
        }
        const count = await group(page, "主题色").getByRole("radio").count()
        assert(count === PRESET_LABELS.length, `应有 ${PRESET_LABELS.length} 个主题色，实际 ${count}`)
        await shot("初始")
      },
    },
    {
      name: "逐个切换 14 个主题色：每个都改变预览的 --primary 与按钮底色，且互不相同",
      async run({ page, assert, shot }) {
        await open(page)
        const seen = new Map<string, string>()
        let previous = (await snapshot(page)).primary
        for (const label of PRESET_LABELS) {
          if (label !== "中性") {
            await radio(page, "主题色", label).click()
            await waitChanged(page, "primary", previous)
          }
          const snap = await snapshot(page)
          assert(snap.primary !== "", `「${label}」的 --primary 不应为空`)
          const clash = seen.get(snap.primary)
          assert(
            !clash,
            `「${label}」与「${clash}」的 --primary 相同（${snap.primary}），主题色没有区分开`,
          )
          seen.set(snap.primary, label)
          assert(
            (await checkedLabel(page, "主题色")) === label,
            `点击后「${label}」应为选中，实际 ${await checkedLabel(page, "主题色")}`,
          )
          const header = await panel(page).getByText(label, { exact: true }).first().isVisible()
          assert(header, `面板标题行应显示当前主题色名「${label}」`)
          previous = snap.primary
        }
        assert(seen.size === PRESET_LABELS.length, `应得到 ${PRESET_LABELS.length} 种不同的 --primary，实际 ${seen.size}`)
        await shot("最后一个主题色")
      },
    },
    {
      name: "主题色真实作用到控件：「创建项目」按钮底色随主题色变化",
      async run({ page, assert, shot }) {
        await open(page)
        const before = await snapshot(page)
        await radio(page, "主题色", "红色").click()
        await waitChanged(page, "primary", before.primary)
        const red = await snapshot(page)
        assert(
          red.buttonBackground !== before.buttonBackground,
          `切到红色后按钮底色应变化，仍是 ${before.buttonBackground}`,
        )
        await radio(page, "主题色", "蓝色").click()
        await waitChanged(page, "primary", red.primary)
        const blue = await snapshot(page)
        assert(
          blue.buttonBackground !== red.buttonBackground,
          `红色与蓝色的按钮底色应不同，都是 ${blue.buttonBackground}`,
        )
        await shot("蓝色")
      },
    },
    {
      name: "亮暗：深色时背景与主色的变量真的变了，浅色回到原值，跟随系统等同浅色页面",
      async run({ page, assert, shot }) {
        await open(page)
        const neutral = await snapshot(page)
        await radio(page, "主题色", "蓝色").click()
        await waitChanged(page, "primary", neutral.primary)
        const light = await snapshot(page)
        await radio(page, "亮暗", "深色").click()
        await waitChanged(page, "background", light.background)
        const dark = await snapshot(page)
        assert(
          dark.background !== light.background,
          `深色下 --background 应变化，仍是 ${light.background}`,
        )
        assert(
          dark.pageBackground !== light.pageBackground,
          `深色下预览区底色应变化，仍是 ${light.pageBackground}`,
        )
        assert(
          dark.textColor !== light.textColor,
          `深色下预览区文字颜色应变化，仍是 ${light.textColor}`,
        )
        assert((await checkedLabel(page, "亮暗")) === "深色", "「深色」应为选中")
        await shot("蓝色深色")
        await radio(page, "亮暗", "浅色").click()
        await waitChanged(page, "background", dark.background)
        const back = await snapshot(page)
        assert(
          back.background === light.background && back.pageBackground === light.pageBackground,
          `切回浅色应还原：期望 ${light.background} / ${light.pageBackground}，实际 ${back.background} / ${back.pageBackground}`,
        )
        await radio(page, "亮暗", "深色").click()
        await waitChanged(page, "background", light.background)
        await radio(page, "亮暗", "跟随系统").click()
        await waitChanged(page, "background", dark.background)
        const system = await snapshot(page)
        assert(
          system.background === light.background,
          `浅色页面里「跟随系统」应等同浅色：期望 ${light.background}，实际 ${system.background}`,
        )
      },
    },
    {
      name: "圆角：小 / 中 / 大对应 --radius 0.375 / 0.625 / 0.875rem，控件圆角依次变大",
      async run({ page, assert, shot }) {
        await open(page)
        const expected: [string, string][] = [
          ["小", "0.375rem"],
          ["中", "0.625rem"],
          ["大", "0.875rem"],
        ]
        const radii: number[] = []
        let previous = (await snapshot(page)).radiusVar
        for (const [label, value] of expected) {
          if ((await snapshot(page)).radiusVar !== value) {
            await radio(page, "圆角", label).click()
            await waitChanged(page, "radiusVar", previous)
          }
          const snap = await snapshot(page)
          previous = snap.radiusVar
          // 计算后的 --radius 可能被规范成 .375rem
          assert(
            parseFloat(snap.radiusVar) === parseFloat(value),
            `「${label}」的 --radius 应为 ${value}，实际 ${snap.radiusVar}`,
          )
          assert(
            (await checkedLabel(page, "圆角")) === label,
            `「${label}」应为选中，实际 ${await checkedLabel(page, "圆角")}`,
          )
          radii.push(snap.buttonRadius)
          assert(snap.cardRadius > 0, "卡片圆角应大于 0")
        }
        assert(
          radii.length === 3 && radii.every((r, i) => i === 0 || r > radii[i - 1]!),
          `按钮圆角应随「小/中/大」依次变大，实际 ${radii.join(" / ")}`,
        )
        await shot("大圆角")
      },
    },
    {
      name: "内容宽度：紧凑给内容列加上最大宽度并变窄，全宽不限制，切回全宽恢复",
      async run({ page, assert, shot }) {
        await open(page)
        const wide = await snapshot(page)
        assert(wide.maxWidth === "none", `全宽时内容列不应限宽，实际 max-width=${wide.maxWidth}`)
        await radio(page, "内容宽度", "紧凑").click()
        await waitChanged(page, "maxWidth", wide.maxWidth)
        const compact = await snapshot(page)
        assert(compact.maxWidth !== "none", "紧凑时内容列应有最大宽度")
        const viewport = page.viewportSize()!
        assert(
          compact.contentWidth <= viewport.width,
          `紧凑时内容列渲染宽度 ${compact.contentWidth}px 不应超过视口 ${viewport.width}px`,
        )
        if (viewport.width > 1100) {
          assert(
            compact.contentWidth < wide.contentWidth,
            `宽屏下紧凑（${compact.contentWidth}px）应比全宽（${wide.contentWidth}px）更窄`,
          )
        }
        assert((await checkedLabel(page, "内容宽度")) === "紧凑", "「紧凑」应为选中")
        await shot("紧凑")
        await radio(page, "内容宽度", "全宽").click()
        await waitChanged(page, "maxWidth", compact.maxWidth)
        assert((await snapshot(page)).maxWidth === "none", "切回全宽后应不限宽")
      },
    },
    {
      // demo.tsx 里写明：预览框比真实页面窄，把紧凑宽度按比例缩到 32rem，切换时才看得出差别。
      // 构建产物里 theme-customizer.css 的 64rem 规则没有放进 @layer，压过了 Tailwind 工具类（在 @layer utilities 里），这条覆盖实际不生效
      name: "预览里的紧凑宽度按 demo 的设计缩到 32rem（512px）",
      async run({ page, assert }) {
        await open(page)
        const wide = await snapshot(page)
        await radio(page, "内容宽度", "紧凑").click()
        await waitChanged(page, "maxWidth", wide.maxWidth)
        const compact = await snapshot(page)
        assert(
          compact.maxWidth === "512px",
          `预览里紧凑的内容列 max-width 应为 512px（demo 里的 --theme-content-width:32rem），实际 ${compact.maxWidth}`,
        )
      },
    },
    {
      name: "恢复默认：四项选中态与计算样式一并回到初始值",
      async run({ page, assert, shot }) {
        await open(page)
        const initial = await snapshot(page)
        await radio(page, "主题色", "红色").click()
        await radio(page, "圆角", "大").click()
        await radio(page, "内容宽度", "紧凑").click()
        await radio(page, "亮暗", "深色").click()
        await waitChanged(page, "background", initial.background)
        const changed = await snapshot(page)
        assert(
          changed.primary !== initial.primary && changed.maxWidth !== initial.maxWidth,
          "先要确认四项都改动过",
        )
        await shot("改动后")
        await panel(page).getByRole("button", { name: "恢复默认", exact: true }).click()
        await page.waitForFunction(
          (selector) => getComputedStyle(document.querySelector(selector)!).maxWidth === "none",
          PREVIEW,
        )
        await waitChanged(page, "background", changed.background)
        const after = await snapshot(page)
        for (const key of ["primary", "background", "radiusVar", "maxWidth", "pageBackground", "buttonBackground", "buttonRadius"] as const) {
          assert(
            after[key] === initial[key],
            `恢复默认后 ${key} 应回到 ${String(initial[key])}，实际 ${String(after[key])}`,
          )
        }
        const expected: [string, string][] = [
          ["圆角", "中"],
          ["内容宽度", "全宽"],
          ["亮暗", "跟随系统"],
        ]
        for (const [name, label] of expected) {
          assert(
            (await checkedLabel(page, name)) === label,
            `恢复默认后「${name}」应选中「${label}」，实际 ${await checkedLabel(page, name)}`,
          )
        }
        assert(
          (await checkedLabel(page, "主题色")) === "中性",
          `恢复默认后主题色应选中「中性」，实际 ${await checkedLabel(page, "主题色")}`,
        )
      },
    },
    {
      name: "局部隔离：改动只作用于预览区，不动文档根元素与本地存储",
      async run({ page, assert }) {
        const read = () =>
          page.evaluate(() => {
            const root = document.documentElement
            return {
              theme: root.dataset.theme ?? null,
              radius: root.dataset.radius ?? null,
              width: root.dataset.contentWidth ?? null,
              dark: root.classList.contains("dark"),
              stored: localStorage.getItem("yiui:theme-customizer"),
              primary: getComputedStyle(root).getPropertyValue("--primary").trim(),
            }
          })
        const before = await read()
        await open(page)
        await radio(page, "主题色", "紫罗兰").click()
        await radio(page, "圆角", "大").click()
        await radio(page, "内容宽度", "紧凑").click()
        await radio(page, "亮暗", "深色").click()
        await page.waitForFunction(
          (selector) => {
            const el = document.querySelector(selector)!
            return (
              el.getAttribute("data-theme") === "violet" &&
              el.getAttribute("data-radius") === "lg" &&
              el.getAttribute("data-content-width") === "compact" &&
              el.classList.contains("dark")
            )
          },
          PREVIEW,
        )
        const after = await read()
        assert(
          JSON.stringify(after) === JSON.stringify(before),
          `局部模式不应改文档根元素或存储：改动前 ${JSON.stringify(before)}，改动后 ${JSON.stringify(after)}`,
        )
        const preview = await page
          .locator(PREVIEW)
          .evaluate((el) => ({ theme: el.getAttribute("data-theme"), radius: el.getAttribute("data-radius") }))
        assert(
          preview.theme === "violet" && preview.radius === "lg",
          `预览区应带上 violet / lg，实际 ${JSON.stringify(preview)}`,
        )
      },
    },
    {
      name: "桌面键盘：方向键在圆角选项间移动并选中，Esc 关闭面板且焦点回到触发按钮",
      viewport: "desktop",
      async run({ page, assert, visible, shot }) {
        await trigger(page).focus()
        await page.keyboard.press("Enter")
        await visible(panel(page), "Enter 应打开面板")
        const medium = radio(page, "圆角", "中")
        await medium.focus()
        await page.keyboard.press("ArrowRight")
        await page.waitForFunction(
          () => getComputedStyle(document.querySelector('[data-slot="theme-customizer-preview"]')!).getPropertyValue("--radius").trim() !== "0.625rem",
        )
        assert(
          (await checkedLabel(page, "圆角")) === "大",
          `向右一步应选中「大」，实际 ${await checkedLabel(page, "圆角")}`,
        )
        await shot("方向键")
        await page.keyboard.press("Escape")
        await panel(page).waitFor({ state: "detached" })
        assert(
          (await trigger(page).evaluate((el) => el === document.activeElement)) === true,
          "关闭面板后焦点应回到「定制主题」按钮",
        )
        // 选择保留：重新打开仍是「大」
        await open(page)
        assert((await checkedLabel(page, "圆角")) === "大", "重新打开面板后选择应保留")
      },
    },
    {
      name: "桌面：面板是气泡，宽度 320px 且完全在视口内",
      viewport: "desktop",
      async run({ page, assert, box, settle, shot }) {
        await open(page)
        // 气泡打开时有缩放动画，等动画走完再量尺寸
        await settle()
        const bubble = await box(panel(page))
        const viewport = page.viewportSize()!
        assert(Math.abs(bubble.width - 320) <= 1, `气泡宽度应为 320px，实际 ${bubble.width}px`)
        assert(
          bubble.x >= 0 && bubble.x + bubble.width <= viewport.width + 1,
          `气泡应在视口水平范围内，实际 x=${bubble.x} 宽=${bubble.width}`,
        )
        assert(
          bubble.y >= 0 && bubble.y + bubble.height <= viewport.height + 1,
          `气泡应在视口垂直范围内，实际 y=${bubble.y} 高=${bubble.height}`,
        )
        await shot("气泡")
      },
    },
    {
      name: "手机：面板是底部抽屉，没有横向溢出，选项与按钮都在视口内",
      viewport: "mobile",
      async run({ page, assert, box, settle, shot }) {
        await open(page)
        await settle()
        const viewport = page.viewportSize()!
        const sheet = await box(panel(page))
        assert(
          Math.abs(sheet.y + sheet.height - viewport.height) <= 1,
          `抽屉应贴着视口底部（底边 ${sheet.y + sheet.height}，视口高 ${viewport.height}）`,
        )
        assert(sheet.width <= viewport.width + 1, `抽屉宽度 ${sheet.width} 不应超过视口 ${viewport.width}`)
        assert(sheet.height <= viewport.height * 0.9 + 1, `抽屉高度 ${sheet.height} 不应超过视口的 90%`)
        const overflow = await overflowOf(page)
        assert(overflow <= 0, `页面不应横向溢出，多出 ${overflow}px`)
        const outside = await panel(page)
          .locator("button, [role='radio']")
          .evaluateAll((nodes, width) =>
            nodes
              .map((node) => ({
                name: node.getAttribute("aria-label") ?? node.textContent?.trim() ?? "",
                right: node.getBoundingClientRect().right,
                left: node.getBoundingClientRect().left,
                shown: node.getClientRects().length > 0,
              }))
              .filter((item) => item.shown && (item.right > width + 1 || item.left < -1)),
          viewport.width)
        assert(outside.length === 0, `有控件超出视口左右边界：${JSON.stringify(outside)}`)
        for (const name of ["恢复默认", "关闭"]) {
          const button = await box(panel(page).getByRole("button", { name, exact: true }))
          assert(
            button.y >= 0 && button.y + button.height <= viewport.height + 1,
            `「${name}」应完整出现在视口内，实际 y=${button.y} 高=${button.height}`,
          )
        }
        await shot("抽屉")
      },
    },
    {
      name: "手机：在抽屉里改动后点「关闭」，改动保留，重新打开选中态一致",
      viewport: "mobile",
      async run({ page, assert, shot }) {
        await open(page)
        const before = await snapshot(page)
        await radio(page, "主题色", "绿色").click()
        await radio(page, "圆角", "小").click()
        await panel(page).getByRole("button", { name: "关闭", exact: true }).click()
        await panel(page).waitFor({ state: "detached" })
        const closed = await snapshot(page)
        assert(
          closed.primary !== before.primary,
          `关闭抽屉后绿色应保留，--primary 仍是 ${before.primary}`,
        )
        assert(
          parseFloat(closed.radiusVar) === 0.375,
          `关闭抽屉后圆角应保留为小（0.375rem），实际 ${closed.radiusVar}`,
        )
        await open(page)
        assert((await checkedLabel(page, "主题色")) === "绿色", "重新打开后主题色应仍选中「绿色」")
        assert((await checkedLabel(page, "圆角")) === "小", "重新打开后圆角应仍选中「小」")
        await shot("重新打开")
      },
    },
  ],
} satisfies Scenario
