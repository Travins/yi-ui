/**
 * Registry 规范检查（结构判断使用 TypeScript AST，字符串颜色使用正则）。
 * error: no-default-export（page/layout/demo.tsx、examples 例外）、use-client-first、
 * no-forward-ref、no-hardcoded-color（只查 className/cva，忽略注释）、
 * forbidden-import（站点私有模块与逆向依赖）、registry-deps（文件与依赖声明）、
 * disable-comment（忽略注释未写规则 id 或写了未知规则 id）。
 * warn: exports-at-end（类型导出、page/layout/demo.tsx、examples 例外）、
 * data-slot（只查直接返回原生 JSX 的大写函数，page/layout/demo.tsx、examples 例外）、
 * function-declaration（大写 JSX 箭头组件）、
 * labels（blocks/pages JSX 中文，config.ts、DEFAULT_LABELS、demo/page 例外，最多三处）、
 * storage-key-prefix（静态 key 必须以 travinsy: 开头）。未使用的 npm 依赖为 warn。
 * 忽略单条诊断：紧邻上一行写 `// registry-lint-disable-next-line <规则 id>[, <规则 id>]`，
 * 必须写明规则 id；被忽略的条数在报告末尾统计。
 * 不做类型推导、跨文件常量求值或 JSX 运行时行为分析。
 */
import fs from "node:fs"
import path from "node:path"
import { isBuiltin } from "node:module"
import { fileURLToPath } from "node:url"
import ts from "typescript"

type Level = "error" | "warn"
type Diagnostic = {
  rule: string
  level: Level
  file: string
  line: number
  column: number
  message: string
}
type RegistryItem = {
  name: string
  files?: { path: string; type?: string; target?: string }[]
  dependencies?: string[]
  registryDependencies?: string[]
}
type Ignored = { rule: string; file: string; line: number }
const rules = [
  "no-default-export",
  "exports-at-end",
  "use-client-first",
  "data-slot",
  "function-declaration",
  "no-forward-ref",
  "no-hardcoded-color",
  "forbidden-import",
  "registry-deps",
  "labels",
  "storage-key-prefix",
  "disable-comment",
]
// registry:index / shadcn build 会整体重写这些文件，检查它们没有意义。
const generatedFiles = new Set(["src/registry/__index__.tsx"])
const slash = (p: string) => p.split(path.sep).join("/")
const parse = (file: string, text: string) =>
  ts.createSourceFile(
    file,
    text,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith(".json") ? ts.ScriptKind.JSON : ts.ScriptKind.TSX,
  )
function walk(node: ts.Node, visit: (node: ts.Node) => void) {
  visit(node)
  ts.forEachChild(node, (child) => walk(child, visit))
}
function unparen(node: ts.Expression): ts.Expression {
  return ts.isParenthesizedExpression(node) ||
    ts.isAsExpression(node) ||
    ts.isSatisfiesExpression(node) ||
    ts.isNonNullExpression(node)
    ? unparen(node.expression)
    : node
}
function literal(
  node: ts.Node,
): node is
  | ts.StringLiteral
  | ts.NoSubstitutionTemplateLiteral
  | ts.TemplateHead
  | ts.TemplateMiddle
  | ts.TemplateTail {
  return (
    ts.isStringLiteral(node) ||
    ts.isNoSubstitutionTemplateLiteral(node) ||
    ts.isTemplateHead(node) ||
    ts.isTemplateMiddle(node) ||
    ts.isTemplateTail(node)
  )
}
function imports(sf: ts.SourceFile) {
  const found: { spec: string; node: ts.Node }[] = []
  walk(sf, (n) => {
    if (
      (ts.isImportDeclaration(n) || ts.isExportDeclaration(n)) &&
      n.moduleSpecifier &&
      ts.isStringLiteral(n.moduleSpecifier)
    )
      found.push({ spec: n.moduleSpecifier.text, node: n.moduleSpecifier })
    if (
      ts.isCallExpression(n) &&
      (n.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(n.expression) && n.expression.text === "require")) &&
      n.arguments[0] &&
      ts.isStringLiteral(n.arguments[0])
    )
      found.push({ spec: n.arguments[0].text, node: n.arguments[0] })
    if (
      ts.isImportTypeNode(n) &&
      ts.isLiteralTypeNode(n.argument) &&
      ts.isStringLiteral(n.argument.literal)
    )
      found.push({ spec: n.argument.literal.text, node: n.argument.literal })
  })
  return found
}
function returns(
  fn: ts.FunctionDeclaration | ts.FunctionExpression | ts.ArrowFunction,
) {
  const result: ts.Expression[] = []
  if (!fn.body) return result
  if (!ts.isBlock(fn.body)) return [unparen(fn.body)]
  const visit = (node: ts.Node) => {
    if (node !== fn.body && ts.isFunctionLike(node)) return
    if (ts.isReturnStatement(node) && node.expression)
      result.push(unparen(node.expression))
    ts.forEachChild(node, visit)
  }
  visit(fn.body)
  return result
}
const jsx = (n: ts.Node) =>
  ts.isJsxElement(n) || ts.isJsxSelfClosingElement(n) || ts.isJsxFragment(n)
