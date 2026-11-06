"use client"

import { useCallback, useState, type FormEvent } from "react"
import type { z } from "zod"

import { DEFAULT_LABELS } from "./config"

type FieldErrors = Record<string, string>
// 字面量初始值（false、""）会被推断成字面量类型，这里放宽为 boolean / string
type Widen<T> = {
  [K in keyof T]: T[K] extends boolean
    ? boolean
    : T[K] extends string
      ? string
      : T[K]
}

/** 每个字段只保留第一条错误，避免一次堆出一长串提示 */
function toErrors(error: z.ZodError): FieldErrors {
  const errors: FieldErrors = {}
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "")
    if (key && !(key in errors)) errors[key] = issue.message
  }
  return errors
}

/** 把未知错误转成可展示的中文文案；没有 message 时用传入的兜底文案。 */
function errorMessage(
  error: unknown,
  fallback: string = DEFAULT_LABELS.requestFailed,
) {
  return error instanceof Error && error.message ? error.message : fallback
}

/** 包装一个异步动作：管理 loading，并把抛出的错误转成可展示的中文文案。 */
function useAsyncAction(fallbackError: string = DEFAULT_LABELS.requestFailed) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const run = useCallback(
    async (action: () => Promise<void>) => {
      setPending(true)
      setError(null)
      try {
        await action()
        return true
      } catch (caught) {
        setError(errorMessage(caught, fallbackError))
        return false
      } finally {
        setPending(false)
      }
    },
    [fallbackError],
  )
  return { pending, error, run, clearError: () => setError(null) }
}

/**
 * 极简受控表单：zod 校验 + 字段错误 + 提交状态。
 * 首次提交前，字段失焦时校验该字段；提交失败后，输入时实时重新校验。
 */
function useAuthForm<I extends Record<string, string | boolean>>(
  schema: z.ZodType,
  initial: I,
  options: { fallbackError?: string } = {},
) {
  type V = Widen<I>
  const [values, setValues] = useState<V>(initial as V)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [submitted, setSubmitted] = useState(false)
  const action = useAsyncAction(options.fallbackError)

  const check = useCallback(
    (next: V) => {
      const result = schema.safeParse(next)
      return result.success ? {} : toErrors(result.error)
    },
    [schema],
  )

  const setValue = <K extends keyof V & string>(key: K, value: V[K]) => {
    const next = { ...values, [key]: value }
    setValues(next)
    if (submitted) setErrors(check(next))
    else if (errors[key]) setErrors((prev) => ({ ...prev, [key]: "" }))
  }
  const blur = (key: keyof V & string) => {
    if (values[key] === "" && !submitted) return
    const found = check(values)[key] ?? ""
    setErrors((prev) => ({ ...prev, [key]: found }))
  }
  const handleSubmit =
    (onValid: (values: V) => Promise<void>) =>
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      setSubmitted(true)
      const found = check(values)
      setErrors(found)
      if (Object.keys(found).length) return
      await action.run(() => onValid(values))
    }

  return {
    values,
    errors,
    setValue,
    blur,
    handleSubmit,
    pending: action.pending,
    formError: action.error,
    run: action.run,
    /** 校验单个字段并返回是否通过（用于「发送验证码」前校验手机号） */
    validateField: (key: keyof V & string) => {
      const found = check(values)[key] ?? ""
      setSubmitted(true)
      setErrors((prev) => ({ ...prev, [key]: found }))
      return !found
    },
  }
}

export { errorMessage, useAsyncAction, useAuthForm }
export type { FieldErrors }
