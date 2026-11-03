/**
 * 生成全国省、市、区县三级行政区划数据：`pnpm regions:build`。
 *
 * 数据来自国家地名信息库的公开接口（民政部，https://dmfw.mca.gov.cn/interface.html），
 * 只在维护者本机按需运行，产物 src/registry/lib/china-regions.ts 提交入库；站点和用户项目运行时都不访问该接口。
 *
 * 处理规则：
 * - 代码取前 6 位（国标县级以上代码），名称用官方全称
 * - 层级照官方原样：直辖市只有「市 → 区」两级，省直辖县级市、不设区的市没有下级
 * - 不收录香港、澳门、台湾（见 EXCLUDED_PROVINCES）
 * - 拼音用 pinyin-pro 生成，地名特殊读音（成都 du、六安 lu、蔚县 yu……）按下方修正表覆盖；ü 写作 v
 */
import { writeFile } from "node:fs/promises"
import { pinyin } from "pinyin-pro"

const API = "https://dmfw.mca.gov.cn/9095/xzqh/getList"
const OUTPUT = "src/registry/lib/china-regions.ts"
// 接口会拒绝没有浏览器 UA 的请求
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36"

/**
 * 地名特殊读音修正表：键为去掉「省、市、区、县」等后缀前的名称开头，值为空格分隔的音节。
 * 来源：逐条核对 pinyin-pro 与人工校对数据的 73 处分歧后确定。新增地名读错时在这里补充。
 */
const PINYIN_OVERRIDES: Record<string, string> = {
  乐亭: "lao ting",
  襄都: "xiang du",
  信都: "xin du",
  望都: "wang du",
  蔚县: "yu xian",
  大城: "da cheng",
  万柏林: "wan bai lin",
  繁峙: "fan shi",
  尧都: "yao du",
  洪洞: "hong tong",
  昆都仑: "kun du lun",
  克什克腾: "ke shi ke teng",
  康巴什: "kang ba shi",
  商都: "shang du",
  调兵山: "diao bing shan",
  珲春: "hun chun",
  大箐山: "da qing shan",
  穆棱: "mu ling",
  绥棱: "sui ling",
  闵行: "min hang",
  六合: "lu he",
  六安: "lu an",
  盐都: "yan du",
  江都: "jiang du",
  乐清: "yue qing",
  莲都: "lian du",
  蚌山: "beng shan",
  蚌埠: "beng bu",
  歙县: "she xian",
  涡阳: "guo yang",
  都昌: "du chang",
  宁都: "ning du",
  于都: "yu du",
  乐陵: "le ling",
  单县: "shan xian",
  殷都: "yin du",
  浚县: "xun xian",
  魏都: "wei du",
  召陵: "shao ling",
  泌阳: "bi yang",
  黄陂: "huang pi",
  宜都: "yi du",
  曾都: "zeng du",
  花都: "hua du",
  大埔: "da bu",
  都安: "du an",
  丰都: "feng du",
  新都: "xin du",
  郫都: "pi du",
  什邡: "shi fang",
  丹棱: "dan ling",
  筠连: "jun lian",
  都匀: "du yun",
  三都: "san du",
  牟定: "mou ding",
  昌都: "chang du",
  秦都: "qin du",
  略阳: "lve yang",
  吴堡: "wu bu",
  民乐: "min le",
  武都: "wu du",
  宕昌: "tan chang",
  乐都: "le du",
  都兰: "du lan",
  红寺堡: "hong si bu",
  尉犁: "yu li",
  乌什: "wu shi",
  阿图什: "a tu shi",
  喀什: "ka shi",
  塔什库尔干: "ta shi ku er gan",
}
// 最长匹配优先，避免「喀什」抢在「塔什库尔干」之类更长的键前面
const OVERRIDE_KEYS = Object.keys(PINYIN_OVERRIDES).sort(
  (a, b) => b.length - a.length,
)

type ApiNode = {
  code: string
  name: string
  level: number
  children?: ApiNode[] | null
}

type Region = {
  code: string
  name: string
  pinyin: string
  children?: Region[]
}

function syllables(text: string) {
  return pinyin(text, { toneType: "none", type: "array", v: true }).join(" ")
}

export function toPinyin(name: string) {
  const key = OVERRIDE_KEYS.find((k) => name.startsWith(k))
  if (!key) return syllables(name)
  const override = PINYIN_OVERRIDES[key]
  if (override === undefined) return syllables(name)
  const rest = name.slice(key.length)
  return rest ? `${override} ${syllables(rest)}` : override
}

