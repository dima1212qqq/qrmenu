import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'Waiter App',
  description: 'Уведомления для официантов',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Waiter',
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#FF6B35',
};

export default function WaiterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <head>
        <link rel="apple-touch-icon" href="/icons/waiter-icon-192.png" />
        <link rel="icon" type="image/png" href="/icons/waiter-icon-192.png" />
      </head>
      <body className="bg-gray-100">{children}</body>
    </html>
  );
}
