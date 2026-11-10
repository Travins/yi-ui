import { getSourceList } from "./source-files"
import { SourceFile } from "./source-file"

/** 条目的源码文件列表。页面里只有路径和行数，展开某个文件时才加载高亮源码。 */
export async function ComponentSource({ name }: { name: string }) {
  const files = await getSourceList(name)
  return files.map(({ path, lines }) => (
    <SourceFile key={path} name={name} path={path} lines={lines} />
  ))
}
