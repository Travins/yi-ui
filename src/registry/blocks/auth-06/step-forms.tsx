"use client"

import * as React from "react"
import { ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { BarField } from "@/registry/ui/bar-field/bar-field"
import { IdNumberInput } from "@/registry/ui/id-number-input/id-number-input"
import { PhoneInput } from "@/registry/ui/phone-input/phone-input"
import { RegionPicker } from "@/registry/ui/region-picker/region-picker"
import { SegmentedControl } from "@/registry/ui/segmented-control/segmented-control"
import type { Auth06Labels } from "./config"
import {
  Auth06Actions,
  Auth06Agreement,
  Auth06ButtonLabel,
  Auth06PasswordField,
} from "./form-parts"
import { Auth06PasswordStrength } from "./password-strength"
import type {
  Auth06Draft,
  Auth06Errors,
  Auth06IdentityMode,
  Auth06TeamSize,
} from "./types"
import type { RegionsSource } from "@/registry/ui/region-picker/region-picker"

type StepFormProps = {
  /** 字段 id 前缀：`${id}-email` 等，校验失败时据此聚焦第一个出错字段 */
  id: string
  labels: Auth06Labels
  draft: Auth06Draft
  errors: Auth06Errors
  pending: boolean
  /** 表单级错误的 id，存在时挂到 form 的 aria-describedby */
  describedBy?: string
  update: (patch: Partial<Auth06Draft>) => void
}

function StepForm({
  slot,
  describedBy,
  onSubmit,
  children,
}: {
  slot: string
  describedBy?: string
  onSubmit: () => void
  children: React.ReactNode
}) {
  return (
    <form
      noValidate
      data-slot={slot}
      aria-describedby={describedBy}
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
    >
      <div className="space-y-4">{children}</div>
    </form>
  )
}

function Auth06AccountForm({
  id,
  labels,
  draft,
  errors,
  pending,
  describedBy,
  update,
  checking,
  agreementLinks,
  onNext,
}: StepFormProps & {
  checking: boolean
  agreementLinks?: { terms?: string; privacy?: string }
  onNext: () => void
}) {
  return (
    <StepForm
      slot="auth-06-account"
      describedBy={describedBy}
      onSubmit={onNext}
    >
      <BarField
        id={`${id}-email`}
        size="lg"
        type="email"
        inputMode="email"
        autoComplete="email"
        spellCheck={false}
        label={labels.email}
        placeholder={labels.emailPlaceholder}
        value={draft.email}
        error={errors.email}
        disabled={pending}
        onValueChange={(email) => update({ email })}
      />
      <div className="space-y-2">
        <Auth06PasswordField
          id={`${id}-password`}
          size="lg"
          autoComplete="new-password"
          label={labels.password}
          placeholder={labels.passwordPlaceholder}
          labels={labels}
          value={draft.password}
          error={errors.password}
          disabled={pending}
          onValueChange={(password) => update({ password })}
        />
        <Auth06PasswordStrength password={draft.password} labels={labels} />
      </div>
      <Auth06Agreement
        id={`${id}-agreed`}
        labels={labels}
        checked={draft.agreed}
        error={errors.agreed}
        disabled={pending}
        links={agreementLinks}
        onCheckedChange={(agreed) => update({ agreed })}
      />
      <Auth06Actions labels={labels}>
        <Button type="submit" size="lg" disabled={pending}>
          <Auth06ButtonLabel
            current={checking ? labels.checking : labels.next}
            options={[labels.next, labels.checking]}
          />
        </Button>
      </Auth06Actions>
    </StepForm>
  )
}

function Auth06ProfileForm({
  id,
  labels,
  draft,
  errors,
  pending,
  describedBy,
  update,
  regions,
  teamSizes,
  last,
  submitting,
  onBack,
  onNext,
}: StepFormProps & {
  regions: RegionsSource
  teamSizes: Auth06TeamSize[]
  /** 实名关闭时这是最后一步，主按钮直接完成注册 */
  last: boolean
  submitting: boolean
  onBack: () => void
  onNext: () => void
}) {
  return (
    <StepForm
      slot="auth-06-profile"
      describedBy={describedBy}
      onSubmit={onNext}
    >
      <BarField
        id={`${id}-name`}
        size="lg"
        autoComplete="name"
        label={labels.name}
        placeholder={labels.namePlaceholder}
        value={draft.name}
        error={errors.name}
        disabled={pending}
        onValueChange={(name) => update({ name })}
      />
      <PhoneInput
        id={`${id}-phone`}
        size="lg"
        label={labels.phone}
        value={draft.phone}
        error={errors.phone}
        disabled={pending}
        labels={{ invalid: labels.phoneError, required: labels.phoneError }}
        onValueChange={(phone) => update({ phone })}
      />
      <RegionPicker
        id={`${id}-region`}
        size="lg"
        depth={2}
        regions={regions}
        label={labels.region}
        placeholder={labels.regionPlaceholder}
        value={draft.region}
        error={errors.region}
        disabled={pending}
        onValueChange={(region, path) =>
          update({ region, regionPath: path.map((item) => item.name) })
        }
      />
      {/* 四个选项在手机宽度下放不下条内标签，标签统一放在条上方 */}
      <div className="space-y-1.5">
        <p
          id={`${id}-team-size-label`}
          className="text-xs text-muted-foreground"
        >
          {labels.teamSize}
        </p>
        <SegmentedControl
          size="lg"
          aria-labelledby={`${id}-team-size-label`}
          options={teamSizes}
          value={draft.teamSize}
          disabled={pending}
          onValueChange={(teamSize) => update({ teamSize })}
        />
      </div>
      <Auth06Actions labels={labels} onBack={onBack} disabled={pending}>
        <Button type="submit" size="lg" disabled={pending}>
          <Auth06ButtonLabel
            current={
              submitting
                ? labels.submitting
                : last
                  ? labels.finish
                  : labels.next
            }
            options={[last ? labels.finish : labels.next, labels.submitting]}
          />
        </Button>
      </Auth06Actions>
    </StepForm>
  )
}

function Auth06IdentityForm({
  id,
  labels,
  draft,
  errors,
  pending,
  describedBy,
  update,
  mode,
  submitting,
  onBack,
  onSubmit,
}: StepFormProps & {
  mode: Exclude<Auth06IdentityMode, "off">
  submitting: "identity" | "skip" | null
  onBack: () => void
  onSubmit: (withIdentity: boolean) => void
}) {
  // 身份证号为空时主按钮是「跳过并完成注册」；填了号码才校验并提交
  const filled = draft.idNumber !== ""
  const submitIdentity = mode === "required" || filled
  return (
    <StepForm
      slot="auth-06-identity"
      describedBy={describedBy}
      onSubmit={() => onSubmit(submitIdentity)}
    >
      <div
        data-slot="auth-06-identity-note"
        className="flex gap-2.5 rounded-md border border-edge bg-muted/40 px-3 py-2.5 text-xs leading-5 text-muted-foreground"
      >
        <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        <p>{labels.identityNote}</p>
      </div>
      <BarField
        id={`${id}-realName`}
        size="lg"
        autoComplete="name"
        label={labels.realName}
        placeholder={labels.realNamePlaceholder}
        value={draft.realName}
        error={errors.realName}
        disabled={pending}
        onValueChange={(realName) => update({ realName })}
      />
      <IdNumberInput
        id={`${id}-idNumber`}
        size="lg"
        label={labels.idNumber}
        value={draft.idNumber}
        error={errors.idNumber}
        disabled={pending}
        labels={{ invalid: labels.idNumberError }}
        onValueChange={(idNumber) => update({ idNumber })}
      />
      <Auth06Actions labels={labels} onBack={onBack} disabled={pending}>
        {mode === "optional" && filled && (
          <Button
            type="button"
            variant="outline"
            size="lg"
            disabled={pending}
            onClick={() => onSubmit(false)}
          >
            <Auth06ButtonLabel
              current={submitting === "skip" ? labels.submitting : labels.skip}
              options={[labels.skip, labels.submitting]}
            />
          </Button>
        )}
        <Button type="submit" size="lg" disabled={pending}>
          <Auth06ButtonLabel
            current={
              submitting === (submitIdentity ? "identity" : "skip")
                ? labels.submitting
                : submitIdentity
                  ? labels.submitAndFinish
                  : labels.skipAndFinish
            }
            options={[
              labels.skipAndFinish,
              labels.submitAndFinish,
              labels.submitting,
            ]}
          />
        </Button>
      </Auth06Actions>
    </StepForm>
  )
}

export { Auth06AccountForm, Auth06IdentityForm, Auth06ProfileForm }
