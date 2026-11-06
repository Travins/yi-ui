import type { Page } from "playwright-core"

import type { Scenario, ScenarioContext } from "./types"

const YUNJIAN = "li.ming@yunjian.example"

const emailField = (page: Page) =>
  page.getByRole("textbox", { name: "工作邮箱" })

const passwordField = (page: Page) => page.getByLabel("密码", { exact: true })

/** 错误提示按区块收窄，避开 Next.js 路由播报器（同样带 role=alert，且一直可见） */
const alerts = (page: Page) =>
  page.locator('[data-slot="auth-04"] [role="alert"]')

const root = (page: Page) => page.locator('[data-slot="auth-04"]')

const isFocused = (target: ReturnType<Page["locator"]>) =>
  target.evaluate((el) => el === document.activeElement)

type Ctx = Pick<ScenarioContext, "page" | "role" | "visible">

/** 每一步都从重新加载的页面开始：填邮箱 → 继续 → 等第二步标题出现。 */
async function resolve(
  { page, role, visible }: Ctx,
  email: string,
  heading: string,
) {
  await emailField(page).fill(email)
  await role("button", { name: "继续", exact: true }).click()
  await visible(
    role("heading", { name: heading, exact: true }),
    `应进入「${heading}」步骤`,
  )
}

const toSso = (ctx: Ctx, email = YUNJIAN) =>
  resolve(ctx, email, "使用企业身份登录")

