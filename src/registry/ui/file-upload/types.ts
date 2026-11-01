import type * as React from "react"
import type { FileUploadLabels } from "./config"
type FileUploadItem = {
  id: string
  file: File
  status?: "pending" | "uploading" | "error" | "done"
  progress?: number
  error?: string
}
type FileUploadRejection = { file: File; reason: "type" | "size" | "count" }
type FileUploadCommonProps = Omit<
  React.ComponentProps<"div">,
  "defaultValue" | "onChange"
> & {
  /** MIME 或扩展名列表，逗号分隔。@default undefined */
  accept?: string
  /** 单文件大小上限，字节。@default Infinity */
  maxSize?: number
  /** 手机拍照方向；false 隐藏拍照。@default "environment" */
  capture?: "user" | "environment" | false
  /** 整体错误提示。 */
  error?: React.ReactNode
  /** @default false */
  disabled?: boolean
  labels?: Partial<FileUploadLabels>
  onReject?: (rejections: FileUploadRejection[]) => void
}
type FileUploadProps = FileUploadCommonProps & {
  value?: FileUploadItem[]
  /** @default [] */
  defaultValue?: FileUploadItem[]
  onValueChange?: (value: FileUploadItem[]) => void
  /** 总文件数上限。@default Infinity */
  maxFiles?: number
  /** @default true */
  multiple?: boolean
  /**
   * 单文件模式下，新文件通过校验后直接替换旧文件；多文件模式忽略
   * @default 单文件模式（`multiple={false}` 或 `maxFiles={1}`）时为 true
   */
  replace?: boolean
  /** 传入后，上传失败的条目右侧出现「重试」按钮；重新上传由使用方完成 */
  onRetry?: (item: FileUploadItem) => void
}
type FileUploadSlotProps = FileUploadCommonProps & {
  /** 触屏安全上下文中启用证件取景；false 始终走原生输入。@default "id-card" */
  viewfinder?: "id-card" | false
  /** 点击失败槽位的重试按钮，由使用方更新上传状态。 */
  onRetry?: (item: FileUploadItem) => void
  label: string
  placeholder?: React.ReactNode
  value?: FileUploadItem | null
  /** @default null */
  defaultValue?: FileUploadItem | null
  onValueChange?: (value: FileUploadItem | null) => void
}
export type {
  FileUploadItem,
  FileUploadRejection,
  FileUploadProps,
  FileUploadSlotProps,
}
