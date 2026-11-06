import type { Locator, Page } from "playwright-core"

export type ScenarioContext = {
  page: Page
  role: Page["getByRole"]
  name: (name: string) => Locator
  assert: (condition: unknown, message: string) => void
  visible: (target: Locator, message: string) => Promise<void>
  box: (
    target: Locator,
  ) => Promise<NonNullable<Awaited<ReturnType<Locator["boundingBox"]>>>>
  settle: () => Promise<void>
  press: (keys: string) => Promise<void>
  shot: (name: string) => Promise<string | null>
}
export type Scenario = {
  name: string
  path?: string
  viewports: ("desktop" | "mobile")[]
  steps: {
    name: string
    viewport?: "desktop" | "mobile"
    run: (ctx: ScenarioContext) => Promise<void>
  }[]
}
export type ScenarioResult = {
  component: string
  scenario: string
  viewport: string
  step: string
  passed: boolean
  message?: string
  screenshots: (string | null)[]
}
