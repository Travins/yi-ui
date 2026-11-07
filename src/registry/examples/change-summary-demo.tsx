import { Activity } from "lucide-react"

import {
  ChangeSummary,
  type ChangeSummaryChange,
} from "@/registry/ui/change-summary/change-summary"

const CHANGES: ChangeSummaryChange[] = [
  { label: "访问量", change: "上涨 6.1%，至 1.82 万", tone: "good" },
  { label: "错误率", change: "下降 0.3 个百分点，至 1.2%", tone: "good", direction: "down" },
  { label: "平均响应时间", change: "上升 40 毫秒，至 320 毫秒", tone: "bad", direction: "up" },
  { label: "新增注册", change: "与上周持平，共 214 人", tone: "neutral" },
]

// 默认示例：后台首页的「本周变化」，一个 changes 数组就够
export default function ChangeSummaryDemo() {
  return (
    <ChangeSummary
      className="max-w-md"
      icon={<Activity />}
      title="本周变化"
      period="本周"
      changes={CHANGES}
    />
  )
}
