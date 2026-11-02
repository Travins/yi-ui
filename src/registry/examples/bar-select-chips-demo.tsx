"use client"
import * as React from "react"
import { BarSelect } from "@/registry/ui/bar-select/bar-select"
import { Button } from "@/components/ui/button"
export default function BarSelectDemo() {
  const [result, setResult] = React.useState("")
  return (
    <div data-slot="bar-select-demo" className="w-full max-w-sm rounded-xl border border-edge bg-background p-4 shadow-xs">
      <form
        data-slot="bar-select-form"
        className="flex w-full flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault()
          setResult(new FormData(event.currentTarget).getAll("tags").join("、"))
        }}
      >
        <BarSelect
          multiple
          display="chips"
          name="tags"
          label="标签"
          defaultValue={["音频", "图像"]}
          options={["音频", "图像", "文本"].map((v) => ({
            value: v,
            label: v,
          }))}
        />
        <Button type="submit">提交</Button>
        <p role="status" className="text-sm text-muted-foreground">
          {result}
        </p>
      </form>
    </div>
  )
}
