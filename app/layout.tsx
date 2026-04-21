import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pivot Galaxy",
  description: "A spatial puzzle campaign with star maps, planets, and fast-touch play.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
