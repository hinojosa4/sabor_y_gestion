import './globals.css'
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import PWAInstallPrompt from '@/components/PWAInstallPrompt'

export const metadata: Metadata = {
  title: 'Sabor & Gestión',
  description: 'Sistema Integral de Gestión Gastronómica',
  manifest: '/manifest.json',
}

export const viewport: Viewport = {
  themeColor: '#e85d26',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
})

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html className={inter.className} lang="es">
      <body className="antialiased" suppressHydrationWarning>
        {children}
        <PWAInstallPrompt />
      </body>
    </html>
  )
}