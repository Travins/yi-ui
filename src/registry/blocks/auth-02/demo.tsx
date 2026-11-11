"use client"

import * as React from "react"
import { Building2, Play, RotateCcw, Smartphone, Square } from "lucide-react"

import { Button } from "@/components/ui/button"
import { DemoBar, DemoBarChoice } from "@/components/demo/demo-bar"
import { Auth02, type Auth02Status } from "./auth-02"

const providers = [
  {
    id: "app",
    label: "App 扫码",
    icon: <Smartphone aria-hidden />,
    description: "使用已登录的手机 App，安全确认本次登录。",
  },
  {
    id: "enterprise",
    label: "企业账号扫码",
    icon: <Building2 aria-hidden />,
    description: "打开企业工作台，扫描二维码后确认工作账号。",
  },
]
const states: { value: Auth02Status; label: string }[] = [
  { value: "pending", label: "待扫码" },
  { value: "scanned", label: "已扫码" },
  { value: "expired", label: "已过期" },
  { value: "confirmed", label: "成功" },
  { value: "error", label: "失败" },
]
const stateLabel = (status: Auth02Status) =>
  states.find((item) => item.value === status)?.label ?? status

/** 播放流程依次经过的状态，每步停留 STEP_MS */
const FLOW: Auth02Status[] = ["pending", "scanned", "confirmed"]
const STEP_MS = 2500
/** 演示二维码的有效期：真实倒计时，到时自动过期 */
const CODE_TTL = 60_000

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * 演示外壳：模拟后端与演示规则只放在这里，不属于 Auth02 组件。
 *
 * 状态以这里为准（受控），组件内部的变化（刷新、重试、切换提供方、生成失败、到期）通过 onStatusChange 回到这里，
 * 控制条和区块始终一致。三种来源：
 * - 实时：初始、重置后、区块内操作后。二维码真实倒计时，到时过期。
 * - 手动：在控制条上选了「已扫码」等状态。此时忽略组件的到期通知，停在所选状态；选「待扫码」回到实时。
 * - 播放：重新生成二维码，按 FLOW 逐步推进；可停止，停在当前步骤（之后同手动）。
 */
export default function Auth02Demo() {
  // 换 key 就是重置：组件重新挂载、回到扫码页签并重新生成二维码
  const [round, setRound] = React.useState(0)
  const [status, setStatus] = React.useState<Auth02Status>("pending")
  const [pinned, setPinned] = React.useState(false)
  /** 播放到 FLOW 的第几步；null 表示没在播放 */
  const [step, setStep] = React.useState<number | null>(null)
  const [played, setPlayed] = React.useState(false)
  const [message, setMessage] = React.useState("")
  // 组件没有公开当前页签，这里看扫码区域在不在：切到短信 / 密码登录时它会被卸载
  const [onQr, setOnQr] = React.useState(true)
  const rootRef = React.useRef<HTMLElement>(null)
  const expiresAt = React.useRef(0)
  /** 是否在播放：给下面的观察回调用，它拿不到最新的 step */
  const playing = React.useRef(false)

  React.useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const observer = new MutationObserver(() => {
      const present = !!root.querySelector('[data-slot="auth-02-code-region"]')
      setOnQr(present)
      if (present || !playing.current) return
      // 播放中切到短信 / 密码登录：眼前已经不是扫码界面，停下来而不是继续播到「成功」
      playing.current = false
      setStep(null)
      setPinned(true)
      setPlayed(true)
      setMessage("已切到其他登录方式，播放已停止")
    })
    observer.observe(root, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [])

  React.useEffect(() => {
    if (step === null) return
    const timer = setTimeout(() => {
      const next = step + 1
      setStatus(FLOW[next] ?? "confirmed")
      if (next < FLOW.length - 1) {
        setStep(next)
        return
      }
      // 到最后一步就结束，停在「成功」，之后同手动选定
      playing.current = false
      setStep(null)
      setPinned(true)
      setPlayed(true)
      setMessage("播放完成，停在「成功」")
    }, STEP_MS)
    return () => clearTimeout(timer)
  }, [step])

  function restart() {
    setRound((value) => value + 1)
    setStatus("pending")
    setPinned(false)
  }

  function play() {
    restart()
    setMessage("")
    playing.current = true
    setStep(0)
  }

  function stop() {
    playing.current = false
    setStep(null)
    setPinned(true)
    setPlayed(true)
    setMessage(`已停止，停在「${stateLabel(status)}」`)
  }

  function reset() {
    restart()
    playing.current = false
    setStep(null)
    setPlayed(false)
    setMessage("")
  }

  function choose(value: Auth02Status) {
    playing.current = false
    setStep(null)
    setMessage("")
    if (value === "pending") {
      // 回到实时：二维码已经过期就重新生成一张，否则一选「待扫码」又立刻过期
      if (Date.now() >= expiresAt.current - 1000) restart()
      else {
        setStatus("pending")
        setPinned(false)
      }
      return
    }
    setStatus(value)
    setPinned(true)
  }

  return (
    <div
      data-slot="auth-02-demo"
      className="flex min-h-screen flex-col bg-background text-foreground"
    >
      <DemoBar
        hint={
          onQr
            ? "二维码 60 秒后过期；手动选定的状态不会被过期打断。不做真实认证。"
            : "当前是短信或密码登录，扫码状态不适用；返回扫码或点「重置」后可切换。"
        }
        status={
          step !== null
            ? `播放中 ${step + 1}/${FLOW.length}：${stateLabel(FLOW[step] ?? "pending")}`
            : message
        }
        actions={
          <>
            {step !== null ? (
              <Button size="sm" variant="outline" onClick={stop}>
                <Square data-icon="inline-start" aria-hidden />
                停止
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={play}>
                <Play data-icon="inline-start" aria-hidden />
                {played ? "重新播放" : "播放流程"}
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={reset}>
              <RotateCcw data-icon="inline-start" aria-hidden />
              重置
            </Button>
          </>
        }
      >
        <DemoBarChoice
          label="扫码状态"
          options={states}
          value={status}
          disabled={!onQr}
          onValueChange={(value) => choose(value as Auth02Status)}
        />
      </DemoBar>
      <main ref={rootRef} className="flex flex-1 flex-col justify-center">
        <Auth02
          key={round}
          status={status}
          onStatusChange={(next) => {
            // 手动选定或播放中，不让真实倒计时把状态改成过期
            if (next === "expired" && (pinned || step !== null)) return
            // 其余变化都来自区块内的操作：接管为实时状态，播放随之停止
            playing.current = false
            setStep(null)
            setPinned(false)
            setMessage("")
            setStatus(next)
          }}
          providers={providers}
          onRequestCode={async (id) => {
            await wait(400)
            expiresAt.current = Date.now() + CODE_TTL
            return {
              value: `https://example.com/login?provider=${id}`,
              expiresAt: expiresAt.current,
            }
          }}
          onSignIn={async () => {
            await wait(500)
          }}
          onSendCode={async () => {
            await wait(500)
          }}
        />
      </main>
    </div>
  )
}
