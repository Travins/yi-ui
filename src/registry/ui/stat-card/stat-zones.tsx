import * as React from "react"

import { cn } from "@/lib/utils"
import {
  formatStat,
  toneColor,
  type DataTone,
} from "@/registry/lib/data-display"

import { DEFAULT_LABELS, type StatLabels } from "./config"

type StatZone = {
  /** 分区名，如「快」 */
  label: string
  /** 区间，如 `< 50 ms` */
  range: string
  /** 占比，单位是百分点：`62.4` 表示 62.4% */
  share: number
  /** 色条色调，不设置时按顺序取绿 / 蓝 / 琥珀 / 玫红 */
  tone?: DataTone
}

type StatZonesProps = Omit<React.ComponentProps<"div">, "children"> & {
  /** 分区，按从好到差的顺序 */
  zones: StatZone[]
  /** 覆盖表头文案 */
  labels?: Partial<Pick<StatLabels, "zone" | "rangeShare">>
}

const ZONE_TONES: DataTone[] = ["green", "blue", "amber", "rose"]

/** 分区表：每行一根彩色竖条 + 分区名 + 区间 + 占比，适合延迟、响应码这类「落在哪一档」的分布。 */
function StatZones({ className, zones, labels, ...props }: StatZonesProps) {
  const text = { ...DEFAULT_LABELS, ...labels }
  return (
    <div
      data-slot="stat-zones"
      className={cn("flex flex-col text-sm", className)}
      {...props}
    >
      <div className="flex items-center justify-between border-b border-edge pb-2 text-xs text-muted-foreground">
        <span>{text.zone}</span>
        <span>{text.rangeShare}</span>
      </div>
      <ul className="divide-y divide-edge">
        {zones.map((zone, index) => (
          <li
            key={zone.label}
            data-slot="stat-zone"
            className="flex items-center justify-between gap-3 py-2 last:pb-0"
          >
            <span className="flex min-w-0 items-center gap-2.5">
              <span
                aria-hidden="true"
                className="h-5 w-1 shrink-0 rounded-full"
                style={{
                  backgroundColor: toneColor(
                    zone.tone ??
                      ZONE_TONES[index % ZONE_TONES.length] ??
                      "green",
                  ),
                }}
              />
              <span className="truncate">{zone.label}</span>
            </span>
            <span className="flex shrink-0 items-center gap-3 tabular-nums">
              <span className="text-muted-foreground">{zone.range}</span>
              <span className="w-14 text-right font-semibold">
                {formatStat(zone.share, { style: "percent" })}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export { StatZones }
export type { StatZone, StatZonesProps }
