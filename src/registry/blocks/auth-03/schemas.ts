import { z } from "zod"
import type { Auth03Labels } from "./config"
function createPhoneSchema(labels: Auth03Labels) {
  return z.string().regex(/^1[3-9]\d{9}$/, labels.phoneError)
}
export { createPhoneSchema }
