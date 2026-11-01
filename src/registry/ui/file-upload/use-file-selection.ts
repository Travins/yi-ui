"use client"
import * as React from "react"
import { DEFAULT_LABELS } from "./config"
import type { FileUploadProps } from "./types"
import {
  describeAccept,
  formatFileSize,
  interpolate,
  validateFiles,
} from "./utils"
function useFileSelection({
  accept,
  maxSize = Infinity,
  maxFiles = Infinity,
  multiple = true,
  replace = !multiple || maxFiles === 1,
  labels: overrides,
  onReject,
}: FileUploadProps) {
  const replacing = replace && (!multiple || maxFiles === 1)
  const labels = { ...DEFAULT_LABELS, ...overrides }
  const [message, setMessage] = React.useState("")
  const input = React.useRef<HTMLInputElement>(null)
  const camera = React.useRef<HTMLInputElement>(null)
  function select(files: File[], count: number) {
    const result = validateFiles(
      files,
      accept,
      maxSize,
      Math.max(0, Math.min(maxFiles, multiple ? Infinity : 1) - (replacing ? 0 : count)),
    )
    setMessage(
      result.rejected
        .map(({ file, reason }) =>
          interpolate(
            reason === "type"
              ? labels.typeError
              : reason === "size"
                ? labels.sizeError
                : labels.countError,
            {
              name: file.name,
              accept: accept ? describeAccept(accept) : labels.any,
              size: formatFileSize(maxSize),
              count: multiple ? maxFiles : 1,
            },
          ),
        )
        .filter((v, i, all) => all.indexOf(v) === i)
        .join("；"),
    )
    if (result.rejected.length) onReject?.(result.rejected)
    return result.accepted
  }
  return { replacing, labels, message, clear: () => setMessage(""), input, camera, select }
}
function useFileUploadReset(
  input: React.RefObject<HTMLInputElement | null>,
  onReset: () => void,
) {
  const callback = React.useEffectEvent(onReset)
  React.useEffect(() => {
    const form = input.current?.form
    function reset(event: Event) {
      queueMicrotask(() => {
        if (!event.defaultPrevented) callback()
      })
    }
    form?.addEventListener("reset", reset)
    return () => form?.removeEventListener("reset", reset)
  }, [input])
}
export { useFileSelection, useFileUploadReset }
