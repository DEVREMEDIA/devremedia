'use client';

import { ThemeProvider } from './theme-provider';
import { AuthProvider } from './auth-provider';
import type { AuthProfile } from '@/lib/auth-profile';

export function Providers({
  children,
  initialProfile,
}: {
  children: React.ReactNode;
  initialProfile: AuthProfile | null;
}) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
      <AuthProvider initialProfile={initialProfile}>{children}</AuthProvider>
    </ThemeProvider>
  );
}
