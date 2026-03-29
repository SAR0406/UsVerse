import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "UsVerse — Your Private Universe",
  description:
    "A shared life app for two people who want to live together, digitally. Real-time presence, deep connection, shared memories.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#0d0d1a] text-[#e8e0f0]">
        {children}
      </body>
    </html>
  );
}

