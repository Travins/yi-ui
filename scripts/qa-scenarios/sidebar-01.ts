import type { Scenario } from "./types"
import { headerStep } from "./shared"
export default {
  name: "内容侧栏",
  viewports: ["desktop", "mobile"],
  steps: [
    headerStep,
    {
      name: "搜索过滤与空状态",
      viewport: "desktop",
      async run({ role, name, visible, assert }) {
        const input = role("searchbox", { name: "搜索导航" })
        await input.fill("草稿")
        await visible(role("link", { name: /草稿箱/ }), "应命中草稿箱")
        assert(
          !(await role("navigation", { name: "主导航", exact: true })
            .getByRole("link", { name: "图片", exact: true })
            .isVisible()),
          "不相关链接应隐藏",
        )
        await input.fill("不存在的导航xyz")
        await visible(
          name("没有找到「不存在的导航xyz」相关的导航项"),
          "应显示空状态",
        )
      },
    },
    {
      name: "手风琴互斥与导航高亮",
      viewport: "desktop",
      async run({ page, role, assert, visible, settle }) {
        await role("button", { name: "媒体库", exact: true }).click()
        await settle()
        assert(
          (await role("button", { name: "文章", exact: true }).getAttribute(
            "aria-expanded",
          )) === "false",
          "文章应收起",
        )
        await role("navigation", { name: "主导航", exact: true })
          .getByRole("link", { name: "图片", exact: true })
          .click()
        assert(
          (await role("navigation", { name: "主导航", exact: true })
            .getByRole("link", { name: "图片", exact: true })
            .getAttribute("aria-current")) === "page",
          "图片链接应标记当前页",
        )
        await visible(
          page
            .locator('[data-slot="breadcrumb-page"]')
            .filter({ hasText: "图片" }),
          "面包屑应更新",
        )
      },
    },
    {
      name: "收起悬停安全区域与 Esc 还焦点",
      viewport: "desktop",
      async run({ page, role, press, settle, box, assert, visible }) {
        await press("Mod+b")
        await settle()
        const trigger = role("button", { name: "文章", exact: true })
        await trigger.hover()
        const menu = role("menu")
        await visible(menu, "悬停应打开菜单")
        const target = await box(menu)
        await page.mouse.move(target.x + 20, target.y + 20, { steps: 30 })
        await settle()
        assert(await menu.isVisible(), "缓慢移入浮层不应关闭")
        await press("Escape")
        await settle()
        assert(!(await menu.isVisible()), "Esc 应关闭浮层")
        assert(
          await trigger.evaluate((el) => el === document.activeElement),
          "焦点应返回图标",
        )
      },
    },
    {
      name: "方向右键打开子菜单",
      viewport: "desktop",
      async run({ role, press, settle, visible }) {
        await press("Mod+b")
        await settle()
        await role("button", { name: "文章", exact: true }).focus()
        await press("ArrowRight")
        await visible(role("menu"), "方向右键应打开子菜单")
      },
    },
    {
      name: "移动抽屉导航后关闭",
      viewport: "mobile",
      async run({ role, visible, assert, settle }) {
        await role("button", { name: "切换侧栏", exact: true }).click()
        await visible(role("dialog"), "应打开抽屉")
        await role("link", { name: "工作概览", exact: true }).click()
        await settle()
        assert(!(await role("dialog").isVisible()), "导航后应关闭抽屉")
      },
    },
    {
      name: "footer 插槽排在底部入口之后，收起后仍可见",
      viewport: "desktop",
      async run({ page, role, press, settle, box, assert, visible }) {
        await page.goto(
          new URL("/demo/sidebar-01-footer-mobile/", page.url()).href,
          { waitUntil: "networkidle" },
        )
        await settle()
        const user = page.locator('[data-slot="sidebar-user"]')
        await visible(user, "footer 插槽里的用户块应渲染")
        const links = await box(role("navigation", { name: "辅助入口" }))
        assert(
          (await box(user)).y >= links.y + links.height - 1,
          "footer 应排在 footerItems 之后",
        )
        await press("Mod+b")
        await settle()
        await visible(
          role("button", { name: "退出登录", exact: true }),
          "收起成图标栏后退出按钮仍应可见",
        )
      },
    },
    {
      name: "searchable 关闭后不渲染搜索框",
      viewport: "desktop",
      async run({ page, role, settle, assert, visible }) {
        assert(
          (await role("searchbox", { name: "搜索导航" }).count()) === 1,
          "默认应有搜索框",
        )
        await page.goto(
          new URL("/demo/context-panel-sidebar-mobile/", page.url()).href,
          { waitUntil: "networkidle" },
        )
        await settle()
        await visible(
          role("navigation", { name: "主导航", exact: true }),
          "侧栏应渲染",
        )
        assert(
          (await role("searchbox", { name: "搜索导航" }).count()) === 0,
          "searchable={false} 时不应有搜索框",
        )
      },
    },
  ],
} satisfies Scenario
