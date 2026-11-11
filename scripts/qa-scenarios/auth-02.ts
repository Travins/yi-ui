import type { Page } from "playwright-core"

import type { Scenario } from "./types"

/** 演示控制条（src/components/demo/demo-bar.tsx，只属于演示外壳 demo.tsx） */
const demoBar = (page: Page) => page.getByRole("region", { name: "演示控制" })

/** 控制条里的「扫码状态」：五种状态放在同一个单选组里 */
const demoStates = (page: Page) =>
  demoBar(page).getByRole("radiogroup", { name: "扫码状态" })

/** 控制条的播报行：播放进度、停止与完成的结果 */
const demoStatus = (page: Page) => demoBar(page).getByRole("status")

const dataState = (page: Page) =>
  page.locator('[data-slot="auth-02"]').getAttribute("data-state")

/** 等控制条里选中的是这一项（区块内的操作要同步回控制条） */
async function waitChecked(page: Page, label: string) {
  try {
    await demoStates(page)
      .getByRole("radio", { name: label, exact: true })
      .and(page.locator('[aria-checked="true"]'))
      .waitFor({ timeout: 8000 })
  } catch {
    throw new Error(`控制条的扫码状态应选中「${label}」`)
  }
}

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
      name: "控制条切换五种状态",
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
      name: "区块内刷新、重试会同步回控制条",
      viewport: "desktop",
      async run({ page, role }) {
        await demoStates(page)
          .getByRole("radio", { name: "失败", exact: true })
          .click()
        await waitStatus(page, "error", "二维码生成失败")
        await role("button", { name: "重试", exact: true }).click()
        await waitStatus(page, "pending", "请用手机扫描登录二维码")
        await waitChecked(page, "待扫码")
        await demoStates(page)
          .getByRole("radio", { name: "已扫码", exact: true })
          .click()
        await waitStatus(page, "scanned", "已扫码，请在手机上确认")
        await role("button", { name: "重新扫码", exact: true }).click()
        await waitStatus(page, "pending", "请用手机扫描登录二维码")
        await waitChecked(page, "待扫码")
      },
    },
    {
      name: "播放流程：进度有文字，逐步走到成功，之后可重新播放",
      viewport: "desktop",
      async run({ page, role, assert, visible }) {
        await role("button", { name: "播放流程", exact: true }).click()
        await visible(
          demoStatus(page).filter({ hasText: "播放中 1/3：待扫码" }),
          "播放开始后播报行应显示第 1 步",
        )
        await visible(
          role("button", { name: "停止", exact: true }),
          "播放中按钮应变成「停止」",
        )
        await waitStatus(page, "scanned", "已扫码，请在手机上确认")
        await visible(
          demoStatus(page).filter({ hasText: "播放中 2/3：已扫码" }),
          "第 2 步应播报已扫码",
        )
        await waitChecked(page, "已扫码")
        await waitStatus(page, "confirmed", "登录成功")
        await visible(
          demoStatus(page).filter({ hasText: "播放完成" }),
          "结束后应播报播放完成",
        )
        const again = role("button", { name: "重新播放", exact: true })
        await visible(again, "结束后应出现「重新播放」")
        await again.click()
        await waitStatus(page, "pending", "请用手机扫描登录二维码")
        assert(
          (await demoStatus(page).textContent())?.includes("播放中 1/3"),
          "重新播放应从第 1 步开始",
        )
      },
    },
    {
      name: "播放中可以停止，停在当前步骤不再推进",
      viewport: "desktop",
      async run({ page, role, assert, visible }) {
        await role("button", { name: "播放流程", exact: true }).click()
        await waitStatus(page, "scanned", "已扫码，请在手机上确认")
        await role("button", { name: "停止", exact: true }).click()
        await visible(
          demoStatus(page).filter({ hasText: "已停止，停在「已扫码」" }),
          "停止后应播报停在哪一步",
        )
        await page.waitForTimeout(3500)
        assert((await dataState(page)) === "scanned", "停止后不应再推进到成功")
        await visible(
          role("button", { name: "重新播放", exact: true }),
          "停止后应可以重新播放",
        )
      },
    },
    {
      name: "播放中切到短信登录：播放停止，不会在短信界面上播报成功",
      viewport: "desktop",
      async run({ page, role, assert, visible }) {
        await role("button", { name: "播放流程", exact: true }).click()
        await waitStatus(page, "scanned", "已扫码，请在手机上确认")
        await (await visibleButton(page, "短信验证码登录")).click()
        await visible(
          demoStatus(page).filter({
            hasText: "已切到其他登录方式，播放已停止",
          }),
          "切离扫码后应停止播放并说明原因",
        )
        await page.waitForTimeout(3500)
        assert(
          (await demoStatus(page).filter({ hasText: "播放完成" }).count()) ===
            0,
          "停止后不应再播报播放完成",
        )
        await visible(
          role("button", { name: "重新播放", exact: true }),
          "停止后应可以重新播放",
        )
      },
    },
    {
      name: "重置回到初始：待扫码、播报清空、回到扫码页签",
      viewport: "desktop",
      async run({ page, role, assert, visible }) {
        await demoStates(page)
          .getByRole("radio", { name: "成功", exact: true })
          .click()
        await waitStatus(page, "confirmed", "登录成功")
        await (await visibleButton(page, "账号密码登录")).click()
        await visible(
          page.locator('[data-slot="auth-02-sign-in-password"]'),
          "应进入账号密码表单",
        )
        await role("button", { name: "重置", exact: true }).click()
        await waitStatus(page, "pending", "请用手机扫描登录二维码")
        await visible(
          role("img", { name: "登录二维码，请用手机扫描" }),
          "重置后应回到扫码页签并重新画出二维码",
        )
        await waitChecked(page, "待扫码")
        assert(
          ((await demoStatus(page).textContent()) ?? "").trim() === "",
          "重置后播报行应清空",
        )
        await visible(
          role("button", { name: "播放流程", exact: true }),
          "重置后播放按钮回到「播放流程」",
        )
      },
    },
    {
      name: "非扫码页签下扫码状态禁用，返回扫码后恢复",
      viewport: "desktop",
      async run({ page, assert, visible }) {
        await (await visibleButton(page, "短信验证码登录")).click()
        await visible(
          demoBar(page).getByText("扫码状态不适用", { exact: false }),
          "提示行应说明扫码状态不适用",
        )
        assert(
          (await demoStates(page).getAttribute("data-disabled")) !== null,
          "短信页签下扫码状态应禁用",
        )
        await (await visibleButton(page, "返回扫码")).click()
        try {
          await page.waitForFunction(
            () =>
              !document
                .querySelector('[aria-label="扫码状态"]')
                ?.hasAttribute("data-disabled"),
            undefined,
            { timeout: 5000 },
          )
        } catch {
          throw new Error("返回扫码后扫码状态应恢复可用")
        }
      },
    },
    {
      name: "手动选定「已扫码」不被真实过期打断；「待扫码」照常过期",
      viewport: "desktop",
      async run({ page, assert }) {
        // 演示二维码 60 秒后过期：用假时钟快进，不真的等一分钟
        await page.clock.install()
        await page.reload({ waitUntil: "networkidle" })
        await page.clock.runFor(2000)
        assert((await dataState(page)) === "pending", "加载后应是待扫码")
        await demoStates(page)
          .getByRole("radio", { name: "已扫码", exact: true })
          .click()
        await page.clock.runFor(500)
        assert((await dataState(page)) === "scanned", "应切到已扫码")
        await page.clock.runFor(65_000)
        assert(
          (await dataState(page)) === "scanned",
          "手动选定的已扫码超过 60 秒也不应变成已过期",
        )
        // 二维码已经过期：再选「待扫码」会重新生成一张，回到实时倒计时，而不是立刻过期
        await demoStates(page)
          .getByRole("radio", { name: "待扫码", exact: true })
          .click()
        await page.clock.runFor(2000)
        assert(
          (await dataState(page)) === "pending",
          "回到待扫码时应重新生成二维码，不应立刻过期",
        )
        await page.clock.runFor(61_000)
        assert(
          (await dataState(page)) === "expired",
          "实时的待扫码到时应自动过期",
        )
      },
    },
    {
      name: "演示控制条在手机宽度下不横向溢出，选项文字完整",
      viewport: "mobile",
      async run({ page, assert, visible }) {
        await visible(demoBar(page), "手机上也应有演示控制条")
        const overflow = await page.evaluate(
          () =>
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
        )
        assert(overflow <= 0, `页面不应横向溢出，多出 ${overflow}px`)
        const clipped = await demoStates(page)
          .locator('[data-slot="segmented-control-item"] span.truncate')
          .evaluateAll((items) =>
            items
              .filter((el) => el.scrollWidth > el.clientWidth + 1)
              .map((el) => el.textContent),
          )
        assert(
          clipped.length === 0,
          `扫码状态的选项文字不应被截断：${clipped.join("、")}`,
        )
        const heights = await demoBar(page)
          .locator('[data-slot="segmented-control"]')
          .evaluateAll((items) =>
            items.map((el) => Math.round(el.getBoundingClientRect().height)),
          )
        assert(
          heights.length > 0 && heights.every((height) => height >= 36),
          `触屏下分段控件应不低于 36px，实际 ${heights.join("、")}`,
        )
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
