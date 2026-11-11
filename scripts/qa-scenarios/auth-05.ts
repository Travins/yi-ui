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

/** 演示控制条（src/components/demo/demo-bar.tsx，只属于演示外壳 demo.tsx，不在 Auth05 里） */
const demoBar = (page: Page) => page.getByRole("region", { name: "演示控制" })

/** 控制条里的某个选项组：布局、恢复码、通行密钥 */
const demoChoice = (page: Page, name: string) =>
  demoBar(page).getByRole("radiogroup", { name, exact: true })

const demoHint = (page: Page) => demoBar(page).locator("p").first()

async function pick(page: Page, group: string, option: string) {
  await demoChoice(page, group)
    .getByRole("radio", { name: option, exact: true })
    .click()
}

/** 通行密钥的模拟结果 */
async function pickMode(page: Page, name: string) {
  await pick(page, "通行密钥", name)
}

/** 点列表里的某一项切换验证方式；名称里带说明文字，所以按前缀匹配 */
async function switchTo(page: Page, name: string) {
  await alternatives(page).filter({ hasText: name }).click()
}

/**
 * 嵌入布局 + 原样恢复码：分屏页右侧放 Auth05Panel（只开 totp 与 recovery、用户名账号、无记住设备），
 * 恢复码 `{ format: false, maxLength: 32 }`，演示后端接受 abc_12345。
 */
async function pickEmbedded(page: Page) {
  await pick(page, "布局", "嵌入")
  await page.locator('[data-slot="auth-05-content"]').waitFor()
  await pick(page, "恢复码", "原样")
}

/**
 * 嵌入布局 + 定长恢复码：
 * `{ format: false, uppercase: true, maxLength: 9, placeholder: "XXXX-XXXX" }`，
 * 演示后端接受 ABCD-1234 与 ABCD1234（自己去掉连字符再比）。
 */
async function pickFixed(page: Page) {
  await pick(page, "布局", "嵌入")
  await pick(page, "恢复码", "定长")
  await page.locator('[data-slot="auth-05-content"]').waitFor()
  await alternatives(page).filter({ hasText: "恢复码" }).click()
}

