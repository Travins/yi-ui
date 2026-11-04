import assert from "node:assert/strict"
import { test } from "node:test"

import { missingPackages } from "./qa-install-monorepo"

test("缺失的模块分成 npm 包和内部文件", () => {
  const output = [
    "a.tsx(1,1): error TS2307: Cannot find module 'motion/react' or its corresponding type declarations.",
    "b.tsx(1,1): error TS2307: Cannot find module '@tanstack/react-table' or its corresponding type declarations.",
    "c.tsx(1,1): error TS2307: Cannot find module '@/lib/flow-tone' or its corresponding type declarations.",
    "d.tsx(1,1): error TS2307: Cannot find module '@workspace/ui/hooks/use-now' or its corresponding type declarations.",
  ].join("\n")
  assert.deepEqual(missingPackages(output, "@workspace"), {
    packages: ["motion", "@tanstack/react-table"],
    internal: ["@/lib/flow-tone", "@workspace/ui/hooks/use-now"],
  })
})
