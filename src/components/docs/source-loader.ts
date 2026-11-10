/** /code/<name>.json 里的一个文件：安装路径、原文（供复制）与高亮后的 HTML */
export type LoadedSource = {
  path: string
  source: string
  lines: number
  html: string
  /** 文件太长时只高亮开头的行数；原文仍是全文 */
  shown?: number
}

const pending = new Map<string, Promise<LoadedSource[]>>()
const loaded = new Map<string, LoadedSource[]>()

/** 已经加载过的源码，没有就是 undefined；同步读取，复制按钮用它避免等待。 */
export const loadedSources = (name: string) => loaded.get(name)

/**
 * 按条目名加载高亮源码。同一个条目在一页里只请求一次（查看器、手动安装、源码列表共用），
 * 失败后清掉缓存，下次调用会重新请求。
 */
export function loadSources(name: string) {
  let request = pending.get(name)
  if (!request) {
    request = fetch(`/code/${name}.json`)
      .then((response) => {
        if (!response.ok) throw new Error(String(response.status))
        return response.json() as Promise<LoadedSource[]>
      })
      .then((files) => {
        loaded.set(name, files)
        return files
      })
      .catch((error) => {
        pending.delete(name)
        throw error
      })
    pending.set(name, request)
  }
  return request
}
