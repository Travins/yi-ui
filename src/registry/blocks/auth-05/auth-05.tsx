"use client"

import { cn } from "@/lib/utils"
import {
  GridContainer,
  GridSection,
} from "@/registry/ui/grid-layout/grid-layout"
import { Auth05Panel } from "./auth-05-panel"
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
 * 登录第二步（整页版）：账号已通过第一步认证，这里再完成一次通行密钥、验证码或恢复码验证。
 * 真实认证由回调接入。和 Auth05Panel 共用同一套状态与零件，只是外面加了线条网格外壳，
 * 并在桌面宽度下把「其他验证方式」放到主面板右侧。
 */
function Auth05(props: Auth05Props) {
  const auth = useAuth05(props)
  const { className, ...rootProps } = auth.rootProps
  const hasFooter = auth.showRememberDevice || Boolean(auth.helpHref)

  return (
    <div
      data-slot="auth-05"
      data-method={auth.method}
      data-state={auth.done ? "success" : "idle"}
      className={cn(
        "w-full overflow-x-clip bg-background text-foreground",
        className,
      )}
      {...rootProps}
    >
      <GridContainer className="max-w-3xl">
        <GridSection topLine className="px-4 py-8 sm:px-6">
          <Auth05Intro auth={auth} defaultLevel={1} />
        </GridSection>
        {/* 账号摘要放在标题之后：先说明要做什么，再说明是哪个账号 */}
        <GridSection
          data-slot="auth-05-account"
          className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 sm:px-6"
        >
          <Auth05AccountContent auth={auth} />
        </GridSection>
        <GridSection
          className={cn(
            "grid",
            !auth.done &&
              auth.others.length > 0 &&
              "md:grid-cols-[minmax(0,1fr)_17rem]",
          )}
        >
          <div className="px-4 py-8 sm:px-6">
            <Auth05MethodBody auth={auth} />
          </div>
          {!auth.done && auth.others.length > 0 && (
            // 右栏用虚线与主面板分开；窄屏变成面板下方的一块，用上边的虚线分隔
            <Auth05Alternatives
              auth={auth}
              className="border-t border-dashed border-edge px-4 py-6 sm:px-6 md:border-t-0 md:border-l md:px-4 md:py-8"
            />
          )}
        </GridSection>
        {!auth.done && hasFooter && (
          <GridSection className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            {auth.showRememberDevice && (
              <div className="sm:w-72">
                <Auth05RememberDevice auth={auth} />
              </div>
            )}
            <Auth05HelpLink auth={auth} />
          </GridSection>
        )}
      </GridContainer>
      <Auth05Announcer auth={auth} />
    </div>
  )
}

export { Auth05, Auth05Panel }
export type {
  Auth05Account,
  Auth05Method,
  Auth05Props,
  Auth05RecoveryCode,
} from "./types"
export type { Auth05Labels } from "./config"
