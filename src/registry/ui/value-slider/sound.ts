"use client"

import * as React from "react"

/**
 * 滑块的音效：用 Web Audio 现场合成，不需要音频文件。
 * 刻度是一声很短的高频「嗒」，音高跟着值走；碰到轨道两端是一声低闷的「咚」。
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
  if (ctx.state === "running") {
    return flush()
  }
  const silent = ctx.createBufferSource()
  silent.buffer = ctx.createBuffer(1, 1, ctx.sampleRate)
  silent.connect(ctx.destination)
  silent.start()
  void ctx.resume().then(flush, () => {})
}

const GESTURES = ["pointerup", "touchend", "click", "keydown"] as const
let listening = false

function removeUnlockListeners() {
  if (!listening) return
  for (const type of GESTURES) window.removeEventListener(type, unlock, true)
  listening = false
}

function listenForUnlock() {
  if (listening) return
  listening = true
  for (const type of GESTURES)
    window.addEventListener(type, unlock, { capture: true, passive: true })
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

const clamp = (value: number) => Math.min(1, Math.max(0, value))

/** 一段指数衰减的正弦：用来做「咚」的主体。 */
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
  gain.gain.exponentialRampToValueAtTime(volume, now + 0.005)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)
  osc.connect(gain).connect(ctx.destination)
  osc.start(now)
  osc.stop(now + duration + 0.02)
}

/** 一段带通滤过的噪声：构成「嗒」的颗粒感，长度只有十几毫秒。 */
function noise(
  ctx: AudioContext,
  frequency: number,
  duration: number,
  volume: number,
  q = 2.4,
) {
  const now = ctx.currentTime
  const length = Math.max(1, Math.ceil(ctx.sampleRate * duration))
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < length; i++)
    data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 2
  const source = ctx.createBufferSource()
  source.buffer = buffer
  const filter = ctx.createBiquadFilter()
  filter.type = "bandpass"
  filter.frequency.value = frequency
  filter.Q.value = q
  const gain = ctx.createGain()
  gain.gain.value = volume
  source.connect(filter).connect(gain).connect(ctx.destination)
  source.start(now)
}

/**
 * 一个刻度的滴答声。`pitch` 0–1 表示值在范围里的位置，越高越尖：
 * 高频带通噪声给「嗒」的触感，叠一声极短的正弦给它音高。
 */
function playTick(pitch = 0.5) {
  const t = clamp(pitch)
  withAudio((ctx) => {
    noise(ctx, 2400 + 2600 * t, 0.011, 0.05 + 0.04 * t, 3)
    tone(ctx, 1100 + 1000 * t, 900 + 800 * t, 0.012, 0.028 + 0.012 * t)
  })
}

/** 碰到轨道两端的一声低闷「咚」：低频下滑 + 一点点噪声让它不空。 */
function playEdge() {
  withAudio((ctx) => {
    tone(ctx, 168, 62, 0.15, 0.17)
    noise(ctx, 420, 0.045, 0.06, 1.1)
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

const subscribeDisabled = () => () => {}

/** 读取 / 切换音效静音。无声滑块不订阅全局事件，挂载后再读本地偏好。 */

function useValueSliderMuted(enabled = true) {
  const muted = React.useSyncExternalStore(
    enabled ? subscribe : subscribeDisabled,
    readMuted,
    () => false,
  )
  return [muted, setMuted] as const
}

export { playEdge, playTick, useValueSliderMuted }
