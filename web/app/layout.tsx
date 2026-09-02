import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "dawere",
  description: "ქართული ბლოგ-პლატფორმა, სადაც სტატიას შეკითხვასაც დაუსვამ",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ka">
      <body>{children}</body>
    </html>
  );
}
