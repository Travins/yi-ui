import type { Page } from "playwright-core"

import type { Scenario } from "./types"

const ID_NUMBER = "110105199003071239"

const root = (page: Page) => page.locator('[data-slot="auth-06"]')
const email = (page: Page) => page.getByRole("textbox", { name: "邮箱" })
// type=password 的输入框没有 textbox 角色，按标签找
const password = (page: Page) => page.getByLabel("密码", { exact: true })
const agreement = (page: Page) =>
  page.locator('[data-slot="auth-06-agreement"] [data-slot="checkbox"]')
const heading = (page: Page, name: string) =>
  page.getByRole("heading", { name, exact: true })
/** Next.js 的路由播报器也带 role=alert，按区块收窄 */
const alerts = (page: Page) => root(page).locator('[role="alert"]')
const isFocused = (page: Page, target: ReturnType<Page["locator"]>) =>
  target.evaluate((el) => el === document.activeElement)

async function fillAccount(page: Page, address = "new@example.com") {
  await email(page).fill(address)
  await password(page).fill("Cloud-2026x")
  await agreement(page).click()
}

async function toProfile(page: Page) {
  await fillAccount(page)
  await page.getByRole("button", { name: "下一步", exact: true }).click()
  await heading(page, "完善资料").waitFor()
}

async function pickRegion(page: Page) {
  await page.getByRole("button", { name: /^所在地区/ }).click()
  for (const name of ["浙江省", "杭州市"])
    await page.getByRole("option", { name, exact: true }).click()
  await page
    .getByRole("button", { name: /^所在地区 浙江省 \/ 杭州市/ })
    .waitFor({ state: "visible" })
}

async function toIdentity(page: Page, phone = "13800138000") {
  await toProfile(page)
  await page.getByRole("textbox", { name: "姓名" }).fill("林知远")
  await page.getByRole("textbox", { name: "手机号" }).fill(phone)
  await pickRegion(page)
  await page.getByRole("button", { name: "下一步", exact: true }).click()
  await heading(page, "实名认证").waitFor()
}

