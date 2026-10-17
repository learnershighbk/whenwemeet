/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Listen on IPv4 + IPv6 (and LAN, for phone testing). Default bound to ::1 only on this machine.
  server: { host: true },
  test: {
    include: ['tests/**/*.test.ts'],
  },
})
