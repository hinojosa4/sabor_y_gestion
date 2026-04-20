import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'

export const metadata: Metadata = {
  title: 'Sabor & Gestión',
  description: 'Sistema Integral de Gestión Gastronómica',
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
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}