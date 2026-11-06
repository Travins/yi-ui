"use client"

import { useMemo } from "react"

import {
  PhoneInput,
  PhoneInputSendButton,
} from "@/registry/ui/phone-input/phone-input"
import { ToggleSwitch } from "@/registry/ui/toggle-switch/toggle-switch"

import { formatLabel, resolveLabels, type Auth02Labels } from "./config"
import { FormError, PasswordField, SubmitButton, TextField } from "./form-parts"
import {
  PHONE_LENGTH,
  createCodeSignInSchema,
  createSignInSchema,
} from "./schemas"
import { useAsyncAction, useAuthForm } from "./use-auth-form"

type SignInValues =
  | { method: "password"; account: string; password: string; remember: boolean }
  | { method: "code"; phone: string; code: string }

const CODE_COOLDOWN = 60

function PasswordSignIn({
  onSignIn,
  labels,
}: {
  onSignIn: (values: SignInValues) => Promise<void>
  labels?: Partial<Auth02Labels>
}) {
  // labels 引用不变时 text 与 schema 都不重建，避免每次输入都重新编译 zod schema
  const text = useMemo(() => resolveLabels(labels), [labels])
  const schema = useMemo(() => createSignInSchema(text), [text])
  const form = useAuthForm(
    schema,
    { account: "", password: "", remember: false },
    { fallbackError: text.requestFailed },
  )
  return (
    <form
      data-slot="auth-02-sign-in-password"
      noValidate
      onSubmit={form.handleSubmit((values) =>
        onSignIn({ method: "password", ...values }),
      )}
      className="flex flex-col gap-5"
    >
      <FormError message={form.formError} />
      <TextField
        id="sign-in-account"
        label={text.accountLabel}
        autoComplete="username"
        placeholder={text.accountPlaceholder}
        value={form.values.account}
        error={form.errors.account}
        onChange={(event) => form.setValue("account", event.target.value)}
        onBlur={() => form.blur("account")}
      />
      <PasswordField
        id="sign-in-password"
        label={text.passwordLabel}
        autoComplete="current-password"
        placeholder={text.passwordPlaceholder}
        value={form.values.password}
        error={form.errors.password}
        onChange={(event) => form.setValue("password", event.target.value)}
        onBlur={() => form.blur("password")}
        labels={labels}
      />
      {/* 记住登录状态是即时生效的开关，不是需要同意的声明，所以用开关而不是复选框 */}
      <ToggleSwitch
        label={text.remember}
        tone="primary"
        checked={form.values.remember}
        onCheckedChange={(checked) => form.setValue("remember", checked)}
      />
      <SubmitButton pending={form.pending} pendingText={text.signInPending}>
        {text.signInSubmit}
      </SubmitButton>
    </form>
  )
}

function CodeSignIn({
  onSignIn,
  onSendCode,
  labels,
}: {
  onSignIn: (values: SignInValues) => Promise<void>
  onSendCode: (phone: string) => Promise<void>
  labels?: Partial<Auth02Labels>
}) {
  const text = useMemo(() => resolveLabels(labels), [labels])
  const schema = useMemo(() => createCodeSignInSchema(text), [text])
  const form = useAuthForm(
    schema,
    { phone: "", code: "" },
    { fallbackError: text.requestFailed },
  )
  const sender = useAsyncAction(text.requestFailed)

  // 失败时必须 throw：PhoneInputSendButton 遇到抛错就不进入倒计时，用户可以马上重试
  const sendCode = async () => {
    if (!form.validateField("phone"))
      throw new Error(text.validationPhoneInvalid)
    const sent = await sender.run(() => onSendCode(form.values.phone))
    if (!sent) throw new Error(text.requestFailed)
  }
  const phoneInvalid = formatLabel(text.validationPhoneInvalid, {
    length: PHONE_LENGTH,
  })
  return (
    <form
      data-slot="auth-02-sign-in-code"
      noValidate
      onSubmit={form.handleSubmit((values) =>
        onSignIn({ method: "code", ...values }),
      )}
      className="flex flex-col gap-5"
    >
      <FormError message={form.formError ?? sender.error} />
      <PhoneInput
        id="sign-in-phone"
        size="lg"
        label={text.phoneLabel}
        placeholder={text.phonePlaceholder}
        value={form.values.phone}
        error={form.errors.phone}
        labels={{ invalid: phoneInvalid, required: phoneInvalid }}
        onValueChange={(phone) => form.setValue("phone", phone)}
        onBlur={() => form.blur("phone")}
        action={
          <PhoneInputSendButton
            cooldown={CODE_COOLDOWN}
            onSend={sendCode}
            labels={{
              send: text.sendCode,
              sending: text.sendCodePending,
              countdown: text.resendCode,
              resend: text.sendCode,
            }}
          />
        }
      />
      <TextField
        id="sign-in-code"
        label={text.codeLabel}
        inputMode="numeric"
        maxLength={6}
        autoComplete="one-time-code"
        placeholder={text.codePlaceholder}
        value={form.values.code}
        error={form.errors.code}
        onChange={(event) => form.setValue("code", event.target.value)}
        onBlur={() => form.blur("code")}
      />
      <SubmitButton pending={form.pending} pendingText={text.signInPending}>
        {text.signInSubmit}
      </SubmitButton>
    </form>
  )
}

export { PasswordSignIn, CodeSignIn }
export type { SignInValues }
