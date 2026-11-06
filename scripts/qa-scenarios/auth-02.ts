import type { Page } from "playwright-core"

import type { Scenario } from "./types"

/** 演示状态条：五种扫码状态放在同一个单选组里（演示外壳 demo.tsx 提供） */
const demoStates = (page: Page) =>
  page.getByRole("radiogroup", { name: "演示状态" })

/** 状态文字同时写在扫码区域和 aria-live 里，读 aria-live 这一处，免得同名文字命中两个元素 */
const statusLine = (page: Page) =>
  page.locator('[data-slot="auth-02"] [aria-live="polite"]')

/** 切换状态后要等 React 提交：data-state 和状态文字都换成新的，才算切过去 */
async function waitStatus(page: Page, state: string, text: string) {
  try {
    await page.waitForFunction(
      ({ state, text }) => {
        const root = document.querySelector('[data-slot="auth-02"]')
        const live = root?.querySelector('[aria-live="polite"]')
        return (
          root?.getAttribute("data-state") === state &&
          live?.textContent?.trim() === text
        )
      },
      { state, text },
      { timeout: 8000 },
    )
  } catch {
    const actual = (await statusLine(page).textContent())?.trim()
    throw new Error(
      `状态应为 ${state} 并显示「${text}」，实际是「${actual ?? ""}」`,
    )
  }
}

/** 同一句文案的入口在桌面和手机各有一个（另一半用 md:hidden 藏起来），只取看得见的那个 */
async function visibleButton(page: Page, name: string) {
  for (const item of await page
    .getByRole("button", { name, exact: true })
    .all()) {
    if (await item.isVisible()) return item
  }
  throw new Error(`找不到可见的「${name}」按钮`)
}

export default {
  name: "扫码登录",
  viewports: ["desktop", "mobile"],
  steps: [
    {
      name: "二维码有可访问名称",
      viewport: "desktop",
      async run({ page, role, assert, visible }) {
        const qr = role("img", { name: "登录二维码，请用手机扫描" })
        await visible(qr, "二维码应有 role=img 与 aria-label")
        assert(
          (await qr.evaluate((el) => el.tagName.toLowerCase())) === "svg",
          "二维码应是 svg",
        )
        assert(
          await qr.evaluate(
            (el) => !!el.closest('[data-slot="auth-02-code-region"]'),
          ),
          "二维码应画在扫码区域里",
        )
        assert(
          (await statusLine(page).textContent())?.trim() ===
            "请用手机扫描登录二维码",
          "待扫码时应有对应文字",
        )
      },
    },
    {
      name: "演示状态条切换五种状态",
      viewport: "desktop",
      async run({ page }) {
        const cases: [string, string, string][] = [
          ["已扫码", "scanned", "已扫码，请在手机上确认"],
          ["已过期", "expired", "二维码已过期"],
          ["成功", "confirmed", "登录成功"],
          ["失败", "error", "二维码生成失败"],
          ["待扫码", "pending", "请用手机扫描登录二维码"],
        ]
        for (const [label, state, text] of cases) {
          await demoStates(page)
            .getByRole("radio", { name: label, exact: true })
            .click()
          await waitStatus(page, state, text)
        }
      },
    },
    {
      name: "已过期后刷新回到待扫码",
      viewport: "desktop",
      async run({ page, role, assert, visible }) {
        await demoStates(page)
          .getByRole("radio", { name: "已过期", exact: true })
          .click()
        await waitStatus(page, "expired", "二维码已过期")
        const refresh = role("button", { name: "刷新", exact: true })
        await visible(refresh, "已过期时应出现「刷新」按钮")
        await refresh.click()
        await waitStatus(page, "pending", "请用手机扫描登录二维码")
        await visible(
          role("img", { name: "登录二维码，请用手机扫描" }),
          "刷新后应重新画出二维码",
        )
        assert(!(await refresh.isVisible()), "刷新后「刷新」按钮应消失")
      },
    },
    {
      name: "切换提供方更换二维码内容",
      viewport: "desktop",
      async run({ page, role, assert, visible }) {
        const qr = page.locator('[data-slot="auth-02-qr-code"]')
        await visible(qr, "应先画出二维码")
        const before = await qr.evaluate((el) => el.innerHTML)
        await role("radiogroup", { name: "扫码方式" })
          .getByRole("radio", { name: /企业账号扫码/ })
          .click()
        try {
          await page.waitForFunction(
            (previous) => {
              const svg = document.querySelector(
                '[data-slot="auth-02-qr-code"]',
              )
              return !!svg && svg.innerHTML !== previous
            },
            before,
            { timeout: 8000 },
          )
        } catch {
          throw new Error("换提供方后二维码内容应重新生成")
        }
        const after = await qr.evaluate((el) => el.innerHTML)
        assert(before !== after, "换提供方后二维码内容应变化")
        assert(after.length > 0, "新二维码不应是空的")
        await visible(
          role("heading", { name: "企业账号扫码", exact: true }),
          "右侧说明应跟随提供方",
        )
      },
    },
    {
      name: "短信验证码登录能进能回",
      viewport: "desktop",
      async run({ page, role, visible }) {
        await (await visibleButton(page, "短信验证码登录")).click()
        await visible(
          page.locator('[data-slot="auth-02-sign-in-code"]'),
          "应进入短信验证码表单",
        )
        await (await visibleButton(page, "返回扫码")).click()
        await visible(
          role("img", { name: "登录二维码，请用手机扫描" }),
          "返回后应回到二维码",
        )
      },
    },
    {
      name: "账号密码登录能进能回",
      viewport: "desktop",
      async run({ page, role, visible }) {
        await (await visibleButton(page, "账号密码登录")).click()
        await visible(
          page.locator('[data-slot="auth-02-sign-in-password"]'),
          "应进入账号密码表单",
        )
        await (await visibleButton(page, "返回扫码")).click()
        await visible(
          role("img", { name: "登录二维码，请用手机扫描" }),
          "返回后应回到二维码",
        )
      },
    },
    {
      name: "手机上短信入口在二维码上方",
      viewport: "mobile",
      async run({ page, box, assert, role, visible }) {
        await visible(
          role("img", { name: "登录二维码，请用手机扫描" }),
          "应画出二维码",
        )
        // 手机上扫不了自己屏幕上的码：短信入口必须提到二维码前面，看得见才点得到
        const sms = await box(await visibleButton(page, "短信验证码登录"))
        const region = await box(
          page.locator('[data-slot="auth-02-code-region"]'),
        )
        assert(
          sms.y + sms.height <= region.y + 1,
          "「短信验证码登录」应排在二维码区域上方",
        )
      },
    },
  ],
} satisfies Scenario
