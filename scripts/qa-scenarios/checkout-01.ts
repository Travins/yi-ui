import type { Locator, Page } from "playwright-core"

import type { Scenario } from "./types"

const root = (page: Page) => page.locator('[data-slot="checkout-01"]')
const summary = (page: Page) => root(page).locator("aside")
const submit = (page: Page) => page.getByRole("button", { name: "提交订单", exact: true })
const pendingButton = (page: Page) => page.getByRole("button", { name: "提交中…", exact: true })
const section = (page: Page, module: string) => page.locator(`[data-module="${module}"]`)

/** 取出金额里的数字，忽略货币符号与空白：「¥346.00」→「346.00」「-¥20.00」→「-20.00」 */
const digits = (text: string) => text.replace(/[¥￥\s]/g, "")

/** 摘要里「标签 → 金额」的一行：标签和金额是同一个 flex 行里的两个 span */
async function summaryRow(page: Page, label: string) {
  const row = summary(page)
    .locator("div.flex.justify-between")
    .filter({ has: page.getByText(label, { exact: true }) })
  return digits(await row.locator("span").last().innerText())
}

const total = async (page: Page) =>
  digits(await summary(page).locator("strong").innerText())

const isFocused = (target: Locator) =>
  target.evaluate((el) => el === document.activeElement)

const overflowOf = (page: Page) =>
  page.evaluate(
    () =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )

/** 示例里企业发票用的合法统一社会信用代码（校验位通过） */
const VALID_USCC = "91350100M000100Y43"

async function pickShipping(page: Page, name: RegExp) {
  await page
    .getByRole("radiogroup", { name: "配送方式" })
    .getByRole("radio", { name })
    .click()
}

async function pickInvoice(page: Page, name: string) {
  await page
    .getByRole("radiogroup", { name: "发票" })
    .getByRole("radio", { name, exact: true })
    .click()
}

/** 弹窗里依次选「浙江省 / 杭州市 / 西湖区」 */
async function pickRegion(page: Page) {
  await page.getByRole("button", { name: /^省市区/ }).click()
  for (const name of ["浙江省", "杭州市", "西湖区"]) {
    await page.getByRole("option", { name, exact: true }).click()
  }
  await page
    .getByRole("button", { name: /^省市区 浙江省 \/ 杭州市 \/ 西湖区/ })
    .waitFor({ state: "visible" })
}

const dialog = (page: Page) => page.getByRole("dialog", { name: "收货地址" })

async function openAddressForm(page: Page) {
  await page.getByRole("button", { name: "更换", exact: true }).click()
  await dialog(page).waitFor({ state: "visible" })
  await dialog(page).getByRole("button", { name: "新增地址", exact: true }).click()
  await dialog(page).getByRole("textbox", { name: /^收货人/ }).waitFor({ state: "visible" })
}