const colorPattern =
  /#[\da-f]{3,8}\b|\b(?:rgb|hsl)a?\s*\(|(?:^|[^\w-])(?:bg|text|border(?:-[xysetblr])?|from|via|to|ring(?:-offset)?|fill|stroke|outline|shadow|decoration|divide|accent|caret)-(?:white|black|(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|[1-9]00|950))(?=$|[^\w-])/gi
function lintFile(
  file: string,
  text: string,
): { diagnostics: Diagnostic[]; ignored: Ignored[] } {
  const sf = parse(file, text),
    output: Diagnostic[] = [],
    ignored: Ignored[] = []
  // 行号 → 该行允许忽略的规则 id
  const suppressed = new Map<number, Set<string>>()
  const add = (rule: string, level: Level, node: ts.Node, message: string) => {
    const pos = sf.getLineAndCharacterOfPosition(node.getStart(sf))
    const line = pos.line + 1
    // 忽略注释写在被忽略的那一行之上，只作用于紧邻的下一行。
    if (suppressed.get(line)?.has(rule)) {
      ignored.push({ rule, file, line })
      return
    }
    output.push({
      rule,
      level,
      file,
      line,
      column: pos.character + 1,
      message,
    })
  }
  for (const comment of singleLineComments(text)) {
    const match = /^\/\/\s*registry-lint-disable-next-line\b(.*)$/.exec(
      comment.text,
    )
    if (!match) continue
    const line = sf.getLineAndCharacterOfPosition(comment.pos).line + 1
    const ids = (match[1] ?? "")
      .split(",")
      .map((id) => id.trim())
      .filter((id) => id.length > 0)
    const unknown = ids.filter((id) => !rules.includes(id))
    if (!ids.length || unknown.length)
      output.push({
        rule: "disable-comment",
        level: "error",
        file,
        line,
        column: 1,
        message: !ids.length
          ? "忽略注释必须写明规则 id，例如 // registry-lint-disable-next-line exports-at-end"
          : `未知的规则 id：${unknown.join("、")}`,
      })
    if (ids.length && !unknown.length) {
      const target = suppressed.get(line + 1) ?? new Set<string>()
      for (const id of ids) target.add(id)
      suppressed.set(line + 1, target)
    }
  }
  const exempt =
    /(?:^|\/)(?:page|layout|demo)\.tsx$/.test(file) ||
    file.startsWith("src/registry/examples/")
  const forwardRefNames = new Set(["forwardRef"])
  const cvaNames = new Set(["cva"])
  for (const statement of sf.statements) {
    if (
      !ts.isImportDeclaration(statement) ||
      !ts.isStringLiteral(statement.moduleSpecifier)
    )
      continue
    const bindings = statement.importClause?.namedBindings
    if (!bindings || !ts.isNamedImports(bindings)) continue
    for (const binding of bindings.elements) {
      const original = binding.propertyName?.text ?? binding.name.text
      if (
        statement.moduleSpecifier.text === "react" &&
        original === "forwardRef"
      )
        forwardRefNames.add(binding.name.text)
      if (
        statement.moduleSpecifier.text === "class-variance-authority" &&
        original === "cva"
      )
        cvaNames.add(binding.name.text)
    }
  }
  let labelCount = 0
  const checkedColors = new Set<ts.Node>()
  const checkColors = (root: ts.Node) =>
    walk(root, (n) => {
      if (literal(n) && !checkedColors.has(n)) {
        checkedColors.add(n)
        const matches = [...n.text.matchAll(colorPattern)].map((m) =>
          m[0].trim(),
        )
        if (matches.length)
          add(
            "no-hardcoded-color",
            "error",
            n,
            `禁止硬编码颜色：${[...new Set(matches)].join("、")}`,
          )
      }
    })
  walk(sf, (n) => {
    if (ts.isExportAssignment(n) && !n.isExportEquals && !exempt)
      add("no-default-export", "error", n, "禁止默认导出，请使用命名导出")
    if (ts.isExportSpecifier(n) && n.name.text === "default" && !exempt)
      add("no-default-export", "error", n, "禁止默认导出，请使用命名导出")
    if (ts.canHaveModifiers(n)) {
      const mods = ts.getModifiers(n) ?? []
      if (mods.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword) && !exempt)
        add("no-default-export", "error", n, "禁止默认导出，请使用命名导出")
      // demo/page/layout 与 examples 按 Next.js 约定使用 export default 和局部导出，不要求集中到末尾。
      if (
        !exempt &&
        (ts.isFunctionDeclaration(n) || ts.isVariableStatement(n)) &&
        mods.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
      )
        add(
          "exports-at-end",
          "warn",
          n,
          "值导出应统一放在文件末尾 export { ... }",
        )
    }
    if (
      ts.isExpressionStatement(n) &&
      ts.isStringLiteral(n.expression) &&
      n.expression.text === "use client" &&
      sf.statements[0] !== n
    )
      add("use-client-first", "error", n, '"use client" 必须是文件第一条语句')
    if (ts.isCallExpression(n)) {
      const callee = n.expression
      if (
        (ts.isIdentifier(callee) && forwardRefNames.has(callee.text)) ||
        (ts.isPropertyAccessExpression(callee) &&
          callee.name.text === "forwardRef")
      )
        add(
          "no-forward-ref",
          "error",
          n,
          "禁止 forwardRef，React 19 请直接接收 ref prop",
        )
      if (
        (ts.isIdentifier(callee) && cvaNames.has(callee.text)) ||
        (ts.isPropertyAccessExpression(callee) && callee.name.text === "cva")
      )
        n.arguments.forEach(checkColors)
      if (
        ts.isPropertyAccessExpression(callee) &&
        ["getItem", "setItem"].includes(callee.name.text) &&
        ((ts.isIdentifier(callee.expression) &&
          callee.expression.text === "localStorage") ||
          (ts.isPropertyAccessExpression(callee.expression) &&
            callee.expression.name.text === "localStorage"))
      ) {
        const key = n.arguments[0]
        if (
          key &&
          (ts.isStringLiteral(key) ||
            ts.isNoSubstitutionTemplateLiteral(key)) &&
          !key.text.startsWith("travinsy:")
        )
          add(
            "storage-key-prefix",
            "warn",
            key,
            "localStorage key 必须以 travinsy: 开头",
          )
      }
    }
    if (
      ts.isJsxAttribute(n) &&
      n.name.getText(sf) === "className" &&
      n.initializer
    )
      checkColors(n.initializer)
    if (
      ts.isFunctionDeclaration(n) ||
      ts.isFunctionExpression(n) ||
      ts.isArrowFunction(n)
    ) {
      const name =
        (!ts.isArrowFunction(n) ? n.name?.getText(sf) : undefined) ??
        (ts.isVariableDeclaration(n.parent) && ts.isIdentifier(n.parent.name)
          ? n.parent.name.text
          : "")
      const roots = returns(n)
      if (/^[A-Z]/.test(name) && roots.some(jsx)) {
        if (ts.isArrowFunction(n))
          add("function-declaration", "warn", n, "组件应使用 function 声明")
        if (!exempt && /^src\/registry\/(ui|blocks|pages)\//.test(file))
          for (const root of roots) {
            const opening = ts.isJsxElement(root)
              ? root.openingElement
              : ts.isJsxSelfClosingElement(root)
                ? root
                : undefined
            if (
              opening &&
              ts.isIdentifier(opening.tagName) &&
              /^[a-z]/.test(opening.tagName.text) &&
              !opening.attributes.properties.some(
                (p) =>
                  ts.isJsxAttribute(p) && p.name.getText(sf) === "data-slot",
              )
            )
              add(
                "data-slot",
                "warn",
                opening,
                `组件 ${name} 的原生根元素必须有 data-slot`,
              )
          }
      }
    }
    if (
      ts.isJsxText(n) &&
      /[\u3400-\u9fff]/.test(n.text) &&
      /^src\/registry\/(blocks|pages)\//.test(file) &&
      !/(?:^|\/)(?:demo|page)\.tsx$/.test(file) &&
      path.basename(file) !== "config.ts" &&
      labelCount < 3
    ) {
      let parent: ts.Node | undefined = n.parent
      while (
        parent &&
        !(
          ts.isVariableDeclaration(parent) &&
          parent.name.getText(sf) === "DEFAULT_LABELS"
        )
      )
        parent = parent.parent
      if (!parent) {
        add("labels", "warn", n, "用户可见文案应集中到 labels")
        labelCount++
      }
    }
  })
  for (const { spec, node } of imports(sf)) {
    const forbidden =
      /^@\/(?:config(?:\/|$)|components\/(?:site|home|docs)(?:\/|$)|lib\/(?:source|themes)(?:\.[cm]?[jt]sx?)?$)/.test(
        spec,
      )
    const reverse = file.startsWith("src/registry/ui/")
      ? /^@\/registry\/(?:blocks|pages)\//.test(spec)
      : file.startsWith("src/registry/blocks/") &&
        spec.startsWith("@/registry/pages/")
    const relative = spec.startsWith(".")
      ? slash(
          path.posix.normalize(path.posix.join(path.posix.dirname(file), spec)),
        )
      : ""
    const relativeForbidden =
      /^(?:src\/config(?:\/|$)|src\/components\/(?:site|home|docs)(?:\/|$)|src\/lib\/(?:source|themes)(?:\.[cm]?[jt]sx?)?$)/.test(
        relative,
      )
    const relativeReverse = file.startsWith("src/registry/ui/")
      ? /^src\/registry\/(blocks|pages)\//.test(relative)
      : file.startsWith("src/registry/blocks/") &&
        relative.startsWith("src/registry/pages/")
    if (forbidden || reverse || relativeForbidden || relativeReverse)
      add(
        "forbidden-import",
        "error",
        node,
        `禁止站点私有依赖或逆向依赖：${spec}`,
      )
  }
  return { diagnostics: output, ignored }
}
/** 只返回诊断，供测试与外部调用；被忽略的条数由 lintFile 另行返回。 */
function lintSource(file: string, text: string): Diagnostic[] {
  return lintFile(file, text).diagnostics
}
/** 用扫描器取真正的单行注释，避免把字符串里的同名文本当成忽略指令。 */
function singleLineComments(text: string) {
  const scanner = ts.createScanner(
    ts.ScriptTarget.Latest,
    false,
    ts.LanguageVariant.Standard,
    text,
  )
  const found: { pos: number; text: string }[] = []
  for (
    let token = scanner.scan();
    token !== ts.SyntaxKind.EndOfFileToken;
    token = scanner.scan()
  )
    if (token === ts.SyntaxKind.SingleLineCommentTrivia)
      found.push({
        pos: scanner.getTokenPos(),
        text: text.slice(scanner.getTokenPos(), scanner.getTextPos()),
      })
  return found
}
function packageName(spec: string) {
  return spec.startsWith("@")
    ? spec
        .split("/")
        .slice(0, 2)
        .join("/")
        .replace(/@[^@/]+$/, "")
    : spec.split("/", 1).join("").split("@", 1).join("")
}
function siteDependency(spec: string, homepage: string): string | undefined {
  if (spec.startsWith("@yiui/")) return spec.slice("@yiui/".length)
  if (!spec.includes(":")) return spec
  try {
    const url = new URL(spec)
    if (url.host === new URL(homepage).host)
      return url.pathname.match(/^\/r\/([^/]+)\.json$/)?.[1]
  } catch {
    /* 非本站 URL 不用于本地依赖解析。 */
  }
}
function lintRegistry(root: string): Diagnostic[] {
  const file = "registry.json",
    filename = path.join(root, file),
    output: Diagnostic[] = []
  if (!fs.existsSync(filename))
    return [
      {
        rule: "registry-deps",
        level: "error",
        file,
        line: 1,
        column: 1,
        message: "registry.json 不存在",
      },
    ]
  const text = fs.readFileSync(filename, "utf8"),
    sf = parse(file, text)
  let registry: { homepage?: string; items?: RegistryItem[] }
  try {
    registry = JSON.parse(text)
  } catch {
    return [
      {
        rule: "registry-deps",
        level: "error",
        file,
        line: 1,
        column: 1,
        message: "registry.json 不是有效 JSON",
      },
    ]
  }
  const items = registry.items ?? [],
    nodes = new Map<string, ts.Node>()
  walk(sf, (n) => {
    if (ts.isObjectLiteralExpression(n)) {
      const name = n.properties.find(
        (p) => ts.isPropertyAssignment(p) && p.name.getText(sf) === '"name"',
      )
      if (
        name &&
        ts.isPropertyAssignment(name) &&
        ts.isStringLiteral(name.initializer)
      )
        nodes.set(name.initializer.text, n)
    }
  })
  const add = (
    item: RegistryItem,
    level: Level,
    message: string,
    source?: { file: string; sf: ts.SourceFile; node: ts.Node },
  ) => {
    const pos = source
      ? source.sf.getLineAndCharacterOfPosition(source.node.getStart(source.sf))
      : sf.getLineAndCharacterOfPosition(
          (nodes.get(item.name) ?? sf).getStart(sf),
        )
    output.push({
      rule: "registry-deps",
      level,
      file: source?.file ?? file,
      line: pos.line + 1,
      column: pos.character + 1,
      message: `[${item.name}] ${message}`,
    })
  }
  const targets = new Map<string, { name: string; path: string }>()
  for (const item of items) {
    for (const entry of item.files ?? []) {
      if (entry.type === "registry:ui" && !entry.target)
        add(item, "error", `registry:ui 文件必须有 target：${entry.path}`)
      if (entry.target?.startsWith("components/"))
        add(
          item,
          "error",
          `target 不要写成 components/…，改用 @components/…（跟随使用方别名，monorepo 才能装对）：${entry.path}`,
        )
      if (!entry.target) continue
      const target = path.posix.normalize(entry.target)
      const previous = targets.get(target)
      if (previous && previous.path !== entry.path)
        add(
          item,
          "error",
          `target 冲突 ${target}：${previous.name} 的 ${previous.path} 与 ${entry.path}`,
        )
      targets.set(target, { name: item.name, path: entry.path })
    }
  }
  for (const item of items) {
    const own = new Set(
      (item.files ?? []).map((f) => slash(path.normalize(f.path))),
    )
    const deps = new Set(
      (item.registryDependencies ?? [])
        .map((d) => siteDependency(d, registry.homepage ?? "https://yiui.dev"))
        .filter((d): d is string => !!d),
    )
    const allowed = new Set(own)
    for (const other of items)
      if (deps.has(other.name))
        for (const f of other.files ?? [])
          allowed.add(slash(path.normalize(f.path)))
    const npm = new Set<string>()
    for (const f of own) {
      const absolute = path.join(root, f)
      if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) {
        add(item, "error", `files 路径不存在：${f}`)
        continue
      }
      const source = parse(f, fs.readFileSync(absolute, "utf8"))
      for (const { spec, node } of imports(source)) {
        const location = { file: f, sf: source, node }
        if (spec.startsWith("@/components/ui/")) {
          const name = spec
            .slice("@/components/ui/".length)
            .split("/", 1)
            .join("")
            .replace(/\.[jt]sx?$/, "")
          if (!deps.has(name))
            add(item, "error", `缺少 registryDependencies：${name}`, location)
        } else if (spec.startsWith("@/registry/") || spec.startsWith(".")) {
          const base = spec.startsWith("@/")
            ? `src/${spec.slice(2)}`
            : path.posix.normalize(path.posix.join(path.posix.dirname(f), spec))
          const candidates = [
            base,
            ...[".ts", ".tsx", ".js", ".jsx", "/index.ts", "/index.tsx"].map(
              (ext) => base + ext,
            ),
            base.replace(/\.js$/, ".ts"),
            base.replace(/\.js$/, ".tsx"),
          ]
          const resolved = candidates.find(
            (p) =>
              fs.existsSync(path.join(root, p)) &&
              fs.statSync(path.join(root, p)).isFile(),
          )
          if (!resolved || !allowed.has(resolved))
            add(
              item,
              "error",
              `引用文件未包含在 files 或本站 registryDependencies：${spec}`,
              location,
            )
        } else if (
          !spec.startsWith("@/") &&
          !/^(?:react|react-dom|next)(?:\/|$)/.test(spec) &&
          !isBuiltin(spec) &&
          !spec.startsWith("#")
        )
          npm.add(packageName(spec))
      }
    }
    const declared = new Set((item.dependencies ?? []).map(packageName))
    for (const name of npm)
      if (!declared.has(name)) add(item, "error", `缺少 dependencies：${name}`)
    for (const name of declared)
      if (!npm.has(name))
        add(item, "warn", `dependencies 已声明但未使用：${name}`)
  }
  return output
}
function sourceFiles(dir: string): string[] {
  return !fs.existsSync(dir)
    ? []
    : fs
        .readdirSync(dir, { withFileTypes: true })
        .flatMap((e) =>
          e.isDirectory()
            ? sourceFiles(path.join(dir, e.name))
            : /\.(ts|tsx)$/.test(e.name)
              ? [path.join(dir, e.name)]
              : [],
        )
}
const byPosition = (a: Ignored | Diagnostic, b: Ignored | Diagnostic) =>
  a.file.localeCompare(b.file) ||
  a.line - b.line ||
  ("column" in a && "column" in b ? a.column - b.column : 0) ||
  a.rule.localeCompare(b.rule)
