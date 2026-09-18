import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Cade the Chill Capybara',
  description: 'Daily mini-games on Base L2. Earn CADE Coin, collect Meadow Badges, and climb the Serenity Rankings.',
  keywords: ['blockchain', 'game', 'capybara', 'base', 'crypto', 'daily games', 'CADE'],
  openGraph: {
    title: 'Cade the Chill Capybara',
    description: 'Play daily mini-games on Base L2 and earn CADE Coin 🦫',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cade the Chill Capybara',
    description: 'Play daily mini-games on Base L2 and earn CADE Coin 🦫',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0F0D0A',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  )
}
