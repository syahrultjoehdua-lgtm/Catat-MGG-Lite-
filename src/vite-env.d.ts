/// <reference types="vite/client" />

interface WakeLockSentinel {
  release(): Promise<void>
}
interface WakeLock {
  request(type: 'screen'): Promise<WakeLockSentinel>
}
interface Navigator {
  wakeLock?: WakeLock
  vibrate?: (pattern: number | number[]) => boolean
  share?: (data: { files?: File[]; title?: string; text?: string }) => Promise<void>
  canShare?: (data: { files?: File[] }) => boolean
}