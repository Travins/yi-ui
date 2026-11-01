"use client"

import * as React from "react"

/**
 * 按下 / 松开的音效：用 Web Audio 现场合成，不需要音频文件。
 * 按下是一声清脆的「咔」（短促的下滑正弦 + 高频带通噪声做触感，只留少量低频厚度），松开是更轻、更高的一声「嗒」。
 * 浏览器的自动播放限制见下面的 unlock：手机上第一次按下的声音会在松手时补放。
 */
let context: AudioContext | null = null
/** 音频还没解锁时攒下的声音：解锁后补放，超过 PENDING_TTL 毫秒的就丢掉 */
let pending: { play: (ctx: AudioContext) => void; at: number }[] = []
const PENDING_TTL = 600

function audio() {
  if (typeof window === "undefined") return null
  if (!context) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext
    if (!Ctor) return null
    context = new Ctor()
  }
  return context
}

function flush() {
  const ctx = context
  if (ctx?.state !== "running") return
  removeUnlockListeners()
  const now = performance.now()
  const queue = pending
  pending = []
  for (const item of queue) if (now - item.at < PENDING_TTL) item.play(ctx)
}

/**
 * 手机浏览器只认「松手」类的手势解锁音频（pointerup、touchend、click、keydown），
 * 触摸的按下不算，所以手指按下那一刻 AudioContext 还是挂起的。
 * 在页面上监听这些手势：第一次松手就恢复 AudioContext 并补放刚才攒下的声音，之后按下也能直接出声。
 * 老版 iOS 还要在手势里真正播一段声音才算解锁，顺手播一个 1 帧的静音缓冲。
 */
function unlock() {
  const ctx = audio()
  if (!ctx) return
  if (ctx.state === "running") return flush()
  const silent = ctx.createBufferSource()
  silent.buffer = ctx.createBuffer(1, 1, ctx.sampleRate)
  silent.connect(ctx.destination)
  silent.start()
  void ctx.resume().then(flush, () => {})
}

const GESTURES = ["pointerup", "touchend", "click", "keydown"] as const
let listening = false

/**
 * 解锁监听懒挂载：第一次真正要发声、而音频还挂起时才挂上，解锁后立即移除。
 * 只导入组件、不出声的页面不会创建 AudioContext，也不会在 window 上留下监听。
 */
function listenForUnlock() {
  if (listening) return
  listening = true
  for (const type of GESTURES)
    window.addEventListener(type, unlock, { capture: true, passive: true })
}

function removeUnlockListeners() {
  if (!listening) return
  listening = false
  for (const type of GESTURES) window.removeEventListener(type, unlock, true)
}

/** 有声就放；还没解锁就先记下，解锁后补放 */
function withAudio(play: (ctx: AudioContext) => void) {
  const ctx = audio()
  if (!ctx) return
  if (ctx.state === "running") {
    removeUnlockListeners()
    return play(ctx)
  }
  listenForUnlock()
  // 只留最近两声：解锁前拖了一路滑块，补放时不能一下子炸出一串滴答
  pending = [...pending, { play, at: performance.now() }].slice(-2)
  void ctx.resume().then(flush, () => {})
}

function tone(
  ctx: AudioContext,
  from: number,
  to: number,
  duration: number,
  volume: number,
) {
  const now = ctx.currentTime
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = "sine"
  osc.frequency.setValueAtTime(from, now)
  osc.frequency.exponentialRampToValueAtTime(to, now + duration)
  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.exponentialRampToValueAtTime(volume, now + 0.004)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)
  osc.connect(gain).connect(ctx.destination)
  osc.start(now)
  osc.stop(now + duration + 0.02)
}

function tick(
  ctx: AudioContext,
  frequency: number,
  duration: number,
  volume: number,
) {
  const now = ctx.currentTime
  const length = Math.ceil(ctx.sampleRate * duration)
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < length; i++)
    data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 3
  const source = ctx.createBufferSource()
  source.buffer = buffer
  const filter = ctx.createBiquadFilter()
  filter.type = "bandpass"
  filter.frequency.value = frequency
  filter.Q.value = 1.2
  const gain = ctx.createGain()
  gain.gain.value = volume
  source.connect(filter).connect(gain).connect(ctx.destination)
  source.start(now)
}

