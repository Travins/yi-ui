import type { Page } from "playwright-core"

import type { Scenario, ScenarioContext } from "./types"

const root = (page: Page) => page.locator('[data-slot="auth-08"]')

const emailField = (page: Page) =>
  page.getByRole("textbox", { name: "邮箱", exact: true })

const codeField = (page: Page) =>
  page.getByRole("textbox", { name: "验证码，共 6 位" })

/** 只在区块内找：Next.js 的路由播报器也带 role=alert 且一直可见 */
const alerts = (page: Page) => root(page).locator('[role="alert"]')

const sendButton = (role: ScenarioContext["role"]) =>
  role("button", { name: "发送登录链接", exact: true })

/** 每一步都从重新加载的页面开始：填邮箱 → 发送 → 等「去邮箱查收」出现 */
async function enterSent(
  { page, role, visible }: Pick<ScenarioContext, "page" | "role" | "visible">,
  email = "travin@qq.com",
) {
  await emailField(page).fill(email)
  await sendButton(role).click()
  await visible(
    role("heading", { name: "去邮箱查收", exact: true }),
    "发送成功后应进入已发送状态",
  )
}

export default {
  name: "邮箱免密登录",
  viewports: ["desktop", "mobile"],
  steps: [
    {
      name: "空邮箱和格式错误被拦截，改对后错误消失",
      async run({ page, role, assert, visible, settle }) {
        await sendButton(role).click()
        await visible(alerts(page), "空邮箱应提示")
        assert(
          (await alerts(page).textContent())?.includes("请输入邮箱"),
          "空邮箱应提示请输入邮箱",
        )
        assert(
          (await emailField(page).getAttribute("aria-invalid")) === "true",
          "输入框应标记错误态",
        )
        const describedBy =
          await emailField(page).getAttribute("aria-describedby")
        const errorId = await alerts(page).getAttribute("id")
        assert(
          !!errorId && describedBy?.split(" ").includes(errorId),
          "错误应通过 aria-describedby 关联到输入框",
        )
        assert(
          await emailField(page).evaluate(
            (el) => el === document.activeElement,
          ),
          "出错后焦点应回到输入框",
        )
        await emailField(page).fill("travin@qq")
        await sendButton(role).click()
        await visible(alerts(page), "格式错误应提示")
        assert(
          (await alerts(page).textContent())?.includes("邮箱格式不正确"),
          "应提示邮箱格式不正确",
        )
        await emailField(page).fill("travin@qq.com")
        await settle()
        assert((await alerts(page).count()) === 0, "改动后错误应消失")
        assert(
          (await root(page).getAttribute("data-step")) === "email",
          "出错时不应离开邮箱状态",
        )
      },
    },
    {
      name: "后缀小按钮按输入筛选并补全，焦点留在输入框",
      async run({ page, role, assert, visible, settle, shot }) {
        const group = role("group", { name: "常用邮箱后缀" })
        await emailField(page).fill("travin")
        assert((await group.count()) === 0, "还没输入 @ 时不显示后缀")
        await emailField(page).fill("travin@")
        await visible(group, "输入到 @ 时应出现后缀")
        assert(
          (await group.getByRole("button").count()) === 4,
          "默认应有 4 个后缀",
        )
        await shot("后缀小按钮")
        await emailField(page).pressSequentially("g")
        await settle()
        assert(
          (await group.getByRole("button").count()) === 1,
          "输入 g 后只剩 gmail.com",
        )
        await role("button", { name: "travin@gmail.com" }).click()
        await settle()
        assert(
          (await emailField(page).inputValue()) === "travin@gmail.com",
          "点后缀应补全邮箱",
        )
        assert(
          await emailField(page).evaluate(
            (el) => el === document.activeElement,
          ),
          "补全后焦点应留在输入框",
        )
        assert((await group.count()) === 0, "写完整域名后后缀应消失")
      },
    },
    {
      name: "键盘：Tab 到后缀按回车补全，再回车发送",
      async run({ page, role, assert, visible, settle }) {
        await emailField(page).fill("travin@1")
        await emailField(page).focus()
        await page.keyboard.press("Tab")
        await page.keyboard.press("Enter")
        await settle()
        assert(
          (await emailField(page).inputValue()) === "travin@163.com",
          "键盘按后缀应补全为 163.com",
        )
        assert(
          await emailField(page).evaluate(
            (el) => el === document.activeElement,
          ),
          "键盘补全后焦点应交回输入框",
        )
        await page.keyboard.press("Enter")
        const title = role("heading", { name: "去邮箱查收", exact: true })
        await visible(title, "回车应发送并进入已发送状态")
        assert(
          await title.evaluate((el) => el === document.activeElement),
          "切换状态后焦点应在标题上",
        )
        await visible(
          role("link", { name: /打开 163 邮箱/ }),
          "163 邮箱应显示打开按钮",
        )
      },
    },
    {
      name: "blocked@ 发送失败，错误显示在邮箱条下",
      async run({ page, role, assert, visible }) {
        await emailField(page).fill("blocked@qq.com")
        await sendButton(role).click()
        await visible(alerts(page), "发送失败应显示错误")
        assert(
          (await alerts(page).textContent())?.includes("发送太频繁"),
          "应提示发送太频繁",
        )
        assert(
          (await root(page).getAttribute("data-step")) === "email",
          "发送失败应留在邮箱状态",
        )
        assert(
          (await emailField(page).getAttribute("aria-invalid")) === "true",
          "发送失败时输入框应标记错误态",
        )
      },
    },
    {
      name: "规范化邮箱后发送，显示打开 QQ 邮箱并在新标签页打开",
      async run({ page, role, assert, visible, shot }) {
        await enterSent({ page, role, visible }, "  Travin@QQ.COM ")
        await visible(
          page.getByText("Travin@qq.com", { exact: true }),
          "应显示去空格、域名转小写后的邮箱",
        )
        const link = role("link", { name: /打开 QQ 邮箱/ })
        await visible(link, "qq.com 应显示打开 QQ 邮箱")
        assert(
          (await link.getAttribute("href")) === "https://mail.qq.com",
          "链接应指向 mail.qq.com",
        )
        assert(
          (await link.getAttribute("target")) === "_blank" &&
            (await link.getAttribute("rel")) === "noreferrer",
          "应在新标签页打开并带 noreferrer",
        )
        await shot("已发送")
      },
    },
    {
      name: "未知域名不显示打开邮箱按钮",
      async run({ page, role, assert, visible }) {
        await enterSent({ page, role, visible }, "travin@example.com")
        assert(
          (await page.locator('[data-slot="auth-08-open-mail"]').count()) === 0,
          "未知域名不应显示打开邮箱",
        )
        await visible(
          page.getByText("也可以输入邮件里的验证码"),
          "没有打开按钮时分隔文字不以「或」开头",
        )
      },
    },
    {
      name: "错误验证码报错，改动即清除",
      async run({ page, role, assert, visible, settle }) {
        await enterSent({ page, role, visible })
        await codeField(page).pressSequentially("000000")
        await visible(alerts(page), "验证码错误应显示错误")
        assert(
          (await alerts(page).textContent())?.includes("验证码错误"),
          "错误文字应说明验证码不对",
        )
        assert(
          (await codeField(page).getAttribute("aria-invalid")) === "true",
          "验证码输入应标记错误态",
        )
        await codeField(page).click()
        await page.keyboard.press("9")
        await settle()
        assert((await alerts(page).count()) === 0, "改动验证码后错误应清除")
      },
    },
    {
      name: "正确验证码登录成功",
      async run({ page, role, assert, visible }) {
        await enterSent({ page, role, visible })
        await codeField(page).fill("123456")
        const title = role("heading", { name: "登录成功", exact: true })
        await visible(title, "验证码正确时应显示登录成功")
        assert(
          (await root(page).getAttribute("data-state")) === "success",
          "根元素应标记 success",
        )
        assert(
          await title.evaluate((el) => el === document.activeElement),
          "成功后焦点应在标题上",
        )
      },
    },
    {
      name: "换一个邮箱回去后邮箱仍在，同一邮箱不重发直接回到已发送",
      async run({ page, role, assert, visible }) {
        await enterSent({ page, role, visible })
        await role("button", { name: "换一个邮箱", exact: true }).click()
        const title = role("heading", { name: "邮箱登录", exact: true })
        await visible(title, "应回到邮箱状态")
        assert(
          await title.evaluate((el) => el === document.activeElement),
          "回到邮箱状态后焦点应在标题上",
        )
        assert(
          (await emailField(page).inputValue()) === "travin@qq.com",
          "之前输入的邮箱应还在",
        )
        await role("button", { name: "回到已发送的邮件", exact: true }).click()
        await visible(
          role("heading", { name: "去邮箱查收", exact: true }),
          "倒计时内同一邮箱应直接回到已发送状态",
        )
      },
    },
    {
      name: "重发按钮在倒计时内禁用",
      async run({ page, role, assert, visible }) {
        await enterSent({ page, role, visible })
        const resend = role("button", { name: /秒后可重新发送/ })
        await visible(resend, "发送后应显示倒计时")
        assert(await resend.isDisabled(), "倒计时内重发按钮应禁用")
        const text = (await resend.textContent()) ?? ""
        const seconds = Number(text.match(/\d+/)?.[0])
        assert(
          seconds > 50 && seconds <= 60,
          `倒计时应从 60 秒开始，实际 ${text}`,
        )
      },
    },
  ],
} satisfies Scenario