export default {
  name: "企业 SSO 登录",
  viewports: ["desktop", "mobile"],
  steps: [
    {
      name: "邮箱格式错误：文字提示并关联输入框",
      viewport: "desktop",
      async run({ page, role, assert, visible }) {
        await emailField(page).fill("not-an-email")
        await role("button", { name: "继续", exact: true }).click()
        const error = alerts(page)
        await visible(error, "邮箱格式不对时应出现文字提示")
        assert(
          (await error.textContent())?.includes("请输入正确的邮箱地址"),
          "提示应说明邮箱不正确",
        )
        const field = emailField(page)
        assert(
          (await field.getAttribute("aria-invalid")) === "true",
          "输入框应标记错误态",
        )
        const describedBy = await field.getAttribute("aria-describedby")
        assert(
          !!describedBy &&
            (
              await page.locator(`[id="${describedBy}"]`).textContent()
            )?.includes("请输入正确的邮箱地址"),
          "aria-describedby 应指向错误文字",
        )
        assert(
          await role("heading", {
            name: "输入工作邮箱",
            exact: true,
          }).isVisible(),
          "出错时不应离开第一步",
        )
        // 改成合法邮箱后错误立即消失
        await field.fill(YUNJIAN)
        assert((await alerts(page).count()) === 0, "改动邮箱后错误应消失")
      },
    },
    {
      name: "识别为企业：右栏面板显示组织、单个提供方主按钮",
      viewport: "desktop",
      async run({ page, role, assert, visible, shot }) {
        await toSso({ page, role, visible })
        // 宽屏只在右栏面板显示组织名和域名，左栏的组织卡隐藏，避免重复
        assert(
          !(await page.locator('[data-slot="auth-04-org-card"]').isVisible()),
          "宽屏不应显示左栏组织卡",
        )
        const card =
          (await page.locator('[data-slot="auth-04-panel"]').textContent()) ??
          ""
        assert(
          card.includes("云间科技") && card.includes("yunjian.example"),
          "组织面板应包含组织名和域名",
        )
        await visible(
          page.getByText("已识别为云间科技的企业账号", { exact: true }),
          "应说明已识别的企业账号",
        )
        const buttons = page.locator('[data-slot="auth-04-provider"]')
        assert((await buttons.count()) === 1, "应只有一个提供方按钮")
        await visible(
          role("button", { name: "通过企业身份（SAML）继续", exact: true }),
          "单个提供方应显示「通过企业身份（SAML）继续」",
        )
        const panel = page.locator('[data-slot="auth-04-panel"]')
        assert(
          (await panel.textContent())?.includes(
            "你将跳转到组织的身份提供方完成验证",
          ),
          "右栏应显示安全提示",
        )
        await shot("识别为企业")
      },
    },
    {
      name: "多个提供方并列显示，点击后进入跳转并禁用",
      viewport: "desktop",
      async run({ page, role, assert, visible }) {
        await toSso({ page, role, visible }, "a@multi.example")
        const saml = role("button", {
          name: "通过企业身份（SAML）继续",
          exact: true,
        })
        const oidc = role("button", {
          name: "通过企业身份（OIDC）继续",
          exact: true,
        })
        await visible(saml, "应有 SAML 提供方按钮")
        await visible(oidc, "应有 OIDC 提供方按钮")
        await oidc.click()
        await visible(
          page.getByText("正在跳转到企业身份提供方…", { exact: true }),
          "点击后应显示正在跳转",
        )
        assert(await oidc.isDisabled(), "进行中提供方按钮应禁用")
        assert(await saml.isDisabled(), "进行中其他提供方按钮也应禁用")
        assert(
          (
            await page.locator('[data-slot="auth-04-panel"]').textContent()
          )?.includes("企业身份（OIDC）"),
          "面板应显示所点击的提供方 OIDC",
        )
      },
    },
    {
      name: "SSO 失败：显示错误，重试，改用账号密码",
      viewport: "desktop",
      async run({ page, role, assert, visible }) {
        await toSso({ page, role, visible }, "a@fail.example")
        await role("button", {
          name: "通过企业身份（SAML）继续",
          exact: true,
        }).click()
        const error = alerts(page)
        await visible(error, "SSO 失败应显示错误")
        assert(
          (await error.textContent())?.includes(
            "无法连接到企业身份提供方，请稍后重试",
          ),
          "应显示回调抛出的错误",
        )
        const retry = role("button", { name: "重试", exact: true })
        await visible(retry, "应提供重试")
        assert(await isFocused(retry), "失败后焦点应落在重试按钮上")
        await retry.click()
        await visible(error, "重试仍失败时应再次显示错误")
        await role("button", { name: "改用账号密码登录", exact: true }).click()
        await visible(
          role("heading", { name: "输入密码", exact: true }),
          "应进入密码步骤",
        )
        await visible(
          page.getByText("a@fail.example", { exact: true }),
          "密码步骤应显示正在登录的邮箱",
        )
      },
    },
    {
      name: "更换邮箱回到第一步且邮箱保留，焦点在标题",
      viewport: "desktop",
      async run({ page, role, assert, visible }) {
        await toSso({ page, role, visible })
        await role("button", {
          name: "不是这个组织？更换邮箱",
          exact: true,
        }).click()
        const title = role("heading", { name: "输入工作邮箱", exact: true })
        await visible(title, "应回到第一步")
        assert(await isFocused(title), "回到第一步后焦点应在标题上")
        assert(
          (await emailField(page).inputValue()) === YUNJIAN,
          "之前输入的邮箱应保留",
        )
      },
    },
    {
      name: "进入企业步骤后焦点在标题上",
      viewport: "desktop",
      async run({ page, role, assert, visible }) {
        await toSso({ page, role, visible })
        const title = role("heading", { name: "使用企业身份登录", exact: true })
        assert(await isFocused(title), "进入企业步骤后焦点应在标题上")
      },
    },
    {
      name: "普通账号：显示邮箱，错误密码报错，demo1234 登录成功",
      viewport: "desktop",
      async run({ page, role, assert, visible }) {
        await resolve({ page, role, visible }, "me@plain.example", "输入密码")
        const title = role("heading", { name: "输入密码", exact: true })
        assert(await isFocused(title), "进入密码步骤后焦点应在标题上")
        await visible(
          page.getByText("me@plain.example", { exact: true }),
          "顶部应显示正在登录的邮箱",
        )
        // 显示 / 隐藏密码
        await passwordField(page).fill("wrong-pass")
        assert(
          (await passwordField(page).getAttribute("type")) === "password",
          "密码默认应隐藏",
        )
        await role("button", { name: "显示密码", exact: true }).click()
        assert(
          (await passwordField(page).getAttribute("type")) === "text",
          "点击后应显示密码",
        )
        await role("button", { name: "登录", exact: true }).click()
        const error = alerts(page)
        await visible(error, "密码错误应显示错误")
        assert(
          (await error.textContent())?.includes("邮箱或密码不正确"),
          "应显示回调抛出的错误",
        )
        await passwordField(page).fill("demo1234")
        assert((await alerts(page).count()) === 0, "改动密码后错误应消失")
        await role("button", { name: "登录", exact: true }).click()
        await visible(
          role("heading", { name: "登录成功", exact: true }),
          "密码正确应显示登录成功",
        )
        assert(
          (await root(page).getAttribute("data-state")) === "success",
          "成功后根元素应标记 success",
        )
      },
    },
    {
      name: "密码步骤点「更换」回到第一步",
      viewport: "desktop",
      async run({ page, role, assert, visible }) {
        await resolve({ page, role, visible }, "me@plain.example", "输入密码")
        await role("button", { name: "更换", exact: true }).click()
        await visible(
          role("heading", { name: "输入工作邮箱", exact: true }),
          "应回到第一步",
        )
        assert(
          (await emailField(page).inputValue()) === "me@plain.example",
          "邮箱应保留",
        )
      },
    },
    {
      name: "组织标识登录：未知标识报错，yunjian 识别为企业",
      viewport: "desktop",
      async run({ page, role, assert, visible }) {
        const toggle = role("button", { name: "使用组织标识登录", exact: true })
        assert(
          (await toggle.getAttribute("aria-expanded")) === "false",
          "组织标识入口默认折叠",
        )
        await toggle.click()
        assert(
          (await toggle.getAttribute("aria-expanded")) === "true",
          "点击后应展开",
        )
        const slug = page.getByRole("textbox", { name: "组织标识" })
        assert(await isFocused(slug), "展开后焦点应进入组织标识输入框")
        await slug.fill("nobody")
        await page.getByRole("button", { name: "继续" }).last().click()
        const error = alerts(page)
        await visible(error, "未知组织应显示错误")
        assert(
          (await error.textContent())?.includes("未找到该组织"),
          "应显示回调抛出的错误",
        )
        await slug.fill("yunjian")
        await page.getByRole("button", { name: "继续" }).last().click()
        await visible(
          role("heading", { name: "使用企业身份登录", exact: true }),
          "识别后应进入企业步骤",
        )
        await visible(
          page.getByText("已识别为云间科技的企业账号", { exact: true }),
          "应显示组织",
        )
      },
    },
    {
      name: "手机宽度：第一步隐藏面板，企业步骤紧凑卡片在表单上方且不溢出",
      viewport: "mobile",
      async run({ page, role, assert, visible, box, shot }) {
        const panel = page.locator('[data-slot="auth-04-panel"]')
        assert(!(await panel.isVisible()), "手机第一步应隐藏组织面板")
        await shot("手机第一步")
        await toSso({ page, role, visible })
        await visible(panel, "手机企业步骤应显示紧凑面板")
        await visible(
          page.locator('[data-slot="auth-04-org-card"]'),
          "手机企业步骤应在表单里显示组织卡",
        )
        const panelBox = await box(panel)
        const stepBox = await box(page.locator('[data-slot="auth-04-step"]'))
        assert(panelBox.y < stepBox.y, "紧凑面板应在表单上方")
        const width = await page.evaluate(() => ({
          scroll: document.documentElement.scrollWidth,
          client: document.documentElement.clientWidth,
        }))
        assert(width.scroll <= width.client, "手机不应横向溢出")
        const button = role("button", {
          name: "通过企业身份（SAML）继续",
          exact: true,
        })
        assert((await box(button)).height >= 40, "触屏按钮高度至少 40px")
        await shot("手机企业步骤")
      },
    },
  ],
} satisfies Scenario
