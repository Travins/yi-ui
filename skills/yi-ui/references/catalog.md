<!-- 由 scripts/build-skill-catalog.ts 生成，不要手改。 -->

# Yi UI 条目目录

安装：`pnpm dlx shadcn@latest add @yiui/<条目>`。点条目名读完整文档（含示例代码和属性表）。

## 组件

### 图形与动效

| 条目 | 中文名 | 导入路径 | 说明 |
| --- | --- | --- | --- |
| [isometric-mark](https://yiui.dev/md/components/isometric-mark.md) | 等轴测标志 | `@/components/ui/isometric-mark/isometric-mark` | 把任意平面多边形挤出成等轴测线条 3D：多种顶面材质与地面、跟随鼠标的线条高光、点击按下与音效。 |
| [flow-diagram](https://yiui.dev/md/components/flow-diagram.md) | 流程动画图示 | `@/components/ui/flow-diagram/flow-diagram` | 节点、细线与流动光点组成的循环动画流程图：统一时间轴、进入视口才播放、减少动态效果时停在静帧；色调与底纹可配置，附带光点路径、逐字输入、加载圈与状态点等原语。 |
| [orbit](https://yiui.dev/md/components/orbit.md) | 轨道环绕 | `@/components/ui/orbit/orbit` | 可组合的同心轨道与正向节点，支持半弧、反向运行与离屏暂停。 |
| [ripple](https://yiui.dev/md/components/ripple.md) | 波纹脉冲 | `@/components/ui/ripple/ripple` | 同心波纹与径向标记，支持扩散脉冲、覆盖范围与离屏暂停。 |
| [globe](https://yiui.dev/md/components/globe.md) | 点阵地球 | `@/components/ui/globe/globe` | 用点阵绘制的 WebGL 地球，颜色跟随主题，支持城市标记、标签、弧线、拖拽旋转与离屏暂停。 |
| [shuffle-grid](https://yiui.dev/md/components/shuffle-grid.md) | 动态格 | `@/components/ui/shuffle-grid/shuffle-grid` | 方格里的内容随机出现、换位、点亮，支持分类胶囊切换、首字母头像、纯色像素块与离屏暂停。 |
| [glyph-field](https://yiui.dev/md/components/glyph-field.md) | 字符矩阵 | `@/components/ui/glyph-field/glyph-field` | 由主题色字符组成的自适应画布背景，支持混合色调、渐隐遮罩、中心内容与离屏暂停。 |
| [code-stack](https://yiui.dev/md/components/code-stack.md) | 代码文件堆叠 | `@/components/ui/code-stack/code-stack` | 带行号与语法骨架的代码文件卡，支持扇形、级联、网格排列与悬停散开。 |

### 表单与输入

| 条目 | 中文名 | 导入路径 | 说明 |
| --- | --- | --- | --- |
| [value-slider](https://yiui.dev/md/components/value-slider.md) | 数值滑块 | `@/components/ui/value-slider/value-slider` | 带标签与读数的数值滑块，支持区间、缓冲进度、刻度磁吸、数值格式化与拖出两端的弹性过冲。 |
| [amount-input](https://yiui.dev/md/components/amount-input.md) | 金额输入 | `@/components/ui/amount-input/amount-input` | 付款、报销、订单金额用的输入框：实时千分位且光标不乱跳，限制小数位与范围，粘贴自动规范化，下方同步显示人民币大写与「约 1.2亿」估读。 |
| [phone-input](https://yiui.dev/md/components/phone-input.md) | 手机号输入 | `@/components/ui/phone-input/phone-input` | 中国大陆手机号输入：边输边按 3-4-4 分隔且光标不乱跳，粘贴、自动填充带 +86 或横线的号码自动整理，失焦校验号段；条内可放带倒计时的「获取验证码」。值是 11 位纯数字。 |
| [id-number-input](https://yiui.dev/md/components/id-number-input.md) | 证件号输入 | `@/components/ui/id-number-input/id-number-input` | 身份证号、银行卡号与统一社会信用代码输入：自动整理与分组、保持光标、失焦校验，支持打码显示和原始值提交。 |
| [number-stepper](https://yiui.dev/md/components/number-stepper.md) | 数量选择 | `@/components/ui/number-stepper/number-stepper` | 方条数量选择，支持长按步进、范围约束和异步提交，保存失败自动回滚。 |
| [steps](https://yiui.dev/md/components/steps.md) | 步骤条 | `@/components/ui/steps/steps` | 多步流程的进度与回退导航，支持横排、竖排、错误状态和随容器宽度切换的紧凑形态。 |
| [region-picker](https://yiui.dev/md/components/region-picker.md) | 省市区选择 | `@/components/ui/region-picker/region-picker` | 分步选择省 / 市 / 区：步骤条清楚显示第几步、可点回上一步，长列表按拼音首字母分组，支持汉字、全拼、首字母搜索；手机上从底部弹出面板。值只存最末一级的代码，数据由 props 传入、可惰性加载。 |
| [segmented-control](https://yiui.dev/md/components/segmented-control.md) | 分段选择 | `@/components/ui/segmented-control/segmented-control` | 方条样式的互斥选项组，选中块在选项间滑动，可带图标或小样，与数值滑块同一套高度。 |
| [toggle-switch](https://yiui.dev/md/components/toggle-switch.md) | 方条开关 | `@/components/ui/toggle-switch/toggle-switch` | 整条可点的开关，打开时铺上淡色、圆形手柄滑到右端，与数值滑块同一套高度。 |
| [tone-picker](https://yiui.dev/md/components/tone-picker.md) | 色调选择 | `@/components/ui/tone-picker/tone-picker` | 方条左侧标签、右侧一排色点的单选组，色点取主题变量，跟随亮暗与颜色主题。 |
| [angle-dial](https://yiui.dev/md/components/angle-dial.md) | 角度刻度尺 | `@/components/ui/angle-dial/angle-dial` | 方条样式的角度输入：左右拖动刻度、中间竖线指针读数，满一圈首尾相接，与数值滑块同一套高度。 |
| [xy-pad](https://yiui.dev/md/components/xy-pad.md) | 二维拖拽板 | `@/components/ui/xy-pad/xy-pad` | 一块带网格的区域，拖动手柄同时调两个值，十字线与淡色填充标出位置，键盘左右 / 上下分别调两条轴。 |
| [control-panel](https://yiui.dev/md/components/control-panel.md) | 控制面板 | `@/components/ui/control-panel/control-panel` | 承载方条控件的面板容器：标题栏、分组网格、恢复按钮，以及把当前参数复制为 JSX 的按钮。 |
| [file-upload](https://yiui.dev/md/components/file-upload.md) | 文件上传 | `@/components/ui/file-upload/file-upload` | 多文件选择与证件槽位，支持拖放、拍照、格式大小校验与受控上传状态，组件不发送请求。 |
| [bar-field](https://yiui.dev/md/components/bar-field.md) | 方条文本框 | `@/components/ui/bar-field/bar-field` | 方条系列基础文本框，支持标签、图标、后缀和错误提示。 |
| [bar-select](https://yiui.dev/md/components/bar-select.md) | 方条下拉选择 | `@/components/ui/bar-select/bar-select` | 方条下拉选择，支持搜索、多选、分组与触屏底部面板。 |
| [color-picker](https://yiui.dev/md/components/color-picker.md) | 颜色选择 | `@/components/ui/color-picker/color-picker` | 可直接编辑 HEX 的方条颜色选择，支持二维取色、透明度与预设色板。 |
| [palette-editor](https://yiui.dev/md/components/palette-editor.md) | 配色编辑器 | `@/components/ui/palette-editor/palette-editor` | 编辑有序配色，提供色觉模拟与可区分性提示。 |

### 数据展示

| 条目 | 中文名 | 导入路径 | 说明 |
| --- | --- | --- | --- |
| [stat-card](https://yiui.dev/md/components/stat-card.md) | 统计卡片 | `@/components/ui/stat-card/stat-card` | 一组可组合的统计卡片原语：KPI 数字与涨跌幅（绿涨红跌 / 红涨绿跌可切换）、目标状态行、配额进度条、分格计量条、延迟分区表、占比分布条与图例，数字默认按万 / 亿压缩。 |
| [mini-chart](https://yiui.dev/md/components/mini-chart.md) | 迷你图 | `@/components/ui/mini-chart/mini-chart` | 放进卡片的极简图表：柱、折线、面积、阶梯线、进度环与环形图。无网格无纵轴，可选 11px 横轴，涨跌色随配色约定变化，尊重「减少动态效果」。 |
| [chart-card](https://yiui.dev/md/components/chart-card.md) | 图表卡片 | `@/components/ui/chart-card/chart-card` | 图表卡片布局（标题、指标行、图例、明细表）加三个图表：刻度式环形仪表、多序列折线 / 柱 / 面积图（支持堆叠与正负对比）、横向排名条。基于 shadcn chart，颜色全部取自主题变量。 |
| [grid-pagination](https://yiui.dev/md/components/grid-pagination.md) | 网格分页 | `@/components/ui/grid-pagination/grid-pagination` | 整条是一行格子的分页：信息、每页条数、首尾页、页码与跳页各占一格，可单独使用，也可贴在表格底部。 |
| [grid-toolbar](https://yiui.dev/md/components/grid-toolbar.md) | 网格工具栏 | `@/components/ui/grid-toolbar/grid-toolbar` | 一行格子组成的工具栏，格子之间虚线分隔、窄容器自动换行；方条输入、分段选择、方条下拉放进来会自动去掉外框铺满整格。 |

### 文字与滚动

| 条目 | 中文名 | 导入路径 | 说明 |
| --- | --- | --- | --- |
| [marquee](https://yiui.dev/md/components/marquee.md) | 跑马灯 | `@/components/ui/marquee/marquee` | 纯 CSS 无缝跑马灯，支持四向滚动、恒定速度、渐隐与斜向丝带。 |
| [text-animate](https://yiui.dev/md/components/text-animate.md) | 文字动效 | `@/components/ui/text-animate/text-animate` | 关键词轮换、分字显现、乱码解码与高亮扫过，支持中文与渐进增强。 |

### 内容展示

| 条目 | 中文名 | 导入路径 | 说明 |
| --- | --- | --- | --- |
| [timeline](https://yiui.dev/md/components/timeline.md) | 时间线 | `@/components/ui/timeline/timeline` | 可组合的时间线原语，支持经历、活动流、项目进度、水平路线图与交替更新日志。 |
| [card-stack](https://yiui.dev/md/components/card-stack.md) | 卡片堆叠 | `@/components/ui/card-stack/card-stack` | 细边框卡片的层叠轮播，支持自动轮换、拖拽、键盘切换与减少动态效果。 |
| [checklist](https://yiui.dev/md/components/checklist.md) | 手写清单 | `@/components/ui/checklist/checklist` | 勾选时文字被手写感划线划掉的清单，支持受控与非受控、进度汇总、自动播放与紧凑尺寸。 |

### 时间

| 条目 | 中文名 | 导入路径 | 说明 |
| --- | --- | --- | --- |
| [local-time](https://yiui.dev/md/components/local-time.md) | 实时当地时间 | `@/components/ui/local-time/local-time` | 按指定 IANA 时区显示实时时间：行内时间可带 UTC 偏移、昼夜图标与同访客的时差；另提供世界时钟（列表 / 卡片）和平滑转动的 SVG 模拟表盘。 |
| [greeting](https://yiui.dev/md/components/greeting.md) | 时段问候 | `@/components/ui/greeting/greeting` | 按访客本地时间问候：时段图标与色调、可配置的分段时间与称呼；附带四时段指示条和会轮换副标题的问候卡片，首屏用静态文案避免水合差异。 |

### 布局

| 条目 | 中文名 | 导入路径 | 说明 |
| --- | --- | --- | --- |
| [grid-layout](https://yiui.dev/md/components/grid-layout.md) | 线条网格布局 | `@/components/ui/grid-layout/grid-layout` | 用全宽横线、竖线容器与点阵分隔带，为内容建立清晰的秩序。 |

### 工具函数

| 条目 | 中文名 | 导入路径 | 说明 |
| --- | --- | --- | --- |
| [flow-tone](https://yiui.dev/md/components/flow-tone.md) | 色调变量 | - | 全站带颜色的组件共用的色调：primary、blue、green 等内置名或任意 CSS 颜色，统一换成 --flow-tone 变量；附带六种多彩色调的亮 / 暗取值，在全局样式里改写即可换成品牌色。 |
| [chinese-number](https://yiui.dev/md/components/chinese-number.md) | 中文数字 | - | 人民币大写（按财务规范，万亿级、零的省略、分以下四舍五入）与整数中文读法的纯函数工具，无依赖，服务端可用。 |
| [china-regions](https://yiui.dev/md/components/china-regions.md) | 全国行政区划 | - | 全国省、市、区县三级行政区划数据，取自国家地名信息库：6 位国标代码、官方全称和校对过的地名拼音，直辖市照官方为两级。纯数据，可替换为自己的版本。 |
| [color](https://yiui.dev/md/components/color.md) | 颜色计算 | - | 零依赖 HEX、RGB、HSV 与 HSL 颜色转换。 |
| [color-vision](https://yiui.dev/md/components/color-vision.md) | 色觉计算 | - | 零依赖色觉模拟、Lab 与 CIEDE2000 色差计算。 |

## 区块

| 条目 | 中文名 | 说明 |
| --- | --- | --- |
| [auth-01](https://yiui.dev/md/blocks/auth-01.md) | 分屏登录页 | 左侧品牌面板 + 右侧表单的分屏登录页：登录（密码 / 验证码）、注册（带强度条）、找回密码，zod 校验；品牌面板与表单控件直接用本站自己的组件拼成。 |
| [settings-01](https://yiui.dev/md/blocks/settings-01.md) | 设置页 | 用方条控件拼成的完整设置页：分区导航、实时预览、已修改计数、恢复默认与异步保存。 |
| [sidebar-01](https://yiui.dev/md/blocks/sidebar-01.md) | 可收起侧栏 | 基于官方 Sidebar 的可收起侧栏：搜索过滤、手风琴分组、带引导线的子项，收起成图标栏后悬停浮出子菜单，手机端沿用抽屉。 |
| [sidebar-02](https://yiui.dev/md/blocks/sidebar-02.md) | 团队与账号切换侧栏 | 基于 shadcn 官方 Sidebar：团队切换（⌘1…⌘9）、⌘K 搜索、分组导航、用户卡与多账号切换，可收起成图标，移动端为抽屉。 |
| [sidebar-03](https://yiui.dev/md/blocks/sidebar-03.md) | 工作区树侧栏 | 图标轨与工作区树双栏侧栏，支持树键盘导航、模块切换、筛选和移动端抽屉。 |
| [sidebar-04](https://yiui.dev/md/blocks/sidebar-04.md) | 右侧上下文面板 | 右侧上下文面板，组合项目进度、状态分布与分给我的任务。 |
| [agent-chat-01](https://yiui.dev/md/blocks/agent-chat-01.md) | AI 助手面板 | 从企业监控平台提炼的 AI 助手：嵌入与浮动布局切换，紧凑的 Trace 展示分析摘要、工具调用与来源，回答里可带迷你图与进度环，内置流式演示。 |
| [checkout-01](https://yiui.dev/md/blocks/checkout-01.md) | 订单结算 | 地址、配送、发票与支付方式组成的订单结算区块。 |
| [data-table-01](https://yiui.dev/md/blocks/data-table-01.md) | 数据表格 | 支持排序、筛选、选择、编辑与虚拟滚动的原生数据表格。 |
| [theme-customizer-01](https://yiui.dev/md/blocks/theme-customizer-01.md) | 主题定制面板 | 即时调整主题色、圆角、内容宽度与亮暗，支持首帧恢复。 |

## 页面

| 条目 | 中文名 | 说明 |
| --- | --- | --- |
| [app-shell-01](https://yiui.dev/md/pages/app-shell-01.md) | 企业控制台布局 | 提炼自企业监控平台的控制台外壳：固定顶栏、可折叠一级导航、二级工作区侧栏、独立滚动主区域，窄屏变抽屉，并预留右侧 aside 插槽（可放 AI 助手面板）。 |
