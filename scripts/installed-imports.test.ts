import assert from "node:assert/strict"
import { test } from "node:test"

import registry from "../registry.json"
import {
  installedPath,
  toInstalledImports,
} from "../src/components/docs/installed-imports"

test("文档里展示的导入路径不带 shadcn 的目标占位符", () => {
  for (const item of registry.items) {
    for (const file of item.files) {
      assert.doesNotMatch(installedPath(file), /^@/, file.path)
    }
  }
  assert.equal(
    toInstalledImports(
      'import { NumberStepper } from "@/registry/ui/number-stepper/number-stepper"',
    ),
    'import { NumberStepper } from "@/components/ui/number-stepper/number-stepper"',
  )
})
