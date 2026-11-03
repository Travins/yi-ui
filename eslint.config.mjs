import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // 本地验收的临时脚本和报告，不入库
    ".qa/**",
    // 第三方技能的原样副本，不按本仓库的规则检查
    ".agents/**",
    ".claude/**",
    ".pi/**",
  ]),
]);

export default eslintConfig;
