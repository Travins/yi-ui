import type { LoadedSource } from "./source-loader"

/** 文件太长、只显示了开头一段时的说明；没有截断就不渲染。 */
export function SourceNote({ file }: { file: LoadedSource }) {
  if (!file.shown) return null
  return (
    <p className="border-t border-edge px-4 py-3 text-[13px] leading-6 text-muted-foreground">
      这个文件共 {file.lines} 行，这里只显示前 {file.shown}{" "}
      行。复制按钮复制的是完整文件。
    </p>
  )
}
