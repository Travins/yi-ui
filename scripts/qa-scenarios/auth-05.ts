import type { Page } from "playwright-core"

import type { Scenario, ScenarioContext } from "./types"

const codeField = (page: Page) =>
  page.getByRole("textbox", { name: "验证码，共 6 位" })

/** 同 auth-03：Next.js 路由播报器也带 role=alert，错误提示按区块收窄 */
const alerts = (page: Page) =>
  page.locator('[data-slot="auth-05"] [role="alert"]')

/** 通行密钥的状态文字放在常驻的 aria-live 容器里 */
const passkeyStatus = (page: Page) =>
  page.locator('[data-slot="auth-05-passkey-status"]')

/** 「其他验证方式」列表里的各项 */
const alternatives = (page: Page) =>
  page.locator('[data-slot="auth-05-alternatives"] button')

const isFocused = (target: ReturnType<Page["locator"]>) =>
  target.evaluate((el) => el === document.activeElement)

/** 演示外壳的通行密钥结果选择（只属于演示，不在 Auth05 里） */
async function pickMode(page: Page, name: string) {
  await page
    .getByRole("radiogroup", { name: "通行密钥模拟结果" })
    .getByRole("radio", { name })
    .click()
}

/** 点列表里的某一项切换验证方式；名称里带说明文字，所以按前缀匹配 */
async function switchTo(page: Page, name: string) {
  await alternatives(page).filter({ hasText: name }).click()
}

/** 切到演示外壳的「嵌入」布局：分屏页右侧放 Auth05Panel（只开 totp 与 recovery、用户名账号、无记住设备、备用码不格式化） */
async function pickEmbedded(page: Page) {
  await page
    .getByRole("radiogroup", { name: "演示布局" })
    .getByRole("radio", { name: "嵌入" })
    .click()
  await page.locator('[data-slot="auth-05-content"]').waitFor()
}

type Ctx = Pick<ScenarioContext, "page" | "role" | "visible" | "assert">

async function expectSuccess({ role, visible, assert, page }: Ctx) {
  await visible(
    role("heading", { name: "验证成功", exact: true }),
    "验证通过后应显示验证成功",
  )
  assert(
    (await page.locator('[data-slot="auth-05"]').getAttribute("data-state")) ===
      "success",
    "成功后根元素应标记 success",
  )
}

