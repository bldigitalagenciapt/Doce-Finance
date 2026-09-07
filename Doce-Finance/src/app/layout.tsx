import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import './globals.css'

import { BrandProvider } from '@/components/layout/BrandProvider'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'Doce Finance',
  description:
    'SaaS de gestão para o seu negócio: ingredientes, receitas, precificação, clientes, pedidos e agenda.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.variable} font-sans antialiased`}>
        <BrandProvider />
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: { borderRadius: '0.75rem', fontSize: '0.875rem' },
            success: { iconTheme: { primary: '#16A34A', secondary: '#fff' } },
            error: { iconTheme: { primary: '#DC2626', secondary: '#fff' } },
          }}
        />
      </body>
    </html>
  )
}
