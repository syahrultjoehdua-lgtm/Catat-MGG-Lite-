import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'

/**
 * Render node langsung sebagai child dari <body>, bukan di posisi asalnya di pohon
 * komponen React.
 *
 * KENAPA INI PENTING (bug iOS PWA — lihat docs/06-RIWAYAT-BUG.md):
 * Semua bottom sheet (Tambah Sewa, Rincian Sewa, dll.) sebelumnya dirender sebagai
 * children biasa di dalam <AppShell>, yang artinya mereka jadi descendant dari
 * `.app-content` — elemen dengan `overflow-y: auto` + `-webkit-overflow-scrolling:
 * touch`. Di WebKit/Safari iOS, `position: fixed` pada descendant dari elemen
 * scrollable seperti itu TIDAK selalu benar-benar fixed ke viewport — perilakunya
 * berbeda dari Chrome/Android, dan dalam kasus ini menyebabkan Bottom Navigation
 * (yang fixed langsung di root) tampil DI ATAS bottom sheet, padahal z-index sheet
 * (50) jauh lebih tinggi dari bottom nav (10).
 *
 * Solusinya: pindahkan seluruh DOM sheet ke luar `.app-content`, langsung jadi
 * child dari <body> lewat createPortal — supaya posisinya benar-benar setara root
 * dengan bottom-nav/fab, dan z-index dibandingkan dengan benar di semua browser.
 */
export function toBody(node: ReactNode) {
  return createPortal(node, document.body)
}
