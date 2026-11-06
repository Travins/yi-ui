import type { Scenario } from "./types"
import { headerStep } from "./shared"
export default {
  name: "团队侧栏",
  viewports: ["desktop"],
  steps: [
    headerStep,
    {
      name: "快捷搜索跳转账单",
      async run({ page, role, press, visible }) {
        await press("Mod+k")
        await role("combobox").fill("账")
        await press("Enter")
        await visible(
          page
            .locator('[data-slot="breadcrumb-page"]')
            .filter({ hasText: "账单" }),
          "面包屑应显示账单",
        )
      },
    },
    {
      name: "团队点选与快捷键",
      async run({ page, role, press, assert, settle }) {
        const trigger = page.locator(
          '[data-slot="sidebar-02-team-switcher"] button',
        )
        await trigger.click()
        await role("menuitemradio", { name: /青禾设计组/ }).click()
        assert(
          (await trigger.getAttribute("aria-label"))?.includes("青禾设计组"),
          "应切换到青禾设计组",
        )
        // Linux Chrome 保留 Ctrl+数字用于切换标签页，页面可能无法收到；此平台只验证点选。
        if (process.platform !== "linux") {
          await press("Mod+1")
          await settle()
          await press("Mod+2")
          await settle()
          assert(
            (await trigger.getAttribute("aria-label"))?.includes("青禾设计组"),
            "Mod+2 应切换团队",
          )
        }
      },
    },
    {
      name: "搜索打开时不响应团队快捷键",
      async run({ page, role, press, assert, settle }) {
        const trigger = page.locator(
          '[data-slot="sidebar-02-team-switcher"] button',
        )
        const before = await trigger.getAttribute("aria-label")
        await press("Mod+k")
        await press("Mod+2")
        await settle()
        assert(
          (await trigger.getAttribute("aria-label")) === before,
          "搜索中不能切换团队",
        )
        assert(await role("dialog").isVisible(), "搜索应保持打开")
      },
    },
    {
      name: "用户菜单切换账号",
      async run({ role, assert }) {
        await role("button", { name: /账号菜单/ }).click()
        await role("menuitemradio", { name: /周明远/ }).click()
        assert(
          await role("button", { name: "账号菜单：周明远" }).isVisible(),
          "应切换账号",
        )
      },
    },
    {
      name: "外链安全与读屏提示",
      async run({ page, assert }) {
        const links = page.locator('a[target="_blank"]')
        assert((await links.count()) > 0, "应存在外链")
        for (const link of await links.all()) {
          assert(
            (await link.getAttribute("rel"))
              ?.split(/\s+/)
              .includes("noreferrer"),
            "外链应有 noreferrer",
          )
          assert(
            (await link.textContent())?.includes("在新窗口打开"),
            "外链应有读屏提示",
          )
        }
      },
    },
    {
      name: "收起后团队和账号菜单可用",
      async run({ role, press, settle, visible }) {
        await press("Mod+b")
        await settle()
        for (const name of [/切换团队，当前/, /账号菜单/]) {
          await role("button", { name }).click()
          await visible(role("menu"), "收起后菜单应可打开")
          await press("Escape")
          await settle()
        }
      },
    },
  ],
} satisfies Scenario
