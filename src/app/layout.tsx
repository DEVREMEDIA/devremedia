import type { Metadata, Viewport } from 'next';
import { EB_Garamond, Inter, Noto_Sans_Mono } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { Providers } from '@/components/providers';
import { Toaster } from '@/components/ui/sonner';
import { AuthHashHandler } from '@/components/shared/auth-hash-handler';
import { createClient } from '@/lib/supabase/server';
import type { AuthProfile } from '@/lib/auth-profile';
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

const displaySerif = EB_Garamond({
  // ΠΡΟΣΟΧΗ: όχι `--font-display` — αυτό είναι το κλειδί του Tailwind theme
  // και θα γινόταν κυκλική αναφορά στο `@theme inline`.
  variable: '--font-display-serif',
  subsets: ['latin', 'greek'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  display: 'swap',
});

const bodySans = Inter({
  variable: '--font-sans-ui',
  subsets: ['latin', 'greek'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
});

const dataMono = Noto_Sans_Mono({
  variable: '--font-data',
  subsets: ['latin', 'greek'],
  weight: ['400', '500', '700'],
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

// Resolve the signed-in user's profile on the server so the client AuthProvider
// is seeded on the first byte and skips a redundant user_profiles query.
async function getInitialProfile(): Promise<AuthProfile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('user_profiles')
    .select('id, role, display_name, avatar_url')
    .eq('id', user.id)
    .single();

  return (data as AuthProfile | null) ?? null;
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();
  const initialProfile = await getInitialProfile();

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <link rel="dns-prefetch" href="https://img.youtube.com" />
      </head>
      <body
        className={`${displaySerif.variable} ${bodySans.variable} ${dataMono.variable} antialiased`}
        suppressHydrationWarning
        style={{ margin: 0, backgroundColor: 'var(--background, #09090b)' }}
      >
        <NextIntlClientProvider messages={pickClientMessages(messages as Record<string, unknown>)}>
          <Providers initialProfile={initialProfile}>
            <AuthHashHandler />
            {children}
            <Toaster richColors position="top-right" />
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