async function fetchList(query: string): Promise<ApiNode> {
  // 接口偶尔返回空响应，最多重试 3 次
  for (let attempt = 1; attempt <= 3; attempt++) {
    const response = await fetch(`${API}?${query}`, {
      headers: { "User-Agent": USER_AGENT },
    })
    const text = await response.text()
    if (response.ok && text.trim()) {
      return (JSON.parse(text) as { data: ApiNode }).data
    }
    await new Promise((resolve) => setTimeout(resolve, 1000 * attempt))
  }
  throw new Error(`国家地名信息库接口请求失败：${query}`)
}

/**
 * 不收录的省级：香港、澳门、台湾。它们在官方数据里只有省级一条、没有下级，
 * 放进省市区选择里只会多出几个选不下去的项（台湾省的代码还是占位文字「资料暂缺」）
 */
const EXCLUDED_PROVINCES = new Set([
  "香港特别行政区",
  "澳门特别行政区",
  "台湾省",
])

function toCode(node: ApiNode) {
  // 遇到非数字代码直接报错，避免占位值之类的脏数据进库
  if (!/^\d{6}/.test(node.code))
    throw new Error(`${node.name} 的代码不是数字：${node.code}`)
  return node.code.slice(0, 6)
}

function toRegion(node: ApiNode): Region {
  const children = (node.children ?? []).map(toRegion)
  return {
    code: toCode(node),
    name: node.name,
    pinyin: toPinyin(node.name),
    ...(children.length ? { children } : {}),
  }
}

function render(region: Region, depth: number): string {
  const indent = "  ".repeat(depth)
  const head = `code: ${JSON.stringify(region.code)}, name: ${JSON.stringify(region.name)}, pinyin: ${JSON.stringify(region.pinyin)}`
  if (!region.children) return `${indent}{ ${head} },`
  const children = region.children.map((child) => render(child, depth + 1))
  return [
    `${indent}{`,
    `${indent}  ${head},`,
    `${indent}  children: [`,
    ...children.map((line) => `  ${line}`),
    `${indent}  ],`,
    `${indent}},`,
  ].join("\n")
}

async function main() {
  const root = await fetchList("maxLevel=1")
  const provinces: Region[] = []
  // 逐省请求本级、下级、下下级；间隔一下，避免给公共接口造成压力
  for (const province of root.children ?? []) {
    if (EXCLUDED_PROVINCES.has(province.name)) continue
    provinces.push(
      toRegion(await fetchList(`code=${province.code.slice(0, 6)}&maxLevel=2`)),
    )
    await new Promise((resolve) => setTimeout(resolve, 300))
  }

  let count = 0
  const walk = (list: Region[]) => {
    for (const region of list) {
      count++
      if (region.children) walk(region.children)
    }
  }
  walk(provinces)

  const fetchedAt = new Date().toISOString().slice(0, 10)
  const source = `/**
 * 全国省、市、区县三级行政区划数据（共 ${count} 条），由 scripts/build-china-regions.ts 生成，不要手改。
 *
 * 来源：国家地名信息库（民政部）公开接口，采集于 ${fetchedAt}。
 * - code：6 位行政区划代码（GB/T 2260 县级以上部分）
 * - name：官方全称
 * - pinyin：全称的无声调拼音，音节用空格分隔，ü 写作 v
 * - children：下级；直辖市只有「市 → 区」两级，省直辖县级市、不设区的市没有下级
 *
 * 任何符合 ChinaRegion 结构的数据都可以替换它，例如只保留可配送地区，或换成自己维护的版本。
 */
export type ChinaRegion = {
  code: string
  name: string
  pinyin?: string
  children?: ChinaRegion[]
}

/** 数据采集日期，界面上可用来提示数据版本 */
const CHINA_REGIONS_UPDATED_AT = ${JSON.stringify(fetchedAt)}

const chinaRegions: ChinaRegion[] = [
${provinces.map((province) => render(province, 1)).join("\n")}
]

export { CHINA_REGIONS_UPDATED_AT, chinaRegions }
`
  await writeFile(OUTPUT, source)
  console.log(`已生成 ${OUTPUT}：${provinces.length} 个省级、共 ${count} 条`)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  void main()
}
