import { z } from "zod"

import { formatLabel, type Auth02Labels } from "./config"

/**
 * 校验规则常量：改策略只改这里，提示文案里的 {min}、{length} 会自动带入新值。
 * 提示文案本身全部来自 labels（config.ts 的 validation* 键），可逐实例覆盖。
 */

/** 密码最少位数 */
const PASSWORD_MIN_LENGTH = 8

/** 姓名最少字符数 */
const NAME_MIN_LENGTH = 2

/** 短信验证码位数 */
const CODE_LENGTH = 6

/** 中国大陆手机号位数，需与 PHONE_PATTERN 的位数一致 */
const PHONE_LENGTH = 11

/** 中国大陆 11 位手机号；面向海外用户时替换这条规则 */
const PHONE_PATTERN = /^1[3-9]\d{9}$/

/** 验证码只接受数字，位数由 CODE_LENGTH 决定 */
const CODE_PATTERN = new RegExp(`^\\d{${CODE_LENGTH}}$`)

function emailField(labels: Auth02Labels) {
  return z
    .string()
    .trim()
    .min(1, labels.validationEmailRequired)
    .email(labels.validationEmailInvalid)
}

function passwordField(labels: Auth02Labels) {
  return z
    .string()
    .min(
      PASSWORD_MIN_LENGTH,
      formatLabel(labels.validationPasswordMin, { min: PASSWORD_MIN_LENGTH }),
    )
    .regex(/[A-Za-z]/, labels.validationPasswordLetter)
    .regex(/\d/, labels.validationPasswordDigit)
}

function phoneField(labels: Auth02Labels) {
  return z
    .string()
    .trim()
    .regex(
      PHONE_PATTERN,
      formatLabel(labels.validationPhoneInvalid, { length: PHONE_LENGTH }),
    )
}

/** 密码登录。labels 需是合并过默认值的完整文案。 */
function createSignInSchema(labels: Auth02Labels) {
  return z.object({
    account: z.string().trim().min(1, labels.validationAccountRequired),
    password: z.string().min(1, labels.validationPasswordRequired),
    remember: z.boolean(),
  })
}

/** 验证码登录。 */
function createCodeSignInSchema(labels: Auth02Labels) {
  return z.object({
    phone: phoneField(labels),
    code: z
      .string()
      .trim()
      .regex(
        CODE_PATTERN,
        formatLabel(labels.validationCodeInvalid, { length: CODE_LENGTH }),
      ),
  })
}

/** 注册：确认密码与条款勾选也在前端校验。 */
function createSignUpSchema(labels: Auth02Labels) {
  return z
    .object({
      name: z
        .string()
        .trim()
        .min(
          NAME_MIN_LENGTH,
          formatLabel(labels.validationNameMin, { min: NAME_MIN_LENGTH }),
        ),
      email: emailField(labels),
      password: passwordField(labels),
      confirm: z.string().min(1, labels.validationConfirmRequired),
      terms: z
        .boolean()
        .refine((value) => value, labels.validationTermsRequired),
    })
    .refine((values) => values.password === values.confirm, {
      message: labels.validationPasswordMismatch,
      path: ["confirm"],
    })
}

/** 找回密码。 */
function createForgotPasswordSchema(labels: Auth02Labels) {
  return z.object({ email: emailField(labels) })
}

export {
  CODE_LENGTH,
  NAME_MIN_LENGTH,
  PASSWORD_MIN_LENGTH,
  PHONE_LENGTH,
  PHONE_PATTERN,
  createCodeSignInSchema,
  createForgotPasswordSchema,
  createSignInSchema,
  createSignUpSchema,
}
