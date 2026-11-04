<div align="center">

<a href="https://yiui.dev">
  <img src="src/app/icon.svg" alt="Yi UI" width="56" height="56" />
</a>

<h1>Yi UI</h1>

<p><strong>易</strong> · A line-grid styled React component library. Components install as source into your project, so the code is yours from day one.</p>

<p>
  <a href="https://yiui.dev">Website</a> ·
  <a href="https://yiui.dev/components/">Components</a> ·
  <a href="https://yiui.dev/blocks/">Blocks</a> ·
  <a href="https://yiui.dev/pages/">Pages</a> ·
  <a href="https://yiui.dev/themes/">Themes</a> ·
  <a href="https://yiui.dev/docs/installation/">Docs</a>
</p>

<p><a href="./README.md">简体中文</a> · <strong>English</strong></p>

</div>

<picture>
  <source media="(prefers-color-scheme: dark)" srcset=".github/assets/preview-dark.png" />
  <img src=".github/assets/preview-light.png" alt="yiui.dev home page: isometric mark with a tuning panel" />
</picture>

## About

Yi UI is a component library distributed as a **shadcn registry**, maintained by Travins as a personal project, with docs at [yiui.dev](https://yiui.dev). Nothing ships as an npm package: the shadcn CLI copies the source into your project, where you can change styles, structure and behavior freely.

The name comes from the site's logo, the Chinese character 易 (*yì*), drawn as three thin and three thick slashes. It means both "easy" and "change": easy to pick up, and yours to change.

Everything follows one visual language, the line grid: full-width rules, ruled containers and dotted separators, combined with hairline borders, small radii and restrained motion.

Yi UI is **Chinese-first**: the docs are in Simplified Chinese, default component labels (buttons, hints, screen-reader text) are Chinese, and typography is tuned for Chinese system fonts. User-facing text is collected into a `labels` prop you can override, so the components can still be used in other languages; there are no plans for an English edition of the docs.

## Features

- **You own the code** — Install with the shadcn CLI; the component, the registry items it depends on and the CSS variables it needs are written into your project together.
- **Built on Base UI** — Interactive primitives use [Base UI](https://base-ui.com), so keyboard support, focus management and screen-reader semantics come built in.
- **Theme-aware** — Every color comes from theme variables: light / dark plus 14 color themes, and components recolor as you switch.
- **A family of bar controls** — Value slider, segmented control, switch, tone picker, angle dial and XY pad share one height scale and look. Combine them into a parameter panel and copy the current values as JSX in one click. The Chinese form controls — amount, phone number, ID number, quantity and region — share the same look.
- **Grid-style table chrome** — The grid toolbar lays out search, filters and column settings as a row of cells, and bar controls placed in it drop their own frame. Grid pagination sits under the table; when you page, the numbers roll and the current-page block slides, so the bar never jumps.
- **Works on phones** — On touch devices buttons and inputs grow one step (36 / 40 / 44px), drag controls tell scrolling from dragging, numeric inputs bring up the number keyboard, and every example can be opened on a phone by scanning a QR code.
- **Thoughtful motion** — Animations start when scrolled into view, pause off-screen and respect "reduce motion".
- **Prerender-friendly** — Every page is prerendered at build time. Components that measure layout or draw on a canvas render a same-size placeholder before scripts load, so there are no blank areas or layout shifts.
- **AI-friendly** — Install the agent skill with `npx skills add Travins/yi-ui --skill yi-ui`. Every doc page has a Markdown version with examples and props expanded, plus [`llms.txt`](https://yiui.dev/llms.txt) and [`llms-full.txt`](https://yiui.dev/llms-full.txt).

## Quick start

You need React 19, Tailwind CSS v4 and a shadcn project initialized with the **Base UI** base.

```bash
# New project (for an existing one, drop -t and -n)
pnpm dlx shadcn@latest init -t next -b base -p nova -n my-app

# Install any component
pnpm dlx shadcn@latest add @yiui/value-slider
```

Yi UI is listed in the [official shadcn registry directory](https://ui.shadcn.com/docs/directory), so the `@yiui` namespace works without any setup — the CLI adds it to `components.json` on first install. You can also install by full URL:

```bash
pnpm dlx shadcn@latest add https://yiui.dev/r/value-slider.json
```

See the [installation guide](https://yiui.dev/docs/installation/) for where files land, how dependencies and styles are written, and common issues.

## Components

<picture>
  <source media="(prefers-color-scheme: dark)" srcset=".github/assets/components-dark.png" />
  <img src=".github/assets/components-light.png" alt="Component gallery" />
</picture>

| Group | Components |
| --- | --- |
| Graphics & Motion | [Isometric Mark](https://yiui.dev/components/isometric-mark/) · [Flow Diagram](https://yiui.dev/components/flow-diagram/) · [Dotted Globe](https://yiui.dev/components/globe/) · [Glyph Field](https://yiui.dev/components/glyph-field/) · [Shuffle Grid](https://yiui.dev/components/shuffle-grid/) · [Orbit](https://yiui.dev/components/orbit/) · [Ripple](https://yiui.dev/components/ripple/) · [Code Stack](https://yiui.dev/components/code-stack/) |
| Form & Input | [Palette Editor](https://yiui.dev/components/palette-editor/) · [Color Picker](https://yiui.dev/components/color-picker/) · [Bar Field](https://yiui.dev/components/bar-field/) · [Bar Select](https://yiui.dev/components/bar-select/) · [Value Slider](https://yiui.dev/components/value-slider/) · [Control Panel](https://yiui.dev/components/control-panel/) · [XY Pad](https://yiui.dev/components/xy-pad/) · [Angle Dial](https://yiui.dev/components/angle-dial/) · [Segmented Control](https://yiui.dev/components/segmented-control/) · [Toggle Switch](https://yiui.dev/components/toggle-switch/) · [Tone Picker](https://yiui.dev/components/tone-picker/) · [Amount Input](https://yiui.dev/components/amount-input/) · [Phone Input](https://yiui.dev/components/phone-input/) · [ID Number Input](https://yiui.dev/components/id-number-input/) · [Number Stepper](https://yiui.dev/components/number-stepper/) · [Steps](https://yiui.dev/components/steps/) · [Region Picker](https://yiui.dev/components/region-picker/) · [File Upload](https://yiui.dev/components/file-upload/) |
| Data Display | [Grid Toolbar](https://yiui.dev/components/grid-toolbar/) · [Grid Pagination](https://yiui.dev/components/grid-pagination/) · [Chart Card](https://yiui.dev/components/chart-card/) · [Stat Card](https://yiui.dev/components/stat-card/) · [Mini Chart](https://yiui.dev/components/mini-chart/) |
| Text & Marquee | [Text Animate](https://yiui.dev/components/text-animate/) · [Marquee](https://yiui.dev/components/marquee/) |
| Content Display | [Timeline](https://yiui.dev/components/timeline/) · [Card Stack](https://yiui.dev/components/card-stack/) · [Checklist](https://yiui.dev/components/checklist/) |
| Time | [Local Time](https://yiui.dev/components/local-time/) · [Greeting](https://yiui.dev/components/greeting/) |
| Layout | [Grid Layout](https://yiui.dev/components/grid-layout/) |
| Utilities | [Chinese Number](https://yiui.dev/components/chinese-number/) · [China Regions](https://yiui.dev/components/china-regions/) · [Flow Tone](https://yiui.dev/components/flow-tone/) |

## Blocks & Pages

| Name | Description |
| --- | --- |
| [Settings `settings-01`](https://yiui.dev/blocks/settings-01/) | A full settings page built from the bar controls: section nav, live preview, modified count, reset and async save. |
| [Theme Customizer `theme-customizer-01`](https://yiui.dev/blocks/theme-customizer-01/) | Color, radius, content width and appearance preferences with early restoration. |
| [Split sign-in `auth-01`](https://yiui.dev/blocks/auth-01/) | Brand panel plus forms: password / one-time-code sign-in (auto-formatted phone number, inline send-code button with countdown), sign-up with a strength meter, password recovery. |
| [Checkout `checkout-01`](https://yiui.dev/blocks/checkout-01/) | Address, shipping, invoice, payment and order completion, with a mobile store ordering demo. |
| [Data table `data-table-01`](https://yiui.dev/blocks/data-table-01/) | Grid toolbar (search, status and owner dropdowns, column settings, density), sorting, column resizing, selection, cell editing with optimistic save, grid pagination and virtual scrolling; narrow screens switch to a card list. |
| [AI assistant `agent-chat-01`](https://yiui.dev/blocks/agent-chat-01/) | Embedded and floating layouts showing reasoning summaries, tool calls, sources and charts, with a built-in streaming demo. |
| [Console shell `app-shell-01`](https://yiui.dev/pages/app-shell-01/) | Fixed header, collapsible nav, workspace sidebar and AI assistant, with example pages full of stat cards and charts; the list page reuses the data table block. |

## Color themes

Three neutral bases (Neutral, Stone, Slate) and 11 color themes (Red, Orange, Amber, Lime, Green, Teal, Sky, Blue, Violet, Fuchsia, Pink). Color themes always use white text on the primary color, at a contrast ratio of at least 4.5:1. Preview them on the [themes page](https://yiui.dev/themes/) and copy the CSS variables, or install one directly:

```bash
pnpm dlx shadcn@latest add https://yiui.dev/r/theme-blue.json
```

## Local development

```bash
git clone https://github.com/Travins/yi-ui.git
cd yi-ui
nvm use          # Node 24 (see .nvmrc)
pnpm install
pnpm dev
```

| Command | What it does |
| --- | --- |
| `pnpm dev` | Start the dev server |
| `pnpm build` | Production build (preview with `pnpm start`) |
| `pnpm lint` | Lint |
| `pnpm registry:build` | Generate `public/r/*.json` and other registry output |
| `pnpm registry:lint` | Check registry items for dependencies, files and conventions |
| `pnpm test` | Script unit tests and self-tests |
| `pnpm qa:shots <name>` | Screenshot QA on the build (light / dark, color themes, narrow widths, errors, overflow) |
| `pnpm qa:install [name…]` | Local install, type, build and browser QA; `--fresh`, `--keep`, `--namespace`; `--monorepo` uses the official shadcn monorepo template |
| `pnpm qa:interaction` | Interaction QA: touch heights, focus styles, keyboard use, whether errors clear once fixed; `--build` checks the production build |
| `pnpm qa:loading` | Block scripts and check pre-hydration placeholders and blank areas |

## Project structure

```
content/            Docs and blog (MDX)
src/registry/       Published source (single source of truth)
  ui/               Components
  blocks/           Blocks
  pages/        Pages
  examples/         Examples used in the docs
src/components/     The site's own shell, doc rendering and home page
src/styles/         Line grid, color themes and doc styles
registry.json       Registry manifest
public/r/           Generated registry JSON
```

Doc previews, code views and `public/r/*.json` all read the same source in `src/registry/`.

## Tech stack

[Next.js](https://nextjs.org) 16 (App Router, deployed on Vercel) · [React](https://react.dev) 19 · [Tailwind CSS](https://tailwindcss.com) v4 · [shadcn/ui](https://ui.shadcn.com) · [Base UI](https://base-ui.com) · [Motion](https://motion.dev) · [Fumadocs](https://fumadocs.dev) (content layer) · [Shiki](https://shiki.style) · [Recharts](https://recharts.org)

## Contributing

Issues and pull requests are welcome. See [CONTRIBUTING.md](./CONTRIBUTING.md) for the workflow and conventions (written in Simplified Chinese).

## License

[MIT](./LICENSE) © Travins
