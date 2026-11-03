"use client"

import * as React from "react"
import {
  Annoyed,
  Frown,
  Laugh,
  Meh,
  Smile,
  type LucideIcon,
} from "lucide-react"

import { ValueSlider } from "@/registry/ui/value-slider/value-slider"

type Mood = {
  label: string
  tone: "rose" | "amber" | "primary" | "green"
  icon: LucideIcon
}

/** 1 到 5 五档：读数与读屏文本都取这里的词 */
const MOODS = [
  { label: "很差", tone: "rose", icon: Frown },
  { label: "不太好", tone: "rose", icon: Annoyed },
  { label: "一般", tone: "amber", icon: Meh },
  { label: "不错", tone: "primary", icon: Smile },
  { label: "很棒", tone: "green", icon: Laugh },
] as const satisfies readonly Mood[]

/** 内置色调名换成变量，图标与滑块用同一个颜色 */
const TONE_COLORS: Record<Mood["tone"], string> = {
  rose: "var(--flow-rose)",
  amber: "var(--flow-amber)",
  primary: "var(--primary)",
  green: "var(--flow-green)",
}

function moodOf(value: number) {
  return (
    MOODS[Math.min(MOODS.length, Math.max(1, Math.round(value))) - 1] ??
    MOODS[0]
  )
}

function moodLabel(value: number) {
  return moodOf(value).label
}

/** 分值即词语：formatValue 同时决定右侧读数与 aria-valuetext */
export default function ValueSliderMoodDemo() {
  const [score, setScore] = React.useState(4)
  const mood = moodOf(score)
  const MoodIcon = mood.icon
  return (
    <div
      className="w-full max-w-xs rounded-xl border border-edge bg-background p-4 shadow-xs"
      style={{ "--flow-tone": TONE_COLORS[mood.tone] } as React.CSSProperties}
    >
      <div className="flex items-center gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-(--flow-tone)/12 text-(--flow-tone)">
          <MoodIcon className="size-6" aria-hidden="true" />
        </span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="text-sm font-medium">今天感觉如何？</p>
          <p className="text-xs text-muted-foreground">
            {mood.label} · 1 到 5 共五档
          </p>
        </div>
      </div>
      <div className="mt-4">
        <ValueSlider
          label="心情"
          min={1}
          max={5}
          step={1}
          largeStep={1}
          ticks={4}
          value={score}
          onValueChange={setScore}
          formatValue={moodLabel}
          tone={mood.tone}
        />
      </div>
    </div>
  )
}
