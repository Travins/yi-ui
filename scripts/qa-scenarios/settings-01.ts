import type { Locator, Page } from "playwright-core"

import type { Scenario } from "./types"

const footer = (page: Page) => page.locator('[data-slot="settings-01-footer"]')
const status = (page: Page) => footer(page).locator('[data-slot="settings-01-status"]')
const saveButton = (page: Page) => footer(page).getByRole("button", { name: /^(保存|保存中…)$/ })
const resetAllButton = (page: Page) => footer(page).getByRole("button", { name: "恢复默认", exact: true })
/** 页脚左侧的「已修改 N 项 / 全部为默认值」触发器 */
const changesTrigger = (page: Page) =>
  footer(page).getByRole("button", { name: /^(已修改 \d+ 项|全部为默认值)$/ })
const section = (page: Page) => page.locator('[data-slot="settings-01-section"]')
const sectionTitle = (page: Page) =>
  section(page).locator('[data-slot="control-panel-title"]')
const changesDialog = (page: Page) => page.getByRole("dialog", { name: "改动对比" })

const isMobile = (page: Page) => (page.viewportSize()?.width ?? 1280) < 768

/** 桌面左侧导航与手机顶部分段选择用的是两套控件、两套名字 */
const SECTION_NAMES = {
  appearance: { desktop: "外观", mobile: "外观", heading: "外观" },
  notifications: { desktop: "通知", mobile: "通知", heading: "通知" },
  sound: { desktop: "声音与触感", mobile: "声音", heading: "声音与触感" },
  editor: { desktop: "编辑器", mobile: "编辑器", heading: "编辑器" },
  privacy: { desktop: "隐私", mobile: "隐私", heading: "隐私" },
} as const
type SectionKey = keyof typeof SECTION_NAMES

async function goSection(page: Page, key: SectionKey) {
  const names = SECTION_NAMES[key]
  if (isMobile(page)) {
    await page
      .getByRole("radiogroup", { name: "设置分区" })
      .getByRole("radio", { name: names.mobile, exact: true })
      .click()
  } else {
    await page
      .getByRole("navigation", { name: "设置分区" })
      // 有改动的分区按钮名称后面还跟着不可见的「已修改 N 项」，所以按前缀匹配
      .getByRole("button", { name: new RegExp(`^${names.desktop}`) })
      .click()
  }
  await page
    .getByRole("heading", { level: 2, name: names.heading, exact: true })
    .waitFor({ state: "visible" })
  // 切换带 180ms 的淡出淡入，等旧分区卸载、页面上只剩当前这一个
  await page.waitForFunction(
    () => document.querySelectorAll('[data-slot="settings-01-section"]').length === 1,
  )
}

const slider = (page: Page, name: string) => page.getByRole("slider", { name })
const toggle = (page: Page, name: RegExp) => page.getByRole("switch", { name })

async function bump(target: Locator, key: string, times = 1) {
  await target.focus()
  for (let i = 0; i < times; i++) await target.press(key)
}

const overflowOf = (page: Page) =>
  page.evaluate(
    () =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )

/** 外观预览里承载字号、内边距和圆角的那张小卡片 */
const previewCard = (page: Page) =>
  page.locator('[data-slot="settings-01-preview"] [style*="font-size"]')

