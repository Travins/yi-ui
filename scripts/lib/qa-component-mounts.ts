/**
 * 安装验收用的挂载页：`registry:component` 条目是区块的部件，没有自己的示例页，
 * 验收时在使用方项目里写一个页面把它真正渲染出来。`importFrom` 是安装后该文件的导入路径。
 */
const MOUNTS: Record<
  string,
  { file: string; page: (importFrom: string) => string }
> = {
  "auth-05-panel": {
    file: "auth-05/auth-05-panel",
    page: (importFrom) =>
      [
        '"use client"',
        `import { Auth05Panel } from "${importFrom}"`,
        "export default function Page() {",
        "  return (",
        '    <main className="mx-auto max-w-sm p-6">',
        "      <Auth05Panel",
        '        account={{ username: "lin_qinghe" }}',
        '        methods={["totp", "recovery"]}',
        "        showRememberDevice={false}",
        '        recoveryCode={{ format: false, uppercase: true, maxLength: 9, placeholder: "XXXX-XXXX" }}',
        "        onVerify={async () => {}}",
        "      />",
        "    </main>",
        "  )",
        "}",
        "",
      ].join("\n"),
  },
}

/** 条目有挂载页时返回页面源码；`importBase` 是组件目录的导入前缀（不带末尾斜杠）。 */
export function componentMountPage(name: string, importBase: string) {
  const mount = MOUNTS[name]
  return mount ? mount.page(`${importBase}/${mount.file}`) : null
}
