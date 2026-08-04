export interface DataLaporanSesi {
  tanggalSesi: string // ISO
  saldoAwal: number
  pendapatan: number
  pengeluaran: number
  saldoAkhir: number
  jumlahUnitDisewa: number
}

function rupiah(n: number) {
  return `Rp${Math.round(n).toLocaleString('id-ID')}`
}

/** Gambar ringkasan laporan (PNG) — dibuat langsung dengan Canvas API, tanpa
 * library pihak ketiga, supaya tetap ringan & jalan offline (spesifikasi 3.7). */
export async function buatGambarLaporanSesi(data: DataLaporanSesi): Promise<Blob> {
  await document.fonts?.ready?.catch(() => {})

  const W = 720
  const H = 960
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!

  const krem = '#faf8f5'
  const navy = '#1e2226'
  const abu = '#6b6f73'
  const oranye = '#e65c0c'
  const garis = '#e4e0d8'

  ctx.fillStyle = krem
  ctx.fillRect(0, 0, W, H)

  // Header
  ctx.fillStyle = navy
  ctx.font = '600 34px Poppins, sans-serif'
  ctx.fillText('Catat MGG', 48, 90)
  ctx.fillStyle = abu
  ctx.font = '400 20px Poppins, sans-serif'
  ctx.fillText('Ringkasan Sesi', 48, 122)

  ctx.strokeStyle = oranye
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.moveTo(48, 148)
  ctx.lineTo(140, 148)
  ctx.stroke()

  ctx.fillStyle = abu
  ctx.font = '400 18px Poppins, sans-serif'
  const tanggal = new Date(data.tanggalSesi).toLocaleDateString('id-ID', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  })
  ctx.fillText(tanggal, 48, 188)

  // Baris rincian
  let y = 260
  const baris = (label: string, nilai: string, besar = false) => {
    ctx.fillStyle = abu
    ctx.font = '400 20px Poppins, sans-serif'
    ctx.fillText(label, 48, y)
    ctx.fillStyle = navy
    ctx.font = `${besar ? '600 30px' : '500 22px'} Poppins, sans-serif`
    ctx.textAlign = 'right'
    ctx.fillText(nilai, W - 48, y + (besar ? 4 : 0))
    ctx.textAlign = 'left'
    y += besar ? 64 : 52
    ctx.strokeStyle = garis
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(48, y - (besar ? 30 : 26))
    ctx.lineTo(W - 48, y - (besar ? 30 : 26))
    ctx.stroke()
  }

  baris('Saldo awal', rupiah(data.saldoAwal))
  baris('Pendapatan', rupiah(data.pendapatan))
  baris('Pengeluaran', `-${rupiah(data.pengeluaran)}`)
  y += 10
  baris('Saldo akhir', rupiah(data.saldoAkhir), true)

  ctx.fillStyle = abu
  ctx.font = '400 18px Poppins, sans-serif'
  ctx.fillText(`${data.jumlahUnitDisewa} unit disewa pada sesi ini`, 48, y + 20)

  ctx.fillStyle = abu
  ctx.font = '400 14px Poppins, sans-serif'
  ctx.fillText('Dibuat otomatis oleh Catat MGG (Lite)', 48, H - 40)

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Gagal membuat gambar'))), 'image/png')
  })
}

/** Bagikan lewat Web Share API (WhatsApp dll) kalau didukung, atau unduh langsung sebagai fallback. */
export async function bagikanAtauUnduhGambar(blob: Blob, namaFile: string): Promise<void> {
  const file = new File([blob], namaFile, { type: 'image/png' })
  if (navigator.canShare?.({ files: [file] }) && navigator.share) {
    try {
      await navigator.share({ files: [file], title: 'Ringkasan Sesi Catat MGG' })
      return
    } catch {
      // Kalau user batal share, lanjut ke fallback unduh di bawah tidak perlu — biarkan saja.
      return
    }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = namaFile
  a.click()
  URL.revokeObjectURL(url)
}