export default {
  name: "设置页",
  viewports: ["desktop", "mobile"],
  steps: [
    {
      name: "初始状态：全部为默认值，保存与恢复默认都不可点",
      async run({ page, assert, visible, shot }) {
        await visible(page.getByRole("heading", { level: 1, name: "设置", exact: true }), "应有页面标题")
        await visible(
          page.getByRole("heading", { level: 2, name: "外观", exact: true }),
          "默认应显示外观分区",
        )
        assert(
          ((await sectionTitle(page).innerText()) ?? "").trim() === "全部为默认值",
          `分区面板头部应写「全部为默认值」，实际「${await sectionTitle(page).innerText()}」`,
        )
        assert(await saveButton(page).isDisabled(), "没有改动时「保存」应禁用")
        assert(await resetAllButton(page).isDisabled(), "没有改动时「恢复默认」应禁用")
        assert(await changesTrigger(page).isDisabled(), "没有改动时改动对比入口应禁用")
        const text = ((await status(page).innerText()) ?? "").trim()
        assert(text === "没有未保存的更改", `状态应为「没有未保存的更改」，实际「${text}」`)
        await shot("初始")
      },
    },
    {
      name: "桌面：左侧导航逐个切换分区，aria-current 跟着走，页面上始终只有一个分区",
      viewport: "desktop",
      async run({ page, assert, shot }) {
        const nav = page.getByRole("navigation", { name: "设置分区" })
        assert(
          (await nav.getByRole("button", { name: "外观", exact: true }).getAttribute("aria-current")) === "page",
          "默认外观应带 aria-current=page",
        )
        for (const key of ["notifications", "sound", "editor", "privacy", "appearance"] as SectionKey[]) {
          await goSection(page, key)
          const names = SECTION_NAMES[key]
          const current = await nav.locator('[aria-current="page"]').allInnerTexts()
          assert(
            current.length === 1 && current[0]?.trim().startsWith(names.desktop) === true,
            `切到「${names.desktop}」后只有它带 aria-current，实际 ${JSON.stringify(current)}`,
          )
          assert(
            (await section(page).getAttribute("data-section")) === key,
            `当前分区应是 ${key}，实际 ${await section(page).getAttribute("data-section")}`,
          )
        }
        await goSection(page, "privacy")
        await shot("隐私")
      },
    },
    {
      name: "手机：顶部分段选择逐个切换分区，左侧导航不显示",
      viewport: "mobile",
      async run({ page, assert, shot }) {
        const nav = page.locator('[data-slot="settings-01-nav"]')
        assert(
          (await nav.evaluate((el) => getComputedStyle(el).display)) === "none",
          "窄屏不应显示左侧导航",
        )
        const group = page.getByRole("radiogroup", { name: "设置分区" })
        for (const key of ["notifications", "sound", "editor", "privacy", "appearance"] as SectionKey[]) {
          await goSection(page, key)
          const names = SECTION_NAMES[key]
          assert(
            (await group.getByRole("radio", { name: names.mobile, exact: true }).getAttribute("aria-checked")) === "true",
            `切到「${names.mobile}」后该分段应为选中`,
          )
          assert(
            (await section(page).getAttribute("data-section")) === key,
            `当前分区应是 ${key}，实际 ${await section(page).getAttribute("data-section")}`,
          )
        }
        await shot("回到外观")
      },
    },
    {
      name: "改一项：面板与页脚都出现已修改计数，保存与恢复默认变为可点",
      async run({ page, assert, visible, shot }) {
        await page
          .getByRole("radiogroup", { name: "主题模式" })
          .getByRole("radio", { name: "深色", exact: true })
          .click()
        await visible(section(page).getByText("已修改 1 项", { exact: true }), "面板头部应显示「已修改 1 项」")
        await visible(changesTrigger(page).filter({ hasText: "已修改 1 项" }), "页脚应显示「已修改 1 项」")
        assert(await saveButton(page).isEnabled(), "有未保存更改时「保存」应可点")
        assert(await resetAllButton(page).isEnabled(), "有改动时「恢复默认」应可点")
        const text = ((await status(page).innerText()) ?? "").trim()
        assert(text === "有未保存的更改", `状态应为「有未保存的更改」，实际「${text}」`)
        if (!isMobile(page)) {
          const count = page.locator('[data-slot="settings-01-nav-count"]')
          assert((await count.count()) === 1, `导航上应只有 1 个修改标记，实际 ${await count.count()}`)
          assert(
            ((await count.innerText()) ?? "").trim().startsWith("1"),
            `外观的修改标记应为 1，实际「${await count.innerText()}」`,
          )
        }
        await shot("已改一项")
      },
    },
    {
      name: "外观预览联动：字号、圆角、信息密度、主题与强调色改变后，预览的计算样式随之变化",
      async run({ page, assert, shot }) {
        const card = previewCard(page)
        const read = () =>
          card.evaluate((el) => {
            const style = getComputedStyle(el)
            return {
              fontSize: style.fontSize,
              radius: style.borderTopLeftRadius,
              padding: style.paddingTop,
            }
          })
        const before = await read()
        assert(
          before.fontSize === "14px" && before.radius === "10px" && before.padding === "16px",
          `预览初始应为 14px / 圆角 10px / 内边距 16px，实际 ${JSON.stringify(before)}`,
        )
        await bump(slider(page, "界面字号"), "ArrowRight", 2)
        await bump(slider(page, "圆角"), "ArrowLeft", 4)
        await page
          .getByRole("radiogroup", { name: "信息密度" })
          .getByRole("radio", { name: "紧凑", exact: true })
          .click()
        await page.waitForFunction(
          () =>
            getComputedStyle(
              document.querySelector('[data-slot="settings-01-preview"] [style*="font-size"]')!,
            ).paddingTop === "12px",
        )
        const after = await read()
        assert(after.fontSize === "16px", `字号加 2 后预览应为 16px，实际 ${after.fontSize}`)
        assert(after.radius === "6px", `圆角减 4 后预览应为 6px，实际 ${after.radius}`)
        assert(after.padding === "12px", `紧凑密度下预览内边距应为 12px，实际 ${after.padding}`)
        // 滑块的值也同步
        assert((await slider(page, "界面字号").inputValue()) === "16", "字号滑块应为 16")
        assert((await slider(page, "圆角").inputValue()) === "6", "圆角滑块应为 6")
        // 强调色：预览进度条颜色变化
        const bar = page.locator('[data-slot="settings-01-preview"] [class~="h-1.5"] > div')
        const color = () => bar.evaluate((el) => getComputedStyle(el).backgroundColor)
        const blue = await color()
        await page
          .getByRole("radiogroup", { name: "强调色" })
          .getByRole("radio", { name: "绿", exact: true })
          .click()
        await page.waitForFunction(
          (prev) => {
            const el = document.querySelector(
              '[data-slot="settings-01-preview"] [class~="h-1.5"] > div',
            )
            return !!el && getComputedStyle(el).backgroundColor !== prev
          },
          blue,
        )
        assert((await color()) !== blue, `切到绿色后预览进度条颜色应变化，仍是 ${blue}`)
        // 主题：深色时预览卡片的背景色变化
        const frame = page.locator('[data-slot="settings-01-preview"]').first()
        const bg = () => frame.evaluate((el) => getComputedStyle(el).backgroundColor)
        const light = await bg()
        await page
          .getByRole("radiogroup", { name: "主题模式" })
          .getByRole("radio", { name: "深色", exact: true })
          .click()
        await page.waitForFunction(
          (prev) =>
            getComputedStyle(document.querySelector('[data-slot="settings-01-preview"]')!)
              .backgroundColor !== prev,
          light,
        )
        assert((await bg()) !== light, `切到深色后预览背景应变化，仍是 ${light}`)
        await shot("预览联动")
      },
    },
    {
      name: "改动对比：列出旧值到新值，撤销单项后回到默认且无未保存更改",
      async run({ page, assert, visible, settle, shot }) {
        await bump(slider(page, "界面字号"), "ArrowRight")
        await changesTrigger(page).click()
        await visible(changesDialog(page), "点「已修改 1 项」应打开改动对比")
        const row = changesDialog(page).getByRole("listitem")
        assert((await row.count()) === 1, `应有 1 条改动，实际 ${await row.count()}`)
        const text = (await row.innerText()).replace(/\s+/g, " ")
        assert(
          text.includes("界面字号") && text.includes("14px") && text.includes("15px"),
          `改动行应写明字号 14px → 15px，实际「${text}」`,
        )
        await settle()
        await shot("改动对比")
        await changesDialog(page).getByRole("button", { name: "撤销 界面字号 的修改" }).click()
        // 手机上这是模态抽屉，打开时背后的内容对读屏隐藏，读滑块前先关掉
        if (isMobile(page)) {
          await page.keyboard.press("Escape")
          await changesDialog(page).waitFor({ state: "detached" })
        }
        assert((await slider(page, "界面字号").inputValue()) === "14", "撤销后字号应回到 14")
        await page.waitForFunction(
          () => document.querySelector('[data-slot="settings-01-status"]')?.textContent?.includes("没有未保存的更改"),
        )
        assert(await saveButton(page).isDisabled(), "撤销后与已保存值相同，「保存」应再次禁用")
        assert(await changesTrigger(page).isDisabled(), "撤销后应没有已修改项")
      },
    },
    {
      name: "改回原值：不算未保存的更改",
      async run({ page, assert, visible }) {
        const font = slider(page, "界面字号")
        await bump(font, "ArrowRight")
        await visible(footer(page).getByText("有未保存的更改"), "改动后应提示有未保存更改")
        await bump(font, "ArrowLeft")
        await page.waitForFunction(
          () => document.querySelector('[data-slot="settings-01-status"]')?.textContent?.includes("没有未保存的更改"),
        )
        assert(await saveButton(page).isDisabled(), "改回原值后「保存」应禁用")
        assert(
          (await sectionTitle(page).innerText()).trim() === "全部为默认值",
          "改回默认值后面板应回到「全部为默认值」",
        )
      },
    },
    {
      name: "跨分区改动：页脚汇总，「恢复默认」一次还原全部",
      async run({ page, assert, visible, settle, shot }) {
        await bump(slider(page, "界面字号"), "ArrowRight")
        await goSection(page, "notifications")
        await toggle(page, /允许通知/).click()
        await visible(changesTrigger(page).filter({ hasText: "已修改 2 项" }), "跨分区后页脚应汇总为「已修改 2 项」")
        await changesTrigger(page).click()
        await visible(changesDialog(page), "应能打开改动对比")
        assert(
          (await changesDialog(page).getByRole("listitem").count()) === 2,
          `应列出 2 条改动，实际 ${await changesDialog(page).getByRole("listitem").count()}`,
        )
        await settle()
        await shot("两条改动")
        await page.keyboard.press("Escape")
        await changesDialog(page).waitFor({ state: "detached" })
        await resetAllButton(page).click()
        await visible(changesTrigger(page).filter({ hasText: "全部为默认值" }), "恢复默认后应回到「全部为默认值」")
        assert(
          (await toggle(page, /允许通知/).getAttribute("aria-checked")) === "true",
          "恢复默认后通知总开关应回到开",
        )
        await goSection(page, "appearance")
        assert((await slider(page, "界面字号").inputValue()) === "14", "恢复默认后字号应回到 14")
        assert(await saveButton(page).isDisabled(), "恢复到已保存的值后「保存」应禁用")
      },
    },
    {
      name: "本分区恢复默认：只还原当前分区，其他分区的改动保留",
      async run({ page, assert, visible }) {
        await bump(slider(page, "界面字号"), "ArrowRight")
        await goSection(page, "privacy")
        await page
          .getByRole("radiogroup", { name: "资料可见范围" })
          .getByRole("radio", { name: "仅自己", exact: true })
          .click()
        await visible(changesTrigger(page).filter({ hasText: "已修改 2 项" }), "应有 2 项改动")
        const reset = section(page).getByRole("button", { name: "恢复本分区默认值", exact: true })
        assert(await reset.isEnabled(), "本分区有改动时「恢复本分区默认值」应可点")
        await reset.click()
        await visible(changesTrigger(page).filter({ hasText: "已修改 1 项" }), "只还原隐私后应剩 1 项")
        assert(await reset.isDisabled(), "还原后「恢复本分区默认值」应禁用")
        assert(
          (await page
            .getByRole("radiogroup", { name: "资料可见范围" })
            .getByRole("radio", { name: "团队", exact: true })
            .getAttribute("aria-checked")) === "true",
          "隐私可见范围应回到默认「团队」",
        )
        await goSection(page, "appearance")
        assert((await slider(page, "界面字号").inputValue()) === "15", "外观里的字号改动应保留（15）")
      },
    },
    {
      name: "保存：进入「保存中…」，完成后显示「已保存」，再改动提示消失",
      async run({ page, assert, visible, shot }) {
        await bump(slider(page, "界面字号"), "ArrowRight")
        await saveButton(page).click()
        await visible(saveButton(page).filter({ hasText: "保存中…" }), "点保存后按钮应显示「保存中…」")
        assert(await saveButton(page).isDisabled(), "保存中按钮应禁用")
        assert(await resetAllButton(page).isDisabled(), "保存中「恢复默认」应禁用")
        await shot("保存中")
        await visible(status(page).filter({ hasText: "已保存" }), "完成后状态应显示「已保存」")
        assert(await saveButton(page).isDisabled(), "保存后没有新改动，「保存」应禁用")
        assert(
          (await changesTrigger(page).innerText()).trim() === "已修改 1 项",
          "保存不应清掉相对默认值的「已修改」标记",
        )
        assert(
          (await slider(page, "界面字号").inputValue()) === "15",
          "保存后值应保持",
        )
        await shot("已保存")
        await bump(slider(page, "界面字号"), "ArrowRight")
        await visible(status(page).filter({ hasText: "有未保存的更改" }), "再次改动后「已保存」应换成「有未保存的更改」")
        assert(await saveButton(page).isEnabled(), "再次改动后「保存」应可点")
      },
    },
    {
      name: "通知：关闭总开关后其余开关与免打扰滑块禁用，重新打开恢复",
      async run({ page, assert, shot }) {
        await goSection(page, "notifications")
        const master = toggle(page, /允许通知/)
        const children = ["提及我", "评论回复", "邮件摘要", "产品动态"]
        for (const name of children)
          assert(await toggle(page, new RegExp(name)).isEnabled(), `总开关打开时「${name}」应可用`)
        await master.focus()
        await page.keyboard.press("Space")
        await page.waitForFunction(
          () => document.querySelector('[role="switch"]')?.getAttribute("aria-checked") === "false",
        )
        assert((await master.getAttribute("aria-checked")) === "false", "按空格后总开关应为关")
        for (const name of children)
          assert(await toggle(page, new RegExp(name)).isDisabled(), `总开关关闭后「${name}」应禁用`)
        for (const name of ["免打扰时段（起点）", "免打扰时段（终点）"])
          assert(await slider(page, name).isDisabled(), `总开关关闭后「${name}」应禁用`)
        await shot("总开关关")
        await master.click()
        for (const name of children)
          assert(await toggle(page, new RegExp(name)).isEnabled(), `总开关重新打开后「${name}」应恢复可用`)
        assert(
          await slider(page, "免打扰时段（起点）").isEnabled(),
          "总开关重新打开后免打扰滑块应恢复可用",
        )
      },
    },
    {
      name: "通知：免打扰时段用键盘调整，读数为 24 小时制并跨午夜",
      async run({ page, assert }) {
        await goSection(page, "notifications")
        const start = slider(page, "免打扰时段（起点）")
        assert(
          (await start.getAttribute("aria-valuetext")) === "22:00",
          `起点默认读数应为 22:00，实际 ${await start.getAttribute("aria-valuetext")}`,
        )
        assert(
          (await slider(page, "免打扰时段（终点）").getAttribute("aria-valuetext")) === "07:00",
          "终点默认读数应为次日 07:00",
        )
        await bump(start, "ArrowLeft", 2)
        assert(
          (await start.getAttribute("aria-valuetext")) === "21:00",
          `向左两步（每步 0.5 小时）应为 21:00，实际 ${await start.getAttribute("aria-valuetext")}`,
        )
        await changesTrigger(page).filter({ hasText: "已修改 1 项" }).waitFor({ state: "visible" })
      },
    },
    {
      name: "声音：按键音效关闭时音色禁用，打开后可选；主音量可用键盘调整",
      async run({ page, assert, shot }) {
        await goSection(page, "sound")
        const group = page.getByRole("radiogroup", { name: "音色" })
        assert(
          (await group.getByRole("radio", { name: "清脆", exact: true }).isDisabled()) === true,
          "按键音效默认关闭，音色应禁用",
        )
        await toggle(page, /按键音效/).click()
        assert(
          (await toggle(page, /按键音效/).getAttribute("aria-checked")) === "true",
          "点击后按键音效应为开",
        )
        await group.getByRole("radio", { name: "清脆", exact: true }).click()
        assert(
          (await group.getByRole("radio", { name: "清脆", exact: true }).getAttribute("aria-checked")) === "true",
          "打开后应能选「清脆」",
        )
        const volume = slider(page, "主音量")
        assert((await volume.inputValue()) === "60", "主音量默认 60")
        await bump(volume, "ArrowRight", 5)
        assert((await volume.inputValue()) === "65", `右键 5 次后应为 65，实际 ${await volume.inputValue()}`)
        await bump(volume, "End")
        assert((await volume.inputValue()) === "100", "End 键应到 100")
        await changesTrigger(page).filter({ hasText: "已修改 3 项" }).waitFor({ state: "visible" })
        await shot("声音")
      },
    },
    {
      name: "编辑器：缩进与行高改变后代码预览的计算样式随之变化",
      async run({ page, assert, shot }) {
        await goSection(page, "editor")
        const pre = page.locator('[data-slot="settings-01-preview"] pre')
        const lineHeight = () => pre.evaluate((el) => getComputedStyle(el).lineHeight)
        const before = await lineHeight()
        await bump(slider(page, "行高"), "ArrowRight", 4)
        await page.waitForFunction(
          (prev) =>
            getComputedStyle(document.querySelector('[data-slot="settings-01-preview"] pre')!)
              .lineHeight !== prev,
          before,
        )
        assert((await lineHeight()) !== before, `行高调大后预览行高应变化，仍是 ${before}`)
        // 显示制表符并选 4 空格：缩进占位字符出现
        await toggle(page, /显示制表符/).click()
        await page
          .getByRole("radiogroup", { name: "缩进宽度" })
          .getByRole("radio", { name: "4 空格", exact: true })
          .click()
        const marker = page.locator('[data-slot="settings-01-preview"] pre span.inline-block').first()
        await page.waitForFunction(
          () =>
            document
              .querySelector('[data-slot="settings-01-preview"] pre span.inline-block')
              ?.textContent === "····",
        )
        assert(
          ((await marker.innerText()) ?? "") === "····",
          `4 空格缩进的标记应是四个点，实际「${await marker.innerText()}」`,
        )
        await page
          .getByRole("radiogroup", { name: "缩进宽度" })
          .getByRole("radio", { name: "制表符", exact: true })
          .click()
        await page.waitForFunction(
          () =>
            document
              .querySelector('[data-slot="settings-01-preview"] pre span.inline-block')
              ?.textContent === "→",
        )
        await shot("制表符")
      },
    },
    {
      name: "隐私：历史保留天数用键盘调整，读数带「天」",
      async run({ page, assert, shot }) {
        await goSection(page, "privacy")
        const retention = slider(page, "历史保留")
        assert((await retention.inputValue()) === "90", "默认保留 90 天")
        await bump(retention, "End")
        assert((await retention.inputValue()) === "365", `End 应到 365，实际 ${await retention.inputValue()}`)
        const readout = await section(page).innerText()
        assert(readout.includes("365 天"), "读数应显示「365 天」")
        await bump(retention, "Home")
        assert((await retention.inputValue()) === "7", `Home 应到 7，实际 ${await retention.inputValue()}`)
        await shot("保留天数")
      },
    },
    {
      name: "复制本分区设置：剪贴板里是当前分区取值的 JSON",
      async run({ page, assert }) {
        await page.context().grantPermissions(["clipboard-read", "clipboard-write"])
        await bump(slider(page, "界面字号"), "ArrowRight")
        const copy = section(page).getByRole("button", { name: "复制本分区设置", exact: true })
        await copy.click()
        await page.waitForFunction(
          () => document.querySelector('[data-slot="control-panel-copy"]')?.hasAttribute("data-copied"),
        )
        const text = await page.evaluate(() => navigator.clipboard.readText())
        const value = JSON.parse(text) as Record<string, unknown>
        assert(
          JSON.stringify(Object.keys(value)) ===
            JSON.stringify(["theme", "accent", "fontSize", "radius", "density", "reduceMotion"]),
          `复制内容应只含外观分区的 6 个键，实际 ${Object.keys(value).join(",")}`,
        )
        assert(value.fontSize === 15, `复制内容里字号应是 15，实际 ${String(value.fontSize)}`)
      },
    },
    {
      name: "手机：页脚、分区内容与改动对比底部抽屉都不横向溢出",
      viewport: "mobile",
      async run({ page, assert, box, visible, settle, shot }) {
        const viewport = page.viewportSize()!
        for (const key of ["appearance", "notifications", "sound", "editor", "privacy"] as SectionKey[]) {
          await goSection(page, key)
          const overflow = await overflowOf(page)
          assert(overflow <= 0, `「${SECTION_NAMES[key].heading}」分区不应横向溢出，多出 ${overflow}px`)
        }
        await goSection(page, "appearance")
        await bump(slider(page, "界面字号"), "ArrowRight")
        const save = await box(saveButton(page))
        assert(
          save.x + save.width <= viewport.width + 1,
          `「保存」按钮右缘 ${save.x + save.width} 不应超出视口 ${viewport.width}`,
        )
        const bar = await box(footer(page))
        assert(
          Math.abs(bar.y + bar.height - viewport.height) <= 1,
          `页脚应贴着视口底部（底边 ${bar.y + bar.height}，视口高 ${viewport.height}）`,
        )
        await changesTrigger(page).click()
        await visible(changesDialog(page), "手机上点改动入口应打开改动对比")
        await settle()
        const sheet = await box(changesDialog(page))
        assert(
          Math.abs(sheet.y + sheet.height - viewport.height) <= 1,
          `改动对比应是贴底的抽屉（底边 ${sheet.y + sheet.height}，视口高 ${viewport.height}）`,
        )
        assert(sheet.width <= viewport.width + 1, `抽屉宽度 ${sheet.width} 不应超过视口 ${viewport.width}`)
        const after = await overflowOf(page)
        assert(after <= 0, `抽屉打开时页面不应横向溢出，多出 ${after}px`)
        await shot("改动对比抽屉")
      },
    },
  ],
} satisfies Scenario
