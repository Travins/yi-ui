import { z } from "zod"
import type { Auth08Labels } from "./config"

/** 去掉首尾空格，并把 @ 之后的域名转小写（名字部分保持原样） */
function createEmailSchema(labels: Auth08Labels) {
  return z
    .string()
    .trim()
    .min(1, labels.emailRequired)
    .regex(/^[^\s@]+@[^\s@]+\.[^\s@.]{2,}$/, labels.emailError)
    .transform((value) => {
      const at = value.lastIndexOf("@")
      return value.slice(0, at) + value.slice(at).toLowerCase()
    })
}

export { createEmailSchema }
