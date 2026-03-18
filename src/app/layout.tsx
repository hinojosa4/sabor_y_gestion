import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sabor & Gestión',
  description: 'Sistema Integral de Gestión Gastronómica',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}