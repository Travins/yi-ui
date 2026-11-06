import type { Scenario } from "./types"
import { headerStep } from "./shared"
export default {
  name: "上下文面板",
  viewports: ["desktop", "mobile"],
  steps: [
    headerStep,
    {
      name: "指标切换完成量",
      viewport: "desktop",
      async run({ role, visible }) {
        await role("combobox", { name: "进度指标" }).click()
        await role("option", { name: "完成量", exact: true }).click()
        await visible(
          role("img", { name: "进度：完成量", exact: true }),
          "指标应切换",
        )
      },
    },
    {
      name: "图表类型与按下状态",
      viewport: "desktop",
      async run({ page, role, assert }) {
        for (const [name, type] of [
          ["柱状图", "bar"],
          ["面积图", "area"],
        ]) {
          await role("button", { name, exact: true }).click()
          assert(
            (await role("button", { name, exact: true }).getAttribute(
              "aria-pressed",
            )) === "true",
            "选中图表应按下",
          )
          assert(
            (await page
              .locator('[data-slot="context-progress-chart"]')
              .getAttribute("data-type")) === type,
            "图表类型应更新",
          )
        }
      },
    },
    {
      name: "快捷键开关面板",
      viewport: "desktop",
      async run({ page, press, settle, assert }) {
        const panel = page.locator('[data-slot="sidebar"][data-side="right"]')
        await press("Mod+b")
        await settle()
        assert(
          (await panel.getAttribute("data-state")) === "collapsed",
          "面板应收起",
        )
        await press("Mod+b")
        await settle()
        assert(
          (await panel.getAttribute("data-state")) === "expanded",
          "面板应展开",
        )
      },
    },
    {
      name: "任务卡片选中反馈",
      viewport: "desktop",
      async run({ page, role, visible }) {
        await page
          .locator('[data-slot="context-section"] article button')
          .first()
          .click()
        await visible(
          role("status").filter({ hasText: "已选择：" }),
          "主区应显示选中反馈",
        )
      },
    },
    {
      name: "移动面板从右侧出现",
      viewport: "mobile",
      async run({ role, box, assert, settle }) {
        await role("button", { name: "切换上下文面板", exact: true }).click()
        await settle()
        const rect = await box(role("dialog"))
        assert(
          Math.abs(rect.x + rect.width - 390) < 1 && rect.x > 0,
          "抽屉应贴右侧且左侧留空",
        )
      },
    },
  ],
} satisfies Scenario