function collect(root: string, rule?: string) {
  const results = sourceFiles(path.join(root, "src/registry"))
    .sort()
    .map((f) => slash(path.relative(root, f)))
    .filter((f) => !generatedFiles.has(f))
    .map((f) => lintFile(f, fs.readFileSync(path.join(root, f), "utf8")))
  const diagnostics = results
    .flatMap((result) => result.diagnostics)
    .concat(lintRegistry(root))
    .filter((d) => !rule || d.rule === rule)
    .sort(byPosition)
  const ignored = results
    .flatMap((result) => result.ignored)
    .filter((i) => !rule || i.rule === rule)
    .sort(byPosition)
  return { diagnostics, ignored }
}
function summarize(diagnostics: Diagnostic[], ignored: Ignored[]) {
  const byRule = Object.fromEntries(
    rules.map((rule) => [
      rule,
      {
        errors: diagnostics.filter(
          (d) => d.rule === rule && d.level === "error",
        ).length,
        warnings: diagnostics.filter(
          (d) => d.rule === rule && d.level === "warn",
        ).length,
      },
    ]),
  )
  return {
    errors: diagnostics.filter((d) => d.level === "error").length,
    warnings: diagnostics.filter((d) => d.level === "warn").length,
    ignored: {
      total: ignored.length,
      byRule: Object.fromEntries(
        rules
          .map((rule) => [rule, ignored.filter((i) => i.rule === rule).length])
          .filter(([, count]) => Number(count) > 0),
      ),
    },
    byRule,
  }
}
async function selfTest() {
  const { runSelfTests } = await import("./registry-lint/self-test")
  runSelfTests({
    lintSource,
    lintFile,
    lintRegistry,
    packageName,
    siteDependency,
    fixtureDir: path.join(
      path.dirname(fileURLToPath(import.meta.url)),
      "registry-lint/__fixtures__",
    ),
  })
}
async function main() {
  const args = process.argv.slice(2)
  let rule: string | undefined,
    maxWarnings = Infinity
  let json = false,
    test = false
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--rule") {
      rule = args[++i]
      if (!rule || !rules.includes(rule))
        throw new Error("--rule 必须是有效的规则 id")
    } else if (args[i] === "--max-warnings") {
      const value = args[++i]
      if (!value || !/^\d+$/.test(value))
        throw new Error("--max-warnings 必须是非负整数")
      maxWarnings = Number(value)
    } else if (args[i] === "--json") json = true
    else if (args[i] === "--self-test") test = true
    else throw new Error(`未知参数：${args[i]}`)
  }
  if (test) {
    await selfTest()
    console.log(
      json ? JSON.stringify({ selfTest: "passed" }) : "registry:lint 自测通过",
    )
    return
  }
  const { diagnostics, ignored } = collect(process.cwd(), rule),
    summary = summarize(diagnostics, ignored)
  const exceeded = summary.warnings > maxWarnings
  if (json)
    console.log(
      JSON.stringify(
        {
          diagnostics,
          ignored,
          summary,
          maxWarnings: Number.isFinite(maxWarnings) ? maxWarnings : null,
          maxWarningsExceeded: exceeded,
        },
        null,
        2,
      ),
    )
  else {
    const color = (s: string, code: number) =>
      process.stdout.isTTY ? `\x1b[${code}m${s}\x1b[0m` : s
    let current = ""
    for (const d of diagnostics) {
      if (current !== d.file) {
        current = d.file
        console.log(`\n${color(current, 1)}`)
      }
      console.log(
        `  ${d.line}:${d.column} ${color(d.level, d.level === "error" ? 31 : 33)} [${d.rule}] ${d.message}`,
      )
    }
    const ignoredDetail = Object.entries(summary.ignored.byRule)
      .map(([name, count]) => `${name} ${count}`)
      .join("、")
    console.log(
      `\n共 ${summary.errors} error，${summary.warnings} warn${exceeded ? `（超过上限 ${maxWarnings}）` : ""}，已忽略 ${summary.ignored.total} 条${ignoredDetail ? `（${ignoredDetail}）` : ""}`,
    )
  }
  if (summary.errors || exceeded) process.exitCode = 1
}
main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
