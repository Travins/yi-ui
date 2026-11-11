import { z } from "zod"
import { isValidIdCard } from "@/registry/ui/id-number-input/id-number-input"
import { isValidPhone } from "@/registry/ui/phone-input/phone-input"
import type { Auth06Labels } from "./config"

function createAccountSchema(labels: Auth06Labels) {
  return z.object({
    email: z.string().trim().email(labels.emailError),
    password: z.string().min(8, labels.passwordError),
    agreed: z.boolean().refine(Boolean, labels.agreementError),
  })
}

function createProfileSchema(labels: Auth06Labels) {
  return z.object({
    name: z.string().trim().min(1, labels.nameError),
    phone: z.string().refine(isValidPhone, labels.phoneError),
    region: z.string().min(1, labels.regionError),
  })
}

function createIdentitySchema(labels: Auth06Labels) {
  return z.object({
    realName: z.string().trim().min(2, labels.realNameError),
    idNumber: z
      .string()
      .refine((value) => isValidIdCard(value), labels.idNumberError),
  })
}

/** 把 zod 的错误按字段名收成「字段 → 第一条信息」。 */
function fieldErrors(error: z.ZodError) {
  const result: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "")
    if (!result[key]) result[key] = issue.message
  }
  return result
}

export {
  createAccountSchema,
  createIdentitySchema,
  createProfileSchema,
  fieldErrors,
}
