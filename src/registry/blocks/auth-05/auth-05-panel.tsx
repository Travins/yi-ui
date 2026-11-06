"use client"

import { cn } from "@/lib/utils"
import {
  Auth05AccountContent,
  Auth05Alternatives,
  Auth05Announcer,
  Auth05HelpLink,
  Auth05Intro,
  Auth05MethodBody,
  Auth05RememberDevice,
} from "./parts"
import type { Auth05Props } from "./types"
import { useAuth05 } from "./use-auth-05"

/**
 * 只有验证内容的版本：没有页面外壳，宽度跟随父容器，适合嵌进已有的登录布局（例如分屏登录页的右侧）。
 * 「其他验证方式」一律排在当前方式下方，单列；嵌入的容器通常很窄，不做两栏。
 */
function Auth05Panel(props: Auth05Props) {
  const auth = useAuth05(props)
  const { className, ...rootProps } = auth.rootProps
  const hasFooter = auth.showRememberDevice || Boolean(auth.helpHref)

  return (
    <div
      data-slot="auth-05-content"
      data-method={auth.method}
      data-state={auth.done ? "success" : "idle"}
      className={cn("flex w-full min-w-0 flex-col gap-6", className)}
      {...rootProps}
    >
      <div>
        <Auth05Intro auth={auth} defaultLevel={2} />
      </div>
      {/* 账号摘要放在标题之后：先说明要做什么，再说明是哪个账号 */}
      <div
        data-slot="auth-05-account"
        className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-edge px-3 py-2"
      >
        <Auth05AccountContent auth={auth} />
      </div>
      <div>
        <Auth05MethodBody auth={auth} />
      </div>
      {!auth.done && auth.others.length > 0 && (
        <Auth05Alternatives
          auth={auth}
          className="border-t border-dashed border-edge pt-6"
        />
      )}
      {!auth.done && hasFooter && (
        <div className="flex flex-col gap-3">
          <Auth05RememberDevice auth={auth} />
          <div>
            <Auth05HelpLink auth={auth} />
          </div>
        </div>
      )}
      <Auth05Announcer auth={auth} />
    </div>
  )
}

export { Auth05Panel }
