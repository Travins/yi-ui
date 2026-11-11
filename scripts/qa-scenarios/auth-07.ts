import type { Page } from "playwright-core"

import type { Scenario } from "./types"

/** 密码框没有 textbox 角色，按可访问名称找；exact 避开「显示密码」按钮 */
const passwordField = (page: Page) => page.getByLabel("密码", { exact: true })

const pinField = (page: Page) =>
  page.getByRole("textbox", { name: "PIN 码，共 6 位" })

const root = (page: Page) => page.locator('[data-slot="auth-07"]')

/** Next.js 路由播报器也带 role=alert，错误提示按区块收窄 */
const alerts = (page: Page) =>
  page.locator('[data-slot="auth-07"] [data-slot="auth-07-error"]')

const lockout = (page: Page) => page.locator('[data-slot="auth-07-lockout"]')

const unlockButton = (page: Page) =>
  page.getByRole("button", { name: "解锁", exact: true })

const isFocused = (target: ReturnType<Page["locator"]>) =>
  target.evaluate((el) => el === document.activeElement)

/** 输入错误密码并回车，等演示后端（350ms）返回、错误出现 */
async function failPassword(page: Page, count: number) {
  for (let index = 0; index < count; index++) {
    await passwordField(page).fill(`wrong-${index}`)
    await passwordField(page).press("Enter")
    await page
      .locator('[data-slot="auth-07"]:not([data-state="pending"])')
      .waitFor()
  }
}

