"use client"
import { Pipette } from "lucide-react"
import { Button } from "@/components/ui/button"
import { BarField } from "@/registry/ui/bar-field/bar-field"
import {
  parseHex,
  hsvToRgb,
  hsvToHsl,
  hslToHsv,
  rgbToHsv,
  type HSV,
} from "@/registry/lib/color"
import {
  ColorArea,
  ColorHueSlider,
  ColorAlphaSlider,
  ColorSwatch,
} from "./color-parts"
import type { ColorPickerLabels } from "./color-picker"
type PanelProps = {
  locked: boolean
  presets: string[]
  hsv: HSV
  hex: string
  alpha: boolean
  labels: ColorPickerLabels
  format: "HEX" | "RGB" | "HSL"
  setFormat: (value: "HEX" | "RGB" | "HSL") => void
  draft: string | null
  setDraft: (value: string) => void
  invalid: boolean
  submit: (value: string) => void
  change: (value: HSV, commit?: boolean) => void
  onValueCommit?: (value: string) => void
  eye: boolean
  coarse: boolean
  setSheetOpen: (value: boolean) => void
}
function ColorPickerPanel({
  locked,
  presets,
  hsv,
  hex,
  alpha,
  labels,
  format,
  setFormat,
  draft,
  setDraft,
  invalid,
  submit,
  change,
  onValueCommit,
  eye,
  coarse,
  setSheetOpen,
}: PanelProps) {
  const rgb = hsvToRgb(hsv),
    hsl = hsvToHsl(hsv)
  const channels =
    format === "RGB"
      ? [
          { label: labels.red, key: "r", value: rgb.r },
          { label: labels.green, key: "g", value: rgb.g },
          { label: labels.blue, key: "b", value: rgb.b },
        ]
      : [
          { label: labels.hue, key: "h", value: hsl.h },
          { label: labels.saturation, key: "s", value: hsl.s * 100 },
          { label: labels.lightness, key: "l", value: hsl.l * 100 },
        ]
  return (
    <div
      inert={locked}
      data-slot="color-picker-panel"
      className="flex flex-col gap-2 p-2"
    >
      <ColorArea
        value={hsv}
        onValueChange={change}
        onValueCommit={(v) => change(v, true)}
        labels={labels}
      />
      <ColorHueSlider
        value={hsv.h}
        label={labels.hue}
        onValueChange={(h) => change({ ...hsv, h })}
        onValueCommit={(h) => change({ ...hsv, h }, true)}
      />
      {alpha && (
        <ColorAlphaSlider
          color={hsv}
          value={hsv.a}
          label={labels.alpha}
          onValueChange={(a) => change({ ...hsv, a })}
          onValueCommit={(a) => change({ ...hsv, a }, true)}
        />
      )}
      <div className="flex gap-1" role="group" aria-label={labels.format}>
        {(["HEX", "RGB", "HSL"] as const).map((f) => (
          <Button
            key={f}
            type="button"
            size="lg"
            variant={format === f ? "secondary" : "ghost"}
            aria-pressed={format === f}
            onClick={() => setFormat(f)}
          >
            {f}
          </Button>
        ))}
      </div>
      {format === "HEX" ? (
        <BarField
          aria-label="HEX"
          value={draft ?? hex}
          onValueChange={setDraft}
          error={invalid ? labels.invalid : undefined}
          onBlur={() => {
            if (draft !== null) submit(draft)
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              submit(draft ?? hex)
            }
          }}
        />
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {channels.map(({ label: c, key, value }, i) => (
            <BarField
              key={`${format}-${c}`}
              label={c}
              type="number"
              min={0}
              max={format === "RGB" ? 255 : i === 0 ? 360 : 100}
              value={String(Math.round(value))}
              onValueChange={(text) => {
                const n = Number(text)
                if (!Number.isFinite(n)) return
                if (format === "RGB") {
                  const next = {
                    ...rgb,
                    [key]: Math.min(255, Math.max(0, n)),
                  }
                  change(rgbToHsv(next, hsv.h))
                } else {
                  change(
                    hslToHsv({
                      ...hsl,
                      [key]:
                        Math.min(i === 0 ? 360 : 100, Math.max(0, n)) /
                        (i === 0 ? 1 : 100),
                    }),
                  )
                }
              }}
              onBlur={() => onValueCommit?.(hex)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  onValueCommit?.(hex)
                }
              }}
            />
          ))}
        </div>
      )}
      {presets.length > 0 && (
        <div
          role="group"
          aria-label={labels.presets}
          className="flex flex-wrap gap-1"
        >
          {presets
            .filter((c) => parseHex(c, { alpha }))
            .map((c) => (
              <Button
                key={c}
                type="button"
                variant="ghost"
                size="icon-lg"
                aria-label={c}
                onClick={() => submit(c)}
              >
                <ColorSwatch color={c} />
              </Button>
            ))}
        </div>
      )}
      {eye && (
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={() => {
            const Constructor = (
              window as unknown as {
                EyeDropper: new () => {
                  open: () => Promise<{ sRGBHex: string }>
                }
              }
            ).EyeDropper
            new Constructor()
              .open()
              .then((result) => submit(result.sRGBHex))
              .catch(() => {})
          }}
        >
          <Pipette aria-hidden />
          {labels.eyeDropper}
        </Button>
      )}
      {coarse && (
        <Button type="button" size="lg" onClick={() => setSheetOpen(false)}>
          {labels.done}
        </Button>
      )}
    </div>
  )
}
export { ColorPickerPanel }
