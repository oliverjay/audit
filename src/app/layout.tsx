import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { CookieConsent } from "@/components/ui/cookie-consent";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Audit AI — Your site, critiqued by experts",
  description:
    "Get a live AI-powered audit of any website with synchronized voiceover analysis. Choose your persona: UX Consultant, CRO Specialist, or the Roaster.",
  openGraph: {
    title: "Audit AI — Your site, critiqued by experts",
    description:
      "Get a live AI-powered audit of any website with synchronized voiceover analysis.",
    siteName: "Audit AI",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Audit AI — Your site, critiqued by experts",
    description:
      "Get a live AI-powered audit of any website with synchronized voiceover analysis.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        {children}
        <CookieConsent />
      </body>
    </html>
  );
}
