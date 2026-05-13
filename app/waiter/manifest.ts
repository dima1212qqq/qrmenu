import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Waiter App',
    short_name: 'Waiter',
    description: 'Уведомления о вызовах и заказах',
    start_url: '/waiter',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#FF6B35',
    icons: [
      {
        src: '/icons/waiter-icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/waiter-icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
