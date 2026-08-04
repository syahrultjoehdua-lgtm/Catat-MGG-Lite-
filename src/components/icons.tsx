// Set ikon inline (SVG, bukan font eksternal) — supaya app tetap 100% jalan offline
// sesuai spesifikasi, dan tidak bergantung pada CDN font ikon.

import type { SVGProps } from 'react'

function base(props: SVGProps<SVGSVGElement>) {
  return { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, ...props }
}

export const IconClockPlus = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><circle cx="11" cy="13" r="8" /><path d="M11 9v4l3 2" /><path d="M18 3v4M16 5h4" /></svg>
)
export const IconEdit = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M15.5 4.5l4 4L8 20H4v-4L15.5 4.5z" /></svg>
)
export const IconSwap = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M4 8h13l-3-3M20 16H7l3 3" /></svg>
)
export const IconPause = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
)
export const IconPlay = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M7 4l13 8-13 8V4z" /></svg>
)
export const IconCheck = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M4 12l6 6L20 6" /></svg>
)
export const IconFlag = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M6 3v18" /><path d="M6 4h12l-3 4 3 4H6" /></svg>
)
export const IconTrash = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></svg>
)
export const IconCamera = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M4 8h3l2-2h6l2 2h3v11H4V8z" /><circle cx="12" cy="13.5" r="3.2" /></svg>
)
export const IconQr = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><rect x="4" y="4" width="6" height="6" /><rect x="14" y="4" width="6" height="6" /><rect x="4" y="14" width="6" height="6" /><path d="M14 14h3v3h-3zM20 14v6M14 20h3" /></svg>
)
export const IconAlarm = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 1.5" /><path d="M5 4L3 6M19 4l2 2" /></svg>
)
export const IconDots = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)} strokeWidth={0}><circle cx="12" cy="5" r="1.8" fill="currentColor" /><circle cx="12" cy="12" r="1.8" fill="currentColor" /><circle cx="12" cy="19" r="1.8" fill="currentColor" /></svg>
)
export const IconPlus = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M12 5v14M5 12h14" /></svg>
)
export const IconHome = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M4 11l8-7 8 7" /><path d="M6 9.5V20h12V9.5" /></svg>
)
export const IconHistory = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M4 6v5h5" /><path d="M4.6 15a8 8 0 1 0 1.2-9.4L4 11" /><path d="M12 8v5l3 2" /></svg>
)
export const IconSettings = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="3" /><path d="M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3.9a7 7 0 0 0-2-1.2L14.2 3H9.8l-.4 2.6a7 7 0 0 0-2 1.2l-2.3-.9-2 3.4 2 1.5A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.4 2.3-.9c.6.5 1.3.9 2 1.2l.4 2.6h4.4l.4-2.6a7 7 0 0 0 2-1.2l2.3.9 2-3.4-2-1.5c.1-.4.1-.8.1-1.2z" /></svg>
)
export const IconX = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M6 6l12 12M18 6L6 18" /></svg>
)
export const IconMerge = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M6 4v6a4 4 0 0 0 4 4h4M18 4v6a4 4 0 0 1-4 4M12 14v6" /><path d="M9 18l3 2 3-2" /></svg>
)
