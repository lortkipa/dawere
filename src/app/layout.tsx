import type { Metadata, Viewport } from 'next';
import { JetBrains_Mono, Noto_Sans_Georgian, Noto_Serif_Georgian } from 'next/font/google';
import { ThemeScript } from '@/components/theme-script';
import { Toaster } from '@/components/toaster';
import { SITE_URL } from '@/lib/site';
import './globals.css';

// Noto Sans Georgian carries both Georgian and Latin, so the interface and the
// "dawere" wordmark share one typeface instead of falling back mid-word.
const sans = Noto_Sans_Georgian({
  variable: '--font-sans-ui',
  subsets: ['georgian', 'latin'],
  display: 'swap',
});
const serif = Noto_Serif_Georgian({
  variable: '--font-serif-display',
  subsets: ['georgian', 'latin'],
  display: 'swap',
});
const mono = JetBrains_Mono({ variable: '--font-mono-code', subsets: ['latin'], display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: 'Dawere',
  title: { default: 'Dawere — ტექსტები, რომლებიც ღირს წაკითხვად', template: '%s · Dawere' },
  description:
    'Dawere არის საგამომცემლო პლატფორმა მათთვის, ვისაც სათქმელი აქვს. დაწერე, გამოაქვეყნე და იპოვე ტექსტები, რომლებიც მართლა გაინტერესებს.',
  openGraph: {
    title: 'Dawere',
    description: 'ტექსტები, რომლებიც ღირს წაკითხვად.',
    type: 'website',
    locale: 'ka_GE',
    siteName: 'Dawere',
  },
  twitter: { card: 'summary_large_image' },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fbfaf7' },
    { media: '(prefers-color-scheme: dark)', color: '#0d0d10' },
  ],
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="ka"
      suppressHydrationWarning
      className={`${sans.variable} ${serif.variable} ${mono.variable} h-full`}
    >
      <head>
        <ThemeScript />
      </head>
      <body className="flex min-h-full flex-col bg-surface text-ink">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
