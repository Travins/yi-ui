"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import { SegmentedControl } from "@/registry/ui/segmented-control/segmented-control"
import { Auth05, Auth05Panel } from "./auth-05"

type PasskeyMode = "success" | "cancel" | "unsupported" | "error"
type Layout = "page" | "embedded" | "fixed"

const modes = [
  { value: "success", label: "成功" },
  { value: "cancel", label: "取消" },
  { value: "unsupported", label: "不支持" },
  { value: "error", label: "失败" },
]

const layouts = [
  { value: "page", label: "整页" },
  { value: "embedded", label: "嵌入" },
  { value: "fixed", label: "嵌入·定长码" },
]

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** 演示外壳：模拟后端与演示规则只放在这里，不属于 Auth05 组件。 */
export default function Auth05Demo() {
  const [mode, setMode] = React.useState<PasskeyMode>("success")
  const [layout, setLayout] = React.useState<Layout>("page")
  const [round, setRound] = React.useState(0)
  const [notice, setNotice] = React.useState("")
  // 两种嵌入布局共用同一个分屏外壳，只是备用码的配置不同
  const embedded = layout !== "page"
  const fixed = layout === "fixed"

  const passkey = async () => {
    await wait(1500)
    if (mode === "cancel") {
      throw Object.assign(new Error("The operation was cancelled."), {
        name: "NotAllowedError",
      })
    }
    if (mode === "error") throw new Error("这台设备上没有找到可用的通行密钥")
  }
  const sendCode = async () => {
    await wait(1000)
  }
  const verify = async ({ method, code }: { method: string; code: string }) => {
    await wait(350)
    if (method === "recovery") {
      if (fixed) {
        // 定长码：后端同时接受带连字符和不带连字符的写法，所以先去掉连字符再比；
        // 组件不会替后端去掉连字符，onVerify 拿到的就是输入框里的值（已转大写）
        if (code.replaceAll("-", "") !== "ABCD1234")
          throw new Error("恢复码无效或已使用")
        return
      }
      // 嵌入模式的备用码不做格式化，演示用 abc_12345；整页模式仍是 ABCD-1234
      const expected = embedded ? "abc_12345" : "ABCD-1234"
      if (code !== expected) throw new Error("恢复码无效或已使用")
    } else if (code !== "123456") {
      throw new Error("验证码错误，请重新输入")
    }
  }
  const switchAccount = () => setNotice("请在接入后跳转到账号选择页面")

  return (
    <main
      data-slot="auth-05-demo"
      className="flex min-h-screen flex-col justify-center bg-background py-8 text-foreground"
    >
      <div className="mx-auto mb-4 flex w-full max-w-3xl flex-wrap items-center gap-3 px-4">
        <span className="text-xs text-muted-foreground">演示布局</span>
        <SegmentedControl
          className="w-72"
          aria-label="演示布局"
          options={layouts}
          value={layout}
          onValueChange={(value) => {
            setLayout(value as Layout)
            setRound((current) => current + 1)
            setNotice("")
          }}
        />
        {!embedded && (
          <>
            <span className="text-xs text-muted-foreground">
              通行密钥模拟结果
            </span>
            <SegmentedControl
              className="min-w-0 flex-1 basis-72"
              aria-label="通行密钥模拟结果"
              options={modes}
              value={mode}
              onValueChange={(value) => setMode(value as PasskeyMode)}
            />
          </>
        )}
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setRound((value) => value + 1)
            setNotice("")
          }}
        >
          重置演示
        </Button>
      </div>
      {embedded ? (
        // 嵌入模式：分屏登录页，左边是品牌面板的占位，右边直接放 Auth05Panel
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
              key={`${layout}-${round}`}
              account={{ username: "lin_qinghe" }}
              methods={["totp", "recovery"]}
              showRememberDevice={false}
              recoveryCode={
                fixed
                  ? {
                      format: false,
                      uppercase: true,
                      maxLength: 9,
                      placeholder: "XXXX-XXXX",
                    }
                  : { format: false, maxLength: 32 }
              }
              helpHref="#"
              onSendCode={sendCode}
              onVerify={verify}
              onSwitchAccount={switchAccount}
            />
          </div>
        </div>
      ) : (
        <Auth05
          key={`page-${round}`}
          account={{ email: "linwei@example.com", phone: "13800138000" }}
          brand={{ name: "云间工作台" }}
          helpHref="#"
          passkeySupported={mode !== "unsupported"}
          onPasskey={passkey}
          onSendCode={sendCode}
          onVerify={verify}
          onSwitchAccount={switchAccount}
        />
      )}
      <div className="mx-auto mt-4 w-full max-w-3xl space-y-1 px-4 text-xs text-muted-foreground">
        <p>
          {fixed
            ? "演示规则：只开身份验证器与恢复码；验证器为 123456；恢复码由后端生成（8 位字母数字），不做格式化、输入时转大写、最多 9 个字符；ABCD-1234 与 ABCD1234 都成功（演示后端自己去掉连字符再比）。"
            : embedded
              ? "演示规则：嵌入模式只开身份验证器与恢复码；验证器为 123456；恢复码不做格式化，输入 abc_12345 成功。"
              : "演示规则：身份验证器与短信验证码为 123456；恢复码为 ABCD-1234；通行密钥 1.5 秒后按上方选择的结果返回。"}
        </p>
        <p role="status">{notice}</p>
      </div>
    </main>
  )
}
