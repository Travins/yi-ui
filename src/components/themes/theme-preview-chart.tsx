"use client"

import {
  ChartCard,
  ChartCardHeader,
  ChartCardTitle,
  ChartCardDescription,
  ChartCardContent,
  ChartSeries,
} from "@/registry/ui/chart-card/chart-card"

/**
 * 中性、石色这类灰阶主题的 chart-1~5 是由浅到深的渐变：亮色下 chart-1、暗色下 chart-5 几乎贴着底色，
 * 堆叠时那一段会像消失了一样。所以只取四档：亮色用 chart-2~5，暗色用 chart-1~4，彩色主题同样适用。
 */
const SERIES = ["文档", "组件", "博客", "页面"].map((label, index) => ({
  key: `s${index}`,
  label,
  tone: `var(--theme-preview-chart-${index + 1})`,
}))
const CHART_TONES =
  "[--theme-preview-chart-1:var(--chart-2)] [--theme-preview-chart-2:var(--chart-3)] [--theme-preview-chart-3:var(--chart-4)] [--theme-preview-chart-4:var(--chart-5)] dark:[--theme-preview-chart-1:var(--chart-1)] dark:[--theme-preview-chart-2:var(--chart-2)] dark:[--theme-preview-chart-3:var(--chart-3)] dark:[--theme-preview-chart-4:var(--chart-4)]"
const DATA = Array.from({ length: 7 }, (_, index) => ({
  day: ["周一", "周二", "周三", "周四", "周五", "周六", "周日"][index] ?? "",
  ...Object.fromEntries(
    SERIES.map((series, seriesIndex) => [
      series.key,
      Math.round(
        80 +
          (5 - seriesIndex) * 32 +
          index * 12 +
          Math.sin(index + seriesIndex) * 35,
      ),
    ]),
  ),
}))

function PreviewChart() {
  return (
    <ChartCard className={`h-full ${CHART_TONES}`}>
      <ChartCardHeader>
        <div>
          <ChartCardTitle>每一份内容，都在被看见</ChartCardTitle>
          <ChartCardDescription>本周栏目访问量 · 演示数据</ChartCardDescription>
        </div>
      </ChartCardHeader>
      <ChartCardContent className="flex flex-1 flex-col justify-center gap-3">
        <ChartSeries
          data={DATA}
          xKey="day"
          series={SERIES}
          type="bar"
          stacked
          className="h-56 w-full"
          label="本周四个栏目的每日访问量堆叠柱状图"
        />
        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer rounded-sm focus-visible:outline-2 focus-visible:outline-ring">
            查看每日数据
          </summary>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-right tabular-nums">
              <caption className="sr-only">本周栏目访问量明细</caption>
              <thead>
                <tr>
                  <th scope="col" className="py-1 text-left">
                    日期
                  </th>
                  {SERIES.map((series) => (
                    <th scope="col" key={series.key}>
                      {series.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DATA.map((row) => (
                  <tr key={row.day}>
                    <th scope="row" className="py-1 text-left font-normal">
                      {row.day}
                    </th>
                    {SERIES.map((series) => (
                      <td key={series.key}>
                        {(row as Record<string, string | number>)[series.key]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </ChartCardContent>
    </ChartCard>
  )
}

export { PreviewChart }
