import type { Scenario } from "./types"

export const headerStep: Scenario["steps"][number] = {
  name: "桌面两侧顶栏底边均为 56px",
  viewport: "desktop",
  async run({ page, box, assert }) {
    const main = await box(page.locator('[data-slot="sidebar-inset"] header'))
    const side = await box(
      page
        .locator(
          '[data-slot="sidebar-header"], [data-slot="sidebar-03-panel-header"], [data-slot="sidebar-04-header"]',
        )
        .first(),
    )
    assert(Math.abs(main.y + main.height - 56) < 1, "主区顶栏底边应为 56px")
    assert(Math.abs(side.y + side.height - 56) < 1, "侧栏顶部横带底边应为 56px")
  },
}