export default {
  name: "锁屏解锁",
  viewports: ["desktop", "mobile"],
  steps: [
    {
      name: "打开时自动聚焦密码框",
      async run({ page, assert, visible }) {
        await visible(passwordField(page), "应显示密码框")
        await page.waitForFunction(
          () =>
            document.activeElement?.getAttribute("autocomplete") ===
            "current-password",
        )
        assert(await isFocused(passwordField(page)), "焦点应在密码框")
        assert(
          (await root(page).getAttribute("data-method")) === "password",
          "默认验证方式应为密码",
        )
      },
    },
    {
      name: "错误密码提示剩余次数并清空输入",
      async run({ page, assert, visible, shot }) {
        await failPassword(page, 1)
        const error = alerts(page)
        await visible(error, "密码错误时应出现错误文字")
        assert(
          (await error.textContent())?.trim() === "密码错误，还可以尝试 2 次",
          `错误文字应带剩余次数，实际为「${await error.textContent()}」`,
        )
        assert(
          (await error.getAttribute("role")) === "alert",
          "错误应用 role=alert 播报",
        )
        assert(
          (await passwordField(page).getAttribute("aria-invalid")) === "true",
          "密码框应标记错误态",
        )
        assert(
          (
            await passwordField(page).getAttribute("aria-describedby")
          )?.includes((await error.getAttribute("id")) ?? "-"),
          "密码框应通过 aria-describedby 关联错误",
        )
        assert((await passwordField(page).inputValue()) === "", "输入应清空")
        assert(await isFocused(passwordField(page)), "失败后焦点应回到密码框")
        await shot("密码错误")
        await passwordField(page).pressSequentially("y")
        assert((await alerts(page).count()) === 0, "重新输入后错误应清除")
      },
    },
    {
      name: "回车提交正确密码后解锁",
      async run({ page, role, assert, visible, shot }) {
        await passwordField(page).fill("yiui2026")
        await passwordField(page).press("Enter")
        const title = role("heading", { name: "已解锁", exact: true })
        await visible(title, "正确密码应解锁")
        assert(
          (await root(page).getAttribute("data-state")) === "unlocked",
          "根节点应标记 unlocked",
        )
        assert(await isFocused(title), "解锁后焦点应落在「已解锁」标题")
        await visible(
          role("button", { name: "重新锁定" }),
          "演示页应出现重新锁定按钮",
        )
        await shot("已解锁")
      },
    },
    {
      name: "切到 PIN 输满自动提交",
      async run({ page, role, assert, visible }) {
        await role("button", { name: "改用 PIN", exact: true }).click()
        await visible(pinField(page), "应切到 PIN 输入")
        assert(await isFocused(pinField(page)), "切换后焦点应在 PIN 输入")
        assert(
          (await root(page).getAttribute("data-method")) === "pin",
          "根节点应标记 pin",
        )
        await visible(
          role("button", { name: "改用密码", exact: true }),
          "应能切回密码",
        )
        await pinField(page).pressSequentially("123456")
        await visible(
          role("heading", { name: "已解锁", exact: true }),
          "PIN 输满 6 位应自动提交并解锁",
        )
      },
    },
    {
      name: "PIN 错误提示剩余次数",
      async run({ page, role, assert, visible }) {
        await role("button", { name: "改用 PIN", exact: true }).click()
        await pinField(page).pressSequentially("000000")
        const error = alerts(page)
        await visible(error, "PIN 错误时应出现错误文字")
        assert(
          (await error.textContent())?.trim() === "PIN 错误，还可以尝试 2 次",
          `错误文字应带剩余次数，实际为「${await error.textContent()}」`,
        )
        assert((await pinField(page).inputValue()) === "", "PIN 应清空")
        assert(await isFocused(pinField(page)), "失败后焦点应回到 PIN 输入")
      },
    },
    {
      name: "连续输错锁定，倒计时结束后恢复",
      async run({ page, assert, visible, shot }) {
        await failPassword(page, 3)
        await visible(lockout(page), "输错 3 次后应出现锁定倒计时")
        assert(
          /^尝试次数过多，请 [1-5] 秒后再试$/.test(
            (await lockout(page).textContent())?.trim() ?? "",
          ),
          `倒计时文字不对：「${await lockout(page).textContent()}」`,
        )
        assert(
          (await lockout(page).getAttribute("role")) === null &&
            (await lockout(page).getAttribute("aria-live")) === null,
          "可见倒计时不应逐秒播报",
        )
        assert(
          (await root(page).getAttribute("data-state")) === "locked",
          "根节点应标记 locked",
        )
        assert(await unlockButton(page).isDisabled(), "锁定期间按钮应禁用")
        assert(await passwordField(page).isDisabled(), "锁定期间输入应禁用")
        await shot("锁定倒计时")
        await lockout(page).waitFor({ state: "detached", timeout: 8000 })
        assert(await unlockButton(page).isEnabled(), "到时后按钮应恢复")
        await page.waitForFunction(
          () =>
            document.activeElement?.getAttribute("autocomplete") ===
            "current-password",
        )
        assert(await isFocused(passwordField(page)), "恢复后应聚焦密码框")
        await failPassword(page, 1)
        assert(
          (await alerts(page).textContent())?.includes("还可以尝试 2 次"),
          "恢复后失败次数应清零",
        )
      },
    },
    {
      name: "显示密码与大写锁定提示",
      viewport: "desktop",
      async run({ page, role, assert, visible }) {
        await passwordField(page).fill("abc")
        await role("button", { name: "显示密码" }).click()
        assert(
          (await passwordField(page).getAttribute("type")) === "text",
          "点按后密码应以明文显示",
        )
        await visible(
          role("button", { name: "隐藏密码" }),
          "按钮名称应切换为隐藏密码",
        )
        // 无头 Chrome 按 CapsLock 不会改变修饰键状态，直接派发带 modifierCapsLock 的按键事件
        const keyWithCapsLock = (on: boolean) =>
          passwordField(page).evaluate((input, capsLock) => {
            input.dispatchEvent(
              new KeyboardEvent("keyup", {
                key: "a",
                bubbles: true,
                modifierCapsLock: capsLock,
              }),
            )
          }, on)
        await keyWithCapsLock(true)
        const caps = page.locator('[data-slot="auth-07-caps-lock"]')
        await visible(caps, "开启大写锁定后应提示")
        assert(
          (await caps.textContent())?.trim() === "大写锁定已开启",
          "提示文字应为「大写锁定已开启」",
        )
        await keyWithCapsLock(false)
        assert((await caps.count()) === 0, "关闭大写锁定后提示应消失")
      },
    },
    {
      name: "手机视口不横向滚动",
      viewport: "mobile",
      async run({ page, assert, shot }) {
        const overflow = await page.evaluate(
          () =>
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
        )
        assert(overflow <= 0, `页面横向溢出 ${overflow}px`)
        const panel = await page
          .locator('[data-slot="auth-07-panel"]')
          .boundingBox()
        const width = page.viewportSize()?.width ?? 0
        assert(
          panel && panel.x >= 0 && panel.x + panel.width <= width,
          "内容带应完整落在视口内",
        )
        await shot("手机")
      },
    },
  ],
} satisfies Scenario
