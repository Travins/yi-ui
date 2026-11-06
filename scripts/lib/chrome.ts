/**
 * 验收脚本共用：找本机可用的 Chrome 可执行文件。
 * 项目没有下载 Playwright 自带的浏览器，所以按固定顺序找：CHROME_PATH，然后是 macOS 与 Linux 的常见安装位置。
 */
import { existsSync } from "node:fs"

/** macOS 的默认安装位置；Linux 开发机靠下面的 google-chrome / chromium 候选 */
const MAC_CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

/** 按优先级排列的候选路径，第一个存在的即为结果 */
const CANDIDATES = [
  MAC_CHROME,
  "/usr/local/bin/google-chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
]

/**
 * 返回 Chrome 可执行文件路径；都找不到时抛错，提示用 CHROME_PATH 指定。
 * 每次调用都重新查找，脚本里可以放心在函数内使用。
 */
export function chromePath(): string {
  const override = process.env.CHROME_PATH
  const candidates = override ? [override, ...CANDIDATES] : CANDIDATES
  const found = candidates.find((candidate) => existsSync(candidate))
  if (!found)
    throw new Error(
      `没有找到 Chrome：设置 CHROME_PATH 指向 Chrome 可执行文件（已检查 ${candidates.join("、")}）`,
    )
  return found
}
