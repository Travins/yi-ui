/**
 * 动态格的洗牌逻辑：全部是纯函数，随机数来自种子，所以同一个 `seed` 在服务端与浏览器得到同一张初始画面，
 * 之后每一步由「种子 + 第几步」决定，行为可复现。
 */

/** 每个格子里放的是 `items` 的下标，`null` 表示空格。 */
type Slots = (number | null)[]
type Random = () => number

function createRandom(seed: number): Random {
  let state = (seed * 2654435761 + 1013904223) >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function pick<T>(list: T[], random: Random): T {
  const value = list[Math.floor(random() * list.length)]
  if (value === undefined) throw new RangeError("不能从空列表中抽取条目")
  return value
}

function shuffled<T>(list: T[], random: Random): T[] {
  const result = [...list]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[result[i], result[j]] = [result[j]!, result[i]!]
  }
  return result
}

const indicesWhere = (slots: Slots, empty: boolean) =>
  slots.flatMap((value, index) => ((value === null) === empty ? [index] : []))

/** 随机挑 `activeCount` 个条目，放进随机的格子。 */
function initialSlots(
  cells: number,
  poolSize: number,
  activeCount: number,
  random: Random,
): Slots {
  const slots: Slots = Array(cells).fill(null)
  const spots = shuffled(
    Array.from({ length: cells }, (_, i) => i),
    random,
  )
  const pool = shuffled(
    Array.from({ length: poolSize }, (_, i) => i),
    random,
  )
  for (let i = 0; i < Math.min(activeCount, cells, poolSize); i++)
    slots[spots[i]!] = pool[i]!
  return slots
}

/**
 * 走一步：数量不足就补一个、多了就拿掉一个；数量正好时随机在「换格」「换人」「互换」里选一种。
 * 每一步只动一两个格子，画面始终是渐变的，不会整盘重排。
 */
function stepSlots(
  slots: Slots,
  poolSize: number,
  activeCount: number,
  random: Random,
): Slots {
  const next = [...slots]
  const filled = indicesWhere(next, false)
  const empty = indicesWhere(next, true)
  const used = new Set(next.filter((v): v is number => v !== null))
  const unused = Array.from({ length: poolSize }, (_, i) => i).filter(
    (i) => !used.has(i),
  )

  if (filled.length > activeCount) {
    next[pick(filled, random)] = null
  } else if (filled.length < activeCount && empty.length && unused.length) {
    next[pick(empty, random)] = pick(unused, random)
  } else {
    const roll = random()
    if (roll < 0.4 && empty.length && filled.length) {
      const from = pick(filled, random)
      next[pick(empty, random)] = next[from] ?? null
      next[from] = null
    } else if (roll < 0.8 && empty.length && unused.length && filled.length) {
      next[pick(filled, random)] = null
      next[pick(empty, random)] = pick(unused, random)
    } else if (filled.length > 1) {
      const a = pick(filled, random)
      const b = pick(
        filled.filter((i) => i !== a),
        random,
      )
      ;[next[a], next[b]] = [next[b] ?? null, next[a] ?? null]
    }
  }
  return next
}

/**
 * 切换到某个分类：不在目标里的条目消失，已经在场的有一半挪到别的空格，缺的补进随机空格。
 * 已经在场的条目保持同一个下标，这样切换时能看到它们「换位」而不是重新出现。
 */
function arrangeSlots(slots: Slots, target: number[], random: Random): Slots {
  const wanted = new Set(target)
  const next: Slots = slots.map((v) => (v !== null && wanted.has(v) ? v : null))
  for (const from of shuffled(indicesWhere(next, false), random)) {
    const empty = indicesWhere(next, true)
    if (empty.length && random() < 0.5) {
      next[pick(empty, random)] = next[from] ?? null
      next[from] = null
    }
  }
  const present = new Set(next.filter((v): v is number => v !== null))
  for (const id of target) {
    if (present.has(id)) continue
    const empty = indicesWhere(next, true)
    if (!empty.length) break
    next[pick(empty, random)] = id
  }
  return next
}

/** 从在场的条目里挑 `count` 个点亮，返回它们的下标。 */
function pickLit(slots: Slots, count: number, random: Random): number[] {
  const present = slots.filter((v): v is number => v !== null)
  return shuffled(present, random).slice(0, count)
}

export { arrangeSlots, createRandom, initialSlots, pickLit, stepSlots }
export type { Random, Slots }
