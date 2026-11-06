import type { Page } from "playwright-core"

import type { Scenario, ScenarioContext } from "./types"

const PHONE = "13800138000"

const phoneField = (page: Page) =>
  page.getByRole("textbox", { name: "手机号（+86）" })

const codeField = (page: Page) =>
  page.getByRole("textbox", { name: "验证码，共 6 位" })

/**
 * 页面里还有一个 Next.js 的路由播报器（同样带 role=alert），错误提示按区块收窄才不会命中两个。
 * 另外它一直在可见状态，不收窄的话「等错误出现」会立刻通过，读到的是播报器的空文字。
 */
const alerts = (page: Page) =>
  page.locator('[data-slot="auth-03"] [role="alert"]')

const agreement = (page: Page) => page.locator('[data-slot="checkbox"]')

/** 错误格子的标记：源码把同一份 error 同时给输入框和每个格子 */
const invalidSlots = (page: Page) =>
  page.locator('[data-slot="input-otp-slot"][aria-invalid="true"]')

/**
 * 每一步都从重新加载的页面开始，这里把状态准备好：填号码 → 勾选协议 → 获取验证码。
 * 演示后端有 350ms 延迟，等第二步标题出现再往下走。
 */
async function enterCodeStep({
  page,
  role,
  visible,
}: Pick<ScenarioContext, "page" | "role" | "visible">) {
  await phoneField(page).fill(PHONE)
  await agreement(page).click()
  await role("button", { name: "获取验证码", exact: true }).click()
  await visible(
    role("heading", { name: "输入短信验证码", exact: true }),
    "发送成功后应进入验证码步骤",
  )
}

export default {
  name: "验证码登录",
  viewports: ["desktop"],
  steps: [
    {
      name: "未同意协议时拦截并聚焦复选框",
      async run({ page, role, assert, visible }) {
        await phoneField(page).fill(PHONE)
        await role("button", { name: "获取验证码", exact: true }).click()
        const error = alerts(page)
        await visible(error, "未勾选协议时应出现文字错误")
        assert(
          (await error.textContent())?.includes(
            "请先阅读并同意用户协议和隐私政策",
          ),
          "错误文字应说明需要同意协议",
        )
        assert(
          await agreement(page).evaluate((el) => el === document.activeElement),
          "焦点应落在协议复选框上",
        )
        assert(
          await role("heading", {
            name: "输入手机号",
            exact: true,
          }).isVisible(),
          "出错时不应离开第一步",
        )
      },
    },
    {
      name: "0000 结尾号码提示发送太频繁",
      async run({ page, role, assert, visible }) {
        await phoneField(page).fill("13800000000")
        await agreement(page).click()
        await role("button", { name: "获取验证码", exact: true }).click()
        const error = page.locator('[data-slot="phone-input-error"]')
        await visible(error, "发送失败时应显示后端返回的错误")
        assert(
          (await error.textContent())?.includes("发送太频繁"),
          "应提示发送太频繁",
        )
        assert(
          (await phoneField(page).getAttribute("aria-invalid")) === "true",
          "发送失败时号码输入应标记错误态",
        )
      },
    },
    {
      name: "进入第二步聚焦标题并显示脱敏号码",
      async run({ page, role, assert, visible }) {
        await enterCodeStep({ page, role, visible })
        const title = role("heading", { name: "输入短信验证码", exact: true })
        assert(
          await title.evaluate((el) => el === document.activeElement),
          "焦点应落在第二步标题上",
        )
        await visible(
          page.getByText("验证码已发送至 +86 138 **** 8000", { exact: true }),
          "应显示脱敏后的号码",
        )
      },
    },
    {
      name: "整串输入 123456 登录成功",
      async run({ page, role, assert, visible }) {
        await enterCodeStep({ page, role, visible })
        // 整串粘贴：一次给满 6 位，走 onComplete 自动提交
        await codeField(page).fill("123456")
        await visible(
          role("heading", { name: "登录成功", exact: true }),
          "验证码正确时应显示登录成功",
        )
        assert(
          (await page
            .locator('[data-slot="auth-03"]')
            .getAttribute("data-state")) === "success",
          "成功后根元素应标记 success",
        )
        await visible(
          role("status").filter({ hasText: "身份验证已完成" }),
          "应显示成功说明",
        )
      },
    },
    {
      name: "000000 报错，再输一位即清除",
      async run({ page, role, assert, visible, settle }) {
        await enterCodeStep({ page, role, visible })
        await codeField(page).pressSequentially("000000")
        const error = alerts(page)
        await visible(error, "验证码错误时应显示错误文字")
        assert(
          (await error.textContent())?.includes("验证码错误"),
          "错误文字应说明验证码不对",
        )
        assert(
          (await codeField(page).getAttribute("aria-invalid")) === "true",
          "验证码输入应标记错误态",
        )
        assert(
          (await invalidSlots(page).count()) === 6,
          "六个格子都应显示错误态",
        )
        // 满 6 位时框内选中最后一位，点一下再敲数字是替换那一位，相当于继续输入
        await codeField(page).click()
        await page.keyboard.press("9")
        await settle()
        assert(
          (await codeField(page).inputValue()) === "000009",
          "再输入一位应替换最后一位",
        )
        assert((await alerts(page).count()) === 0, "改动验证码后错误文字应清除")
        assert(
          (await invalidSlots(page).count()) === 0,
          "改动验证码后格子的错误态应清除",
        )
      },
    },
    {
      name: "修改号码回到第一步且号码保留",
      async run({ page, role, assert, visible }) {
        await enterCodeStep({ page, role, visible })
        await role("button", { name: "修改号码", exact: true }).click()
        await visible(
          role("heading", { name: "输入手机号", exact: true }),
          "应回到手机号步骤",
        )
        assert(
          (await phoneField(page).inputValue()) === "138 0013 8000",
          "之前输入的号码应还在",
        )
      },
    },
  ],
} satisfies Scenario
