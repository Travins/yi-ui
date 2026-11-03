import { createGenerator, type DocEntry } from "fumadocs-typescript"
import { codeToHtml } from "shiki"
import { cache, Fragment, type ReactNode } from "react"
import registry from "../../../registry.json"
import { codeThemes } from "./highlight-theme"
import { TypeTableRow } from "./type-table"
import { typeTableBodyGrid, typeTableGrid } from "./type-table-shared"
import { cn } from "@/lib/utils"

const generator = createGenerator()

/**
 * 只保留组件自己声明的属性。
 * `DocEntry` 只有名字、类型和说明，不含声明位置，所以借 `transform` 的上下文拿到属性符号：
 * 从 `@types/react` 继承的 `href`、`target` 这类原生属性声明在 node_modules，
 * 组件自己写的属性则声明在 `src/registry/` 下，据此过滤。
 */
const generate = cache(async (path: string, name: string) => {
  const ownEntries: DocEntry[] = []
  await generator.generateTypeTable(
    {
      path,
      name: `${name}Props`,
      // 直接取组件入参类型；原生属性靠下面的声明来源过滤，不必在类型里 Omit。
      type: `Parameters<typeof ${name}>[0]`,
    },
    {
      transform(entry, _propertyType, symbol) {
        const declaredInProject = (symbol.declarations ?? []).some(
          (declaration) => {
            const fileName =
              declaration.resolve(this.program)?.getSourceFile()?.fileName ?? ""
            return (
              fileName.length > 0 &&
              !fileName.replaceAll("\\", "/").includes("/node_modules/")
            )
          },
        )
        if (declaredInProject) ownEntries.push(entry)
      },
    },
  )
  return ownEntries
})

// 通用组合属性的说明统一在这里兜底，避免源码里重复写同样的注释。
const genericDescriptions: Record<string, string> = {
  children: "组件内容",
  className: "附加的样式类名",
}

// 双主题输出 --shiki-light / --shiki-dark，亮暗切换由 docs.css 决定。
const highlightType = cache((type: string) =>
  codeToHtml(type, { lang: "ts", themes: codeThemes, defaultColor: false }),
)

/** 在顶层（不在括号、引号内）查找字符，用来判断联合类型 / 函数类型。 */
function hasTopLevel(
  source: string,
  match: (char: string, next: string) => boolean,
) {
  let depth = 0
  let quote = ""
  for (let i = 0; i < source.length; i++) {
    const char = source[i]
    if (quote) {
      if (char === "\\") i++
      else if (char === quote) quote = ""
      continue
    }
    if (char === '"' || char === "'" || char === "`") quote = char
    else if (char === "=" && source[i + 1] === ">") {
      if (depth === 0 && match("=>", "")) return true
      i++
    } else if ("([{<".includes(char)) depth++
    else if (")]}>".includes(char)) depth--
    else if (depth === 0 && match(char, source[i + 1] ?? "")) return true
  }
  return false
}

/** 手写数据没有 `simplifiedType`，按完整类型的形状推一个，规则与 fumadocs 的简化形式保持一致。 */
function simplifyType(type: string): string {
  const source = type.trim()
  if (hasTopLevel(source, (char) => char === "|")) {
    const members = source
      .split(/\s*\|\s*/)
      .filter((member) => member !== "undefined" && member !== "null")
    if (members.length === 1) return simplifyType(members[0])
    return members.every((member) => member === "true" || member === "false")
      ? "boolean"
      : "union"
  }
  if (hasTopLevel(source, (char) => char === "=>")) return "function"
  if (source.startsWith("{")) return "object"
  if (source.endsWith("[]") || source.startsWith("Array<")) return "array"
  if (source.includes("<")) return "object"
  return source
}