export default {
  name: "结算页",
  viewports: ["desktop", "mobile"],
  steps: [
    {
      name: "初始摘要：商品金额、运费、优惠与实付互相对得上，并给出大写金额",
      async run({ page, assert, visible, shot }) {
        await visible(summary(page), "应有订单摘要")
        const rows = {
          商品金额: await summaryRow(page, "商品金额"),
          运费: await summaryRow(page, "运费"),
          优惠: await summaryRow(page, "优惠"),
        }
        assert(rows.商品金额 === "358.00", `商品金额应为 358.00，实际 ${rows.商品金额}`)
        assert(rows.运费 === "8.00", `默认快递运费应为 8.00，实际 ${rows.运费}`)
        assert(rows.优惠 === "-20.00", `优惠应显示为 -20.00，实际 ${rows.优惠}`)
        const sum = await total(page)
        assert(sum === "346.00", `实付应为 358+8-20 = 346.00，实际 ${sum}`)
        await visible(summary(page).getByText("叁佰肆拾陆元整"), "应显示实付的大写金额「叁佰肆拾陆元整」")
        await shot("初始摘要")
      },
    },
    {
      name: "切换到到店自提：运费归零、实付与大写联动、地址模块变成自提门店",
      async run({ page, assert, visible, shot }) {
        await pickShipping(page, /^到店自提/)
        await page.getByRole("heading", { name: "自提门店", exact: true }).waitFor({ state: "visible" })
        assert(
          (await summaryRow(page, "运费")) === "0.00",
          `自提运费应为 0.00，实际 ${await summaryRow(page, "运费")}`,
        )
        assert((await total(page)) === "338.00", `自提实付应为 338.00，实际 ${await total(page)}`)
        await visible(summary(page).getByText("叁佰叁拾捌元整"), "大写应同步为「叁佰叁拾捌元整」")
        await visible(section(page, "address").getByText("示例生活馆 · 示例路 18 号"), "应显示自提门店信息")
        assert(
          (await section(page, "address").getByRole("button", { name: "更换", exact: true }).count()) === 0,
          "自提时不应再有「更换」地址按钮",
        )
        await shot("自提")
        await pickShipping(page, /^快递配送/)
        await page.getByRole("heading", { name: "收货地址", exact: true }).waitFor({ state: "visible" })
        assert((await total(page)) === "346.00", `切回快递后实付应回到 346.00，实际 ${await total(page)}`)
        await visible(
          section(page, "address").getByText("林小满"),
          "切回快递后应回到收货地址卡片",
        )
      },
    },
    {
      name: "支付方式：默认微信支付，可改选支付宝，完成页显示所选方式",
      async run({ page, assert, visible }) {
        const group = page.getByRole("radiogroup", { name: "支付方式" })
        assert(
          (await group.getByRole("radio", { name: "微信支付" }).getAttribute("aria-checked")) === "true",
          "默认应选中微信支付",
        )
        await group.getByRole("radio", { name: "支付宝" }).click()
        assert(
          (await group.getByRole("radio", { name: "支付宝" }).getAttribute("aria-checked")) === "true",
          "点击后支付宝应为选中",
        )
        assert(
          (await group.getByRole("radio", { name: "微信支付" }).getAttribute("aria-checked")) === "false",
          "微信支付应取消选中（单选）",
        )
        await submit(page).click()
        await visible(
          page.getByRole("heading", { name: "订单已提交", exact: true }),
          "提交后应显示订单已提交",
        )
        await visible(
          page.locator('[data-slot="checkout-completion"]').getByText("支付宝", { exact: true }),
          "完成页应显示所选的支付方式「支付宝」",
        )
      },
    },
    {
      name: "提交订单：按钮进入「提交中…」并禁用，完成页显示订单号、金额与进度",
      async run({ page, assert, visible, shot }) {
        await submit(page).click()
        await visible(pendingButton(page), "提交后按钮应显示「提交中…」")
        assert(await pendingButton(page).isDisabled(), "提交中按钮应禁用，防止重复提交")
        await shot("提交中")
        const done = page.locator('[data-slot="checkout-completion"]')
        await visible(done, "示例请求完成后应切到完成页")
        await visible(page.getByRole("heading", { name: "订单已提交", exact: true }), "应有标题「订单已提交」")
        const text = await done.innerText()
        assert(text.includes("EX20261030001"), `完成页应显示订单号 EX20261030001，实际「${text.slice(0, 80)}」`)
        assert(digits(text).includes("346.00"), "完成页应显示实付 ¥346.00")
        assert(text.includes("微信支付"), "完成页应显示支付方式微信支付")
        assert(text.includes("已下单") && text.includes("等待处理"), "进度时间线应有「已下单」与「等待处理」")
        assert(
          (await root(page).locator('[data-module="address"]').count()) === 0,
          "完成后不应再显示表单模块",
        )
        await shot("完成页")
      },
    },
    {
      name: "完成页复制订单号：按钮名称或状态播报给出明确结果",
      async run({ page, assert, visible }) {
        await submit(page).click()
        await visible(page.getByRole("heading", { name: "订单已提交", exact: true }), "先要到完成页")
        await page.getByRole("button", { name: "复制订单号", exact: true }).click()
        // 剪贴板在无头环境里可能没有权限：成功时名称变成「已复制」，失败时播报「复制失败，请手动复制」，两者必居其一
        await page
          .locator('[data-slot="checkout-completion"]')
          .filter({
            has: page.locator(
              '[aria-label="已复制"], [role="status"]:has-text("复制失败，请手动复制")',
            ),
          })
          .waitFor({ state: "attached" })
        const copied = await page.getByRole("button", { name: "已复制", exact: true }).count()
        const failed = await page.getByRole("status").filter({ hasText: "复制失败，请手动复制" }).count()
        assert(
          copied + failed === 1,
          `复制后应只给出一种结果，已复制 ${copied} 个、失败播报 ${failed} 个`,
        )
      },
    },
    {
      name: "发票：个人自动带出抬头，企业需要抬头与统一社会信用代码",
      async run({ page, assert, visible, shot }) {
        const title = page.getByRole("textbox", { name: /^发票抬头/ })
        assert((await title.count()) === 0, "默认不开发票时不应有抬头输入")
        await pickInvoice(page, "个人")
        await visible(title, "选个人后应出现抬头输入")
        assert((await title.inputValue()) === "个人", `个人发票抬头默认为「个人」，实际「${await title.inputValue()}」`)
        assert(
          (await page.getByRole("textbox", { name: /^统一社会信用代码/ }).count()) === 0,
          "个人发票不需要统一社会信用代码",
        )
        await pickInvoice(page, "企业")
        await visible(page.getByRole("textbox", { name: /^统一社会信用代码/ }), "选企业后应出现统一社会信用代码输入")
        assert((await title.inputValue()) === "", "切到企业后抬头应清空")
        await visible(page.getByText("企业发票请填写与登记信息一致的统一社会信用代码"), "应有填写提示")
        await shot("企业发票")
        await pickInvoice(page, "不开发票")
        assert((await title.count()) === 0, "切回不开发票后抬头输入应消失")
      },
    },
    {
      name: "企业发票空提交：报错并把焦点移到抬头，不会提交订单",
      async run({ page, assert, visible, shot }) {
        await pickInvoice(page, "企业")
        await submit(page).click()
        await visible(page.getByText("请填写发票抬头", { exact: true }), "抬头为空应提示「请填写发票抬头」")
        await visible(page.getByText("请输入有效的统一社会信用代码", { exact: true }), "代码为空应提示「请输入有效的统一社会信用代码」")
        assert(
          await isFocused(page.getByRole("textbox", { name: /^发票抬头/ })),
          "校验失败后焦点应落在发票抬头输入框",
        )
        assert((await pendingButton(page).count()) === 0, "校验未通过时不应进入提交中")
        assert(
          (await page.locator('[data-slot="checkout-completion"]').count()) === 0,
          "校验未通过时不应出现完成页",
        )
        await shot("企业发票报错")
      },
    },
    {
      name: "企业发票：抬头已填但代码无效时焦点落到代码，改正后提交成功",
      async run({ page, assert, visible }) {
        await pickInvoice(page, "企业")
        await page.getByRole("textbox", { name: /^发票抬头/ }).fill("示例科技有限公司")
        const tax = page.getByRole("textbox", { name: /^统一社会信用代码/ })
        await tax.fill("91350100M000100Y44")
        await submit(page).click()
        await visible(page.getByText("请输入有效的统一社会信用代码", { exact: true }), "校验位不对应提示代码无效")
        assert(await isFocused(tax), "抬头已填时焦点应落在统一社会信用代码")
        assert(
          (await page.getByText("请填写发票抬头", { exact: true }).count()) === 0,
          "抬头已填写，不应再提示抬头必填",
        )
        await tax.fill(VALID_USCC)
        await page.getByText("请输入有效的统一社会信用代码", { exact: true }).waitFor({ state: "detached" })
        await submit(page).click()
        await visible(
          page.getByRole("heading", { name: "订单已提交", exact: true }),
          "代码改正后应能提交成功",
        )
      },
    },
    {
      name: "更换地址弹窗：展示当前地址，Esc 关闭后焦点回到「更换」",
      async run({ page, assert, visible, settle, shot }) {
        const trigger = page.getByRole("button", { name: "更换", exact: true })
        await trigger.click()
        await visible(dialog(page), "点更换应打开地址弹窗")
        await settle()
        const radio = dialog(page).getByRole("radio", { name: /林小满/ })
        assert(
          (await radio.getAttribute("aria-checked")) === "true",
          "当前地址应处于选中状态",
        )
        await shot("地址弹窗")
        await page.keyboard.press("Escape")
        await dialog(page).waitFor({ state: "detached" })
        await page.waitForFunction(
          () => document.activeElement?.textContent?.trim() === "更换",
        )
        assert(await isFocused(trigger), "关闭弹窗后焦点应回到「更换」按钮")
      },
    },
    {
      name: "新增地址：空保存逐项报错并聚焦首个错误字段",
      async run({ page, assert, visible, settle, shot }) {
        await openAddressForm(page)
        const expand = dialog(page).getByRole("button", { name: "新增地址", exact: true })
        assert(
          (await expand.getAttribute("aria-expanded")) === "true",
          "展开新增表单后 aria-expanded 应为 true",
        )
        await dialog(page).getByRole("button", { name: "保存地址", exact: true }).click()
        for (const message of [
          "请填写收货人",
          "请输入有效的 11 位手机号",
          "请选择完整的省市区",
          "请填写详细地址",
        ]) {
          await visible(dialog(page).getByText(message, { exact: true }), `空保存应提示「${message}」`)
        }
        assert(
          await isFocused(dialog(page).getByRole("textbox", { name: /^收货人/ })),
          "空保存后焦点应落在第一个有错误的字段「收货人」",
        )
        await settle()
        await shot("地址报错")
      },
    },
    {
      name: "新增地址：保存后弹窗关闭，新地址成为当前收货地址，再打开能看到两条",
      async run({ page, assert, visible, shot }) {
        await openAddressForm(page)
        await dialog(page).getByRole("textbox", { name: /^收货人/ }).fill("周小北")
        await dialog(page).getByRole("textbox", { name: /^手机号/ }).fill("13900139000")
        await pickRegion(page)
        await dialog(page).getByRole("textbox", { name: /^详细地址/ }).fill("测试路 8 号")
        await dialog(page).getByRole("button", { name: "保存地址", exact: true }).click()
        await dialog(page).waitFor({ state: "detached" })
        const card = section(page, "address")
        await visible(card.getByText("周小北"), "保存后地址模块应显示新收货人")
        const text = await card.innerText()
        assert(text.includes("139 0013 9000"), `手机号应按 3-4-4 分隔显示，实际「${text}」`)
        assert(text.includes("浙江省 杭州市 西湖区 测试路 8 号"), `应显示完整地址，实际「${text}」`)
        await shot("新地址已选中")
        await page.getByRole("button", { name: "更换", exact: true }).click()
        const radios = dialog(page).getByRole("radio")
        assert((await radios.count()) === 2, `弹窗里应有 2 个地址，实际 ${await radios.count()}`)
        assert(
          (await dialog(page).getByRole("radio", { name: /周小北/ }).getAttribute("aria-checked")) === "true",
          "新地址应为选中",
        )
        await dialog(page).getByRole("radio", { name: /林小满/ }).click()
        await dialog(page).waitFor({ state: "detached" })
        await visible(card.getByText("林小满"), "选回原地址后应关闭弹窗并显示林小满")
      },
    },
    {
      name: "桌面宽度：摘要在内容右侧，提交按钮在摘要里，没有底部固定栏",
      viewport: "desktop",
      async run({ page, assert, box }) {
        const aside = await box(summary(page))
        const address = await box(section(page, "address"))
        assert(
          aside.x >= address.x + address.width - 1,
          `摘要应在内容区右侧（摘要 x=${aside.x}，内容右缘 ${address.x + address.width}）`,
        )
        const button = await box(submit(page))
        assert(
          button.x >= aside.x - 1 && button.x + button.width <= aside.x + aside.width + 1,
          "提交按钮应在摘要栏里",
        )
        assert(
          (await root(page).locator(".fixed").evaluate((el) => getComputedStyle(el).display)) === "none",
          "桌面宽度下底部固定栏应隐藏",
        )
      },
    },
    {
      name: "手机宽度：摘要排在内容下方，底部固定栏带实付金额与提交按钮，没有横向溢出",
      viewport: "mobile",
      async run({ page, assert, box, shot }) {
        const overflow = await overflowOf(page)
        assert(overflow <= 0, `页面不应横向溢出，多出 ${overflow}px`)
        const aside = await box(summary(page))
        const payment = await box(section(page, "payment"))
        assert(
          aside.y >= payment.y + payment.height - 1,
          `摘要应在支付方式下方（摘要 y=${aside.y}，支付底边 ${payment.y + payment.height}）`,
        )
        const bar = root(page).locator(".fixed")
        const barBox = await box(bar)
        const viewport = page.viewportSize()!
        assert(
          Math.abs(barBox.y + barBox.height - viewport.height) <= 1,
          `底部栏应贴着视口底部（底边 ${barBox.y + barBox.height}，视口高 ${viewport.height}）`,
        )
        const barText = digits(await bar.innerText())
        assert(barText.includes("346.00"), `底部栏应显示实付 346.00，实际「${barText}」`)
        // 摘要区里的提交按钮在窄屏隐藏，只剩底部栏这一个可见入口
        const visibleSubmits = await page
          .getByRole("button", { name: "提交订单", exact: true })
          .count()
        assert(visibleSubmits === 1, `窄屏应只有 1 个可见的提交按钮，实际 ${visibleSubmits}`)
        await shot("手机底部栏")
      },
    },
    {
      name: "手机宽度：底部栏金额随配送方式联动，页面滚到底也不会盖住大写金额",
      viewport: "mobile",
      async run({ page, assert, box, shot }) {
        await pickShipping(page, /^到店自提/)
        await page.getByRole("heading", { name: "自提门店", exact: true }).waitFor({ state: "visible" })
        const bar = root(page).locator(".fixed")
        const text = digits(await bar.innerText())
        assert(text.includes("338.00"), `自提后底部栏应显示 338.00，实际「${text}」`)
        await summary(page).getByText("叁佰叁拾捌元整").scrollIntoViewIfNeeded()
        await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
        const upper = await box(summary(page).getByText("叁佰叁拾捌元整"))
        const barBox = await box(bar)
        assert(
          upper.y + upper.height <= barBox.y + 1,
          `滚到底后大写金额（底边 ${upper.y + upper.height}）不应被底部栏（顶边 ${barBox.y}）盖住`,
        )
        await shot("滚到底")
      },
    },
    {
      name: "手机宽度：从底部栏提交订单成功",
      viewport: "mobile",
      async run({ page, visible }) {
        await submit(page).click()
        await visible(pendingButton(page), "底部栏提交后应显示「提交中…」")
        await visible(
          page.getByRole("heading", { name: "订单已提交", exact: true }),
          "应显示订单已提交",
        )
      },
    },
    {
      name: "手机宽度：地址弹窗贴底显示，新增地址表单不超出屏幕",
      viewport: "mobile",
      async run({ page, assert, box, shot }) {
        await openAddressForm(page)
        const sheet = await box(dialog(page))
        const viewport = page.viewportSize()!
        assert(
          Math.abs(sheet.y + sheet.height - viewport.height) <= 1,
          `窄屏弹窗应贴着视口底部（底边 ${sheet.y + sheet.height}，视口高 ${viewport.height}）`,
        )
        assert(sheet.width <= viewport.width + 1, `弹窗宽度 ${sheet.width} 不应超过视口 ${viewport.width}`)
        assert(sheet.height <= viewport.height * 0.85 + 1, `弹窗高度 ${sheet.height} 不应超过视口的 85%`)
        const overflow = await overflowOf(page)
        assert(overflow <= 0, `弹窗打开时页面不应横向溢出，多出 ${overflow}px`)
        await shot("地址弹窗")
      },
    },
  ],
} satisfies Scenario
