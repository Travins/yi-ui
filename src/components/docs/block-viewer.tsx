import { getSourceList } from "./source-files"
import { BlockViewerClient } from "./block-viewer-client"
import { InstallCommand } from "./install-command"
import { getRegistryItem } from "./registry-items"

/**
 * 区块 / 页面查看器：iframe 预览（可切换设备宽度）+ 多文件代码 + 安装命令。
 * 页面里只带文件列表；高亮后的源码在构建时生成为 /code/<name>.json，第一次打开「代码」时才请求，
 * 这样列表页不必为十几个区块的全部源码付出体积。文件内容与发布的 JSON 同源。
 */
export async function BlockViewer({ name }: { name: string }) {
  const item = getRegistryItem(name)
  const files = await getSourceList(name)
  return (
    <BlockViewerClient
      name={name}
      title={item.title}
      height={item.meta?.iframeHeight ?? "720px"}
      files={files.map(({ path }) => path)}
      install={<InstallCommand name={name} bare />}
    />
  )
}
