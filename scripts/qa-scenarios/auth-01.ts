import type { Page } from "playwright-core"

import type { Scenario } from "./types"

const root = (page: Page) => page.locator('[data-slot="auth-01"]')

/** 方条输入框：可访问名称是「标签 标签」（可见标签与隐藏的上置标签各算一次），所以按前缀匹配 */
const field = (page: Page, label: string) =>
  root(page).getByRole("textbox", { name: new RegExp(`^${label}`) })

/** 密码框在显示状态下 type=text，隐藏时是 password，没有 textbox 角色，按 id 取 */
const passwordInput = (page: Page, id: string) =>
  page.locator(`input#${id}`)

/** 条下方的字段错误（BarField 的 error 节点，id 为 `${id}-error`） */
const fieldError = (page: Page, id: string) =>
  page.locator(`#${id}-error`)

/** 区块内的表单级错误；Next 的路由播报器也带 role=alert，所以按区块收窄 */
const submitButton = (page: Page) =>
  root(page).locator('[data-slot="auth-01-submit-button"]')

const isFocused = (target: ReturnType<Page["locator"]>) =>
  target.evaluate((el) => el === document.activeElement)

const overflowOf = (page: Page) =>
  page.evaluate(
    () =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )

/** 点底部「注册」「忘记密码？」等文字链接按钮 */
const linkButton = (page: Page, name: string) =>
  root(page).getByRole("button", { name, exact: true })