export default {
  name: "注册向导",
  viewports: ["desktop", "mobile"],
  steps: [
    {
      name: "空表单下一步：三项错误，焦点落到邮箱",
      async run({ page, role, assert, visible, shot }) {
        await role("button", { name: "下一步", exact: true }).click()
        await visible(
          page.getByText("请输入正确的邮箱地址", { exact: true }),
          "应提示邮箱格式",
        )
        await visible(
          page.getByText("密码至少 8 位", { exact: true }),
          "应提示密码长度",
        )
        const alert = alerts(page)
        await visible(alert, "协议未勾选应用 role=alert 播报")
        assert(
          (await alert.textContent())?.includes("请先阅读并同意"),
          "协议错误文字不对",
        )
        assert(
          (await email(page).getAttribute("aria-invalid")) === "true",
          "邮箱应标记错误态",
        )
        assert(
          await isFocused(page, email(page)),
          "焦点应落在第一个出错的邮箱上",
        )
        assert(
          (await root(page).getAttribute("data-step")) === "account",
          "出错时不应离开第一步",
        )
        await shot("空表单错误")
        // 改对之后错误立即消失
        await email(page).fill("a@example.com")
        assert(
          (await page
            .getByText("请输入正确的邮箱地址", { exact: true })
            .count()) === 0,
          "改对邮箱后错误应消失",
        )
      },
    },
    {
      name: "只差协议时聚焦复选框，空格勾选",
      async run({ page, role, assert, press, settle }) {
        await email(page).fill("a@example.com")
        await password(page).fill("12345678")
        await role("button", { name: "下一步", exact: true }).click()
        await settle()
        assert(await isFocused(page, agreement(page)), "焦点应落在协议复选框上")
        await press("Space")
        await settle()
        assert(
          (await agreement(page).getAttribute("aria-checked")) === "true",
          "空格应勾选协议",
        )
        assert((await alerts(page).count()) === 0, "勾选后协议错误应消失")
      },
    },
    {
      name: "已注册邮箱显示在邮箱下方",
      async run({ page, role, assert, visible }) {
        await fillAccount(page, "taken@example.com")
        // 键盘提交：在密码框里按回车
        await password(page).press("Enter")
        await visible(
          page.getByText("该邮箱已注册，可以直接登录", { exact: true }),
          "应显示后端返回的错误",
        )
        assert(
          (await email(page).getAttribute("aria-invalid")) === "true",
          "邮箱应标记错误态",
        )
        assert(await isFocused(page, email(page)), "出错后焦点应回到邮箱")
        assert(await heading(page, "创建账号").isVisible(), "应停在第一步")
        await role("button", { name: "下一步", exact: true }).isEnabled()
      },
    },
    {
      name: "第 2 步返回第 1 步，两边的值都保留",
      async run({ page, role, assert, settle }) {
        await toProfile(page)
        assert(
          await isFocused(page, heading(page, "完善资料")),
          "进入第二步后焦点应在标题上",
        )
        await role("textbox", { name: "姓名" }).fill("林知远")
        await role("button", { name: "上一步" }).click()
        await heading(page, "创建账号").waitFor()
        assert(
          (await email(page).inputValue()) === "new@example.com",
          "邮箱应保留",
        )
        assert(
          (await password(page).inputValue()) === "Cloud-2026x",
          "密码应保留",
        )
        assert(
          (await agreement(page).getAttribute("aria-checked")) === "true",
          "协议勾选应保留",
        )
        await role("button", { name: "下一步", exact: true }).click()
        await heading(page, "完善资料").waitFor()
        await settle()
        assert(
          (await role("textbox", { name: "姓名" }).inputValue()) === "林知远",
          "姓名应保留",
        )
      },
    },
    {
      name: "桌面：点步骤栏回到已完成的步骤，未到的不可点",
      viewport: "desktop",
      async run({ page, assert }) {
        await toProfile(page)
        const nav = page.locator(
          '[data-slot="auth-06-sidebar"] [data-slot="steps"]',
        )
        assert(
          (await nav.getByRole("button").count()) === 1,
          "第二步时只有「账号」可以点",
        )
        await nav.getByRole("button").click()
        await heading(page, "创建账号").waitFor()
        assert(
          await isFocused(page, heading(page, "创建账号")),
          "点回去后焦点应在标题上",
        )
      },
    },
    {
      name: "资料页空提交的错误与地区选择",
      async run({ page, role, assert, visible, shot }) {
        await toProfile(page)
        await role("button", { name: "下一步", exact: true }).click()
        await visible(
          page.getByText("请输入姓名", { exact: true }),
          "应提示姓名",
        )
        await visible(
          page.getByText("请输入正确的 11 位手机号", { exact: true }),
          "应提示手机号",
        )
        await visible(
          page.getByText("请选择所在地区", { exact: true }),
          "应提示地区",
        )
        assert(
          await isFocused(page, role("textbox", { name: "姓名" })),
          "焦点应落在姓名上",
        )
        await shot("资料页错误")
        await pickRegion(page)
        assert(
          (await page.getByText("请选择所在地区", { exact: true }).count()) ===
            0,
          "选好地区后错误应消失",
        )
        // 团队规模：方向键切换
        await role("radio", { name: "仅自己" }).focus()
        await page.keyboard.press("ArrowRight")
        assert(
          (await role("radio", { name: "2–10 人" }).getAttribute(
            "aria-checked",
          )) === "true",
          "方向键应选中下一项",
        )
      },
    },
    {
      name: "实名预填姓名，跳过并完成注册",
      async run({ page, role, assert, visible, shot }) {
        await toIdentity(page)
        assert(
          (await role("textbox", { name: "真实姓名" }).inputValue()) ===
            "林知远",
          "真实姓名应预填第 2 步的姓名",
        )
        assert(
          (await role("button", { name: "跳过", exact: true }).count()) === 0,
          "身份证号为空时不显示次要的跳过",
        )
        await role("button", { name: "跳过并完成注册" }).click()
        await heading(page, "注册完成").waitFor()
        assert(
          (await root(page).getAttribute("data-state")) === "success",
          "完成后根元素应标记 success",
        )
        await visible(
          page.locator(
            '[data-slot="auth-06-done-item"][data-state="pending"]',
            {
              hasText: "待完成",
            },
          ),
          "实名一项应为待完成",
        )
        const identityItem = page
          .locator('[data-slot="auth-06-sidebar"] [data-slot="steps-item"]')
          .last()
        assert(
          (await identityItem.getAttribute("data-state")) === "wait",
          "跳过实名后步骤栏里的实名应保持未完成",
        )
        await shot("跳过实名完成")
      },
    },
    {
      name: "填写实名：错误号码拦截，正确后提交完成",
      async run({ page, role, assert, visible }) {
        await toIdentity(page)
        const id = role("textbox", { name: "身份证号" })
        await id.fill("110105199003071230")
        await visible(
          role("button", { name: "跳过", exact: true }),
          "填了号码后应保留跳过",
        )
        await role("button", { name: "提交并完成注册" }).click()
        await visible(
          page.getByText("请输入正确的 18 位身份证号", { exact: true }),
          "错误号码应被拦截",
        )
        assert(await isFocused(page, id), "焦点应落在身份证号上")
        await id.fill(ID_NUMBER)
        await role("button", { name: "提交并完成注册" }).click()
        await heading(page, "注册完成").waitFor()
        await visible(
          page.locator('[data-slot="auth-06-done-item"][data-state="done"]', {
            hasText: "已提交",
          }),
          "实名一项应为已提交",
        )
      },
    },
    {
      name: "提交失败显示在表单上方",
      async run({ page, role, assert, visible, shot }) {
        await toIdentity(page, "13800000000")
        await role("button", { name: "跳过并完成注册" }).click()
        const error = page.locator('[data-slot="auth-06-form-error"]')
        await visible(error, "提交失败应显示错误")
        assert(
          (await error.getAttribute("role")) === "alert",
          "提交错误应用 role=alert",
        )
        assert(
          (await error.textContent())?.includes("注册服务暂时不可用"),
          "应显示后端返回的原因",
        )
        assert(
          await heading(page, "实名认证").isVisible(),
          "失败后应停在当前步骤",
        )
        await shot("提交失败")
      },
    },
    {
      name: "手机：顶部进度文字随步骤变化",
      viewport: "mobile",
      async run({ page, assert, shot }) {
        const compact = page.locator('[data-slot="auth-06-progress-compact"]')
        assert(
          (await compact.innerText()).trim() === "步骤 1 / 3 · 账号",
          `第一步进度不对：${await compact.innerText()}`,
        )
        assert(
          !(await page
            .locator('[data-slot="auth-06-sidebar"] [data-slot="steps"]')
            .isVisible()),
          "手机上不显示纵向步骤",
        )
        await toProfile(page)
        assert(
          (await compact.innerText()).trim() === "步骤 2 / 3 · 资料",
          `第二步进度不对：${await compact.innerText()}`,
        )
        await shot("手机第二步")
      },
    },
  ],
} satisfies Scenario