const contentAlerts = (page: Page) =>
  page.locator('[data-slot="auth-05-content"] [role="alert"]')

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
      name: "定长码：粘贴 12 个字符不被截断，显示超长错误且不能提交",
      viewport: "desktop",
      async run({ page, role, assert, visible }) {
        await pickFixed(page)
        const input = page.getByRole("textbox", { name: "恢复码", exact: true })
        assert(
          (await input.getAttribute("placeholder")) === "XXXX-XXXX",
          "应使用配置的占位文字",
        )
        assert(
          (await input.getAttribute("maxlength")) === null,
          "format 为 false 时不应给 input 设原生 maxLength（会悄悄截断）",
        )
        // fill 一次性写入 12 个字符，等同粘贴
        await input.fill("ABCD-1234-XY")
        assert(
          (await input.inputValue()) === "ABCD-1234-XY",
          "超长内容应原样保留，不能被截断",
        )
        const error = contentAlerts(page)
        await visible(error, "超长时应出现错误提示")
        assert(
          (await error.textContent())?.trim() ===
            "备用码最多 9 个字符，当前 12 个，请检查是否多粘贴了内容",
          "错误应说明上限和当前长度",
        )
        assert(
          (await input.getAttribute("aria-invalid")) === "true",
          "输入框应标记错误态",
        )
        const errorId = await error.getAttribute("id")
        assert(
          !!errorId &&
            ((await input.getAttribute("aria-describedby")) ?? "").includes(
              errorId,
            ),
          "输入框应通过 aria-describedby 关联错误",
        )
        assert(
          await role("button", { name: "验证", exact: true }).isDisabled(),
          "超长时提交按钮应禁用",
        )
        await input.press("Enter")
        // 演示后端 350ms 后才返回，等够时间再看有没有误提交
        await page.waitForTimeout(800)
        assert(
          (await page.getByRole("heading", { name: "验证成功" }).count()) === 0,
          "超长时回车也不能提交",
        )
        assert(await isFocused(input), "回车被拦下后焦点应留在输入框")
      },
    },
    {
      name: "定长码：删到 9 个字符以内，错误消失",
      viewport: "desktop",
      async run({ page, role, assert, settle }) {
        await pickFixed(page)
        const input = page.getByRole("textbox", { name: "恢复码", exact: true })
        await input.fill("ABCD-1234-XY")
        assert((await contentAlerts(page).count()) === 1, "先应出现超长错误")
        await input.press("Backspace")
        await input.press("Backspace")
        await input.press("Backspace")
        await settle()
        assert((await input.inputValue()) === "ABCD-1234", "应剩下 9 个字符")
        assert(
          (await contentAlerts(page).count()) === 0,
          "回到长度内错误应消失",
        )
        assert(
          (await input.getAttribute("aria-invalid")) === null,
          "错误态应一并清除",
        )
        assert(
          await role("button", { name: "验证", exact: true }).isEnabled(),
          "回到长度内提交按钮应恢复可点",
        )
      },
    },
    {
      name: "定长码：输入小写 abcd-1234，输入框里的值变大写并提交成功",
      viewport: "desktop",
      async run({ page, role, assert, visible }) {
        await pickFixed(page)
        const input = page.getByRole("textbox", { name: "恢复码", exact: true })
        await input.pressSequentially("abcd-1234")
        assert(
          (await input.inputValue()) === "ABCD-1234",
          "输入框里实际的值应是大写 ABCD-1234，而不只是看起来大写",
        )
        await role("button", { name: "验证", exact: true }).click()
        await visible(
          role("heading", { name: "验证成功", exact: true }),
          "ABCD-1234 应验证成功",
        )
      },
    },
    {
      name: "定长码：不带连字符的 ABCD1234 原样提交，演示后端也接受",
      viewport: "desktop",
      async run({ page, role, assert, visible }) {
        await pickFixed(page)
        const input = page.getByRole("textbox", { name: "恢复码", exact: true })
        await input.pressSequentially("abcd1234")
        assert(
          (await input.inputValue()) === "ABCD1234",
          "不应替用户补连字符，原样（转大写后）保留",
        )
        assert((await contentAlerts(page).count()) === 0, "8 个字符不应报超长")
        await role("button", { name: "验证", exact: true }).click()
        await visible(
          role("heading", { name: "验证成功", exact: true }),
          "演示后端同时接受不带连字符的写法",
        )
      },
    },
    {
      name: "有掩码：多粘贴的部分被丢掉时给出可见提示，下次输入清除",
      viewport: "desktop",
      async run({ page, assert, visible, settle }) {
        await switchTo(page, "恢复码")
        const input = page.getByRole("textbox", { name: "恢复码", exact: true })
        const notice = page.locator('[data-slot="auth-05-recovery-notice"]')
        assert(
          (await notice.getAttribute("role")) === "status",
          "提示应放在 role=status 的播报区里",
        )
        assert((await notice.textContent()) === "", "没有多出内容时不应有提示")
        await input.fill("abcd1234wxyz")
        assert(
          (await input.inputValue()) === "ABCD-1234",
          "有掩码时只取需要的 8 位",
        )
        await visible(
          notice.filter({ hasText: "已按格式保留前 8 位" }),
          "丢掉了多余内容应提示",
        )
        assert(
          ((await input.getAttribute("aria-describedby")) ?? "").includes(
            (await notice.getAttribute("id")) ?? "-",
          ),
          "提示应关联到输入框",
        )
        await input.fill("abcd")
        await settle()
        assert((await notice.textContent()) === "", "下次输入应清除提示")
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
      name: "演示：布局和恢复码格式各自切换，提示行跟着变",
      viewport: "desktop",
      async run({ page, role, assert, visible }) {
        assert(
          (await demoHint(page).textContent())?.includes("恢复码 ABCD-1234"),
          "默认提示应写掩码恢复码 ABCD-1234",
        )
        // 整页 + 原样：恢复码格式不再绑在嵌入布局上
        await pick(page, "恢复码", "原样")
        assert(
          (await demoHint(page).textContent())?.includes("恢复码 abc_12345"),
          "切到原样后提示应改为 abc_12345",
        )
        assert(
          (await page.locator('[data-slot="auth-05"]').count()) === 1,
          "只换恢复码格式不应改变布局",
        )
        await switchTo(page, "恢复码")
        const input = page.getByRole("textbox", { name: "恢复码", exact: true })
        await input.pressSequentially("abc_12345")
        assert(
          (await input.inputValue()) === "abc_12345",
          "整页布局下原样格式也应保留原值",
        )
        await role("button", { name: "验证", exact: true }).click()
        await expectSuccess({ page, role, visible, assert })
        // 嵌入 + 掩码：换布局不改恢复码格式
        await pick(page, "布局", "嵌入")
        await pick(page, "恢复码", "掩码")
        await page.locator('[data-slot="auth-05-content"]').waitFor()
        assert(
          (await demoHint(page).textContent())?.includes("嵌入版"),
          "嵌入布局的提示应说明嵌入版只开验证器和恢复码",
        )
        await switchTo(page, "恢复码")
        const embedded = page.getByRole("textbox", {
          name: "恢复码",
          exact: true,
        })
        await embedded.pressSequentially("abcd1234")
        assert(
          (await embedded.inputValue()) === "ABCD-1234",
          "嵌入布局下掩码格式应自动整理为 ABCD-1234",
        )
        await role("button", { name: "验证", exact: true }).click()
        await visible(
          role("heading", { name: "验证成功", exact: true }),
          "嵌入 + 掩码输入 ABCD-1234 应成功",
        )
      },
    },
    {
      name: "演示：通行密钥结果在等待中锁定，嵌入布局下禁用",
      viewport: "desktop",
      async run({ page, role, assert, visible }) {
        const group = demoChoice(page, "通行密钥")
        assert(
          (await group.getAttribute("data-disabled")) === null,
          "空闲时应可以改选",
        )
        await role("button", { name: "使用通行密钥验证", exact: true }).click()
        await visible(
          demoBar(page)
            .getByRole("status")
            .filter({ hasText: "通行密钥等待中，1.5 秒后返回「成功」" }),
          "等待中播报行应说明会返回什么",
        )
        assert(
          (await group.getAttribute("data-disabled")) !== null,
          "等待返回期间应锁定通行密钥结果",
        )
        await expectSuccess({ page, role, visible, assert })
        assert(
          (await group.getAttribute("data-disabled")) === null,
          "返回后应解除锁定",
        )
        await pick(page, "布局", "嵌入")
        assert(
          (await group.getAttribute("data-disabled")) !== null,
          "嵌入布局没有通行密钥，这一组应禁用",
        )
      },
    },
    {
      name: "演示：等待中重置再验证，旧请求返回时不解除新一轮的锁定",
      viewport: "desktop",
      async run({ page, role, assert }) {
        const group = demoChoice(page, "通行密钥")
        const start = role("button", {
          name: "使用通行密钥验证",
          exact: true,
        })
        await start.click()
        await page.waitForTimeout(700)
        await role("button", { name: "重置", exact: true }).click()
        await start.click()
        // 第一轮请求在此刻（开始后约 1.5 秒）返回，第二轮还要再等约 0.7 秒
        await page.waitForTimeout(1000)
        assert(
          (await group.getAttribute("data-disabled")) !== null,
          "旧请求返回后，新一轮等待中仍应锁定通行密钥结果",
        )
        assert(
          (await demoBar(page)
            .getByRole("status")
            .filter({ hasText: "通行密钥等待中" })
            .count()) === 1,
          "旧请求返回后，播报行仍应显示等待中",
        )
      },
    },
    {
      name: "演示：重置让区块回到初始，保留布局和格式",
      viewport: "desktop",
      async run({ page, role, assert, visible }) {
        await pick(page, "恢复码", "定长")
        await pickMode(page, "失败")
        await switchTo(page, "身份验证器 App")
        await codeField(page).fill("123456")
        await expectSuccess({ page, role, visible, assert })
        await role("button", { name: "重置", exact: true }).click()
        await visible(
          role("heading", { name: "使用通行密钥验证", exact: true }),
          "重置后应回到默认的通行密钥面板",
        )
        for (const [group, option] of [
          ["布局", "整页"],
          ["恢复码", "定长"],
          ["通行密钥", "失败"],
        ] as const)
          assert(
            (await demoChoice(page, group)
              .getByRole("radio", { name: option, exact: true })
              .getAttribute("aria-checked")) === "true",
            `重置后「${group}」应仍是「${option}」`,
          )
      },
    },
    {
      name: "演示控制条在手机宽度下不横向溢出，选项文字完整",
      viewport: "mobile",
      async run({ page, assert, visible }) {
        await visible(demoBar(page), "手机上也应有演示控制条")
        const clipped = await demoBar(page)
          .locator('[data-slot="segmented-control-item"] span.truncate')
          .evaluateAll((items) =>
            items
              .filter((el) => el.scrollWidth > el.clientWidth + 1)
              .map((el) => el.textContent),
          )
        assert(
          clipped.length === 0,
          `选项文字不应被截断：${clipped.join("、")}`,
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
      name: "嵌入模式：没有「记住此设备」，不出现整页外壳",
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
