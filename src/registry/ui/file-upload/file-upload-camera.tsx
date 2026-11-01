"use client"
import * as React from "react"
import { Dialog } from "@base-ui/react/dialog"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { FileUploadPreview, IdCardFrontIllustration } from "./file-upload-parts"
import type { FileUploadLabels } from "./config"

// 相机实时画面需固定黑白对比。
// registry-lint-disable-next-line no-hardcoded-color
const cameraClass =
  "fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-black text-white outline-none"
// registry-lint-disable-next-line no-hardcoded-color
const actionsClass =
  "absolute inset-x-0 bottom-0 z-10 grid grid-cols-[1fr_auto_1fr] items-center gap-3 bg-black/60 px-4 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
// registry-lint-disable-next-line no-hardcoded-color
const ghostClass = "text-white hover:bg-white/10 hover:text-white"
// registry-lint-disable-next-line no-hardcoded-color
const outlineClass =
  "border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
// registry-lint-disable-next-line no-hardcoded-color
const primaryClass = "bg-white text-black hover:bg-white/90"
// registry-lint-disable-next-line no-hardcoded-color
const shutterClass =
  "grid size-16 place-items-center rounded-full border-4 border-white outline-none focus-visible:ring-3 focus-visible:ring-white/60 disabled:opacity-50 [&>span]:transition-transform active:[&>span]:scale-90 motion-reduce:[&>span]:transition-none"
// registry-lint-disable-next-line no-hardcoded-color
const shutterDotClass = "size-12 rounded-full bg-white"
function FileUploadCamera({
  label,
  labels,
  placeholder,
  onClose,
  onSelect,
  onAlbum,
  onError,
}: {
  label: string
  labels: FileUploadLabels
  placeholder?: React.ReactNode
  onClose: () => void
  onSelect: (file: File) => void
  onAlbum: () => void
  onError: () => void
}) {
  const video = React.useRef<HTMLVideoElement>(null)
  const frame = React.useRef<HTMLDivElement>(null)
  const [photo, setPhoto] = React.useState<File | null>(null)
  const [ready, setReady] = React.useState(false)
  const fail = React.useEffectEvent(onError)
  const close = React.useEffectEvent(onClose)
  React.useEffect(() => {
    if (photo) return
    let disposed = false
    let stream: MediaStream | undefined
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" }, audio: false })
      .then(async (next) => {
        if (disposed) {
          for (const track of next.getTracks()) track.stop()
          return
        }
        stream = next
        if (video.current) {
          video.current.srcObject = next
          await video.current.play()
          setReady(true)
        }
      })
      .catch(() => {
        if (!disposed) fail()
      })
    function hidden() {
      if (document.hidden) close()
    }
    document.addEventListener("visibilitychange", hidden)
    return () => {
      disposed = true
      for (const track of stream?.getTracks() ?? []) track.stop()
      document.removeEventListener("visibilitychange", hidden)
    }
  }, [photo])
  async function shoot() {
    const source = video.current
    const target = frame.current
    if (!source || !target || !source.videoWidth) return
    try {
      const view = source.getBoundingClientRect()
      const crop = target.getBoundingClientRect()
      const scale = Math.max(
        view.width / source.videoWidth,
        view.height / source.videoHeight,
      )
      const x =
        (crop.left - view.left + (source.videoWidth * scale - view.width) / 2) /
        scale
      const y =
        (crop.top - view.top + (source.videoHeight * scale - view.height) / 2) /
        scale
      const canvas = document.createElement("canvas")
      canvas.width = Math.round(crop.width / scale)
      canvas.height = Math.round(crop.height / scale)
      const context = canvas.getContext("2d")
      if (!context) throw new Error()
      context.drawImage(
        source,
        x,
        y,
        crop.width / scale,
        crop.height / scale,
        0,
        0,
        canvas.width,
        canvas.height,
      )
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.9),
      )
      if (!blob) throw new Error()
      setReady(false)
      setPhoto(new File([blob], `${label}.jpg`, { type: "image/jpeg" }))
    } catch {
      onError()
    }
  }
  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-background" />
        {/* 相机画面需要固定黑白对比，避免主题色在实时画面上不可读。 */}
        <Dialog.Popup
          data-slot="file-upload-camera-dialog"
          className={cameraClass}
        >
          {!photo && (
            <video
              ref={video}
              muted
              playsInline
              className="absolute inset-0 size-full object-cover"
            />
          )}
          <div className="relative z-20 mb-6 w-[86%] text-center">
            <Dialog.Title className="text-base font-medium">
              {photo
                ? labels.cameraConfirm
                : labels.cameraAlign.replace("{label}", label)}
            </Dialog.Title>
            <Dialog.Description className="mt-2 text-sm">
              {labels.cameraLight}
            </Dialog.Description>
          </div>
          <div
            ref={frame}
            className="relative z-10 aspect-[85.6/54] w-[86%] rounded-xl"
          >
            {photo ? (
              <FileUploadPreview file={photo} className="rounded-xl" />
            ) : (
              <>
                <div className="absolute inset-0 rounded-xl shadow-[0_0_0_100vmax_rgb(0_0_0/0.6)]" />
                <div className="absolute inset-0 overflow-hidden rounded-xl opacity-30 [&>svg]:size-full [&>svg]:text-inherit">
                  {placeholder ?? <IdCardFrontIllustration />}
                </div>
                {[
                  "top-0 left-0 border-t-4 border-l-4 rounded-tl-xl",
                  "top-0 right-0 border-t-4 border-r-4 rounded-tr-xl",
                  "bottom-0 left-0 border-b-4 border-l-4 rounded-bl-xl",
                  "bottom-0 right-0 border-b-4 border-r-4 rounded-br-xl",
                ].map((corner) => (
                  <span
                    key={corner}
                    className={`absolute size-7 border-current ${corner}`}
                  />
                ))}
              </>
            )}
          </div>
          <div className={actionsClass}>
            {photo ? (
              // 确认页两个按钮等宽并排，占满三列
              <div className="col-span-3 flex gap-3">
                <Button
                  size="lg"
                  variant="outline"
                  className={cn("flex-1", outlineClass)}
                  onClick={() => setPhoto(null)}
                >
                  {labels.replace}
                </Button>
                <Button
                  size="lg"
                  className={cn("flex-1", primaryClass)}
                  onClick={() => onSelect(photo)}
                >
                  {labels.cameraUse}
                </Button>
              </div>
            ) : (
              <>
                <Button
                  size="lg"
                  variant="ghost"
                  className={cn("justify-self-start", ghostClass)}
                  onClick={onClose}
                >
                  {labels.cameraCancel}
                </Button>
                {/* 快门是相机界面的专用控件，沿用系统相机的 64px 圆形外观，不走 Button 的三档高度 */}
                <button
                  type="button"
                  data-slot="file-upload-camera-shutter"
                  aria-label={labels.cameraShoot}
                  disabled={!ready}
                  onClick={() => void shoot()}
                  className={shutterClass}
                >
                  <span aria-hidden="true" className={shutterDotClass} />
                </button>
                <Button
                  size="lg"
                  variant="ghost"
                  className={cn("justify-self-end", ghostClass)}
                  onClick={onAlbum}
                >
                  {labels.album}
                </Button>
              </>
            )}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
export { FileUploadCamera }
