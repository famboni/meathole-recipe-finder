import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: "Tony's Meathole Recipe Finder",
  description: 'Find delicious meat recipes by ingredients',
  icons: {
    icon: '/icon-192.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#f97316" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body>{children}</body>
    </html>
  );
}