import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import './globals.css'
import './mobile.css'

export const metadata: Metadata = {
  title: 'Estoque Vai Mais BG',
  description: 'Controle de estoque e compras',
  generator: 'v0.app',
    manifest: '/manifest.webmanifest',
    applicationName: 'Estoque Vai Mais BG',
    appleWebApp: {
      capable: true,
      title: 'Estoque Vai Mais BG',
      statusBarStyle: 'black-translucent',
    },
    icons: {
      icon: [
        { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
        { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      ],
      apple: '/apple-touch-icon.png',
    },
  }

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#1E1B16' },
    { media: '(prefers-color-scheme: dark)', color: '#171410' },
  ],
  userScalable: true,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  return (
    <html lang="pt-BR">
      <body className="antialiased">
        <script
          dangerouslySetInnerHTML={{
            __html: `window.__SUPABASE_CONFIG__=${JSON.stringify({ url: supabaseUrl, key: supabaseKey })}`,
          }}
        />
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