export default {
  name: "多因素验证",
  viewports: ["desktop", "mobile"],
  steps: [
    {
      name: "账号摘要显示脱敏邮箱，切换账号触发回调",
      viewport: "desktop",
      async run({ page, role, assert, visible }) {
        const account = page.locator('[data-slot="auth-05-account"]')
        await visible(account, "应有账号摘要条")
        assert(
          (await account.textContent())?.includes("lin***@example.com"),
          "摘要应显示脱敏邮箱 lin***@example.com",
        )
        assert(
          !(await account.textContent())?.includes("linwei@example.com"),
          "摘要不应出现完整邮箱",
        )
        await role("button", { name: "不是你？切换账号", exact: true }).click()
        await visible(
          page.getByText("请在接入后跳转到账号选择页面", { exact: true }),
          "点击切换账号应调用 onSwitchAccount",
        )
      },
    },
    {
      name: "默认是通行密钥，其他方式列表不含当前方式",
      viewport: "desktop",
      async run({ page, role, assert, visible }) {
        await visible(
          role("heading", { name: "使用通行密钥验证", exact: true }),
          "默认应显示通行密钥面板",
        )
        const list = alternatives(page)
        assert((await list.count()) === 3, "其他验证方式应有 3 项")
        const texts = await list.allTextContents()
        assert(
          !texts.some((text) => text.includes("通行密钥")),
          "列表里不应包含当前方式通行密钥",
        )
        for (const name of ["身份验证器 App", "短信验证码", "恢复码"])
          assert(
            texts.some((text) => text.includes(name)),
            `列表里应有 ${name}`,
          )
      },
    },
    {
      name: "切换方式后列表同步：当前方式消失，原方式出现",
      viewport: "desktop",
      async run({ page, role, assert, visible }) {
        await switchTo(page, "短信验证码")
        await visible(
          role("heading", { name: "输入短信验证码", exact: true }),
          "应切到短信面板",
        )
        const texts = await alternatives(page).allTextContents()
        assert(
          !texts.some((text) => text.includes("短信验证码")),
          "切换后列表不应再有短信验证码",
        )
        assert(
          texts.some((text) => text.includes("通行密钥")),
          "原来的通行密钥应回到列表里",
        )
      },
    },
    {
      name: "通行密钥：等待中再成功",
      viewport: "desktop",
      async run({ page, role, assert, visible }) {
        await role("button", { name: "使用通行密钥验证", exact: true }).click()
        await visible(
          page
            .locator('[data-slot="auth-05-passkey-status"]')
            .filter({ hasText: "请在浏览器或系统弹窗中完成验证" }),
          "等待期间应提示在弹窗中完成验证",
        )
        const waiting = role("button", { name: "等待验证…", exact: true })
        assert(await waiting.isDisabled(), "等待期间按钮应禁用")
        assert(
          (await alternatives(page).first().isDisabled()) === true,
          "等待期间不应允许切换方式",
        )
        await expectSuccess({ page, role, visible, assert })
      },
    },
    {
      name: "通行密钥：取消后提示可以重试，并能再次发起",
      viewport: "desktop",
      async run({ page, role, assert, visible }) {
        await pickMode(page, "取消")
        const start = role("button", { name: "使用通行密钥验证", exact: true })
        await start.click()
        await visible(
          passkeyStatus(page).filter({ hasText: "已取消，可以重试" }),
          "NotAllowedError 应显示已取消",
        )
        assert((await alerts(page).count()) === 0, "取消不应当作错误展示")
        assert(await start.isEnabled(), "取消后按钮应恢复可点")
        await start.click()
        await visible(
          passkeyStatus(page).filter({
            hasText: "请在浏览器或系统弹窗中完成验证",
          }),
          "重试应再次进入等待状态",
        )
      },
    },
    {
      name: "通行密钥：其他错误显示 Error.message",
      viewport: "desktop",
      async run({ page, role, assert, visible }) {
        await pickMode(page, "失败")
        await role("button", { name: "使用通行密钥验证", exact: true }).click()
        const error = alerts(page)
        await visible(error, "失败时应出现错误提示")
        assert(
          (await error.textContent())?.includes("没有找到可用的通行密钥"),
          "应显示回调抛出的 message",
        )
      },
    },
    {
      name: "不支持通行密钥：提示、禁用主按钮、建议改用其他方式",
      viewport: "desktop",
      async run({ page, role, assert, visible }) {
        await pickMode(page, "不支持")
        await visible(
          passkeyStatus(page).filter({ hasText: "当前浏览器不支持通行密钥" }),
          "应提示当前浏览器不支持",
        )
        assert(
          await role("button", {
            name: "使用通行密钥验证",
            exact: true,
          }).isDisabled(),
          "不支持时主按钮应禁用",
        )
        await role("button", {
          name: "改用身份验证器 App",
          exact: true,
        }).click()
        await visible(
          role("heading", { name: "输入身份验证器验证码", exact: true }),
          "点建议后应切到验证器面板",
        )
      },
    },
    {
      name: "切换到身份验证器后焦点落在标题上",
      viewport: "desktop",
      async run({ page, role, assert, visible }) {
        await switchTo(page, "身份验证器 App")
        const title = role("heading", {
          name: "输入身份验证器验证码",
          exact: true,
        })
        await visible(title, "应显示验证器面板标题")
        assert(await isFocused(title), "焦点应落在新面板的标题上")
      },
    },
    {
      name: "身份验证器：000000 报错，改一位即清除",
      viewport: "desktop",
      async run({ page, assert, visible, settle }) {
        await switchTo(page, "身份验证器 App")
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
          (await page
            .locator('[data-slot="input-otp-slot"][aria-invalid="true"]')
            .count()) === 6,
          "六个格子都应显示错误态",
        )
        await codeField(page).click()
        await page.keyboard.press("9")
        await settle()
        assert((await alerts(page).count()) === 0, "改动后错误文字应清除")
      },
    },
    {
      name: "身份验证器：123456 整串输入自动提交成功",
      viewport: "desktop",
      async run({ page, role, assert, visible }) {
        await switchTo(page, "身份验证器 App")
        await codeField(page).fill("123456")
        await expectSuccess({ page, role, visible, assert })
      },
    },
    {
      name: "短信：发送、倒计时、验证",
      viewport: "desktop",
      async run({ page, role, assert, visible }) {
        await switchTo(page, "短信验证码")
        await visible(
          page.getByText("我们会向 138 **** 8000 发送一条验证码短信。"),
          "应显示脱敏手机号",
        )
        assert(
          (await codeField(page).count()) === 0,
          "发送前不应出现验证码输入",
        )
        await role("button", { name: "发送验证码", exact: true }).click()
        const countdown = role("button", { name: /秒后可重新发送/ })
        await visible(countdown, "发送成功后应出现倒计时")
        assert(await countdown.isDisabled(), "倒计时期间不能重发")
        await visible(codeField(page), "发送后应出现验证码输入")
        assert(
          (await page.getByText("验证码已发送至 138 **** 8000").count()) === 1,
          "应播报验证码已发送",
        )
        await codeField(page).fill("123456")
        await expectSuccess({ page, role, visible, assert })
      },
    },
    {
      name: "恢复码：自动大写加短横线，错误与成功",
      viewport: "desktop",
      async run({ page, role, assert, visible }) {
        await switchTo(page, "恢复码")
        const input = page.getByRole("textbox", { name: "恢复码", exact: true })
        assert(
          (await input.getAttribute("autocomplete")) === "off",
          "恢复码输入应关闭自动填充",
        )
        await visible(
          page.getByText("每个恢复码只能用一次", { exact: true }),
          "应提示每个恢复码只能用一次",
        )
        await input.pressSequentially("wxyz9999")
        assert(
          (await input.inputValue()) === "WXYZ-9999",
          "输入应自动转大写并插入短横线",
        )
        await role("button", { name: "验证", exact: true }).click()
        const error = alerts(page)
        await visible(error, "恢复码不对应显示错误")
        assert(
          (await error.textContent())?.includes("恢复码无效或已使用"),
          "应显示回调抛出的 message",
        )
        await input.fill("")
        await input.pressSequentially("abcd1234")
        assert((await input.inputValue()) === "ABCD-1234", "应整理为 ABCD-1234")
        await page.keyboard.press("Enter")
        await expectSuccess({ page, role, visible, assert })
      },
    },
    {
      name: "记住此设备开关可开关",
      viewport: "desktop",
      async run({ role, assert }) {
        const toggle = role("switch", { name: "记住此设备 30 天" })
        assert(
          (await toggle.getAttribute("aria-checked")) === "false",
          "默认应关闭",
        )
        await toggle.click()
        assert(
          (await toggle.getAttribute("aria-checked")) === "true",
          "点击后应开启",
        )
        await toggle.click()
        assert(
          (await toggle.getAttribute("aria-checked")) === "false",
          "再次点击应关闭",
        )
      },
    },
    {
      name: "手机宽度：单列、列表在面板下方、不横向溢出",
      viewport: "mobile",
      async run({ page, box, assert, visible }) {
        const panel = page.locator('[data-slot="auth-05-panel"]')
        const list = page.locator('[data-slot="auth-05-alternatives"]')
        await visible(panel, "应有主面板")
        await visible(list, "手机上也应显示其他验证方式")
        const [p, l] = [await box(panel), await box(list)]
        assert(l.y >= p.y + p.height - 1, "窄屏时其他验证方式应在主面板下方")
        const overflow = await page.evaluate(
          () =>
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
        )
        assert(overflow <= 0, `页面不应横向溢出，多出 ${overflow}px`)
      },
    },
    {
      name: "嵌入模式：没有「记住此设备」，成功回调里 rememberDevice 为 false",
      viewport: "desktop",
      async run({ page, assert, visible }) {
        await pickEmbedded(page)
        await visible(
          page.locator('[data-slot="auth-05-content"]'),
          "嵌入模式应渲染 Auth05Panel",
        )
        assert(
          (await page.getByRole("switch", { name: /记住此设备/ }).count()) ===
            0,
          "showRememberDevice 为 false 时不应渲染记住设备开关",
        )
        assert(
          (await page.getByText("记住此设备", { exact: false }).count()) === 0,
          "页面上不应出现记住此设备的文字",
        )
        assert(
          (await page.locator('[data-slot="auth-05"]').count()) === 0,
          "嵌入模式不应出现整页外壳",
        )
        assert(
          (await page.locator('[data-slot^="grid-"]').count()) === 0,
          "嵌入面板里不应有线条网格外壳",
        )
        // 嵌进已有页面时宿主页通常已有 h1：嵌入版主标题默认降为 h2
        await visible(
          page.getByRole("heading", { level: 2, name: "验证你的身份" }),
          "嵌入面板的主标题默认应为 h2",
        )
      },
    },
    {
      name: "嵌入模式：只开 totp 与 recovery，用户名原样显示不脱敏",
      viewport: "desktop",
      async run({ page, role, assert, visible }) {
        await pickEmbedded(page)
        const account = page.locator('[data-slot="auth-05-account"]')
        await visible(account, "应有账号摘要")
        const text = (await account.textContent()) ?? ""
        assert(text.includes("lin_qinghe"), "摘要应原样显示用户名 lin_qinghe")
        assert(!text.includes("*"), "用户名不应被脱敏")
        assert(
          (await account.locator(".sr-only").textContent())?.includes(
            "当前账号",
          ),
          "读屏文本应是「当前账号」，不写死邮箱",
        )
        await visible(
          role("heading", { name: "输入身份验证器验证码", exact: true }),
          "默认应是第一个可用方式 totp",
        )
        const texts = await alternatives(page).allTextContents()
        assert(texts.length === 1, "其他验证方式应只剩 1 项")
        assert(texts[0]?.includes("恢复码"), "其他验证方式里应是恢复码")
      },
    },
    {
      name: "嵌入模式：备用码不格式化，abc_12345 原样输入并提交成功",
      viewport: "desktop",
      async run({ page, role, assert, visible }) {
        await pickEmbedded(page)
        await switchTo(page, "恢复码")
        const input = page.getByRole("textbox", { name: "恢复码", exact: true })
        await visible(input, "应显示恢复码输入")
        assert(
          (await input.getAttribute("placeholder")) === null ||
            (await input.getAttribute("placeholder")) === "",
          "format 为 false 时不应有 XXXX-XXXX 占位",
        )
        await input.pressSequentially("abc_12345")
        assert(
          (await input.inputValue()) === "abc_12345",
          "应原样保留小写和下划线，不插入短横线",
        )
        await role("button", { name: "验证", exact: true }).click()
        await visible(
          role("heading", { name: "验证成功", exact: true }),
          "abc_12345 应验证成功",
        )
        assert(
          (await page
            .locator('[data-slot="auth-05-content"]')
            .getAttribute("data-state")) === "success",
          "成功后面板根元素应标记 success",
        )
      },
    },
    {
      name: "嵌入模式：面板在容器宽度内，其他方式在下方单列",
      viewport: "desktop",
      async run({ page, box, assert, visible }) {
        await pickEmbedded(page)
        const root = page.locator('[data-slot="auth-05-content"]')
        await visible(root, "应有嵌入面板")
        const parent = root.locator("xpath=..")
        const [r, p] = [await box(root), await box(parent)]
        assert(
          r.x >= p.x - 1 && r.x + r.width <= p.x + p.width + 1,
          "面板应在父容器宽度内",
        )
        const clipped = await root.evaluate(
          (el) => el.scrollWidth - el.clientWidth,
        )
        assert(clipped <= 0, `面板内容不应横向溢出，多出 ${clipped}px`)
        const [m, l] = [
          await box(page.locator('[data-slot="auth-05-panel"]')),
          await box(page.locator('[data-slot="auth-05-alternatives"]')),
        ]
        assert(l.y >= m.y + m.height - 1, "其他验证方式应在当前方式下方")
      },
    },
    {
      name: "嵌入模式手机宽度：不横向溢出",
      viewport: "mobile",
      async run({ page, box, assert, visible }) {
        await pickEmbedded(page)
        const root = page.locator('[data-slot="auth-05-content"]')
        await visible(root, "手机上也应显示嵌入面板")
        const r = await box(root)
        const width = page.viewportSize()?.width ?? 0
        assert(r.x >= 0 && r.x + r.width <= width + 1, "面板应在视口宽度内")
        const overflow = await page.evaluate(
          () =>
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
        )
        assert(overflow <= 0, `页面不应横向溢出，多出 ${overflow}px`)
      },
    },
  ],
} satisfies Scenario
