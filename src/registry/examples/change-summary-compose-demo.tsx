import { Sparkles } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  ChangeSummary,
  ChangeSummaryHeader,
  ChangeSummaryIcon,
  ChangeSummaryItem,
  ChangeSummaryList,
  ChangeSummaryPeriod,
  ChangeSummaryTitle,
} from "@/registry/ui/change-summary/change-summary"

const LABELS = {
  up: "Up",
  down: "Down",
  flat: "Flat",
  good: "improved",
  bad: "worsened",
  neutral: "neutral",
  mark: "{direction}, {tone}: ",
}

// 组合写法：头部里放自己的徽标，文案整体换成英文
export default function ChangeSummaryComposeDemo() {
  return (
    <ChangeSummary className="max-w-md">
      <ChangeSummaryHeader>
        <ChangeSummaryIcon>
          <Sparkles />
        </ChangeSummaryIcon>
        <ChangeSummaryTitle>Release 2.4 changes</ChangeSummaryTitle>
        <Badge variant="secondary">new</Badge>
        <ChangeSummaryPeriod>vs 2.3</ChangeSummaryPeriod>
      </ChangeSummaryHeader>
      <ChangeSummaryList>
        <ChangeSummaryItem labels={LABELS} label="Bundle size" change="Down 12 KB, to 182 KB" tone="good" direction="down" />
        <ChangeSummaryItem labels={LABELS} label="Build time" change="Up 4 s, to 38 s" tone="bad" direction="up" />
        <ChangeSummaryItem labels={LABELS} label="Test coverage" change="Unchanged at 87%" tone="neutral" />
      </ChangeSummaryList>
    </ChangeSummary>
  )
}
