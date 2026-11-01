import { DEFAULT_STORAGE_KEY } from "./config"

type AppShellScriptProps = {
  /** 与 AppShell 的 `storageKey` 保持一致 */
  storageKey?: string
}

/**
 * 首帧脚本：在浏览器解析 HTML 时（早于首次绘制与水合）读取 localStorage，
 * 把折叠状态写到所在元素（AppShell 根元素）的 `data-collapsed`，
 * 侧栏宽度、图标栏等样式据此在水合前就是正确状态，刷新不再闪烁。
 * 没有本地记录时不动，保持服务端渲染的 `defaultCollapsed`。
 *
 * 必须作为 AppShell 根元素的子节点渲染（AppShell 已自动放好），
 * 脚本通过 `document.currentScript.parentElement` 找到根元素。
 */
function AppShellScript({
  storageKey = DEFAULT_STORAGE_KEY,
}: AppShellScriptProps) {
  // 键里的 "<" 转义，防止提前闭合 <script>
  const key = JSON.stringify(storageKey).replace(/</g, "\\u003c")
  const html = `(function(){try{var v=localStorage.getItem(${key});if(v===null&&${key}===${JSON.stringify(DEFAULT_STORAGE_KEY)}){var old="travinsy:app-shell:collapsed";v=localStorage.getItem(old);if(v!==null){localStorage.setItem(${key},v);localStorage.removeItem(old)}}if(v===null)return;var e=document.currentScript.parentElement;if(v==="1")e.setAttribute("data-collapsed","");else e.removeAttribute("data-collapsed")}catch(_){}})()`

  return (
    <script
      data-slot="app-shell-script"
      // 服务端输出可执行脚本；客户端渲染（路由跳转进来）时改为 text/plain，
      // 避免 React 对 <script> 的开发警告——此时 React 自己按 localStorage 渲染，无需脚本
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

export { AppShellScript }
export type { AppShellScriptProps }
