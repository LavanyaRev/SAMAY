import type { Metadata } from "next";
import {
  Source_Serif_4,
  IBM_Plex_Sans,
  IBM_Plex_Mono,
  Noto_Sans_Devanagari,
  Noto_Serif_Devanagari,
} from "next/font/google";
import "@/styles/tokens.css";
import { AppProvider } from "@/lib/app-context";

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-serif",
  display: "swap",
});

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-sans",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

const notoSansDevanagari = Noto_Sans_Devanagari({
  subsets: ["devanagari"],
  weight: ["400", "500", "600"],
  variable: "--font-sans-hi",
  display: "swap",
});

const notoSerifDevanagari = Noto_Serif_Devanagari({
  subsets: ["devanagari"],
  weight: ["600", "700"],
  variable: "--font-serif-hi",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SAMAY — Smart AICTE Monitoring & Approval Yojana",
  description:
    "SAMAY statutory regulatory platform for AICTE institutional approvals, scrutiny, EVC inspections, undertakings, and SLA pendency monitoring.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      data-theme="light"
      suppressHydrationWarning
      className={`${sourceSerif.variable} ${ibmPlexSans.variable} ${ibmPlexMono.variable} ${notoSansDevanagari.variable} ${notoSerifDevanagari.variable}`}
    >
      <body className="min-h-screen bg-surface text-text-primary antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-xs focus:border focus:border-brand focus:bg-surface-raised focus:px-3 focus:py-2 focus:text-xs focus:font-semibold focus:text-text-primary"
        >
          Skip to main content
        </a>
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
