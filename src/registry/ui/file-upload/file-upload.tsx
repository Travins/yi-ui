"use client"
import * as React from "react"
import { RotateCw, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Attachment,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentContent,
  AttachmentTitle,
  AttachmentDescription,
  AttachmentActions,
  AttachmentAction,
} from "@/components/ui/attachment"
import { useControllableState } from "@/registry/hooks/use-controllable-state"
import { FileUploadPreview } from "./file-upload-parts"
import type { FileUploadProps } from "./types"
import { useFileSelection, useFileUploadReset } from "./use-file-selection"
import { describeAccept, formatFileSize, interpolate } from "./utils"

function FileUpload({
  value: prop,
  defaultValue = [],
  onValueChange,
  accept,
  maxSize = Infinity,
  maxFiles = Infinity,
  multiple = true,
  replace,
  capture = "environment",
  disabled,
  error,
  labels: overrides,
  onReject,
  onRetry,
  className,
  "aria-describedby": describedBy,
  ...props
}: FileUploadProps) {
  const [items, setItems] = useControllableState({
    prop,
    defaultProp: defaultValue,
    onChange: onValueChange,
  })
  const selection = useFileSelection({
    accept,
    maxSize,
    maxFiles,
    multiple,
    replace,
    labels: overrides,
    onReject,
  })
  const { labels, input, camera, message } = selection
  const [dragging, setDragging] = React.useState(false)
  const depth = React.useRef(0)
  useFileUploadReset(input, () => {
    if (prop === undefined) setItems(defaultValue)
    selection.clear()
  })
  const errorId = React.useId()
  const hintId = React.useId()
  // 被拒文件只在下方出一行说明，不把整个控件标成出错；出错态只跟随外部 error
  const invalid = Boolean(error || props["aria-invalid"])
  function add(files: File[]) {
    if (disabled) return
    const next = selection.select(files, items.length)
    if (next.length) setItems(selection.replacing ? next : [...items, ...next])
  }
  function change(event: React.ChangeEvent<HTMLInputElement>) {
    add(Array.from(event.target.files ?? []))
    event.target.value = ""
  }
  const canCapture =
    capture !== false &&
    (!accept ||
      accept
        .split(",")
        .some((v) => /image\/|\.(jpe?g|png|webp|heic|heif|avif)/i.test(v)))
  return (
    <div
      data-slot="file-upload"
      data-disabled={disabled || undefined}
      className={cn("@container flex min-w-0 flex-col gap-3", className)}
      {...props}
    >
      <input
        data-slot="file-upload-input"
        ref={input}
        type="file"
        className="hidden"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        onChange={change}
      />
      <input
        data-slot="file-upload-camera"
        ref={camera}
        type="file"
        className="hidden"
        accept="image/*"
        capture={capture || undefined}
        disabled={disabled}
        onChange={change}
      />
      {/* biome-ignore lint/a11y/noNoninteractiveElementInteractions: 拖放是指针增强操作，键盘用户通过区域内的原生按钮选择文件。 */}
      <fieldset
        data-slot="file-upload-dropzone"
        aria-label={labels.dropzone}
        data-dragging={dragging || undefined}
        data-invalid={invalid || undefined}
        aria-describedby={[
          describedBy,
          hintId,
          invalid || message ? errorId : null,
        ]
          .filter(Boolean)
          .join(" ")}
        className="flex min-w-0 flex-col items-center gap-3 rounded-xl border border-dashed border-edge bg-muted/40 p-5 data-invalid:border-destructive data-invalid:ring-3 data-invalid:ring-destructive/20 data-[dragging]:border-solid data-[dragging]:bg-background dark:data-invalid:ring-destructive/40"
        onDragEnter={(event) => {
          event.preventDefault()
          if (!disabled) {
            depth.current++
            setDragging(true)
          }
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={() => {
          depth.current--
          if (depth.current <= 0) setDragging(false)
        }}
        onDrop={(event) => {
          event.preventDefault()
          depth.current = 0
          setDragging(false)
          add(Array.from(event.dataTransfer.files))
        }}
      >
        <div className="flex flex-wrap items-center justify-center gap-2 pointer-coarse:hidden">
          <span className="text-sm text-muted-foreground">{labels.drop}</span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={disabled}
            aria-invalid={invalid || undefined}
            aria-describedby={invalid || message ? errorId : undefined}
            onClick={() => input.current?.click()}
          >
            {labels.choose}
          </Button>
        </div>
        <div className="hidden w-full gap-2 pointer-coarse:flex">
          {canCapture && (
            <Button
              type="button"
              size="lg"
              variant="outline"
              className="min-w-0 flex-1"
              disabled={disabled}
              onClick={() => camera.current?.click()}
            >
              {labels.camera}
            </Button>
          )}
          <Button
            type="button"
            size="lg"
            variant="outline"
            className="min-w-0 flex-1"
            disabled={disabled}
            onClick={() => input.current?.click()}
          >
            {labels.album}
          </Button>
        </div>
        <p id={hintId} className="text-center text-xs text-muted-foreground">
          {interpolate(labels.hint, {
            accept: accept ? describeAccept(accept) : labels.any,
            size: Number.isFinite(maxSize)
              ? formatFileSize(maxSize)
              : labels.unlimited,
          })}
        </p>
      </fieldset>
      {items.length > 0 && (
        <AttachmentGroup className="flex-col overflow-visible">
          {items.map((item) => (
            <Attachment
              key={item.id}
              state={
                !item.status || item.status === "pending" ? "idle" : item.status
              }
              className="w-full flex-nowrap focus-within:ring-0"
            >
              <AttachmentMedia variant="image">
                <FileUploadPreview file={item.file} />
              </AttachmentMedia>
              <AttachmentContent>
                <AttachmentTitle title={item.file.name}>
                  {item.file.name}
                </AttachmentTitle>
                <AttachmentDescription className="font-mono">
                  {formatFileSize(item.file.size)}
                </AttachmentDescription>
                {item.status === "uploading" && item.progress !== undefined && (
                  <div
                    data-slot="file-upload-progress"
                    aria-hidden="true"
                    className="mt-1 h-1 overflow-hidden rounded-full bg-muted"
                  >
                    <div
                      className="h-full rounded-full bg-primary transition-[width] duration-200 motion-reduce:transition-none"
                      style={{
                        width: `${Math.max(0, Math.min(100, item.progress))}%`,
                      }}
                    />
                  </div>
                )}
                {item.error && (
                  <p className="text-xs text-destructive">{item.error}</p>
                )}
              </AttachmentContent>
              <AttachmentActions>
                <span className="text-xs text-muted-foreground">
                  {labels[item.status ?? "pending"]}
                  {item.status === "uploading" && item.progress !== undefined
                    ? ` ${Math.round(Math.max(0, Math.min(100, item.progress)))}%`
                    : ""}
                </span>
                {item.status === "error" && onRetry && (
                  <AttachmentAction
                    type="button"
                    size="icon-sm"
                    disabled={disabled}
                    aria-label={interpolate(labels.retry, {
                      name: item.file.name,
                    })}
                    onClick={() => onRetry(item)}
                  >
                    <RotateCw aria-hidden="true" />
                  </AttachmentAction>
                )}
                <AttachmentAction
                  type="button"
                  size="icon-sm"
                  disabled={disabled}
                  aria-label={interpolate(labels.remove, {
                    name: item.file.name,
                  })}
                  onClick={() => {
                    setItems(items.filter((v) => v.id !== item.id))
                    selection.clear()
                  }}
                >
                  <X aria-hidden="true" />
                </AttachmentAction>
              </AttachmentActions>
            </Attachment>
          ))}
        </AttachmentGroup>
      )}
      <div
        data-slot="file-upload-error"
        id={errorId}
        aria-live="polite"
        className="text-xs text-destructive"
      >
        {error || message}
      </div>
    </div>
  )
}
export { FileUpload }
export { FileUploadSlot } from "./file-upload-slot"
export {
  IdCardFrontIllustration,
  IdCardBackIllustration,
} from "./file-upload-parts"
export { appendFiles } from "./utils"
export type {
  FileUploadItem,
  FileUploadProps,
  FileUploadSlotProps,
  FileUploadRejection,
} from "./types"
export type { FileUploadLabels } from "./config"
