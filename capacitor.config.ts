import type { CapacitorConfig } from '@capacitor/cli'

// appId cuma perlu unik & konsisten — kalau mau ganti, lakukan SEBELUM
// `npx cap add android` pertama kali (ganti setelahnya lebih ribet, ada
// beberapa file native yang perlu disesuaikan manual).
const config: CapacitorConfig = {
  appId: 'com.mgglapangan.catatmgg',
  appName: 'Catat MGG',
  webDir: 'dist',
  android: {
    // Warna splash/status bar native mengikuti brand (navy dari logo).
    backgroundColor: '#1e2226'
  }
}

export default config
