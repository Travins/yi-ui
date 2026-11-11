"use client"

import * as React from "react"
import { RotateCcw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { DemoBar, DemoBarChoice } from "@/components/demo/demo-bar"
import { Auth05, Auth05Panel, type Auth05RecoveryCode } from "./auth-05"

type Layout = "page" | "embedded"
type RecoveryFormat = "mask" | "raw" | "fixed"
type PasskeyResult = "success" | "cancel" | "unsupported" | "error"

const layouts = [
  { value: "page", label: "整页" },
  { value: "embedded", label: "嵌入" },
]
const formats = [
  { value: "mask", label: "掩码" },
  { value: "raw", label: "原样" },
  { value: "fixed", label: "定长" },
]
const results = [
  { value: "success", label: "成功" },
  { value: "cancel", label: "取消" },
  { value: "unsupported", label: "不支持" },
  { value: "error", label: "失败" },
]

/** 三种恢复码配置，以及演示后端各自接受的写法 */
const RECOVERY: Record<
  RecoveryFormat,
  {
    config?: Auth05RecoveryCode
    accepts: (code: string) => boolean
    hint: string
  }
> = {
  // 默认掩码 XXXX-XXXX：输入时自动转大写、补连字符
  mask: { accepts: (code) => code === "ABCD-1234", hint: "ABCD-1234" },
  // 不格式化：原样提交，大小写和符号都不动
  raw: {
    config: { format: false, maxLength: 32 },
    accepts: (code) => code === "abc_12345",
    hint: "abc_12345",
  },
  // 后端生成 8 位码：不格式化但转大写、最多 9 个字符。
  // 组件不会替后端去掉连字符，onVerify 拿到的就是输入框里的值，所以演示后端自己去掉再比
  fixed: {
    config: {
      format: false,
      uppercase: true,
      maxLength: 9,
      placeholder: "XXXX-XXXX",
    },
    accepts: (code) => code.replaceAll("-", "") === "ABCD1234",
    hint: "ABCD-1234 或 ABCD1234",
  },
}

const PASSKEY_MS = 1500
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * 演示外壳：模拟后端与演示规则只放在这里，不属于 Auth05 组件。
 *
 * - 「布局」和「恢复码」是两件独立的配置，改了都会让区块重新挂载（配置变了，旧的输入不再成立）。
 * - 「通行密钥」只决定模拟后端返回什么：空闲时改选，下次点击生效，区块不重置；
 *   等待返回的 1.5 秒里锁定，结果就是点击时选的那一项。嵌入布局没有通行密钥，这一组禁用。
 * - 「重置」重新挂载区块，三项配置都保留。
 */
export default function Auth05Demo() {
  const [layout, setLayout] = React.useState<Layout>("page")
  const [format, setFormat] = React.useState<RecoveryFormat>("mask")
  const [result, setResult] = React.useState<PasskeyResult>("success")
  const [waiting, setWaiting] = React.useState(false)
  const [round, setRound] = React.useState(0)
  const [notice, setNotice] = React.useState("")
  const embedded = layout === "embedded"
  const recovery = RECOVERY[format]

  // 每次通行密钥请求的编号：重置或改配置后，旧请求返回时不能再动新一轮的等待状态
  const passkeyRun = React.useRef(0)

  function restart() {
    passkeyRun.current += 1
    setRound((value) => value + 1)
    setWaiting(false)
    setNotice("")
  }

  const passkey = async () => {
    // 等待期间控件锁定，这里读到的就是点击时的选项
    const run = ++passkeyRun.current
    setWaiting(true)
    setNotice("")
    try {
      await wait(PASSKEY_MS)
      if (result === "cancel")
        throw Object.assign(new Error("The operation was cancelled."), {
          name: "NotAllowedError",
        })
      if (result === "error")
        throw new Error("这台设备上没有找到可用的通行密钥")
    } finally {
      if (run === passkeyRun.current) setWaiting(false)
    }
  }
  const sendCode = async () => {
    await wait(1000)
  }
  const verify = async ({ method, code }: { method: string; code: string }) => {
    await wait(350)
    if (method === "recovery") {
      if (!recovery.accepts(code)) throw new Error("恢复码无效或已使用")
    } else if (code !== "123456") {
      throw new Error("验证码错误，请重新输入")
    }
  }
  const switchAccount = () => setNotice("请在接入后跳转到账号选择页面")

  const hint = embedded
    ? `嵌入版只开验证器和恢复码。验证器 123456 · 恢复码 ${recovery.hint}`
    : `验证器、短信 123456 · 恢复码 ${recovery.hint} · 通行密钥 1.5 秒后返回所选结果`

  return (
    <div
      data-slot="auth-05-demo"
      className="flex min-h-screen flex-col bg-background text-foreground"
    >
      <DemoBar
        hint={hint}
        status={
          waiting
            ? `通行密钥等待中，1.5 秒后返回「${results.find((item) => item.value === result)?.label}」`
            : notice
        }
        actions={
          <Button size="sm" variant="ghost" onClick={restart}>
            <RotateCcw data-icon="inline-start" aria-hidden />
            重置
          </Button>
        }
      >
        <DemoBarChoice
          label="布局"
          options={layouts}
          value={layout}
          onValueChange={(value) => {
            setLayout(value as Layout)
            restart()
          }}
        />
        <DemoBarChoice
          label="恢复码"
          options={formats}
          value={format}
          onValueChange={(value) => {
            setFormat(value as RecoveryFormat)
            restart()
          }}
        />
        <DemoBarChoice
          label="通行密钥"
          options={results}
          value={result}
          disabled={embedded || waiting}
          onValueChange={(value) => setResult(value as PasskeyResult)}
        />
      </DemoBar>
      <main className="flex flex-1 flex-col justify-center py-8">
        {embedded ? (
          // 嵌入布局：分屏登录页，左边是品牌面板的占位，右边直接放 Auth05Panel
          <div
            data-slot="auth-05-demo-split"
            className="mx-auto grid w-full max-w-4xl overflow-hidden rounded-xl border border-edge md:grid-cols-2"
          >
            <div className="hidden flex-col justify-between bg-foreground p-8 text-background md:flex">
              <span className="text-sm font-medium">云间工作台</span>
              <p className="text-sm leading-7 opacity-70">
                品牌面板占位：换成自己的品牌与流程图。
              </p>
            </div>
            <div className="min-w-0 p-6 sm:p-8">
              <Auth05Panel
                key={`embedded-${format}-${round}`}
                account={{ username: "lin_qinghe" }}
                methods={["totp", "recovery"]}
                showRememberDevice={false}
                recoveryCode={recovery.config}
                helpHref="#"
                onSendCode={sendCode}
                onVerify={verify}
                onSwitchAccount={switchAccount}
              />
            </div>
          </div>
        ) : (
          <Auth05
            key={`page-${format}-${round}`}
            account={{ email: "linwei@example.com", phone: "13800138000" }}
            brand={{ name: "云间工作台" }}
            helpHref="#"
            passkeySupported={result !== "unsupported"}
            recoveryCode={recovery.config}
            onPasskey={passkey}
            onSendCode={sendCode}
            onVerify={verify}
            onSwitchAccount={switchAccount}
          />
        )}
      </main>
    </div>
  )
}
