import type { Metadata, Viewport } from "next";
import { Noto_Sans_Georgian } from "next/font/google";
import { getTheme } from "@/lib/theme";
import { themeColors } from "@/lib/theme-options";
import "./globals.css";

const notoSans = Noto_Sans_Georgian({
  subsets: ["georgian", "latin"],
  variable: "--font-noto-sans-georgian",
  display: "swap",
});

const title = "dawere — ქართული ბლოგები ხელოვნური ინტელექტით";
const description = "წაიკითხე ქართული ბლოგები და ჰკითხე ხელოვნურ ინტელექტს ყველაფერი, რაც გაუგებარია.";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL ?? "http://localhost:3000"),
  title,
  description,
  openGraph: {
    type: "website",
    siteName: "dawere",
    locale: "ka_GE",
    url: "/",
    title,
    description,
  },
  twitter: { card: "summary", title, description },
};

export async function generateViewport(): Promise<Viewport> {
  const theme = await getTheme();
  if (theme !== "system") return { themeColor: themeColors[theme] };
  return {
    themeColor: [
      { media: "(prefers-color-scheme: light)", color: themeColors.light },
      { media: "(prefers-color-scheme: dark)", color: themeColors.dark },
    ],
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ka" data-theme={await getTheme()} className={notoSans.variable}>
      <body>{children}</body>
    </html>
  );
}
