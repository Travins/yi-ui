/**
 * 验收脚本共用：对 `pnpm build` 的产物起一个临时的 `next start`，返回地址与关闭函数。
 * 站点部署在 Vercel 的 Next.js 运行时上，验收也用同一种方式访问，而不是读静态文件。
 */
import { spawn } from "node:child_process"
import { existsSync } from "node:fs"
import { createServer } from "node:net"

/** 只监听本机回环地址：开发机可能没有防火墙，验收用的临时服务不能暴露到其他网卡 */
const HOST = "127.0.0.1"

/** 先用 0 号端口向系统要一个空闲端口，再交给 next start */
function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const probe = createServer()
    probe.once("error", reject)
    probe.listen(0, HOST, () => {
      const address = probe.address()
      const port = typeof address === "object" && address ? address.port : 0
      probe.close(() => resolve(port))
    })
  })
}

export async function startNextServer(): Promise<{
  base: string
  close: () => void
}> {
  if (!existsSync(".next/BUILD_ID")) {
    throw new Error("没有找到构建产物 .next/，先运行 pnpm build")
  }
  const port = await freePort()
  const child = spawn("pnpm", ["exec", "next", "start", "-H", HOST, "-p", String(port)], {
    stdio: ["ignore", "ignore", "inherit"],
  })
  const base = `http://${HOST}:${port}`
  const close = () => {
    child.kill()
  }
  // 最多等 30 秒，首页能返回 200 即视为就绪
  for (let attempt = 0; attempt < 60; attempt++) {
    if (child.exitCode !== null) throw new Error("next start 启动失败")
    try {
      const response = await fetch(`${base}/`)
      if (response.ok) return { base, close }
    } catch {
      // 服务还没起来，继续等
    }
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  close()
  throw new Error("next start 30 秒内没有就绪")
}
