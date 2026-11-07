import type { Page } from "playwright-core"

import type { Scenario } from "./types"

const GROUP = '[data-slot="agent-chat-tool-group"]'
const TOOL = '[data-slot="agent-chat-tool"]'
const TRIGGER = '[data-slot="trace-collapsible-trigger"]'
const WAIT = { timeout: 30_000 }

/** 点建议问题之外，直接在输入框里发一句话（每步都是新加载的页面，不依赖上一步） */
async function ask(page: Page, question: string) {
  const input = page.getByRole("textbox", { name: "向 AI 助手提问" })
  await input.fill(question)
  await input.press("Enter")
}

/** 折叠行 / 工具行自己的触发器（不含嵌套在里面的子行） */
const triggerOf = (page: Page, selector: string) =>
  page.locator(selector).locator(`:scope > ${TRIGGER}`)

export default {
  name: "AI 助手",
  viewports: ["desktop", "mobile"],
  steps: [
    {
      name: "多工具折叠：运行进度、展开后逐个工具与耗时、改动摘要",
      async run({ page, assert, visible, shot, box }) {
        await ask(page, "这周数据有什么变化")
        // 工具在运行：折叠行显示进度与实时计时
        const group = page.locator(GROUP).first()
        await group.waitFor({ state: "visible", ...WAIT })
        await page
          .locator(`${GROUP} ${TRIGGER}`)
          .first()
          .filter({ hasText: /正在调用工具 · 第 \d+\/\d+ 个/ })
          .waitFor({ state: "visible", ...WAIT })
        assert(
          (await group.getAttribute("data-status")) === "running",
          "运行中折叠行应为 running 状态",
        )
        await shot("运行中")
        // 全部完成：合并成一行「调用了 4 个工具 · x 秒」
        const trigger = triggerOf(page, GROUP).first()
        await trigger
          .filter({ hasText: /^调用了 4 个工具 · [\d.]+ 秒$/ })
          .waitFor({ state: "visible", ...WAIT })
        assert(
          (await trigger.getAttribute("aria-expanded")) === "false",
          "没有失败时折叠行默认收起",
        )
        const collapsed = await box(trigger)
        assert(collapsed.height <= 28, `折叠行应保持一行紧凑，实际 ${collapsed.height}px`)
        await trigger.click()
        const lines = page.locator(`${GROUP} ${TOOL}`)
        assert((await lines.count()) === 4, "展开后应有 4 个工具")
        for (const name of ["查询核心指标", "对比错误率与延迟", "拉取变更记录", "汇总告警"]) {
          const line = lines.filter({ hasText: name })
          await visible(line, `应有工具「${name}」`)
          const text = (await line.locator(`:scope > ${TRIGGER}`).innerText()).trim()
          assert(
            new RegExp(`^已完成 · ${name} · [\\d.]+ 秒$`).test(text),
            `工具行应形如「已完成 · ${name} · 1.2 秒」，实际「${text}」`,
          )
          assert((await box(line.locator(`:scope > ${TRIGGER}`))).height <= 28, `「${name}」行应保持一行紧凑`)
        }
        // 耗时较长的那一次要体现出来（剧本里是 2.6 秒）
        const slow = await lines
          .filter({ hasText: "拉取变更记录" })
          .locator(`:scope > ${TRIGGER}`)
          .innerText()
        const seconds = Number(/· ([\d.]+) 秒/.exec(slow)?.[1])
        assert(seconds >= 2 && seconds <= 4, `最慢的工具耗时应在 2–4 秒，实际 ${seconds}`)
        // 回答结尾的改动摘要卡片
        const changes = page.locator('[data-slot="agent-chat-changes"]')
        await changes.waitFor({ state: "visible", ...WAIT })
        await changes.scrollIntoViewIfNeeded()
        assert(
          (await changes.locator('[data-slot="change-summary-item"]').count()) === 5,
          "改动摘要应有 5 行",
        )
        assert(
          /错误率/.test(await changes.innerText()),
          "改动摘要里应有「错误率」",
        )
        // 读屏播报只有一个共用区域，并播过工具完成
        const live = page.locator('[data-slot="agent-chat-tool-status"]')
        assert((await live.count()) === 1, "工具播报区域应只有一个")
        assert(
          (await live.getAttribute("aria-live")) === "polite",
          "播报区域应是 aria-live=polite",
        )
        assert(/已完成/.test(await live.innerText()), "播报区域应读出工具已完成")
        // 窄屏不能被撑出横向滚动
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth > window.innerWidth + 1,
        )
        assert(!overflow, "页面不应出现横向滚动")
        await shot("完成后展开")
      },
    },
    {
      name: "长结果截断：展开全部与收起",
      viewport: "desktop",
      async run({ page, assert, visible, box, shot }) {
        await ask(page, "这周数据有什么变化")
        await triggerOf(page, GROUP)
          .first()
          .filter({ hasText: /^调用了 4 个工具/ })
          .waitFor({ state: "visible", ...WAIT })
        await triggerOf(page, GROUP).first().click()
        const line = page.locator(`${GROUP} ${TOOL}`).filter({ hasText: "拉取变更记录" })
        await line.locator(`:scope > ${TRIGGER}`).click()
        const output = line.locator('[data-slot="agent-chat-code"]').nth(1)
        await visible(output, "展开工具应看到输出代码块")
        await output.getByRole("button", { name: "展开全部 输出" }).waitFor({ state: "visible", timeout: 5000 })
        assert((await output.getAttribute("data-truncated")) !== null, "长输出应被截断")
        const short = await box(output)
        assert(short.height <= 222, `截断后高度应约 220px，实际 ${short.height}px`)
        // 输入很短，不应出现展开按钮
        const input = line.locator('[data-slot="agent-chat-code"]').nth(0)
        assert(
          (await input.getByRole("button", { name: /展开全部/ }).count()) === 0,
          "短输入不应出现展开全部",
        )
        await shot("已截断")
        await output.getByRole("button", { name: "展开全部 输出" }).click()
        const tall = await box(output)
        assert(tall.height > 240, `展开全部后应显示全文，实际 ${tall.height}px`)
        assert((await output.getAttribute("data-truncated")) === null, "展开后不再截断")
        await shot("已展开")
        await output.getByRole("button", { name: "收起 输出" }).click()
        await page.waitForTimeout(100)
        const back = await box(output)
        assert(back.height <= 222, `收起后应回到约 220px，实际 ${back.height}px`)
        // 复制的是全文：按钮要能点
        await output.hover()
        await visible(
          output.getByRole("button", { name: "复制输出" }),
          "应有复制输出按钮",
        )
      },
    },
    {
      name: "失败自动展开 → 手动收起不再展开 → 重试成功",
      viewport: "desktop",
      async run({ page, assert, visible, shot }) {
        await ask(page, "排查 orders 服务的慢查询")
        // 失败的工具和外层折叠行都自动展开，错误直接可见
        const failedLine = page.locator(`${GROUP} ${TOOL}`).filter({ hasText: "读取慢查询日志" })
        await visible(
          failedLine.getByText("请求超时（8 秒）"),
          "失败后应自动展开并显示错误",
        )
        const groupTrigger = triggerOf(page, GROUP).first()
        assert(
          (await groupTrigger.getAttribute("aria-expanded")) === "true",
          "外层折叠行应自动展开",
        )
        // 全部结束：折叠行用 error 状态，标题带失败数
        await groupTrigger
          .filter({ hasText: /^调用了 3 个工具 · 1 个失败/ })
          .waitFor({ state: "visible", ...WAIT })
        assert(
          (await page.locator(GROUP).first().getAttribute("data-status")) === "failed",
          "有失败时折叠行应为 failed 状态",
        )
        assert(
          (await groupTrigger.locator('[data-slot="trace-line"]').getAttribute("data-status")) ===
            "error",
          "折叠行应使用 error 状态",
        )
        await shot("失败自动展开")
        // 手动收起后，后续更新不再自动展开
        const lineTrigger = failedLine.locator(`:scope > ${TRIGGER}`)
        await lineTrigger.click()
        await page.waitForTimeout(600)
        assert(
          (await lineTrigger.getAttribute("aria-expanded")) === "false",
          "手动收起后应保持收起",
        )
        // 回答结束（重新生成按钮可用）后仍然收起
        await page
          .getByRole("button", { name: "重新生成回答" })
          .waitFor({ state: "visible", ...WAIT })
        assert(
          (await lineTrigger.getAttribute("aria-expanded")) === "false",
          "流式结束后仍应保持手动收起的状态",
        )
        await lineTrigger.click()
        // 重试：运行中 → 成功
        await page.getByRole("button", { name: "重试 读取慢查询日志" }).click()
        await lineTrigger
          .filter({ hasText: /^重试中 · 读取慢查询日志/ })
          .waitFor({ state: "visible", timeout: 5000 })
        await lineTrigger
          .filter({ hasText: /^已完成 · 读取慢查询日志 · [\d.]+ 秒$/ })
          .waitFor({ state: "visible", ...WAIT })
        await groupTrigger
          .filter({ hasText: /^调用了 3 个工具 · [\d.]+ 秒$/ })
          .waitFor({ state: "visible", timeout: 5000 })
        assert(
          (await failedLine.getByText("请求超时（8 秒）").count()) === 0,
          "重试成功后错误应消失",
        )
        assert(
          (await page.getByRole("button", { name: "重试 读取慢查询日志" }).count()) === 0,
          "成功后不应再有重试按钮",
        )
        assert(
          /读取慢查询日志 已完成/.test(
            await page.locator('[data-slot="agent-chat-tool-status"]').innerText(),
          ),
          "重试成功应被读屏播报",
        )
        await shot("重试成功")
      },
    },
    {
      name: "不足阈值的单个失败工具：自动展开，重试后仍失败可再次重试",
      viewport: "desktop",
      async run({ page, assert, visible }) {
        // CI 剧本的工具只有 2 个：不折叠，失败的单个工具自动展开，重试后仍然失败
        await ask(page, "pnpm install 在 CI 里失败")
        const line = page.locator(TOOL).filter({ hasText: "读取 CI 安装日志" })
        await visible(
          line.getByText(/ERR_PNPM_OUTDATED_LOCKFILE/),
          "单个失败的工具也应自动展开",
        )
        assert((await page.locator(GROUP).count()) === 0, "只有 2 个工具时不应折叠")
        await page
          .getByRole("button", { name: "重新生成回答" })
          .waitFor({ state: "visible", ...WAIT })
        await page.getByRole("button", { name: "重试 读取 CI 安装日志" }).click()
        await line
          .getByText("重试后仍然失败（模拟失败）")
          .waitFor({ state: "visible", ...WAIT })
        assert(
          (await page.getByRole("button", { name: "重试 读取 CI 安装日志" }).isVisible()),
          "重试仍失败后应还能再次重试",
        )
      },
    },
  ],
} satisfies Scenario
