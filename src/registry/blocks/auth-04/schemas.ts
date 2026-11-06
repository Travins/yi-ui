import { z } from "zod"
import type { Auth04Labels } from "./config"

function createEmailSchema(labels: Auth04Labels) {
  return z
    .string()
    .trim()
    .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, labels.emailError)
}

function createSlugSchema(labels: Auth04Labels) {
  return z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9][a-z0-9-]*$/, labels.orgError)
}

export { createEmailSchema, createSlugSchema }
