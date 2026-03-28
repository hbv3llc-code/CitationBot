import type { Metadata } from "next";
import { Toaster } from "@/components/ui/Toaster";
import "./globals.css";

export const metadata: Metadata = {
  title: "CitationBot — Automated Local Citation Building",
  description:
    "Build consistent business citations across hundreds of directories automatically.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <Toaster>{children}</Toaster>
      </body>
    </html>
  );
}