export default {
  name: "分屏登录页",
  viewports: ["desktop", "mobile"],
  steps: [
    {
      name: "密码登录：空提交时两个字段都出现必填提示并标记错误态",
      async run({ page, assert, visible, shot }) {
        await submitButton(page).click()
        await visible(
          fieldError(page, "sign-in-account"),
          "空提交后账号字段应出现错误提示",
        )
        const account = (await fieldError(page, "sign-in-account").innerText()).trim()
        assert(
          account === "请输入用户名或邮箱",
          `账号错误应为「请输入用户名或邮箱」，实际「${account}」`,
        )
        const password = (await fieldError(page, "sign-in-password").innerText()).trim()
        assert(
          password === "请输入密码",
          `密码错误应为「请输入密码」，实际「${password}」`,
        )
        for (const id of ["sign-in-account", "sign-in-password"]) {
          const invalid = await page.locator(`input#${id}`).getAttribute("aria-invalid")
          assert(invalid === "true", `#${id} 应标记 aria-invalid=true，实际 ${invalid}`)
          const describedBy = await page.locator(`input#${id}`).getAttribute("aria-describedby")
          assert(
            describedBy?.split(" ").includes(`${id}-error`) === true,
            `#${id} 的 aria-describedby 应包含 ${id}-error，实际「${describedBy}」`,
          )
        }
        await shot("空提交")
      },
    },
    {
      name: "密码登录：输入后错误提示随之消失",
      async run({ page, assert, visible, settle, shot }) {
        await submitButton(page).click()
        await visible(fieldError(page, "sign-in-account"), "先要触发出账号错误")
        await field(page, "用户名或邮箱").fill("linwei")
        await passwordInput(page, "sign-in-password").fill("abc12345")
        await settle()
        for (const id of ["sign-in-account", "sign-in-password"]) {
          const count = await fieldError(page, id).count()
          assert(count === 0, `填写后 #${id} 的错误提示应消失，实际仍有 ${count} 个`)
          const invalid = await page.locator(`input#${id}`).getAttribute("aria-invalid")
          assert(invalid === null, `填写后 #${id} 不应再有 aria-invalid，实际 ${invalid}`)
        }
        await shot("已填写")
      },
    },
    {
      name: "密码显示与隐藏：按钮名称、aria-pressed 与输入框类型联动，值保持不变",
      async run({ page, assert, visible, shot }) {
        const input = passwordInput(page, "sign-in-password")
        await input.fill("Secret123")
        const show = linkButton(page, "显示密码")
        await visible(show, "默认应有「显示密码」按钮")
        assert(
          (await show.getAttribute("aria-pressed")) === "false",
          "隐藏状态下 aria-pressed 应为 false",
        )
        assert((await input.getAttribute("type")) === "password", "默认应是 password 类型")
        await show.click()
        const hide = linkButton(page, "隐藏密码")
        await visible(hide, "点击后按钮名称应变成「隐藏密码」")
        assert(
          (await hide.getAttribute("aria-pressed")) === "true",
          "显示状态下 aria-pressed 应为 true",
        )
        assert((await input.getAttribute("type")) === "text", "显示后应是 text 类型")
        assert(
          (await input.inputValue()) === "Secret123",
          `切换不应改变输入值，实际「${await input.inputValue()}」`,
        )
        await shot("显示")
        await hide.click()
        await visible(linkButton(page, "显示密码"), "再点一次应回到「显示密码」")
        assert((await input.getAttribute("type")) === "password", "再次隐藏后应回到 password 类型")
      },
    },
    {
      name: "密码登录：提交时按钮进入「登录中…」并禁用，完成后恢复",
      async run({ page, assert, visible, shot }) {
        await field(page, "用户名或邮箱").fill("linwei")
        await passwordInput(page, "sign-in-password").fill("abc12345")
        await submitButton(page).click()
        await visible(
          submitButton(page).filter({ hasText: "登录中…" }),
          "提交后按钮应显示「登录中…」",
        )
        assert(await submitButton(page).isDisabled(), "提交中按钮应禁用，防止重复提交")
        await shot("提交中")
        await submitButton(page).filter({ hasText: /^登录$/ }).waitFor({ state: "visible" })
        assert(await submitButton(page).isEnabled(), "示例请求完成后按钮应恢复可点")
        assert(
          (await root(page).locator('[data-slot="auth-01-form-error"]').count()) === 0,
          "登录成功不应出现表单错误",
        )
        assert(
          (await field(page, "用户名或邮箱").inputValue()) === "linwei",
          "登录完成后不应清空已输入的账号",
        )
      },
    },
    {
      name: "回车提交：在密码框里按 Enter 触发校验与提交",
      async run({ page, assert, visible }) {
        // 空表单按 Enter：校验报错，不进入提交中
        await field(page, "用户名或邮箱").focus()
        await page.keyboard.press("Enter")
        await visible(fieldError(page, "sign-in-account"), "空表单按 Enter 应触发必填提示")
        assert(
          (await submitButton(page).filter({ hasText: "登录中…" }).count()) === 0,
          "校验未通过时不应进入提交中",
        )
        await field(page, "用户名或邮箱").fill("linwei")
        await passwordInput(page, "sign-in-password").fill("abc12345")
        await page.keyboard.press("Enter")
        await visible(
          submitButton(page).filter({ hasText: "登录中…" }),
          "填写完整后按 Enter 应提交",
        )
      },
    },
    {
      name: "键盘 Tab 顺序：账号 → 密码 → 显示密码 → 忘记密码 → 记住登录 → 登录",
      async run({ page, assert }) {
        await field(page, "用户名或邮箱").focus()
        const expected: { name: string; focus: () => ReturnType<Page["locator"]> }[] = [
          { name: "密码输入框", focus: () => passwordInput(page, "sign-in-password") },
          { name: "显示密码按钮", focus: () => linkButton(page, "显示密码") },
          { name: "忘记密码？", focus: () => linkButton(page, "忘记密码？") },
          { name: "记住登录状态开关", focus: () => root(page).getByRole("switch", { name: /记住登录状态/ }) },
          { name: "登录按钮", focus: () => submitButton(page) },
        ]
        for (const step of expected) {
          await page.keyboard.press("Tab")
          assert(
            await isFocused(step.focus()),
            `Tab 之后焦点应落在「${step.name}」，实际是 ${await page.evaluate(
              () => document.activeElement?.outerHTML.slice(0, 80) ?? "无",
            )}`,
          )
        }
      },
    },
    {
      name: "记住登录状态开关可用键盘切换",
      async run({ page, assert, shot }) {
        const toggle = root(page).getByRole("switch", { name: /记住登录状态/ })
        assert((await toggle.getAttribute("aria-checked")) === "false", "默认应为关")
        await toggle.focus()
        await page.keyboard.press("Space")
        await page.waitForFunction(
          (el) => el?.getAttribute("aria-checked") === "true",
          await toggle.elementHandle(),
        ).catch(() => {})
        assert(
          (await toggle.getAttribute("aria-checked")) === "true",
          `按空格后开关应为开，实际 aria-checked=${await toggle.getAttribute("aria-checked")}`,
        )
        await shot("已开启")
      },
    },
    {
      name: "验证码登录：手机号与验证码校验，获取验证码后进入倒计时",
      async run({ page, assert, visible, shot }) {
        await root(page).getByRole("radio", { name: "验证码登录", exact: true }).click()
        const phone = root(page).locator("input#sign-in-phone")
        await visible(phone, "切到验证码登录后应出现手机号输入")
        assert(
          (await root(page).getByRole("radio", { name: "验证码登录", exact: true }).getAttribute("aria-checked")) === "true",
          "验证码登录分段应处于选中状态",
        )
        // 手机号为空时点获取验证码：给出校验提示
        const send = root(page).getByRole("button", { name: "获取验证码", exact: true })
        await visible(send, "应有「获取验证码」按钮")
        // 空提交：手机号和验证码都报错
        await submitButton(page).click()
        await visible(fieldError(page, "sign-in-code"), "空提交后验证码字段应有错误提示")
        const codeError = (await fieldError(page, "sign-in-code").innerText()).trim()
        assert(
          codeError === "请输入 6 位数字验证码",
          `验证码错误应为「请输入 6 位数字验证码」，实际「${codeError}」`,
        )
        await shot("空提交")
        // 输入合法手机号后获取验证码，进入倒计时
        await phone.fill("13800138000")
        await root(page).getByRole("button", { name: "获取验证码", exact: true }).click()
        const countdown = root(page).getByRole("button", { name: /^\d+s 后重发$/ })
        await visible(countdown, "发送成功后应出现「N s 后重发」倒计时")
        assert(await countdown.isDisabled(), "倒计时期间按钮应禁用")
        await shot("倒计时")
      },
    },
    {
      name: "找回密码：邮箱校验，提交后显示「邮件已发送」并可返回登录",
      async run({ page, assert, visible, shot }) {
        await linkButton(page, "忘记密码？").click()
        await visible(
          root(page).getByRole("heading", { name: "找回密码", exact: true }),
          "应切到找回密码视图",
        )
        await submitButton(page).click()
        await visible(fieldError(page, "forgot-email"), "空邮箱提交应出现错误")
        const empty = (await fieldError(page, "forgot-email").innerText()).trim()
        assert(empty === "请输入邮箱", `空邮箱错误应为「请输入邮箱」，实际「${empty}」`)
        await field(page, "邮箱").fill("not-an-email")
        await submitButton(page).click()
        await page.waitForFunction(
          () => document.querySelector("#forgot-email-error")?.textContent?.includes("有效的邮箱地址"),
        )
        const invalid = (await fieldError(page, "forgot-email").innerText()).trim()
        assert(
          invalid === "请输入有效的邮箱地址",
          `格式错误应为「请输入有效的邮箱地址」，实际「${invalid}」`,
        )
        await shot("格式错误")
        await field(page, "邮箱").fill("lin@example.com")
        await submitButton(page).click()
        const sent = root(page).locator('[data-slot="auth-01-email-sent"]')
        await visible(sent, "提交后应出现邮件已发送状态")
        assert(
          (await sent.getAttribute("role")) === "status",
          "成功状态应带 role=status 便于读屏播报",
        )
        const text = await sent.innerText()
        assert(text.includes("邮件已发送"), `成功状态应有标题「邮件已发送」，实际「${text.slice(0, 40)}」`)
        assert(text.includes("lin@example.com"), "成功状态应回显收件邮箱 lin@example.com")
        await shot("邮件已发送")
        await sent.getByRole("button", { name: "返回登录", exact: true }).click()
        await visible(
          root(page).getByRole("heading", { name: "欢迎回来", exact: true }),
          "点「返回登录」应回到登录视图",
        )
      },
    },
    {
      name: "注册：空提交逐项报错，密码强度与确认密码、条款校验",
      async run({ page, assert, visible, shot }) {
        await linkButton(page, "注册").click()
        await visible(
          root(page).getByRole("heading", { name: "创建账号", exact: true }),
          "应切到注册视图",
        )
        await submitButton(page).click()
        const expected: [string, string][] = [
          ["sign-up-name", "姓名至少 2 个字符"],
          ["sign-up-email", "请输入邮箱"],
          ["sign-up-password", "密码至少 8 位"],
          ["sign-up-confirm", "请再次输入密码"],
        ]
        for (const [id, message] of expected) {
          await visible(fieldError(page, id), `空提交后 #${id} 应出现错误`)
          const actual = (await fieldError(page, id).innerText()).trim()
          assert(actual === message, `#${id} 错误应为「${message}」，实际「${actual}」`)
        }
        await visible(page.locator("#sign-up-terms-error"), "未勾选条款应出现错误")
        assert(
          (await page.locator("#sign-up-terms-error").innerText()).trim() === "请先阅读并同意服务条款",
          "条款错误文案应为「请先阅读并同意服务条款」",
        )
        await shot("空提交")
        // 密码强度：随输入变化
        const strength = root(page).locator('[data-slot="auth-01-password-strength"]')
        assert((await strength.getAttribute("data-strength")) === "0", "未输入时强度应为 0")
        await passwordInput(page, "sign-up-password").fill("abcdefgh")
        const weak = await strength.getAttribute("data-strength")
        await passwordInput(page, "sign-up-password").fill("Abcdefgh1234!")
        const strong = await strength.getAttribute("data-strength")
        assert(
          Number(strong) > Number(weak),
          `更复杂的密码强度应更高（弱 ${weak}，强 ${strong}）`,
        )
        assert(
          (await strength.innerText()).includes("强度："),
          "强度条应有文字说明",
        )
        // 两次密码不一致
        await passwordInput(page, "sign-up-confirm").fill("different1")
        await page.waitForFunction(() =>
          document.querySelector("#sign-up-confirm-error")?.textContent?.includes("不一致"),
        )
        assert(
          (await fieldError(page, "sign-up-confirm").innerText()).trim() === "两次输入的密码不一致",
          "确认密码不一致时应提示「两次输入的密码不一致」",
        )
        await shot("密码不一致")
      },
    },
    {
      name: "注册：填写完整后提交，按钮进入「注册中…」",
      async run({ page, assert, visible, shot }) {
        await linkButton(page, "注册").click()
        await field(page, "姓名").fill("林小满")
        await field(page, "邮箱").fill("lin@example.com")
        await passwordInput(page, "sign-up-password").fill("Abcdefg123")
        await passwordInput(page, "sign-up-confirm").fill("Abcdefg123")
        const terms = root(page).getByRole("checkbox", { name: /我已阅读并同意/ })
        await terms.click()
        assert(
          (await terms.getAttribute("aria-checked")) === "true",
          `点击后条款复选框应为选中，实际 aria-checked=${await terms.getAttribute("aria-checked")}`,
        )
        await submitButton(page).click()
        await visible(
          submitButton(page).filter({ hasText: "注册中…" }),
          "提交后按钮应显示「注册中…」",
        )
        assert(await submitButton(page).isDisabled(), "提交中按钮应禁用")
        assert(
          (await page.locator('[id$="-error"]').count()) === 0,
          "填写完整时不应出现任何字段错误",
        )
        await shot("提交中")
      },
    },
    {
      name: "手机宽度：登录视图没有横向溢出，表单控件不超出屏幕",
      viewport: "mobile",
      async run({ page, assert, shot }) {
        const overflow = await overflowOf(page)
        assert(overflow <= 0, `页面不应横向溢出，多出 ${overflow}px`)
        const width = await page.evaluate(() => window.innerWidth)
        const outside = await root(page)
          .locator("input, button")
          .evaluateAll((nodes, limit) =>
            nodes
              .map((node) => ({
                text: (node.getAttribute("aria-label") ?? node.textContent ?? node.id).trim().slice(0, 12),
                right: node.getBoundingClientRect().right,
                visible: node.getClientRects().length > 0,
              }))
              .filter((item) => item.visible && item.right > limit + 1),
          width)
        assert(
          outside.length === 0,
          `有控件右缘超出视口 ${width}px：${JSON.stringify(outside)}`,
        )
        await shot("登录视图")
      },
    },
    {
      name: "手机宽度：注册视图（含错误提示）没有横向溢出",
      viewport: "mobile",
      async run({ page, assert, visible, shot }) {
        await linkButton(page, "注册").click()
        await visible(
          root(page).getByRole("heading", { name: "创建账号", exact: true }),
          "应切到注册视图",
        )
        await submitButton(page).click()
        await visible(page.locator("#sign-up-terms-error"), "应出现条款错误")
        const overflow = await overflowOf(page)
        assert(overflow <= 0, `注册视图带错误提示时不应横向溢出，多出 ${overflow}px`)
        await shot("注册带错误")
      },
    },
    {
      name: "手机宽度：不显示左侧品牌面板，改在表单上方显示品牌",
      viewport: "mobile",
      async run({ page, assert, visible }) {
        const panelVisible = await root(page)
          .locator('[data-slot="auth-01-brand-panel"]')
          .evaluateAll((nodes) => nodes.filter((n) => n.getClientRects().length > 0).length)
        assert(panelVisible === 0, `窄屏不应显示品牌面板，实际可见 ${panelVisible} 个`)
        await visible(
          root(page).locator('[data-slot="auth-01-mobile-brand"]'),
          "窄屏应在表单上方显示品牌",
        )
      },
    },
  ],
} satisfies Scenario