const mix = (a: number, b: number, t: number) => a + (b - a) * t

/**
 * 音色在「闷」与「脆」之间连续插值：0 是低沉的「咚」（长低频、暗噪声），
 * 1 是清脆的「咔」（短低频、加一层高频短音、亮噪声）。默认 0.6。
 */
function playPress(crisp = 0.6) {
  const t = Math.min(Math.max(crisp, 0), 1)
  withAudio((ctx) => {
    tone(
      ctx,
      mix(150, 340, t),
      mix(62, 150, t),
      mix(0.14, 0.06, t),
      mix(0.22, 0.12, t),
    )
    if (t > 0.05)
      tone(ctx, mix(900, 1600, t), mix(700, 1000, t), 0.03, 0.08 * t)
    tick(ctx, mix(1600, 4200, t), mix(0.022, 0.013, t), mix(0.1, 0.22, t))
  })
}

function playRelease(crisp = 0.6) {
  const t = Math.min(Math.max(crisp, 0), 1)
  withAudio((ctx) => {
    tone(
      ctx,
      mix(260, 700, t),
      mix(180, 520, t),
      mix(0.06, 0.035, t),
      mix(0.08, 0.06, t),
    )
    tick(ctx, mix(3000, 6000, t), mix(0.012, 0.009, t), mix(0.05, 0.13, t))
  })
}

/* ---------- 静音偏好：存在 localStorage，全站带音效的组件共用 ---------- */

const STORAGE_KEY = "yiui:sound:muted"
/** 旧版本用过的键：读到新键没写过时按它迁移，保证升级后偏好不丢。 */
const LEGACY_KEYS = ["travinsy:sound:muted", "isometric-mark:muted"]
const WATCHED_KEYS = [STORAGE_KEY, ...LEGACY_KEYS]
/**
 * 同页广播：`storage` 事件只发给「其他」标签页，本页写 localStorage 不会触发它。
 * 带音效的组件各自有一份静音模块（互不 import），所以约定用同一个事件名互相通知。
 */
const MUTED_EVENT = "yiui:sound-muted-change"
const listeners = new Set<() => void>()

function readMuted() {
  try {
    const current = window.localStorage.getItem(STORAGE_KEY)
    if (current !== null) return current === "1"
    for (const key of LEGACY_KEYS) {
      const legacy = window.localStorage.getItem(key)
      if (legacy === null) continue
      window.localStorage.setItem(STORAGE_KEY, legacy)
      for (const oldKey of LEGACY_KEYS) window.localStorage.removeItem(oldKey)
      return legacy === "1"
    }
    return false
  } catch {
    return false
  }
}

function setMuted(muted: boolean) {
  try {
    window.localStorage.setItem(STORAGE_KEY, muted ? "1" : "0")
  } catch {
    // 隐私模式等存不了时只在本页生效
  }
  for (const listener of listeners) listener()
  // 通知同页其他带音效的组件
  window.dispatchEvent(new Event(MUTED_EVENT))
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  const notify = () => listener()
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || WATCHED_KEYS.includes(event.key)) notify()
  }
  window.addEventListener("storage", onStorage)
  window.addEventListener(MUTED_EVENT, notify)
  return () => {
    listeners.delete(listener)
    window.removeEventListener("storage", onStorage)
    window.removeEventListener(MUTED_EVENT, notify)
  }
}

/** 读取 / 切换音效静音。服务端与水合阶段按未静音渲染，挂载后再读本地偏好。 */
function useIsometricMarkMuted() {
  const muted = React.useSyncExternalStore(subscribe, readMuted, () => false)
  return [muted, setMuted] as const
}

export { playPress, playRelease, useIsometricMarkMuted }
