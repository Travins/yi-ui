import type { Page } from "playwright-core"

import type { Scenario } from "./types"

/** 桌面端的面板（aside）；窄屏是抽屉，用 role=dialog 取 */
const panel = (page: Page) => page.locator('aside[data-slot="context-panel"]')
const sidebar = (page: Page) =>
  page.locator('[data-slot="sidebar"][data-side="left"]')
const trigger = (page: Page) =>
  page.locator('[data-slot="context-panel-trigger"]')
const stateOf = (target: ReturnType<Page["locator"]>) =>
  target.getAttribute("data-state")
const isFocused = (target: ReturnType<Page["locator"]>) =>
  target.evaluate((el) => el === document.activeElement)

export default {
  name: "上下文面板",
  // 「左侧 sidebar-01 + 主内容 + 右侧面板」的组合示例
  path: "/demo/context-panel-sidebar-mobile/",
  viewports: ["desktop", "mobile"],
  steps: [
    {
      name: "⌘B 只收起左侧导航，右侧面板不动",
      viewport: "desktop",
      async run({ page, press, settle, assert, box, shot }) {
        assert((await stateOf(panel(page))) === "open", "面板初始应打开")
        assert(
          (await stateOf(sidebar(page))) === "expanded",
          "左侧导航初始应展开",
        )
        const before = await box(panel(page))
        await press("Mod+b")
        await settle()
        assert(
          (await stateOf(sidebar(page))) === "collapsed",
          "⌘B 应收起左侧导航",
        )
        assert((await stateOf(panel(page))) === "open", "⌘B 不应关闭右侧面板")
        const after = await box(panel(page))
        assert(
          Math.abs(after.width - before.width) < 1,
          "左侧导航收起后右侧面板宽度不应变化",
        )
        await shot("左侧收起右侧仍打开")
      },
    },
    {
      name: "开合按钮只开合右侧面板，左侧导航不动",
      viewport: "desktop",
      async run({ page, settle, assert, box, shot }) {
        await trigger(page).click()
        await settle()
        assert((await stateOf(panel(page))) === "closed", "面板应关闭")
        assert(
          (await trigger(page).getAttribute("aria-expanded")) === "false",
          "开合按钮应标记 aria-expanded=false",
        )
        assert((await box(panel(page))).width < 1, "关闭后面板宽度应为 0")
        assert(
          (await panel(page).evaluate((el) => (el as HTMLElement).inert)) ===
            true,
          "关闭后面板应为 inert",
        )
        assert(
          (await stateOf(sidebar(page))) === "expanded",
          "关闭右侧面板不应收起左侧导航",
        )
        await shot("右侧关闭左侧仍展开")
        await trigger(page).click()
        await settle()
        assert((await stateOf(panel(page))) === "open", "再点一次应重新打开")
        assert(
          Math.abs((await box(panel(page))).width - 256) < 1,
          "示例里面板宽度应为 16rem",
        )
      },
    },
    {
      name: "面板内按 Esc 关闭并把焦点还给开合按钮",
      viewport: "desktop",
      async run({ page, role, press, settle, assert }) {
        await trigger(page).focus()
        const close = role("button", { name: "关闭面板", exact: true })
        await close.focus()
        await press("Escape")
        await settle()
        assert((await stateOf(panel(page))) === "closed", "Esc 应关闭面板")
        assert(await isFocused(trigger(page)), "焦点应回到开合按钮")
      },
    },
    {
      name: "焦点在面板外时 Esc 不关闭面板",
      viewport: "desktop",
      async run({ page, press, settle, assert }) {
        await trigger(page).focus()
        await press("Escape")
        await settle()
        assert(
          (await stateOf(panel(page))) === "open",
          "焦点不在面板里时 Esc 不应关闭面板",
        )
      },
    },
    {
      name: "面板有读屏名称，内容渲染在面板里",
      viewport: "desktop",
      async run({ page, role, visible, assert }) {
        const region = role("complementary", { name: "文章详情", exact: true })
        await visible(region, "面板应是带名称的 complementary 区域")
        await visible(
          region.getByRole("region", { name: "发布信息", exact: true }),
          "分区应渲染在面板里并带名称",
        )
        assert(
          (await trigger(page).getAttribute("aria-controls")) ===
            (await panel(page).getAttribute("id")),
          "开合按钮的 aria-controls 应指向面板",
        )
      },
    },
    {
      name: "窄屏初始不弹出，点开合按钮从右侧滑出抽屉",
      viewport: "mobile",
      async run({ page, role, box, assert, settle, shot }) {
        assert(
          !(await role("dialog").isVisible()),
          "defaultOpen 在窄屏不应直接弹出抽屉",
        )
        assert(
          (await trigger(page).getAttribute("aria-expanded")) === "false",
          "窄屏初始 aria-expanded 应为 false",
        )
        await trigger(page).click()
        await settle()
        const rect = await box(role("dialog", { name: "文章详情" }))
        assert(
          Math.abs(rect.x + rect.width - 390) < 1 && rect.x > 0,
          "抽屉应贴右侧且左侧留空",
        )
        await shot("窄屏抽屉")
        await role("button", { name: "关闭面板", exact: true }).click()
        await settle()
        assert(!(await role("dialog").isVisible()), "关闭按钮应关闭抽屉")
        assert(await isFocused(trigger(page)), "焦点应回到开合按钮")
      },
    },
    {
      name: "窄屏左右两个抽屉互不影响",
      viewport: "mobile",
      async run({ role, visible, assert, settle, press }) {
        await role("button", { name: "切换侧栏", exact: true }).click()
        await visible(role("dialog"), "应打开左侧导航抽屉")
        assert(
          !(await role("dialog", { name: "文章详情" }).isVisible()),
          "打开左侧导航不应带出右侧面板",
        )
        await press("Escape")
        await settle()
        assert(!(await role("dialog").isVisible()), "Esc 应关闭导航抽屉")
      },
    },
    {
      name: "没有内容的页面不渲染开合按钮和面板",
      async run({ page, role, settle, assert, visible }) {
        await page.goto(
          new URL("/demo/context-panel-slot-mobile/", page.url()).href,
          { waitUntil: "networkidle" },
        )
        await settle()
        await visible(trigger(page), "订单页应有开合按钮")
        await role("button", { name: "设置页", exact: true }).click()
        await settle()
        assert(
          (await trigger(page).count()) === 0,
          "设置页没有声明内容，不应渲染开合按钮",
        )
        if ((await panel(page).count()) > 0)
          assert(
            (await stateOf(panel(page))) === "closed",
            "没有内容时面板应收起",
          )
        await role("button", { name: "订单页", exact: true }).click()
        await settle()
        await visible(trigger(page), "回到订单页后开合按钮应重新出现")
      },
    },
    {
      name: "受控：选中即打开，关闭即取消选中",
      viewport: "desktop",
      async run({ page, role, settle, assert }) {
        await page.goto(
          new URL("/demo/context-panel-controlled-mobile/", page.url()).href,
          { waitUntil: "networkidle" },
        )
        await settle()
        assert((await stateOf(panel(page))) === "closed", "初始应关闭")
        const view = page.getByRole("button", { name: /^查看/ }).first()
        await view.click()
        await settle()
        assert((await stateOf(panel(page))) === "open", "选中后应打开")
        await role("button", { name: "关闭面板", exact: true }).click()
        await settle()
        assert((await stateOf(panel(page))) === "closed", "关闭按钮应关闭")
        assert(
          (await view.getAttribute("aria-pressed")) === "false",
          "关闭后应取消选中（onOpenChange 被调用）",
        )
        assert(await isFocused(view), "焦点应回到打开面板的那个按钮")
      },
    },
  ],
} satisfies Scenario
