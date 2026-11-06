import { Building2, ShieldCheck } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Auth04Labels } from "./config"
import { providerIcon } from "./form-parts"
import type { Auth04Org, Auth04Provider, Auth04Step } from "./types"

/**
 * 右侧组织面板：第一步说明识别规则，识别后展示组织、所选提供方和安全提示。
 * 窄屏缩成表单上方的紧凑卡片；第一步没有组织信息，窄屏隐藏。
 */
function Auth04Panel({
  step,
  org,
  provider,
  text,
  className,
}: {
  step: Auth04Step
  org?: Auth04Org
  provider?: Auth04Provider
  text: Auth04Labels
  className?: string
}) {
  const identified = step === "sso" && org
  return (
    <aside
      data-slot="auth-04-panel"
      data-step={step}
      aria-label={text.panelLabel}
      className={cn(
        "bg-muted/30 px-4 py-4 sm:px-6 md:py-8",
        step === "email" && "max-md:hidden",
        className,
      )}
    >
      {identified ? (
        <div className="space-y-3 md:space-y-5">
          <dl className="space-y-4 text-sm max-md:hidden">
            <div className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md border border-edge bg-background [&_svg]:size-5">
                {org.logo ?? <Building2 aria-hidden="true" />}
              </span>
              <div className="min-w-0">
                <dt className="sr-only">{text.orgName}</dt>
                <dd className="truncate font-medium">{org.name}</dd>
                <dt className="sr-only">{text.orgDomain}</dt>
                <dd className="truncate font-mono text-xs text-muted-foreground">
                  {org.domain}
                </dd>
              </div>
            </div>
            {provider && (
              <div className="border-t border-dashed border-edge pt-4">
                <dt className="text-xs text-muted-foreground">
                  {text.orgProvider}
                </dt>
                <dd className="mt-1 flex items-center gap-2 [&_svg]:size-4 [&_svg]:shrink-0">
                  {providerIcon(provider)}
                  {provider.label}
                </dd>
              </div>
            )}
          </dl>
          {provider && (
            <p className="flex items-center gap-2 text-sm font-medium md:hidden [&_svg]:size-4 [&_svg]:shrink-0">
              {providerIcon(provider)}
              {provider.label}
            </p>
          )}
          <p className="flex items-start gap-2 text-xs leading-6 text-muted-foreground max-md:text-sm">
            <ShieldCheck
              aria-hidden="true"
              className="mt-1 size-4 shrink-0 text-foreground"
            />
            <span>{text.security}</span>
          </p>
        </div>
      ) : step === "password" ? (
        <div className="space-y-2">
          <h2 className="text-sm font-medium">{text.passwordPanelTitle}</h2>
          <p className="text-xs leading-6 text-muted-foreground max-md:text-sm">
            {text.passwordPanelDescription}
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="space-y-2">
            <h2 className="text-sm font-medium">{text.panelTitle}</h2>
            <p className="text-sm leading-7 text-muted-foreground">
              {text.panelDescription}
            </p>
          </div>
          <div className="space-y-3">
            <h3 className="text-xs text-muted-foreground">
              {text.methodsTitle}
            </h3>
            <ul className="space-y-2 text-sm">
              {[text.methodSso, text.methodDirectory, text.methodPassword].map(
                (item) => (
                  <li key={item} className="flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="size-1.5 shrink-0 bg-primary"
                    />
                    {item}
                  </li>
                ),
              )}
            </ul>
          </div>
        </div>
      )}
    </aside>
  )
}

export { Auth04Panel }
