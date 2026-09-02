import type { Metadata } from "next";
import { Noto_Sans_Georgian, Noto_Serif_Georgian } from "next/font/google";
import "./globals.css";

const sans = Noto_Sans_Georgian({
  subsets: ["georgian", "latin"],
  variable: "--font-sans",
});

const serif = Noto_Serif_Georgian({
  subsets: ["georgian", "latin"],
  variable: "--font-serif",
});

export const metadata: Metadata = {
  title: "dawere",
  description: "ქართული ბლოგ-პლატფორმა, სადაც სტატიას შეკითხვასაც დაუსვამ",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ka" className={`${sans.variable} ${serif.variable}`}>
      <body>{children}</body>
    </html>
  );
}
