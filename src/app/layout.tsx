import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { Providers } from '@/components/providers';
import { Toaster } from '@/components/ui/sonner';
import { AuthHashHandler } from '@/components/shared/auth-hash-handler';
import './globals.css';

// Namespaces only used server-side (via getTranslations) — excluded from client bundle
const SERVER_ONLY_NAMESPACES = ['validation'];

function pickClientMessages(messages: Record<string, unknown>) {
  const picked: Record<string, unknown> = {};
  for (const key of Object.keys(messages)) {
    if (!SERVER_ONLY_NAMESPACES.includes(key)) {
      picked[key] = messages[key];
    }
  }
  return picked;
}

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
  display: 'swap',
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  title: {
    default: 'Devre Media System',
    template: '%s | DMS',
  },
  description: 'Videography client management, project tracking, financials, and video delivery.',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <link rel="dns-prefetch" href="https://img.youtube.com" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
        style={{ margin: 0, backgroundColor: 'var(--background, #09090b)' }}
      >
        <NextIntlClientProvider messages={pickClientMessages(messages as Record<string, unknown>)}>
          <Providers>
            <AuthHashHandler />
            {children}
            <Toaster richColors position="top-right" />
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