/** 说明里的反引号片段渲染成行内代码，`[文字](#锚点)` 渲染成链接，其余按纯文本。 */
function renderInline(text: string): ReactNode {
  return text.split(/(`[^`]+`|\[[^\]]+\]\([^)]+\))/).map((part, index) => {
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2)
      return (
        <code
          key={index}
          className="rounded border border-edge bg-muted px-1 py-0.5 font-mono text-[0.8125rem]"
        >
          {part.slice(1, -1)}
        </code>
      )
    const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part)
    if (link)
      return (
        <a key={index} href={link[2]} className="underline underline-offset-4">
          {link[1]}
        </a>
      )
    return <Fragment key={index}>{part}</Fragment>
  })
}

type TypeTableRowData = {
  name: string
  type: string
  simplifiedType?: string
  description?: ReactNode
  default?: string
  required?: boolean
  deprecated?: boolean
}

/** 手写 `<TypeTable>` 的单项：键是属性名。 */
type TypeTableEntry = Omit<TypeTableRowData, "name">

async function TypeTableItem({ row }: { row: TypeTableRowData }) {
  const typeHtml = await highlightType(row.type)
  const description =
    typeof row.description === "string"
      ? renderInline(row.description)
      : row.description
  return (
    <TypeTableRow
      name={row.name}
      simplifiedType={row.simplifiedType ?? simplifyType(row.type)}
      required={row.required}
      deprecated={row.deprecated}
    >
      <div className={cn(typeTableBodyGrid, "text-[13px] leading-5")}>
        {description ? (
          <p className="col-span-full mb-1 text-foreground">{description}</p>
        ) : null}
        <span className="text-muted-foreground">类型</span>
        <div
          className="docs-type min-w-0"
          dangerouslySetInnerHTML={{ __html: typeHtml }}
        />
        {row.default ? (
          <>
            <span className="text-muted-foreground">默认值</span>
            <code className="docs-type min-w-0 font-mono text-[12.5px] break-words">
              {row.default}
            </code>
          </>
        ) : null}
      </div>
    </TypeTableRow>
  )
}

function TypeTableView({ rows }: { rows: TypeTableRowData[] }) {
  return (
    <div
      data-slot="type-table"
      className="not-prose mt-4 mb-6 rounded-xl border border-edge bg-muted/40 p-1"
    >
      <div
        aria-hidden="true"
        className={cn(
          typeTableGrid,
          // 与行头对齐：行有 1px 透明边框 + px-3
          "px-[calc(0.75rem+1px)] py-2 text-[13px] leading-5 text-muted-foreground",
        )}
      >
        <span>属性</span>
        <span>类型</span>
      </div>
      {rows.map((row) => (
        <TypeTableItem key={row.name} row={row} />
      ))}
    </div>
  )
}

/**
 * 手写数据的属性表，用于 hook 返回值、`labels` 键这类无法从源码自动生成的场景：
 * `<TypeTable type={{ open: { type: "boolean", description: "…", default: "false" } }} />`。
 * 属性名带 `?` 表示可选；`required: true` 去掉 `?`。
 */
function TypeTable({ type }: { type: Record<string, TypeTableEntry> }) {
  return (
    <TypeTableView
      rows={Object.entries(type).map(([name, entry]) => ({ name, ...entry }))}
    />
  )
}

/** 组件 Props 的类型与 JSDoc：网页属性表和 /md/ 文档共用。 */
async function componentPropRows(name: string, component: string) {
  const item = registry.items.find((item) => item.name === name)
  if (!item) throw new Error(`未登记的组件：${name}`)
  const entries = await generate(item.files[0].path, component)
  return entries.map((entry) => ({
    name: entry.name,
    type: entry.type,
    // `boolean | undefined` 这类可选属性被简化成 union，按完整类型重新推一次
    simplifiedType:
      entry.simplifiedType === "union"
        ? simplifyType(entry.type)
        : entry.simplifiedType,
    description: entry.description || genericDescriptions[entry.name],
    default: entry.tags.find((tag) => tag.name === "default")?.text,
    required: entry.required,
    deprecated: entry.deprecated,
  }))
}

/** 从源码自动生成：读取组件 Props 的类型与 JSDoc（说明、`@default`、`@deprecated`）。 */
async function PropsTable({
  name,
  component,
}: {
  name: string
  component: string
}) {
  const rows = await componentPropRows(name, component)
  // 只透传原生属性的组件没有自己的 Props，不必硬凑一张空表。
  if (rows.length === 0) {
    return (
      <p className="text-[13px] text-muted-foreground">
        {component} 没有自定义 Props；该组件继承原生元素的全部属性。
      </p>
    )
  }
  return (
    <TypeTableView rows={rows} />
  )
}

export { componentPropRows, PropsTable, TypeTable }
