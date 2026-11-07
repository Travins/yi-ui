import type { ChatChanges, ChatChart } from "./types"

type Script = {
  match: RegExp
  reasoning: string
  tools: {
    name: string
    input: Record<string, unknown>
    output?: unknown
    error?: string
    /** 这次调用在演示里「运行」多久（毫秒），默认 800 */
    duration?: number
    /** 用户点「重试」后返回的结果；没写的工具重试后仍然失败 */
    retryOutput?: unknown
  }[]
  source: { title: string; url: string }
  /** 工具返回后出现在分析过程与回答之间的图表，尺寸克制，保持消息紧凑 */
  chart?: ChatChart
  answer: string
  /** 回答文字之后附上的改动摘要，以 `data-changes` 数据块下发 */
  changes?: ChatChanges
}

// 所有数据均为演示数据，不会查询或操作真实服务。reasoning 是预写的分析摘要。
const scripts: Script[] = [
  {
    match: /这周|本周|周报/,
    reasoning:
      "先拉取本周核心指标，再和上周对比错误率与延迟，最后核对变更记录，找出真正有变化的几项。",
    tools: [
      {
        name: "查询核心指标",
        input: { period: "本周", compareWith: "上周" },
        output: { requests: "1,284 万", availability: "99.93%", status: "演示数据" },
      },
      {
        name: "对比错误率与延迟",
        input: { service: "api-gateway", metrics: "error_rate,p95" },
        output: { error_rate: "1.2%（上周 1.5%）", p95: "412 ms（上周 356 ms）" },
        duration: 1000,
      },
      {
        name: "拉取变更记录",
        input: { scope: "all", since: "7d", limit: 14 },
        output: {
          total: 14,
          items: [
            "周一 10:20 orders v2.8.0 发布",
            "周一 15:42 调整 gateway 限流阈值",
            "周二 09:05 payments 扩容至 6 副本",
            "周二 14:18 orders v2.8.1 发布（修复连接池）",
            "周三 11:30 关闭旧版 /v1/legacy 接口",
            "周三 16:47 search 索引重建",
            "周四 08:55 数据库只读副本切换",
            "周四 13:12 gateway 超时由 5s 调整为 8s",
            "周四 20:03 CDN 缓存规则更新",
            "周五 10:41 payments v3.1.0 发布",
            "周五 14:26 告警规则：新增延迟 P95 告警",
            "周五 17:09 search 查询超时调整",
            "周六 02:30 定时备份窗口调整",
            "周日 23:10 日志保留期调整为 30 天",
          ],
        },
        // 耗时较长的一次调用，用来演示实时计时
        duration: 2600,
      },
      {
        name: "汇总告警",
        input: { window: "7d", severity: "P1,P2" },
        output: { fired: 9, resolved: 9, longest: "34 分钟（周二 orders）" },
        duration: 900,
      },
    ],
    source: {
      title: "SRE 工作手册：监控分布式系统",
      url: "https://sre.google/sre-book/monitoring-distributed-systems/",
    },
    changes: {
      period: "本周 vs 上周",
      changes: [
        { label: "错误率", change: "下降 0.3 个百分点，至 1.2%", tone: "good", direction: "down" },
        { label: "P95 延迟", change: "上升 56 ms，至 412 ms", tone: "bad", direction: "up" },
        { label: "可用率", change: "99.93%，与上周基本持平", tone: "neutral", direction: "flat" },
        { label: "P1 / P2 告警", change: "减少 3 条，共 9 条，全部已恢复", tone: "good", direction: "down" },
        { label: "发布次数", change: "共 3 次，比上周多 1 次", tone: "neutral", direction: "up" },
      ],
    },
    answer:
      "整体偏稳：错误率下降，告警减少；需要留意的是 P95 延迟比上周高了约 56 ms。\n\n- 延迟上升的时间点接近周四网关超时由 5s 调到 8s，慢请求不再被提前截断，会抬高 P95。\n- 错误率下降与周二 `orders v2.8.1` 修复连接池一致。\n- 本周共 14 条变更，其中 3 次发布。\n\n以下是本周的变化摘要，均为模拟数据。",
  },
  {
    match: /慢查询|slow ?query/i,
    reasoning:
      "先读取 orders 的慢查询日志，再对照连接池与索引使用情况，判断慢在查询本身还是资源争用。",
    tools: [
      {
        name: "读取慢查询日志",
        input: { service: "orders", window: "1h", minDuration: "500ms" },
        error: "请求超时（8 秒）：日志服务暂时不可用（模拟失败）",
        duration: 1200,
        retryOutput: {
          total: 41,
          slowest: [
            "SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC · 2.4 s · 12 次",
            "UPDATE inventory SET stock = stock - ? WHERE sku = ? · 1.9 s · 8 次",
            "SELECT COUNT(*) FROM orders WHERE status = 'pending' · 1.7 s · 15 次",
            "SELECT * FROM coupons WHERE expires_at < ? · 1.2 s · 6 次",
            "SELECT o.*, i.* FROM orders o JOIN items i ON i.order_id = o.id · 1.1 s · 9 次",
            "DELETE FROM sessions WHERE updated_at < ? · 0.9 s · 3 次",
            "SELECT * FROM addresses WHERE user_id = ? · 0.8 s · 11 次",
            "SELECT * FROM audit_logs WHERE actor = ? ORDER BY id DESC · 0.7 s · 4 次",
            "SELECT * FROM shipments WHERE order_id IN (?) · 0.6 s · 7 次",
            "UPDATE orders SET status = ? WHERE id = ? · 0.5 s · 10 次",
          ],
          status: "演示数据",
        },
      },
      {
        name: "查看连接池状态",
        input: { service: "orders" },
        output: { active: 48, idle: 2, waiting: 17, max: 50, status: "演示数据" },
      },
      {
        name: "检查索引使用情况",
        input: { table: "orders", index: "idx_orders_user_created" },
        output: { used: false, reason: "查询按 user_id 过滤后排序，缺少复合索引", status: "演示数据" },
      },
    ],
    source: {
      title: "EXPLAIN 输出格式",
      url: "https://dev.mysql.com/doc/refman/8.4/en/explain-output.html",
    },
    answer:
      "日志服务这次超时了，我先根据连接池和索引的检查结果判断：\n\n- 连接池 50 个连接几乎占满，还有 17 个请求在排队，慢查询很可能是排队造成的。\n- `orders` 按 `user_id` 过滤再按时间排序，缺少复合索引，会触发额外排序。\n- 点上面失败工具里的「重试」可以重新读取慢查询日志，确认具体是哪几条语句。\n\n这些是模拟结果，没有改动任何数据库。",
  },
  {
    match: /API|可用率|监控/i,
    reasoning: "先对比可用率与错误分布，再核对最近一次发布，缩小排查范围。",
    tools: [
      {
        name: "查询可用率",
        input: { service: "api-gateway", window: "15m" },
        output: {
          availability: "97.8%",
          baseline: "99.95%",
          status: "演示数据",
        },
      },
      {
        name: "关联错误与发布",
        input: { service: "api-gateway", groupBy: "upstream" },
        output: {
          upstream: "orders",
          errors: "连接池超时",
          deployment: "v2.8.1",
          correlation: "发布后 3 分钟开始升高",
        },
      },
    ],
    source: {
      title: "Prometheus 查询基础",
      url: "https://prometheus.io/docs/prometheus/latest/querying/basics/",
    },
    chart: {
      kind: "series",
      title: "api-gateway 可用率",
      description: "近 15 分钟 · 演示数据",
      label:
        "api-gateway 近 15 分钟可用率走势，14:05 发布后从 99.9% 降到 97.8%",
      seriesLabel: "可用率",
      type: "area",
      tone: "trend",
      format: { style: "percent", digits: 2 },
      metrics: [
        { label: "当前", value: "97.80%", tone: "rose" },
        { label: "基线", value: "99.95%", tone: "green" },
        { label: "发布", value: "14:05 v2.8.1" },
      ],
      data: [
        99.96, 99.95, 99.97, 99.95, 99.94, 99.2, 98.4, 97.9, 97.6, 97.7, 97.9,
        97.8, 97.7, 97.8, 97.8,
      ].map((value, index) => ({
        label: `14:${String(index).padStart(2, "0")}`,
        value,
      })),
    },
    answer:
      "可用率下降与 `orders` 上游的连接池超时相关。演示窗口内可用率从 99.95% 降到 97.8%，错误集中在 `v2.8.1` 发布之后。\n\n- 先对照发布前后的连接池配置与慢查询。\n- 检查等待连接数、请求并发和数据库延迟。\n- 若错误持续扩大，按你的发布流程评估回滚。\n\n这些是模拟观测结果，尚未执行任何变更。",
  },
  {
    match: /vllm|显存|推理|GPU/i,
    reasoning:
      "先读取 GPU 显存快照，再对照 KV cache 与并发配置，区分预分配与实际压力。",
    tools: [
      {
        name: "读取 GPU 快照",
        input: {
          command:
            "nvidia-smi --query-gpu=memory.used,memory.total --format=csv",
        },
        output: {
          gpu: "A100 80GB",
          used: "72 GiB",
          utilization: "61%",
          status: "演示数据",
        },
      },
      {
        name: "检查 vLLM 配置",
        input: {
          service: "inference",
          metrics: "kv_cache_usage,requests_waiting",
        },
        output: {
          gpu_memory_utilization: 0.9,
          kv_cache_usage: "84%",
          requests_waiting: 12,
          max_model_len: 32768,
        },
      },
    ],
    source: {
      title: "vLLM 性能与调优",
      url: "https://docs.vllm.ai/en/latest/configuration/optimization/",
    },
    chart: {
      kind: "rings",
      title: "A100 80GB 资源占用",
      description: "显存、KV cache 与算力 · 演示数据",
      label: "显存已用 90%，KV cache 已用 84%，GPU 利用率 61%",
      items: [
        { label: "显存 72/80G", value: 90, display: "90%", tone: "blue" },
        { label: "KV cache", value: 84, display: "84%", tone: "amber" },
        { label: "GPU 利用率", value: 61, display: "61%", tone: "green" },
      ],
    },
    answer:
      "当前演示服务使用约 `72 / 80 GiB` 显存。`gpu_memory_utilization=0.9` 会预留大部分显存，因此高占用本身不等于泄漏。\n\n- KV cache 已用 84%，同时有 12 个请求排队，建议观察峰值并发。\n- 若长上下文并非必需，可评估降低 `max_model_len`。\n- 调整前记录吞吐、首 token 延迟与 OOM 次数，并做压测对比。\n\n我只展示了模拟检查结果，没有修改推理服务。",
  },
  {
    match: /pnpm|CI|install|前端/i,
    reasoning:
      "先查看 CI 安装日志，再检查 lockfile 和包管理器版本是否与本地一致。",
    tools: [
      {
        name: "读取 CI 安装日志",
        input: {
          job: "frontend-build",
          step: "pnpm install --frozen-lockfile",
        },
        error:
          "ERR_PNPM_OUTDATED_LOCKFILE：package.json 与 pnpm-lock.yaml 不一致（模拟失败）",
      },
      {
        name: "核对包管理器",
        input: { files: "package.json, pnpm-lock.yaml" },
        output: {
          local: "pnpm 10",
          ci: "pnpm 9",
          lockfile: "缺少新增依赖项",
          status: "演示数据",
        },
      },
    ],
    source: { title: "pnpm install 文档", url: "https://pnpm.io/cli/install" },
    chart: {
      kind: "series",
      title: "frontend-build 各步骤耗时",
      description: "上一次成功运行 · 单位：秒 · 演示数据",
      label: "上一次成功运行的各步骤耗时，安装依赖最长，为 94 秒",
      seriesLabel: "耗时（秒）",
      type: "bar",
      tone: "blue",
      highlight: "max",
      format: { digits: 0 },
      metrics: [
        { label: "本次安装", value: "失败 · 3 秒", tone: "rose" },
        { label: "上次总耗时", value: "238 秒" },
      ],
      data: [
        { label: "安装", value: 94 },
        { label: "构建", value: 71 },
        { label: "类型", value: 38 },
        { label: "测试", value: 26 },
        { label: "检查", value: 9 },
      ],
    },
    answer:
      "这次模拟失败来自锁文件不同步：`--frozen-lockfile` 检测到依赖声明发生变化，CI 与本地 pnpm 版本也不一致。\n\n- 在 `packageManager` 中固定团队使用的 pnpm 版本。\n- 使用相同版本在本地运行 `pnpm install`，检查并提交锁文件差异。\n- 让 CI 使用固定版本，然后重新运行安装任务。\n\n保留 `--frozen-lockfile`，有助于保证安装可复现。",
  },
]
const fallback: Script = {
  match: /.*/,
  reasoning: "先明确问题范围，检查已有上下文，再整理可验证的下一步。",
  tools: [
    {
      name: "读取工作区摘要",
      input: { scope: "demo" },
      output: {
        services: ["应用监控", "模型部署", "前端工程"],
        mode: "离线演示",
      },
    },
    {
      name: "检查上下文",
      input: { source: "当前问题" },
      output: {
        missing: ["环境", "错误日志", "发生时间"],
        status: "需要更多信息",
      },
    },
  ],
  source: { title: "AI SDK 文档", url: "https://ai-sdk.dev/docs/introduction" },
  answer:
    "我可以帮你排查应用监控、模型部署和前端工程问题。当前使用离线演示数据。\n\n- 请补充问题发生的环境与时间。\n- 提供经过脱敏的错误日志或配置片段。\n- 说明预期行为与实际结果，便于逐项验证。",
}

export { scripts, fallback }
