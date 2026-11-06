import type { Scenario } from "./types"
import { headerStep } from "./shared"
export default {
  name: "工作区树",
  viewports: ["desktop"],
  steps: [
    headerStep,
    {
      name: "树完整键盘导航",
      async run({ page, role, press, assert }) {
        const parent = role("treeitem", { name: "客户工作区", exact: true })
        const focused = () =>
          page.locator('[role="treeitem"]:focus').getAttribute("aria-label")
        await parent.focus()
        await press("ArrowLeft")
        assert(
          (await parent.getAttribute("aria-expanded")) === "false",
          "左键应收起",
        )
        await press("ArrowRight")
        assert(
          (await parent.getAttribute("aria-expanded")) === "true",
          "右键应展开",
        )
        await press("ArrowRight")
        assert((await focused()) === "客户视图", "右键应进入子节点")
        await press("ArrowLeft")
        await press("ArrowLeft")
        assert((await focused()) === "客户工作区", "左键应返回父节点")
        await press("ArrowDown")
        assert((await focused()) !== "客户工作区", "下键应移动焦点")
        await press("ArrowUp")
        assert((await focused()) === "客户工作区", "上键应返回")
        await press("End")
        assert((await focused()) === "往期合作", "End 应到末项")
        await press("Home")
        assert((await focused()) === "客户工作区", "Home 应到首项")
      },
    },
    {
      name: "父节点焦点环只覆盖行",
      async run({ role, press, assert, settle }) {
        const parent = role("treeitem", { name: "客户工作区", exact: true })
        await press("Tab")
        await parent.focus()
        await press("ArrowLeft")
        await press("ArrowRight")
        await settle()
        assert(
          await parent
            .locator(":scope > div")
            .evaluate((el) => getComputedStyle(el).boxShadow !== "none"),
          "行应有焦点环",
        )
        assert(
          await parent
            .locator(":scope > ul")
            .evaluate((el) => getComputedStyle(el).boxShadow === "none"),
          "子树不应有焦点环",
        )
      },
    },
    {
      name: "模块切换更新树",
      async run({ role, assert }) {
        const before = await role("tree").textContent()
        await role("button", { name: "收件箱", exact: true }).click()
        assert(
          (await role("tree").textContent()) !== before,
          "切换模块应更新树",
        )
      },
    },
    {
      name: "树筛选命中和空状态",
      async run({ role, visible }) {
        const input = role("textbox", { name: "筛选当前工作区…" })
        await input.fill("待")
        await visible(
          role("treeitem", { name: "待跟进", exact: true }),
          "应命中待跟进",
        )
        await input.fill("不存在xyz")
        await visible(role("status"), "应显示空状态")
      },
    },
  ],
} satisfies Scenario
