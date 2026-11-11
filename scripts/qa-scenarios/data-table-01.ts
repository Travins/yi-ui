import type { Page } from "playwright-core"

import type { Scenario } from "./types"

/** 文档页里「外部筛选」示例的根元素（示例不在 /view/ 里，步骤自己跳到文档页） */
const EXTERNAL = '[data-slot="data-table-external-filter-demo"]'

const pagination = (page: Page) => page.locator('[data-slot="grid-pagination"]')

/** 窄容器里跳页入口：名称是「3 / 67，跳转到指定页」 */
const jumpTrigger = (page: Page) =>
  pagination(page).getByRole("button", { name: /跳转到指定页/ })

const jumpInput = (page: Page) =>
  pagination(page).getByRole("textbox", { name: "跳转页码" })

/** 在方条下拉里选一项（桌面是 combobox，选项在弹层里） */
async function pickOption(
  page: Page,
  scope: string,
  label: string,
  option: string,
) {
  await page.locator(scope).getByRole("combobox", { name: label }).click()
  await page.getByRole("option", { name: option }).click()
}

export default {
  name: "数据表格",
  viewports: ["desktop", "mobile"],
  steps: [
    {
      name: "外部筛选到空结果后，点「清除筛选」恢复",
      viewport: "desktop",
      async run({ page, assert, visible, shot }) {
        await page.goto(new URL("/blocks/data-table-01/", page.url()).href, {
          waitUntil: "networkidle",
        })
        const demo = page.locator(EXTERNAL)
        await demo.scrollIntoViewIfNeeded()
        await visible(demo, "文档页应有外部筛选示例")
        // 示例数据里负责人与状态一一对应：林小满 + 已归档 没有结果
        await pickOption(page, EXTERNAL, "负责人", "林小满")
        await pickOption(page, EXTERNAL, "状态", "已归档")
        await visible(
          demo.locator("table").getByText("没有符合条件的结果"),
          "筛到没有结果时应显示空状态",
        )
        await shot("空结果")
        await demo
          .locator("table")
          .getByRole("button", { name: "清除筛选" })
          .click()
        await visible(demo.getByRole("row").nth(1), "清除筛选后应恢复出数据行")
        assert(
          (await demo
            .locator("table")
            .getByText("没有符合条件的结果")
            .count()) === 0,
          "清除后空状态应消失",
        )
        // 外部筛选被重置：两个下拉回到占位
        for (const label of ["负责人", "状态"]) {
          const text = await demo
            .getByRole("combobox", { name: label })
            .innerText()
          assert(
            /全部/.test(text),
            `「${label}」应回到占位，实际是「${text.trim()}」`,
          )
        }
        await shot("已恢复")
      },
    },
    {
      name: "行操作按钮的 aria-label 是「行名称 的操作」",
      viewport: "desktop",
      async run({ page, assert, visible }) {
        const button = page
          .getByRole("table")
          .getByRole("button", { name: /的操作$/ })
          .first()
        await visible(button, "行内应有操作按钮")
        assert(
          (await button.getAttribute("aria-label")) === "城市声景 01 的操作",
          "第一行的操作按钮名称应为「城市声景 01 的操作」",
        )
      },
    },
    {
      name: "桌面 table 的 aria-label 是列表名称，不是搜索占位文案",
      viewport: "desktop",
      async run({ page, assert, visible }) {
        await visible(
          page.getByRole("table", { name: "数据列表", exact: true }),
          "table 的名称应是「数据列表」",
        )
        assert(
          (await page.locator('[aria-label="搜索数据集…"]').count()) === 0,
          "不应再有 aria-label 复用搜索占位文案",
        )
      },
    },
    {
      name: "手机列表的 aria-label 是列表名称",
      viewport: "mobile",
      async run({ page, assert, visible }) {
        await visible(
          page.getByRole("list", { name: "数据列表", exact: true }),
          "手机列表的名称应是「数据列表」",
        )
        assert(
          (await page.locator('[aria-label="搜索数据集…"]').count()) === 0,
          "不应再有 aria-label 复用搜索占位文案",
        )
      },
    },
    {
      name: "手机宽度下搜索格独占一行",
      viewport: "mobile",
      async run({ page, assert, box, shot }) {
        const toolbar = page.locator(
          '[data-slot="data-table"] [data-slot="grid-toolbar"]',
        )
        const items = toolbar.locator('[data-slot="grid-toolbar-item"]:visible')
        const search = await box(items.first())
        const bar = await box(toolbar)
        assert(
          Math.abs(search.width - bar.width) < 2,
          `搜索格应占满工具栏宽度（${search.width} / ${bar.width}）`,
        )
        const rest = await items.evaluateAll((nodes) =>
          nodes.slice(1).map((node) => node.getBoundingClientRect().top),
        )
        assert(rest.length > 0, "搜索格之外应还有别的格")
        assert(
          rest.every((top) => top >= search.y + search.height - 1),
          "其余格应全部在搜索格下面一行",
        )
        await shot("工具栏")
      },
    },
    {
      name: "手机宽度下用紧凑跳页跳到指定页",
      viewport: "mobile",
      async run({ page, assert, visible, shot }) {
        const trigger = jumpTrigger(page)
        await trigger.scrollIntoViewIfNeeded()
        await visible(trigger, "窄屏应有「跳转到指定页」入口")
        assert(
          (await trigger.getAttribute("aria-label"))?.startsWith("1 / ") ===
            true,
          "入口名称应以「1 / 总页数」开头",
        )
        await trigger.click()
        await visible(jumpInput(page), "点入口后应出现跳页输入框")
        assert(
          await jumpInput(page).evaluate((el) => el === document.activeElement),
          "输入框应自动聚焦",
        )
        await shot("输入框")
        await jumpInput(page).fill("5")
        await page.keyboard.press("Enter")
        await visible(jumpTrigger(page), "回车后输入框应收起、入口恢复")
        assert(
          (await jumpTrigger(page).getAttribute("aria-label"))?.startsWith(
            "5 / ",
          ) === true,
          "回车后应跳到第 5 页",
        )
        assert(
          await jumpTrigger(page).evaluate(
            (el) => el === document.activeElement,
          ),
          "跳转后焦点应回到入口按钮",
        )
      },
    },
    {
      name: "紧凑跳页按 Esc 取消，不跳页并还焦点",
      viewport: "mobile",
      async run({ page, assert, visible }) {
        const trigger = jumpTrigger(page)
        await trigger.scrollIntoViewIfNeeded()
        await trigger.click()
        await jumpInput(page).fill("9")
        await page.keyboard.press("Escape")
        await visible(jumpTrigger(page), "Esc 后输入框应收起")
        assert((await jumpInput(page).count()) === 0, "Esc 后不应再有输入框")
        assert(
          (await jumpTrigger(page).getAttribute("aria-label"))?.startsWith(
            "1 / ",
          ) === true,
          "Esc 取消后不应跳页",
        )
        assert(
          await jumpTrigger(page).evaluate(
            (el) => el === document.activeElement,
          ),
          "Esc 后焦点应回到入口按钮",
        )
      },
    },
    {
      name: "手机宽度下分页条每一行的行首格不画左线",
      viewport: "mobile",
      async run({ page, assert, visible }) {
        const list = page
          .locator(
            '[data-slot="grid-pagination"] [data-slot="pagination-content"]',
          )
          .first()
        await visible(list, "应有分页条")
        // 把分页条放进四边有框的容器里时，行首格的左线会和外框贴成双线
        const offenders = await list.evaluate((el) => {
          const items = [...el.children].filter(
            (item): item is HTMLElement =>
              item instanceof HTMLElement && item.offsetParent !== null,
          )
          const left = Math.min(...items.map((item) => item.offsetLeft))
          return items
            .filter(
              (item) =>
                item.offsetLeft === left &&
                parseFloat(getComputedStyle(item).borderInlineStartWidth) > 0,
            )
            .map((item) => item.textContent?.trim() || item.className)
        })
        assert(
          offenders.length === 0,
          `行首格不应有左线：${offenders.join("、")}`,
        )
        const rows = await list.evaluate(
          (el) =>
            new Set(
              [...el.children]
                .filter(
                  (item) =>
                    item instanceof HTMLElement && item.offsetParent !== null,
                )
                .map((item) => (item as HTMLElement).offsetTop),
            ).size,
        )
        assert(rows >= 2, "手机宽度下分页条应折成两行，否则这一步没有测到行首")
      },
    },
  ],
} satisfies Scenario
