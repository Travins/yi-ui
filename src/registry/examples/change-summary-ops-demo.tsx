import { Gauge, Megaphone } from "lucide-react"

import {
  ChangeSummary,
  type ChangeSummaryChange,
} from "@/registry/ui/change-summary/change-summary"

const OPS: ChangeSummaryChange[] = [
  { label: "日活用户", change: "上涨 8.4%，至 3.26 万", tone: "good" },
  { label: "转化率", change: "下降 0.6 个百分点，至 4.1%", tone: "bad" },
  { label: "退款率", change: "下降 0.2 个百分点，至 0.9%", tone: "good", direction: "down" },
  { label: "客单价", change: "上涨 2.3%，至 ¥186", tone: "good" },
  { label: "工单数量", change: "与上周持平，共 57 单", tone: "neutral" },
]

const STABILITY: ChangeSummaryChange[] = [
  { label: "可用性", change: "保持在 99.97%", tone: "neutral" },
  { label: "P95 延迟", change: "下降 85 毫秒，至 410 毫秒", tone: "good", direction: "down" },
  { label: "5xx 错误", change: "增加 12 次，共 31 次", tone: "bad", direction: "up" },
]

// 好坏和方向分开：退款率、延迟下降是好事（good + down），转化率下降、5xx 增加是坏事
export default function ChangeSummaryOpsDemo() {
  return (
    <div className="grid w-full max-w-3xl items-start gap-3 sm:grid-cols-2">
      <ChangeSummary icon={<Megaphone />} title="本周运营" period="本周" changes={OPS} />
      <ChangeSummary icon={<Gauge />} title="服务稳定性" period="近 7 天" changes={STABILITY} />
    </div>
  )
}
